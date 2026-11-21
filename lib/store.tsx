import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from './firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from './firebase';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  SAMPLE_DONORS,
  SAMPLE_MESSAGES,
  SAMPLE_PLEDGES,
  SAMPLE_REQUESTS,
  dayKey,
  demoMessage,
  isEligible,
} from './blood';
import { firebaseConfigured } from './config';
import { signInWithGoogle } from './google';
import {
  type BloodGroup,
  type BloodRequest,
  type Donor,
  type HistoryEntry,
  type MessageDraft,
  type Pledge,
} from './types';

const REQUESTS_KEY = 'bloodbond:requests:v1';
const DONORS_KEY = 'bloodbond:donors:v1';
const PLEDGES_KEY = 'bloodbond:pledges:v1';
const MESSAGES_KEY = 'bloodbond:messages:v1';
const HISTORY_KEY = 'bloodbond:history:v1';
const SEEDED_KEY = 'bloodbond:seeded:v1';
const HISTORY_LIMIT = 20;

export interface AuthUser {
  uid: string;
  name: string | null;
  email: string | null;
  photo: string | null;
  /** 'google.com' or 'password' — how this account signs in. */
  provider: string | null;
}

export interface AppState {
  requests: BloodRequest[];
  donors: Donor[];
  pledges: Pledge[];
  messages: MessageDraft[];
  history: HistoryEntry[];
  /** Requests still needing units, most urgent first. */
  openCount: number;
  unitsNeeded: number;
  user: AuthUser | null;
  authReady: boolean;
  guest: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  setAvatarData: (dataUrl: string) => Promise<void>;
  sendPasswordReset: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  addRequest: (input: {
    patientName: string;
    bloodGroup: BloodGroup;
    unitsNeeded: number;
    hospital: string;
    city: string;
    urgency: BloodRequest['urgency'];
    deadline: string;
    contactName: string;
    contactPhone: string;
    notes: string;
  }) => BloodRequest;
  addPledge: (requestId: string) => Pledge | null;
  completePledge: (pledgeId: string) => void;
  cancelPledge: (pledgeId: string) => void;
  saveMessage: (draft: MessageDraft) => void;
  applyHistory: (entry: HistoryEntry) => MessageDraft | null;
  clearHistory: () => void;
  clearDemoData: () => void;
  requestById: (id: string) => BloodRequest | undefined;
  donorById: (id: string) => Donor | undefined;
}

const AppContext = createContext<AppState | null>(null);

function loadJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** First-run demo content so the board shows real-looking requests immediately. */
function seedDemo(): {
  requests: BloodRequest[];
  donors: Donor[];
  pledges: Pledge[];
  messages: MessageDraft[];
  history: HistoryEntry[];
} {
  const now = Date.now();
  const requests: BloodRequest[] = SAMPLE_REQUESTS.map((sample, i) => {
    const d = new Date();
    d.setDate(d.getDate() + sample.daysToDeadline);
    return {
      id: `demo-req-${i}`,
      patientName: sample.patientName,
      bloodGroup: sample.bloodGroup,
      unitsNeeded: sample.unitsNeeded,
      unitsPledged: sample.unitsPledged,
      hospital: sample.hospital,
      city: sample.city,
      urgency: sample.urgency,
      deadline: dayKey(d),
      contactName: sample.contactName,
      contactPhone: sample.contactPhone,
      notes: sample.notes,
      createdAt: now - (SAMPLE_REQUESTS.length - i) * 60000,
      isDemo: true,
    };
  });
  const donors: Donor[] = SAMPLE_DONORS.map((sample, i) => ({
    id: `demo-donor-${i}`,
    name: sample.name,
    bloodGroup: sample.bloodGroup,
    lastDonation: sample.lastDonation,
    distanceKm: sample.distanceKm,
    city: sample.city,
    available: isEligible(sample.lastDonation),
    createdAt: now - (SAMPLE_DONORS.length - i) * 60000,
    isDemo: true,
  }));
  const pledges: Pledge[] = SAMPLE_PLEDGES.map((sample, i) => {
    const d = new Date();
    d.setDate(d.getDate() + sample.daysToDate);
    const req = requests[i] ?? requests[0];
    return {
      id: `demo-pledge-${i}`,
      requestId: req.id,
      patientName: sample.patientName,
      bloodGroup: sample.bloodGroup,
      hospital: sample.hospital,
      date: dayKey(d),
      reminder: sample.reminder,
      status: sample.status,
      createdAt: now - sample.daysAgo * 86400000,
    };
  });
  const messages: MessageDraft[] = SAMPLE_MESSAGES.map((sample, i) => {
    const draft = demoMessage({
      patientName: sample.patientName,
      bloodGroup: sample.bloodGroup,
      unitsNeeded: 2,
      hospital: sample.hospital,
      city: 'Glassboro, NJ',
      urgency: 'urgent',
      deadline: dayKey(new Date(Date.now() + 4 * 86400000)),
      contactName: 'Family contact',
      contactPhone: '',
      notes: '',
    });
    return { ...draft, id: `demo-msg-${i}`, at: now - sample.daysAgo * 86400000 };
  });
  const history: HistoryEntry[] = messages.map((m) => ({
    id: `h-${m.id}`,
    messageId: m.id,
    title: `${m.bloodGroup} request for ${m.patientName} · ${m.hospital}`,
    bloodGroup: m.bloodGroup,
    at: m.at,
  }));
  return { requests, donors, pledges, messages, history };
}

async function upsertProfile(u: User): Promise<void> {
  if (!firebaseConfigured) return;
  try {
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    const base = {
      displayName: u.displayName ?? '',
      email: u.email ?? '',
      photoURL: u.photoURL ?? '',
      lastLoginAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(ref, { ...base, createdAt: serverTimestamp() });
    } else {
      await setDoc(ref, base, { merge: true });
    }
  } catch {
    // Sync is best-effort; the app keeps working offline.
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [messages, setMessages] = useState<MessageDraft[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [guest, setGuest] = useState(false);
  const requestsRef = useRef<BloodRequest[]>([]);
  const donorsRef = useRef<Donor[]>([]);
  const pledgesRef = useRef<Pledge[]>([]);
  const messagesRef = useRef<MessageDraft[]>([]);
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyLoadedRef = useRef(false);
  const unsubsRef = useRef<(() => void)[]>([]);

  // Local data loads once at startup; first launch seeds the demo board.
  useEffect(() => {
    void (async () => {
      const [rRaw, dRaw, pRaw, mRaw, hRaw, seeded] = await Promise.all([
        AsyncStorage.getItem(REQUESTS_KEY),
        AsyncStorage.getItem(DONORS_KEY),
        AsyncStorage.getItem(PLEDGES_KEY),
        AsyncStorage.getItem(MESSAGES_KEY),
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(SEEDED_KEY),
      ]);
      const r = loadJson<BloodRequest[]>(rRaw);
      const d = loadJson<Donor[]>(dRaw);
      const p = loadJson<Pledge[]>(pRaw);
      const m = loadJson<MessageDraft[]>(mRaw);
      const h = loadJson<HistoryEntry[]>(hRaw);
      if (r && r.length > 0) {
        setRequests(r);
        setDonors(d ?? []);
        setPledges(p ?? []);
        setMessages(m ?? []);
        setHistory(h ?? []);
      } else if (!seeded) {
        const demo = seedDemo();
        setRequests(demo.requests);
        setDonors(demo.donors);
        setPledges(demo.pledges);
        setMessages(demo.messages);
        setHistory(demo.history);
        await AsyncStorage.setItem(SEEDED_KEY, '1');
      }
      historyLoadedRef.current = true;
    })();
  }, []);

  // Local mirrors.
  useEffect(() => {
    requestsRef.current = requests;
    AsyncStorage.setItem(REQUESTS_KEY, JSON.stringify(requests)).catch(() => undefined);
  }, [requests]);
  useEffect(() => {
    donorsRef.current = donors;
    AsyncStorage.setItem(DONORS_KEY, JSON.stringify(donors)).catch(() => undefined);
  }, [donors]);
  useEffect(() => {
    pledgesRef.current = pledges;
    AsyncStorage.setItem(PLEDGES_KEY, JSON.stringify(pledges)).catch(() => undefined);
  }, [pledges]);
  useEffect(() => {
    messagesRef.current = messages;
    AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages)).catch(() => undefined);
  }, [messages]);
  useEffect(() => {
    historyRef.current = history;
    if (!historyLoadedRef.current) return;
    AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history)).catch(() => undefined);
  }, [history]);

  // Auth state: profile write, cloud subscriptions.
  // Readiness waits for Firebase to finish restoring any persisted
  // session from storage — the gate must not decide "signed out" (and
  // show Welcome) before the saved session has had its chance to load.
  useEffect(() => {
    let alive = true;
    void auth.authStateReady().then(() => {
      if (alive) setAuthReady(true);
    });
    const unsub = onAuthStateChanged(auth, (u) => {
      for (const fn of unsubsRef.current) fn();
      unsubsRef.current = [];
      if (!u) {
        setUser(null);
        return;
      }
      setUser({
        uid: u.uid,
        name: u.displayName,
        email: u.email,
        photo: u.photoURL,
        provider: u.providerData[0]?.providerId ?? null,
      });
      void upsertProfile(u);
      if (!firebaseConfigured) return;

      const subscribe = <T,>(
        colName: string,
        apply: (items: T[]) => void,
        local: () => T[],
        idOf: (item: T) => string,
      ) => {
        const col = collection(db, 'users', u.uid, colName);
        unsubsRef.current.push(
          onSnapshot(
            col,
            (snap) => {
              apply(snap.docs.map((d) => d.data() as T));
            },
            () => undefined,
          ),
        );
        // One-time merge: anything saved locally before sign-in joins the account.
        void (async () => {
          try {
            const cloud = await getDocs(col);
            const cloudIds = new Set(cloud.docs.map((d) => d.id));
            for (const item of local()) {
              const id = idOf(item);
              if (!cloudIds.has(id)) {
                await setDoc(
                  doc(db, 'users', u.uid, colName, id),
                  item as unknown as Record<string, unknown>,
                );
              }
            }
          } catch {
            // Best-effort merge only.
          }
        })();
      };
      subscribe<BloodRequest>('requests', setRequests, () => requestsRef.current, (r) => r.id);
      subscribe<Donor>('donors', setDonors, () => donorsRef.current, (d) => d.id);
      subscribe<Pledge>('pledges', setPledges, () => pledgesRef.current, (p) => p.id);
      subscribe<MessageDraft>('messages', setMessages, () => messagesRef.current, (m) => m.id);
      subscribe<HistoryEntry>('history', setHistory, () => historyRef.current, (h) => h.id);

      // Profile doc: a custom avatar / edited name stored there overrides
      // the auth copy.
      void (async () => {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists()) {
            const data = snap.data();
            setUser((prev) =>
              prev && prev.uid === u.uid
                ? {
                    ...prev,
                    name: (data.displayName as string) || prev.name,
                    photo: (data.photoData as string) || prev.photo,
                  }
                : prev,
            );
          }
        } catch {
          // Keep the auth profile.
        }
      })();
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const openCount = useMemo(
    () => requests.filter((r) => r.unitsNeeded - r.unitsPledged > 0).length,
    [requests],
  );
  const unitsNeeded = useMemo(
    () => requests.reduce((n, r) => n + Math.max(0, r.unitsNeeded - r.unitsPledged), 0),
    [requests],
  );

  const signIn = useCallback(async () => {
    await signInWithGoogle();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUpWithEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const cleanName = name.trim();
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName });
        setUser({
          uid: cred.user.uid,
          name: cleanName,
          email: cred.user.email,
          photo: null,
          provider: 'password',
        });
        void upsertProfile({ ...cred.user, displayName: cleanName } as User);
      }
    },
    [],
  );

  const updateDisplayName = useCallback(async (name: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    const clean = name.trim();
    await updateProfile(currentUser, { displayName: clean });
    if (firebaseConfigured) {
      await setDoc(doc(db, 'users', currentUser.uid), { displayName: clean }, { merge: true });
    }
    setUser((prev) => (prev ? { ...prev, name: clean } : prev));
  }, []);

  const setAvatarData = useCallback(async (dataUrl: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    if (firebaseConfigured) {
      await setDoc(doc(db, 'users', currentUser.uid), { photoData: dataUrl }, { merge: true });
    }
    setUser((prev) => (prev ? { ...prev, photo: dataUrl } : prev));
  }, []);

  const sendPasswordReset = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;
    await sendPasswordResetEmail(auth, currentUser.email);
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    // Back to the welcome screen — the gate routes there as soon as the
    // user is signed out and not a guest.
    setGuest(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    // Deliberately NOT persisted: guest lasts for this visit only, so the
    // next open asks for sign-in again. A signed-in user, by contrast,
    // stays signed in (Firebase Auth persistence).
    setGuest(true);
  }, []);

  const syncDoc = useCallback(
    (colName: string, id: string, data: unknown) => {
      if (!user || !firebaseConfigured) return;
      void setDoc(doc(db, 'users', user.uid, colName, id), data).catch(() => undefined);
    },
    [user],
  );

  const deleteDocCloud = useCallback(
    (colName: string, id: string) => {
      if (!user || !firebaseConfigured) return;
      void deleteDoc(doc(db, 'users', user.uid, colName, id)).catch(() => undefined);
    },
    [user],
  );

  const addRequest = useCallback(
    (input: {
      patientName: string;
      bloodGroup: BloodGroup;
      unitsNeeded: number;
      hospital: string;
      city: string;
      urgency: BloodRequest['urgency'];
      deadline: string;
      contactName: string;
      contactPhone: string;
      notes: string;
    }): BloodRequest => {
      const request: BloodRequest = {
        id: uid('req'),
        patientName: input.patientName.trim(),
        bloodGroup: input.bloodGroup,
        unitsNeeded: Math.max(1, Math.round(input.unitsNeeded)),
        unitsPledged: 0,
        hospital: input.hospital.trim(),
        city: input.city.trim(),
        urgency: input.urgency,
        deadline: input.deadline,
        contactName: input.contactName.trim(),
        contactPhone: input.contactPhone.trim(),
        notes: input.notes.trim(),
        createdAt: Date.now(),
      };
      setRequests((prev) => [request, ...prev]);
      syncDoc('requests', request.id, request);
      return request;
    },
    [syncDoc],
  );

  const addPledge = useCallback(
    (requestId: string): Pledge | null => {
      const request = requestsRef.current.find((r) => r.id === requestId);
      if (!request) return null;
      if (request.unitsPledged >= request.unitsNeeded) return null;
      if (pledgesRef.current.some((p) => p.requestId === requestId && p.status === 'pledged')) {
        return null;
      }
      const d = new Date(request.deadline);
      d.setDate(d.getDate() - 1);
      const pledge: Pledge = {
        id: uid('pledge'),
        requestId,
        patientName: request.patientName,
        bloodGroup: request.bloodGroup,
        hospital: request.hospital,
        date: dayKey(d),
        reminder: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, 6:00 PM`,
        status: 'pledged',
        createdAt: Date.now(),
      };
      setPledges((prev) => [pledge, ...prev]);
      syncDoc('pledges', pledge.id, pledge);
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, unitsPledged: r.unitsPledged + 1 } : r,
        ),
      );
      return pledge;
    },
    [syncDoc],
  );

  const completePledge = useCallback(
    (pledgeId: string) => {
      setPledges((prev) =>
        prev.map((p) => (p.id === pledgeId ? { ...p, status: 'completed' as const } : p)),
      );
    },
    [],
  );

  const cancelPledge = useCallback(
    (pledgeId: string) => {
      const pledge = pledgesRef.current.find((p) => p.id === pledgeId);
      setPledges((prev) => prev.filter((p) => p.id !== pledgeId));
      if (pledge) {
        deleteDocCloud('pledges', pledgeId);
        setRequests((prev) =>
          prev.map((r) =>
            r.id === pledge.requestId
              ? { ...r, unitsPledged: Math.max(0, r.unitsPledged - 1) }
              : r,
          ),
        );
      }
    },
    [deleteDocCloud],
  );

  const saveMessage = useCallback(
    (draft: MessageDraft) => {
      setMessages((prev) => [draft, ...prev].slice(0, HISTORY_LIMIT));
      syncDoc('messages', draft.id, draft);
      const entry: HistoryEntry = {
        id: uid('h'),
        messageId: draft.id,
        title: draft.title,
        bloodGroup: draft.bloodGroup,
        at: draft.at,
      };
      setHistory((prev) =>
        prev.some((h) => h.messageId === draft.id)
          ? prev
          : [entry, ...prev].slice(0, HISTORY_LIMIT),
      );
      syncDoc('history', entry.id, entry);
    },
    [syncDoc],
  );

  const applyHistory = useCallback(
    (entry: HistoryEntry): MessageDraft | null => {
      return messagesRef.current.find((m) => m.id === entry.messageId) ?? null;
    },
    [],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setMessages([]);
    if (user && firebaseConfigured) {
      void (async () => {
        try {
          const snap = await getDocs(collection(db, 'users', user.uid, 'history'));
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
          const snapM = await getDocs(collection(db, 'users', user.uid, 'messages'));
          await Promise.all(snapM.docs.map((d) => deleteDoc(d.ref)));
        } catch {
          // The subscription will reconcile the visible list.
        }
      })();
    }
  }, [user]);

  const clearDemoData = useCallback(() => {
    const demoReqIds = new Set(requestsRef.current.filter((r) => r.isDemo).map((r) => r.id));
    const demoDonorIds = new Set(donorsRef.current.filter((d) => d.isDemo).map((d) => d.id));
    setRequests((prev) => prev.filter((r) => !r.isDemo));
    setDonors((prev) => prev.filter((d) => !d.isDemo));
    setPledges((prev) => prev.filter((p) => !demoReqIds.has(p.requestId)));
    setMessages((prev) => prev.filter((m) => !m.id.startsWith('demo-msg')));
    setHistory((prev) => prev.filter((h) => !h.messageId.startsWith('demo-msg')));
    if (user && firebaseConfigured) {
      for (const id of demoReqIds) {
        void deleteDoc(doc(db, 'users', user.uid, 'requests', id)).catch(() => undefined);
      }
      for (const id of demoDonorIds) {
        void deleteDoc(doc(db, 'users', user.uid, 'donors', id)).catch(() => undefined);
      }
    }
  }, [user]);

  const requestById = useCallback(
    (id: string) => requests.find((r) => r.id === id),
    [requests],
  );

  const donorById = useCallback(
    (id: string) => donors.find((d) => d.id === id),
    [donors],
  );

  const value = useMemo<AppState>(
    () => ({
      requests,
      donors,
      pledges,
      messages,
      history,
      openCount,
      unitsNeeded,
      user,
      authReady,
      guest,
      signIn,
      signInWithEmail,
      signUpWithEmail,
      updateDisplayName,
      setAvatarData,
      sendPasswordReset,
      resetPasswordForEmail,
      signOut,
      continueAsGuest,
      addRequest,
      addPledge,
      completePledge,
      cancelPledge,
      saveMessage,
      applyHistory,
      clearHistory,
      clearDemoData,
      requestById,
      donorById,
    }),
    [
      requests,
      donors,
      pledges,
      messages,
      history,
      openCount,
      unitsNeeded,
      user,
      authReady,
      guest,
      signIn,
      signInWithEmail,
      signUpWithEmail,
      updateDisplayName,
      setAvatarData,
      sendPasswordReset,
      resetPasswordForEmail,
      signOut,
      continueAsGuest,
      addRequest,
      addPledge,
      completePledge,
      cancelPledge,
      saveMessage,
      applyHistory,
      clearHistory,
      clearDemoData,
      requestById,
      donorById,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
