/** BloodBond shared types. Dates are 'YYYY-MM-DD' strings. */

export type BloodGroup = 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+';

export const BLOOD_GROUPS: BloodGroup[] = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

export type Urgency = 'critical' | 'urgent' | 'routine';

export const URGENCIES: Urgency[] = ['critical', 'urgent', 'routine'];

export const URGENCY_LABELS: Record<Urgency, string> = {
  critical: 'Critical',
  urgent: 'Urgent',
  routine: 'Routine',
};

export interface BloodRequest {
  id: string;
  /** Patient first name + initial only — never a full name. */
  patientName: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  unitsPledged: number;
  hospital: string;
  city: string;
  urgency: Urgency;
  /** 'YYYY-MM-DD' — the day the blood is needed by. */
  deadline: string;
  contactName: string;
  contactPhone: string;
  notes: string;
  /** Epoch milliseconds the request was posted. */
  createdAt: number;
  /** Seeded demo content — clearable from Settings. */
  isDemo?: boolean;
}

export interface Donor {
  id: string;
  name: string;
  bloodGroup: BloodGroup;
  /** 'YYYY-MM-DD' of the last donation, or null if never donated. */
  lastDonation: string | null;
  /** Distance from the user in kilometres (demo data). */
  distanceKm: number;
  city: string;
  /** Available to donate right now (last donation 56+ days ago). */
  available: boolean;
  /** Epoch milliseconds the donor joined. */
  createdAt: number;
  /** Seeded demo content — clearable from Settings. */
  isDemo?: boolean;
}

export type PledgeStatus = 'pledged' | 'completed';

export interface Pledge {
  id: string;
  requestId: string;
  /** Snapshot of the request at pledge time, so the pledge still reads
   *  even if the request is later cleared. */
  patientName: string;
  bloodGroup: BloodGroup;
  hospital: string;
  /** 'YYYY-MM-DD' — the day the donation is planned. */
  date: string;
  /** 'YYYY-MM-DD HH:mm' reminder, or '' when none is set. */
  reminder: string;
  status: PledgeStatus;
  /** Epoch milliseconds the pledge was made. */
  createdAt: number;
}

export type MessageSource = 'live' | 'demo';

export interface MessageDraft {
  id: string;
  title: string;
  /** The full shareable message text. */
  message: string;
  source: MessageSource;
  /** Epoch milliseconds the message was written. */
  at: number;
  /** The request details the message was written from. */
  patientName: string;
  bloodGroup: BloodGroup;
  hospital: string;
}

export interface HistoryEntry {
  id: string;
  messageId: string;
  /** Short label, e.g. "B+ request for Ravi · City General". */
  title: string;
  bloodGroup: BloodGroup;
  /** Epoch milliseconds the message was written. */
  at: number;
}

export interface MessageRequestInput {
  patientName: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  hospital: string;
  city: string;
  urgency: Urgency;
  deadline: string;
  contactName: string;
  contactPhone: string;
  notes: string;
}

export interface MessageResponse {
  message?: string;
  title?: string;
  error?: { message?: string };
}
