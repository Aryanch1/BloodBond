/**
 * BloodBond runtime config.
 *
 * The AI request-message writer is a Java Spring Boot service
 * (backend/): POST /api/message. EXPO_PUBLIC_API_URL is the backend
 * origin when it is deployed (e.g. the deployed URL). When no endpoint
 * answers, the app falls back to its on-device demo writer (lib/blood.ts)
 * and says so honestly — requests and pledges are always saved and
 * visible either way.
 *
 * No Gemini key ever lives in this file or in app code; the key is
 * server-side only in the backend service.
 */

/** Backend origin, or '' when the backend is not deployed yet. */
export const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/$/, '');

/**
 * Set to true once the Firebase project for BloodBond exists and the
 * values in lib/firebase.ts / lib/firebase.native.ts are the real web
 * config. No project exists yet (2026-11-21) — TODO-BLOODBOND
 * placeholders in both files; wiring is a publish step.
 */
export const firebaseConfigured = false;
