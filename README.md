# Talabat ElBeit · طلبات البيت

A shared shopping list for the whole family, in Arabic and English. Built with Expo (React Native) and Firebase.

<p>
  <img src="docs/screenshots/list.png" width="200" alt="Shopping list: overdue, today and tomorrow items, and bought items">
  <img src="docs/screenshots/add-item.png" width="200" alt="Add-item sheet confirming the last item added">
  <img src="docs/screenshots/family.png" width="200" alt="Family sheet for the creator: remove a member, change the family password">
  <img src="docs/screenshots/list-arabic-dark.png" width="200" alt="Shopping list in Arabic, right to left, dark theme">
</p>
<p>
  <img src="docs/screenshots/sign-in.png" width="200" alt="Sign in">
  <img src="docs/screenshots/join-lockout.png" width="200" alt="Joining with a wrong family password: tries left before a wait">
  <img src="docs/screenshots/waiting.png" width="200" alt="Waiting for a connection when offline">
  <img src="docs/screenshots/family-deleted.png" width="200" alt="Notice after the family was deleted">
</p>

## What it does

- **One list per family.** Everyone sees changes live: items, who added them, who bought them.
- **Quick adding.** Name, quantity, unit (pcs, kg, g, L, mL, pack, box) and an optional "needed by" time: No rush, Today, Tomorrow, or a time you pick.
- **To buy, then Bought.** Tap to mark bought. Overdue items are flagged in red. Swipe to delete, with Undo.
- **Notifications.** Other members get a push notification in their own language when you add, buy or remove something.
- **Arabic and English.** Full right-to-left layout and Arabic digits (٢ كجم).
- **Light and dark** themes, following the phone.

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Firebase project. In the Firebase console:
   - **Authentication → Sign-in method:** enable **Email/Password**. Leave **Anonymous** off.
   - **Firestore:** create a database.
   - **Project settings → Your apps:** add a Web app and copy its config.
3. Copy `.env.example` to `.env.local` and fill in the values from that config.
4. Deploy the security rules (see [Security](#security)):
   ```bash
   npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```
5. Run the app:
   ```bash
   npx expo start
   ```
   Push notifications need a development build (`npx expo run:android` / `npx expo run:ios`, or EAS Build).

### Running against local emulators

No Firebase project needed:

```bash
npx firebase emulators:start --only auth,firestore --project demo-talabat
```

Then start the app with `EXPO_PUBLIC_USE_EMULATORS=1` (in `.env.local` or on the command line).

## Android APK

GitHub builds an installable APK on every push to `master`. You can also start a build by hand: **Actions → Android APK → Run workflow**.

1. Once, add six repository secrets under **Settings → Secrets and variables → Actions**, with the values from your Firebase web app config: `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID`, `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`, `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_FIREBASE_APP_ID`.
2. Open the latest **Android APK** run under the **Actions** tab and download `talabat-elbeit-apk-N` from **Artifacts**. It's a zip with the APK inside.
3. Copy the APK to the phone and open it. Android asks you to allow installing from that app the first time.

The APK is signed with a development key: fine for installing directly, not for the Play Store. Each build has a higher version number, so a new APK installs over the old one. Push notifications on Android also need a `google-services.json` from Firebase.

## Security

Family data is protected by [`firestore.rules`](firestore.rules), enforced by Firebase's servers. The app only displays what the rules allow.

- A family's items and members are readable only by its members.
- The family password is stored as a salted SHA-256 hash that no client can read. To join, the app records your guess first, and the rules only let you become a member if that recorded guess matches.
- Guessing is rate-limited by the rules themselves:
  - **Per account:** 5 attempts, then one every 15 minutes, then one an hour after 10.
  - **Per family:** at most 10 attempts an hour, across all accounts.
- A join only counts a guess made in the last 10 minutes, so an old correct guess can't be reused.
- The family's creator can remove members and change the family password. Members already in the family stay in after a password change.
- Family passwords must be at least 8 characters.

## Tests

```bash
npm test            # unit tests: name rules, lockout maths, dates, translations, push messages
npm run test:rules  # security rules and Firestore services, against the Firestore emulator (needs Java 21)
npm run typecheck
npm run lint
```

## Project layout

```
app/                Screens (expo-router): sign-in, family-setup, index (the list), family
components/ui/      Themed building blocks: text, buttons, fields, chips, sheet, pattern band…
components/list/    List rows, add bar, add-item sheet
hooks/              Session (auth + family membership), live family data, clock
services/           Firebase setup and Firestore operations (families, items, users, push)
lib/                Pure logic with unit tests
i18n/               English and Arabic strings, language switching
theme/              Mashrabiya colors, spacing, type
firestore.rules     Server-side security rules
tests/rules/        Emulator tests for the rules and services
docs/               Design spec, implementation plan, design directions
```

## License

MIT License © 2025
