/**
 * BloodBond blood logic — compatibility, the on-device demo message
 * writer, and the seeded demo board.
 *
 * The live writer is the Java Spring Boot service (backend/): POST
 * /api/message. The key (GEMINI_API_KEY) lives server-side only, in
 * the backend. When no backend answers, the app falls back to the
 * rule-based demo writer below and says so honestly (DEMO badge) — it
 * only ever uses the details the user actually typed, and never
 * invents a fact.
 *
 * Compatibility facts are the standard red-cell transfusion rules:
 * O- is the universal donor, AB+ the universal recipient. Nothing
 * here is medical advice — the app always says to confirm with the
 * hospital or blood bank.
 */

import { API_BASE } from './config';
import {
  BLOOD_GROUPS,
  URGENCY_LABELS,
  type BloodGroup,
  type BloodRequest,
  type MessageDraft,
  type MessageRequestInput,
  type MessageResponse,
  type Urgency,
} from './types';

/** 'YYYY-MM-DD' for a Date, in local time. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return dayKey(new Date());
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return key;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatDayLabel(key: string): string {
  const today = todayKey();
  if (key === today) return 'Today';
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (key === dayKey(y)) return 'Yesterday';
  return formatDate(key);
}

/** Whole days from today until the deadline (negative when overdue). */
export function daysUntil(deadline: string): number {
  const [y, m, d] = deadline.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((target - start) / 86400000);
}

/* ------------------------------------------------------------------ */
/* Compatibility — standard red-cell transfusion rules.                */
/* ------------------------------------------------------------------ */

/** Groups a donor of `group` can give red cells to. */
export const CAN_DONATE_TO: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

/** Groups a patient of `group` can receive red cells from. */
export function canReceiveFrom(group: BloodGroup): BloodGroup[] {
  return BLOOD_GROUPS.filter((donor) => CAN_DONATE_TO[donor].includes(group));
}

export function canDonate(donor: BloodGroup, recipient: BloodGroup): boolean {
  return CAN_DONATE_TO[donor].includes(recipient);
}

/** Whole days since a date key (negative when the date is in future). */
export function daysSince(key: string | null): number | null {
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  const then = new Date(y, m - 1, d).getTime();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((start - then) / 86400000);
}

/**
 * Donors must wait at least 56 days between whole-blood donations.
 * Returns true when the donor is eligible to give today.
 */
export function isEligible(lastDonation: string | null): boolean {
  if (!lastDonation) return true;
  const since = daysSince(lastDonation);
  return since === null || since >= 56;
}

/** Requests sorted most urgent first, then soonest deadline. */
export function sortRequests(requests: BloodRequest[]): BloodRequest[] {
  const rank: Record<Urgency, number> = { critical: 0, urgent: 1, routine: 2 };
  return [...requests].sort(
    (a, b) =>
      rank[a.urgency] - rank[b.urgency] ||
      a.deadline.localeCompare(b.deadline) ||
      b.createdAt - a.createdAt,
  );
}

export function unitsStillNeeded(request: BloodRequest): number {
  return Math.max(0, request.unitsNeeded - request.unitsPledged);
}

export function openRequests(requests: BloodRequest[]): BloodRequest[] {
  return requests.filter((r) => unitsStillNeeded(r) > 0);
}

/* ------------------------------------------------------------------ */
/* Demo message writer — rule-based, honest, uses only typed input.   */
/* ------------------------------------------------------------------ */

function urgencyOpening(urgency: Urgency): string {
  if (urgency === 'critical') return 'Urgent: blood needed today.';
  if (urgency === 'urgent') return 'Blood needed soon — please help if you can.';
  return 'Blood needed — a planned donation would help.';
}

function urgencyLine(urgency: Urgency): string {
  if (urgency === 'critical') return 'This is urgent — every hour matters.';
  if (urgency === 'urgent') return 'The hospital is asking within the next few days.';
  return 'This is a planned request, so there is time to arrange a donation.';
}

/**
 * Rule-based demo writer. Builds a clear, respectful, shareable
 * request message from exactly the details given — nothing invented.
 */
export function demoMessage(input: MessageRequestInput): MessageDraft {
  const group = input.bloodGroup;
  const units = input.unitsNeeded;
  const unitWord = units === 1 ? 'unit' : 'units';
  const name = input.patientName.trim() || 'a patient';
  const hospital = input.hospital.trim() || 'the hospital';
  const city = input.city.trim();
  const where = city ? `${hospital}, ${city}` : hospital;
  const by = formatDate(input.deadline);
  const contact = input.contactName.trim();
  const phone = input.contactPhone.trim();
  const contactLine =
    contact && phone
      ? `If you can donate, please contact ${contact} at ${phone}.`
      : contact
        ? `If you can donate, please contact ${contact}.`
        : 'If you can donate, please reply to this message.';
  const donors = canReceiveFrom(group).join(', ');
  const notes = input.notes.trim();
  const message =
    `${urgencyOpening(input.urgency)} ${units} ${unitWord} of ${group} blood needed for ${name} at ${where} by ${by}.\n\n` +
    `${urgencyLine(input.urgency)} ${group} patients can receive from: ${donors}. ` +
    `Please share this with anyone nearby who may be able to help.\n\n` +
    `${contactLine}` +
    (notes ? `\n\nNote: ${notes}` : '') +
    `\n\nThank you for considering it — one donation can help more than one person.`;
  const title = `${group} blood needed for ${name} · ${hospital}`;
  return {
    id: `msg-demo-${Date.now()}`,
    title,
    message,
    source: 'demo',
    at: Date.now(),
    patientName: name,
    bloodGroup: group,
    hospital,
  };
}

/** Ask the live Java backend for a written message; null when unreachable. */
export async function fetchLiveMessage(
  input: MessageRequestInput,
): Promise<MessageDraft | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/api/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as MessageResponse;
    if (!data.message) return null;
    return {
      id: `msg-live-${Date.now()}`,
      title: data.title ?? `${input.bloodGroup} blood needed for ${input.patientName}`,
      message: data.message,
      source: 'live',
      at: Date.now(),
      patientName: input.patientName,
      bloodGroup: input.bloodGroup,
      hospital: input.hospital,
    };
  } catch {
    return null;
  }
}

/** Live first, demo fallback — the caller shows which source answered. */
export async function writeMessage(input: MessageRequestInput): Promise<MessageDraft> {
  const live = await fetchLiveMessage(input);
  if (live) return live;
  return demoMessage(input);
}

/* ------------------------------------------------------------------ */
/* Seeded demo board — clearly labelled, clearable from Settings.     */
/* ------------------------------------------------------------------ */

export const SAMPLE_REQUESTS: {
  patientName: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  unitsPledged: number;
  hospital: string;
  city: string;
  urgency: Urgency;
  daysToDeadline: number;
  contactName: string;
  contactPhone: string;
  notes: string;
}[] = [
  {
    patientName: 'Ravi K.',
    bloodGroup: 'B+',
    unitsNeeded: 4,
    unitsPledged: 2,
    hospital: 'City General Hospital',
    city: 'Glassboro, NJ',
    urgency: 'critical',
    daysToDeadline: 3,
    contactName: 'Anil K.',
    contactPhone: '(856) 555-0142',
    notes: 'Surgery scheduled Nov 25, 8:00 AM.',
  },
  {
    patientName: 'Grace T.',
    bloodGroup: 'A-',
    unitsNeeded: 1,
    unitsPledged: 0,
    hospital: 'Inspira Medical Center',
    city: 'Vineland, NJ',
    urgency: 'critical',
    daysToDeadline: 2,
    contactName: 'Paul T.',
    contactPhone: '(856) 555-0117',
    notes: 'Emergency — needed today.',
  },
  {
    patientName: 'Meera S.',
    bloodGroup: 'O-',
    unitsNeeded: 3,
    unitsPledged: 1,
    hospital: 'St. Mary Medical Center',
    city: 'Camden, NJ',
    urgency: 'urgent',
    daysToDeadline: 4,
    contactName: 'Dev S.',
    contactPhone: '(856) 555-0189',
    notes: 'Ongoing treatment, needs 1 unit every few days.',
  },
  {
    patientName: 'Lila R.',
    bloodGroup: 'AB-',
    unitsNeeded: 2,
    unitsPledged: 1,
    hospital: 'Jefferson Hospital',
    city: 'Philadelphia, PA',
    urgency: 'urgent',
    daysToDeadline: 5,
    contactName: 'Tom R.',
    contactPhone: '(215) 555-0163',
    notes: 'Rare group — please share widely.',
  },
  {
    patientName: 'Jon M.',
    bloodGroup: 'A+',
    unitsNeeded: 2,
    unitsPledged: 0,
    hospital: 'Cooper University Hospital',
    city: 'Camden, NJ',
    urgency: 'routine',
    daysToDeadline: 6,
    contactName: 'Sara M.',
    contactPhone: '(856) 555-0126',
    notes: 'Planned transfusion.',
  },
  {
    patientName: 'Omar F.',
    bloodGroup: 'O+',
    unitsNeeded: 3,
    unitsPledged: 2,
    hospital: 'Virtua Hospital',
    city: 'Voorhees, NJ',
    urgency: 'routine',
    daysToDeadline: 7,
    contactName: 'Nadia F.',
    contactPhone: '(856) 555-0151',
    notes: 'Post-surgery recovery.',
  },
];

export const SAMPLE_DONORS: {
  name: string;
  bloodGroup: BloodGroup;
  lastDonation: string | null;
  distanceKm: number;
  city: string;
}[] = [
  { name: 'Maya D.', bloodGroup: 'O+', lastDonation: '2026-10-21', distanceKm: 1.8, city: 'Glassboro, NJ' },
  { name: 'Arjun K.', bloodGroup: 'O-', lastDonation: '2026-09-12', distanceKm: 2.1, city: 'Glassboro, NJ' },
  { name: 'Chris L.', bloodGroup: 'A-', lastDonation: '2026-11-02', distanceKm: 2.9, city: 'Pitman, NJ' },
  { name: 'Priya S.', bloodGroup: 'A+', lastDonation: '2026-10-03', distanceKm: 3.4, city: 'Glassboro, NJ' },
  { name: 'Fatima Z.', bloodGroup: 'O-', lastDonation: '2026-10-18', distanceKm: 3.8, city: 'Sewell, NJ' },
  { name: 'Sam W.', bloodGroup: 'AB+', lastDonation: '2026-09-30', distanceKm: 4.2, city: 'Glassboro, NJ' },
  { name: 'Jon M.', bloodGroup: 'B+', lastDonation: '2026-08-28', distanceKm: 5.0, city: 'Camden, NJ' },
  { name: 'Nina P.', bloodGroup: 'B-', lastDonation: '2026-07-15', distanceKm: 6.1, city: 'Mullica Hill, NJ' },
  { name: 'Alex R.', bloodGroup: 'AB-', lastDonation: '2026-11-10', distanceKm: 7.3, city: 'Glassboro, NJ' },
];

export const SAMPLE_PLEDGES: {
  patientName: string;
  bloodGroup: BloodGroup;
  hospital: string;
  daysToDate: number;
  reminder: string;
  status: 'pledged' | 'completed';
  daysAgo: number;
}[] = [
  {
    patientName: 'Ravi K.',
    bloodGroup: 'B+',
    hospital: 'City General Hospital',
    daysToDate: 2,
    reminder: 'Nov 23, 6:00 PM',
    status: 'pledged',
    daysAgo: 0,
  },
  {
    patientName: 'Meera S.',
    bloodGroup: 'O-',
    hospital: 'St. Mary Medical Center',
    daysToDate: -40,
    reminder: '',
    status: 'completed',
    daysAgo: 40,
  },
  {
    patientName: 'Jon M.',
    bloodGroup: 'B+',
    hospital: 'Cooper University Hospital',
    daysToDate: -78,
    reminder: '',
    status: 'completed',
    daysAgo: 78,
  },
];

export const SAMPLE_MESSAGES: {
  patientName: string;
  bloodGroup: BloodGroup;
  hospital: string;
  daysAgo: number;
}[] = [
  { patientName: 'Ravi K.', bloodGroup: 'B+', hospital: 'City General Hospital', daysAgo: 1 },
  { patientName: 'Lila R.', bloodGroup: 'AB-', hospital: 'Jefferson Hospital', daysAgo: 3 },
];

export { URGENCY_LABELS };
