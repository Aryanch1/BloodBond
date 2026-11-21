# BloodBond

**Every drop counts.** A community blood-donor and request board — see open requests, find matching donors, pledge a donation, and write a clear shareable request message.

Someone nearby needs blood today. BloodBond puts the open requests on one board, sorted by urgency, with the blood group, hospital and deadline on every card — and lets anyone pledge a donation or write a clear message to share with family, friends and donor groups.

## Features

- **Request board** — open blood requests with blood group, hospital, units needed, urgency (Critical / Urgent / Routine) and deadline; seeded demo data, clearly labelled and clearable from Settings.
- **Donor directory** — demo donors with blood group, last donation date, distance and availability; filter by blood group. A donor is listed as available only when their last donation was at least 56 days ago.
- **AI request message writer** — type a few details and get a clear, respectful, shareable message (live Gemini when the backend is connected, honest on-device demo writer otherwise — the app always says which).
- **Blood-type compatibility chart** — who can donate to whom, as a designed visual (O- is the universal donor, AB+ the universal recipient).
- **“I can donate” pledges** — pick a request, pledge, see it in My Pledges with a reminder the day before; past pledges kept as history.
- **Accounts** — sign in with Google or email, or continue as a guest. Signed-in users stay signed in; pledges and messages sync per account.
- **Premium design** — deep crimson on warm white, Bebas Neue poster headlines, spring-physics animations, a droplet-filling pull-to-refresh, frosted glass cards. Works on phones, tablets, foldables and desktop.

## Live web

Live link coming soon — the app is built locally and ready to publish.

## Design

Figma: https://www.figma.com/design/jZfZzwT8vcwH1w3ZKvkK62 — "BloodBond — Daily App"

## Tech stack

- React Native + Expo SDK 58 + TypeScript (one codebase: Android, iOS, web)
- Gemini AI (`gemini-3.5-flash-lite`) for the message writer, via a Java Spring Boot service (`backend/`, key server-side only) — honest demo writer mode when the backend is not deployed
- Firebase Authentication + Firestore for accounts and sync
- react-native-reanimated, expo-blur, expo-haptics, expo-linear-gradient

## Run it

```sh
npm install
npm run web        # web
npm run android    # Android (Expo Go / emulator)
npm run ios        # iOS (Expo Go)
```

Backend (Java 17):

```sh
cd backend
./mvnw spring-boot:run   # serves on http://localhost:8080
```

Set `EXPO_PUBLIC_API_URL` to the backend origin to use the live writer; without it the app runs its on-device demo writer. `GEMINI_API_KEY` is set server-side only, never in the app or repo — see `.env.example`.

## Firebase

Firebase wiring is a publish step: create the project, enable Email/Password + Google sign-in (email-link OFF), publish `firestore.rules`, and fill in the TODO-BLOODBOND placeholders in `lib/firebase.ts` and `lib/firebase.native.ts`, then set `firebaseConfigured=true` in `lib/config.ts`.

## License

MIT License — Copyright (c) 2026 Aryanmouli Cherupalli
