# Talabat ElBeit Fixes and Mashrabiya Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secure family access with rules-enforced join lockout, fix every review bug, and rebuild the UI in the Mashrabiya look with Arabic + English.

**Architecture:** Pure logic in `lib/` (unit-tested), Firestore access in `services/` as functions that take a `Firestore` instance (tested against the emulator together with `firestore.rules`), React state in a session context plus small live-data hooks, and expo-router screens built from themed `components/ui`.

**Tech Stack:** Expo SDK 53, expo-router 5 (`Stack.Protected`), Firebase JS SDK 12, i18next, `@expo-google-fonts/cairo`, `react-native-svg`, `react-native-gesture-handler` (`ReanimatedSwipeable`), Jest (`jest-expo` + node project), `@firebase/rules-unit-testing` 5, firebase-tools emulators.

**Spec:** `docs/superpowers/specs/2026-11-01-fixes-and-redesign-design.md`

## Global Constraints

- The family password minimum is 8 characters, trimmed at both ends, at create and at join.
- Family name: 2–40 characters after trimming, no `/`. `nameKey` = trimmed, whitespace collapsed to one space, lowercased.
- Hash = hex SHA-256 of `` `${familyId}:${password.trim()}` ``.
- Lockout:
  - Per account: 5 free attempts. When `count` ≥ 5, wait 15 min after `at`. When `count` ≥ 10, wait 60 min.
  - Per family: at most 10 attempts per 1-hour window.
- Units: `pcs, kg, g, L, mL, pack, box`. Arabic labels: `قطعة, كجم, جم, لتر, مل, باكو, كرتونة`.
- Due presets:
  - **Today:** 18:00 today, or 23:00 today if it's already 17:00 or later.
  - **Tomorrow:** 18:00 tomorrow.
  - **No rush:** `null`.
- No emoji in UI. Icons are Ionicons. No `letterSpacing` on Arabic text.
- Arabic formatting locale `ar-EG`. English `en-US`.
- Do not change the Android `package`. iOS `bundleIdentifier` = `com.mohamed0x1hussein.TalabatElBeit`.

## Review Focus

1. Two people tap "Join" for the same family at the same moment. One batch may be denied because of the `joinLimit` race. Expected: retry once, then show the error. Test: `joinFamily` retries once on `permission-denied` from the attempt batch (Task 4).
2. The creator deletes the family while another member has the list open. Expected: the member is sent to family setup with "This family was deleted". The session test covers clearing `familyId` when the member doc is gone (Task 4, `clearUserFamily` + rules allow it).
3. A family name typed with different case or extra spaces. Expected: it resolves to the same family. Test in Task 2 (`normalizeFamilyName('  The  Husseins ')`).
4. Quantity typed as `0` or negative. Expected: the stepper floor is 1 and the rules reject `quantity <= 0`. Rules test in Task 3.
5. A user with no display name (an account made before names were required). Expected: show the email prefix. `displayNameOf()` in Task 2.

---

### Task 1: Project setup and dependencies

**Files:**
- Modify: `package.json`, `app.json`, `tsconfig.json`, `.gitignore`
- Create: `jest.config.js`, `firebase.json`, `.env.example`, `services/firebase.ts`, `tests/shims/expo-crypto.ts`
- Delete: `expo`, `talabat_elbeit@1.0.0`

**Interfaces:**
- Produces: `services/firebase.ts` exports `app: FirebaseApp`, `auth: Auth`, `db: Firestore`. It reads `EXPO_PUBLIC_FIREBASE_{API_KEY,AUTH_DOMAIN,PROJECT_ID,STORAGE_BUCKET,MESSAGING_SENDER_ID,APP_ID}`. When `EXPO_PUBLIC_USE_EMULATORS === '1'` it connects auth to `http://127.0.0.1:9099` and Firestore to `127.0.0.1:8080`.
- Produces: npm scripts `test` (unit project), `test:rules` (`firebase emulators:exec --only firestore --project demo-talabat "jest --selectProjects rules"`), `typecheck`.

- [ ] Step 1: Remove the deps `@react-native-firebase/app`, `@react-native-firebase/messaging`, `react-native-dropdown-picker`, `@react-native-picker/picker`, `moment`, `install`, `npm`.
- [ ] Step 2: Add the deps at SDK 53 versions (from `expo/bundledNativeModules.json`): `expo-crypto`, `expo-localization`, `expo-updates`, `react-native-svg`, `@expo-google-fonts/cairo`, `i18next`, `react-i18next`.
  Add the devDeps: `jest`, `jest-expo`, `@types/jest`, `@firebase/rules-unit-testing@5`, `firebase-tools`.
- [ ] Step 3: Set up `jest.config.js` with two projects:
  - `unit`: preset `jest-expo`, matches `lib/**/*.test.ts`.
  - `rules`: preset `jest-expo`, `testEnvironment: node`, matches `tests/rules/**/*.test.ts`, maps `expo-crypto` to `tests/shims/expo-crypto.ts` (Node `crypto` sha256).
- [ ] Step 4: Update `app.json`:
  - iOS bundle id.
  - `extra.supportsRTL: true`.
  - Plugins: `expo-localization`, `expo-font`.
- [ ] Step 5: Write `firebase.json` (firestore rules path and emulator ports 8080 and 9099) and `.env.example`.
- [ ] Step 6: Run `npm install`. Expected: exit 0.
- [ ] Step 7: Commit `chore: dependencies, test runners, firebase config from env`.

### Task 2: Pure logic in `lib/`

**Files:** Create `lib/familyName.ts`, `lib/password.ts`, `lib/items.ts`, `lib/format.ts`, `lib/joinLimits.ts`, `lib/errors.ts`, `lib/types.ts`, and a `*.test.ts` beside each.

**Interfaces (Produces):**
- `types.ts`:
  - `Lang = 'en' | 'ar'`
  - `UNITS` (const tuple), `Unit`
  - `Item = { id; name; quantity: number; unit: Unit; dueAt: Date | null; bought: boolean; boughtBy: string | null; addedBy: string; addedById: string; createdAt: Date }`
  - `Member = { id; displayName; expoPushToken: string; language: Lang; joinedAt: Date | null }`
  - `Family = { id; name; nameKey; creatorId; createdAt: Date | null }`
- `familyName.ts`:
  - `normalizeFamilyName(name: string): string`
  - `validateFamilyName(name: string): 'ok' | 'tooShort' | 'tooLong' | 'invalidChars'`
  - `displayNameOf(user: { displayName?: string | null; email?: string | null }): string`
- `password.ts`:
  - `MIN_FAMILY_PASSWORD = 8`
  - `validateFamilyPassword(pw: string): 'ok' | 'tooShort'`
  - `passwordHashInput(familyId: string, pw: string): string`
- `items.ts`:
  - `dueStatus(dueAt: Date | null, now: Date): 'none' | 'overdue' | 'today' | 'later'`
  - `splitItems(items: Item[], now: Date): { toBuy: Item[]; bought: Item[] }`
  - `duePreset(preset: 'none' | 'today' | 'tomorrow', now: Date): Date | null`
- `format.ts`:
  - `localeFor(lang: Lang): string`
  - `formatNumber(n: number, lang: Lang): string`
  - `formatTime(d: Date, lang: Lang): string`
  - `formatDue(dueAt: Date, now: Date, lang: Lang, words: { today: string; tomorrow: string; yesterday: string }): string`
- `joinLimits.ts`:
  - Constants: `FREE_ATTEMPTS = 5`, `SLOW_COOLDOWN_MS = 900000`, `SLOWER_AFTER = 10`, `SLOWER_COOLDOWN_MS = 3600000`, `FAMILY_WINDOW_MS = 3600000`, `FAMILY_MAX_ATTEMPTS = 10`
  - `accountCooldownUntil(prev: { count: number; at: Date } | null): Date | null`
  - `familyBusyUntil(limit: { windowStart: Date; count: number } | null, now: Date): Date | null`
  - `triesLeftBeforeWait(count: number): number`
- `errors.ts`:
  - `class AppError extends Error { code: 'familyNotFound' | 'familyNameTaken' | 'wrongPassword' | 'accountCooldown' | 'familyBusy'; until?: Date; triesLeft?: number }`
  - `errorKey(e: unknown): string` returns an i18n key under `errors.`.

- [ ] Step 1: Write the tests. Key assertions:
  - `normalizeFamilyName('  The  Husseins ') === 'the husseins'`
  - `validateFamilyName('a/b') === 'invalidChars'`, `validateFamilyName('x') === 'tooShort'`, and 41 characters is `'tooLong'`
  - `validateFamilyPassword('1234567') === 'tooShort'`
  - `passwordHashInput('F1', ' pw12345678 ') === 'F1:pw12345678'`
  - `dueStatus`:
    - yesterday → `'overdue'`
    - 18:00 today at 10:00 → `'today'`
    - tomorrow → `'later'`
    - `null` → `'none'`
  - `splitItems`: overdue first, then by `dueAt`, then no-due by `createdAt`. Bought items are separate.
  - `duePreset('today')` at 16:59 → same day 18:00. At 17:00 → same day 23:00.
  - `accountCooldownUntil`:
    - `{ count: 4 }` → `null`
    - `{ count: 5, at }` → `at + 15m`
    - `{ count: 10, at }` → `at + 60m`
  - `familyBusyUntil`:
    - `{ count: 10, windowStart: now - 10m }` → `windowStart + 1h`
    - the same with `windowStart: now - 61m` → `null`
  - `formatNumber(2, 'ar') === '٢'`
  - `errorKey({ code: 'auth/invalid-credential' }) === 'errors.wrongCredentials'`
  - `displayNameOf({ email: 'sara@x.com' }) === 'sara'`
- [ ] Step 2: Run `npx jest --selectProjects unit`. Expected: FAIL (modules missing).
- [ ] Step 3: Implement the modules.
- [ ] Step 4: Run `npx jest --selectProjects unit`. Expected: all pass.
- [ ] Step 5: Commit `feat: pure logic for names, passwords, items, formatting, lockout`.

### Task 3: Firestore rules with tests

**Files:** Create `firestore.rules`, `tests/rules/helpers.ts`, `tests/rules/families.rules.test.ts`, `tests/rules/items.rules.test.ts`

**Interfaces:**
- Consumes: the data model in spec §2 and the table in §3.
- Produces: the rules file deployed by `firebase deploy --only firestore:rules`.

- [ ] Step 1: Write the tests using `initializeTestEnvironment({ projectId: 'demo-talabat', firestore: { rules } })`. Seed data with `withSecurityRulesDisabled`. Cases:
  - **Family creation:**
    - The creator batch (familyNames + family + secret + joinLimit + member + user) succeeds.
    - The same name again fails.
  - **Who can read what:**
    - Nobody can `get` `secret/password`, including the creator.
    - A non-member can't read the family, items or members.
    - A non-member can `get` `familyNames/{key}` and `meta/joinLimit`, but can't list `familyNames`.
  - **Joining:**
    - Without an attempt doc → denied.
    - Attempt batch with the right proof, then member create → allowed.
    - Attempt with the wrong proof, then member create → denied.
    - An attempt without bumping `joinLimit` → denied.
    - A `joinLimit` bump without an attempt → denied.
  - **Per-account lockout:**
    - Seed `count: 5, at: now - 1m` → the next attempt is denied.
    - Seed `count: 5, at: now - 16m` → allowed.
    - Seed `count: 10, at: now - 30m` → denied.
  - **Per-family limit:**
    - Seed `joinLimit { count: 10, windowStart: now - 10m }` → denied.
    - Seed `windowStart: now - 61m` → allowed with `count: 1`, `windowStart: request.time`.
  - **Items:**
    - A member creates a valid item → allowed.
    - `quantity: 0` → denied.
    - `addedById` set to someone else → denied.
    - Updating `name` → denied.
    - Updating `bought`/`boughtBy` → allowed.
  - **Members:**
    - Updating your own `expoPushToken` → allowed.
    - Updating someone else's → denied.
    - Leaving (delete own member doc) → allowed.
    - The creator deletes another member → allowed. A non-creator does the same → denied.
  - **Family deletion:**
    - The creator can delete the secret, `joinLimit`, `familyNames` and the family. A member can't.
- [ ] Step 2: Run `npm run test:rules` with an empty-deny `firestore.rules`. Expected: the allow cases FAIL.
- [ ] Step 3: Write `firestore.rules`. Write the lockout checks as boolean functions:

```
function cooldownOk(prev) {
  return prev.count < 5
    || (prev.count < 10 && request.time >= prev.at + duration.value(15, 'm'))
    || request.time >= prev.at + duration.value(60, 'm');
}
```

  Bind the attempt and the limit together:
  - The attempt rules require `getAfter(limit) != get(limit)` on `count` or `windowStart`.
  - The limit rules require `getAfter(attempt).data.at == request.time`.
- [ ] Step 4: Run `npm run test:rules`. Expected: all pass.
- [ ] Step 5: Commit `feat: firestore rules with rate-limited join`.

### Task 4: Services

**Files:** Create `services/hash.ts`, `services/families.ts`, `services/items.ts`, `services/convert.ts`, `tests/rules/services.test.ts`

**Interfaces (Produces):**
- `hash.ts`: `sha256Hex(input: string): Promise<string>` (expo-crypto).
- `families.ts`. Each takes `db: Firestore` first:
  - `createFamily(db, user: { uid: string; displayName: string }, input: { name: string; password: string; language: Lang; expoPushToken: string }): Promise<{ familyId: string }>`. Throws `AppError('familyNameTaken')`.
  - `joinFamily(db, user, input): Promise<{ familyId: string }>`. Throws `AppError` `familyNotFound`, `wrongPassword` (with `triesLeft`), `accountCooldown` or `familyBusy` (with `until`). Retries the attempt batch once on `permission-denied`.
  - `leaveFamily(db, uid: string, familyId: string): Promise<void>`
  - `deleteFamily(db, uid: string, familyId: string): Promise<void>`
  - `clearUserFamily(db, uid: string): Promise<void>`
  - `updateMyMember(db, familyId: string, uid: string, patch: Partial<Pick<Member, 'displayName' | 'expoPushToken' | 'language'>>): Promise<void>`
- `items.ts`:
  - `addItem(db, familyId, user: { uid; displayName }, input: { name: string; quantity: number; unit: Unit; dueAt: Date | null }): Promise<string>`
  - `setBought(db, familyId, itemId, bought: boolean, byName: string | null): Promise<void>`
  - `deleteItem(db, familyId, itemId): Promise<void>`
  - `restoreItem(db, familyId, item: Item): Promise<void>`
  - `clearBought(db, familyId, itemIds: string[]): Promise<void>`
- `convert.ts`: `toItem(snap)`, `toMember(snap)`, `toFamily(snap)`. They map Firestore `Timestamp` to `Date`.

- [ ] Step 1: Write the tests with emulator contexts from `rules-unit-testing`.
  - **Create and join:**
    - create → join with the right password → `members/{uid}` exists.
    - join with the wrong password → `wrongPassword` with `triesLeft === 4`.
    - 6th wrong try → `accountCooldown`.
    - unknown name → `familyNotFound`.
    - duplicate create → `familyNameTaken`.
  - **Delete and leave:**
    - `deleteFamily` removes items, members, secret, limit, name and family.
    - Another member's `clearUserFamily` then succeeds.
    - `leaveFamily` removes the member doc and nulls `users.familyId`.
  - **Items:** add → setBought → delete → restore keeps the same id and fields.
- [ ] Step 2: Run `npm run test:rules`. Expected: FAIL (services missing).
- [ ] Step 3: Implement.
- [ ] Step 4: Run `npm run test:rules`. Expected: all pass.
- [ ] Step 5: Commit `feat: firestore services for families and items`.

### Task 5: Theme, i18n, UI kit

**Files:** Create:
- `theme/tokens.ts`, `theme/ThemeProvider.tsx`
- `i18n/index.ts`, `i18n/en.json`, `i18n/ar.json`, `i18n/LanguageProvider.tsx`
- `components/ui/{AppText,Button,TextField,SegmentedTabs,Chip,Stepper,Checkbox,AvatarStack,Sheet,Snackbar,PatternBand,Screen}.tsx`

**Interfaces (Produces):**
- `useTheme(): { scheme: 'light' | 'dark'; c: Palette; space: (n: 1 | 2 | 3 | 4 | 5 | 6 | 8) => number; radius: { sm: 6; md: 10; lg: 14; xl: 22; pill: 999 }; font: { regular; semibold; bold; extrabold } }`
  - `space(n)` = `n * 4`.
  - Palette keys: exactly the token names in spec §4.1, in camelCase: `bg, surface, field, text, muted, line, primary, onPrimary, accent, onAccent, dueBg, dueText, danger, band`.
- `useLanguage(): { lang: Lang; setLang(l: Lang): Promise<void>; isRTL: boolean }`
  - `setLang` saves to AsyncStorage key `talabat.lang`, runs `I18nManager.forceRTL(l === 'ar')`, then `Updates.reloadAsync()`. If that throws, it shows the `settings.reopenToApply` alert.
- `AppText` props:
  - `variant: 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'section'`
  - `tone?: 'default' | 'muted' | 'primary' | 'danger' | 'onBand'`
  - `section` uppercases with letterSpacing in English only.
- `Button` props: `title`, `onPress`, `variant: 'primary' | 'accent' | 'ghost' | 'danger'`, `loading?`, `disabled?`, `icon?: IoniconName`.
- `Sheet` props: `visible`, `onClose`, `children`. RN `Modal`, transparent, slide.
- `Snackbar` props: `message`, `actionLabel?`, `onAction?`, `visible`, `onHide`. Auto-hides after 5000 ms.
- `PatternBand` props: `children`. SVG pattern: two 16-unit squares, one rotated 45°, on a 34-unit tile, white stroke opacity 0.17.
- i18n keys are grouped as `auth.*`, `familySetup.*`, `list.*`, `addItem.*`, `family.*`, `units.*`, `due.*`, `errors.*`, `push.*`, `settings.*`. Both JSON files have identical key sets.

- [ ] Step 1: Add the unit test `i18n/keys.test.ts` (unit project match extended to `i18n/**`). Assert the flattened key sets of `en.json` and `ar.json` are equal.
- [ ] Step 2: Run it. Expected: FAIL.
- [ ] Step 3: Implement the theme, i18n and components.
- [ ] Step 4: Run the unit tests and `npx tsc --noEmit` (new files only should be clean). Expected: pass.
- [ ] Step 5: Commit `feat: mashrabiya theme, i18n and ui kit`.

### Task 6: Session, routing, sign-in and family setup screens

**Files:**
- Create: `hooks/useSession.tsx`, `hooks/useNow.ts`, `app/sign-in.tsx`, `app/family-setup.tsx`
- Rewrite: `app/_layout.tsx`
- Delete: `app/screens/*`, `app/+not-found.tsx` (recreated as a themed version)

**Interfaces:**
- Produces: `useSession(): { status: 'loading' | 'signedOut' | 'needsFamily' | 'ready'; user: User | null; familyId: string | null; notice: 'familyDeleted' | 'removed' | null; clearNotice(): void }`
- Produces: `useNow(intervalMs = 60000): Date`
- Guards in the layout:
  - `Stack.Protected guard={status === 'signedOut'}` → `sign-in`
  - `guard={status === 'needsFamily'}` → `family-setup`
  - `guard={status === 'ready'}` → `index`, `family`
  - The splash screen stays up while fonts load or `status === 'loading'`.

- [ ] Step 1: Implement the session. Watch `users/{uid}`. When it has a `familyId`, also watch `families/{id}` and `members/{uid}`. If either is missing or returns `permission-denied`, call `clearUserFamily`. Set `notice` to `familyDeleted` when the family doc is gone and to `removed` otherwise.
- [ ] Step 2: Build the screens to the mockup. Sign-in tabs: Sign in / Create account (name, email, password). Family setup tabs: Join / Create (name, password, with the 8-character hint on Create). Show the lockout messages from `AppError`.
- [ ] Step 3: Run `npx tsc --noEmit` and `npm run lint`. Expected: pass.
- [ ] Step 4: Commit `feat: session guard, sign-in and family setup screens`.

### Task 7: Shopping list, add sheet, family sheet

**Files:**
- Create: `hooks/useFamilyData.ts` (`useFamily`, `useItems`, `useMembers`), `components/list/{ItemRow,AddBar,AddItemSheet,SectionHeader}.tsx`, `app/index.tsx`, `app/family.tsx`

**Interfaces:**
- Consumes: services from Task 4, `splitItems`/`dueStatus`/`formatDue` from Task 2, the UI kit from Task 5.
- Produces:
  - `useItems(familyId): { items: Item[]; loading: boolean }`
  - `useMembers(familyId): Member[]`
  - `useFamily(familyId): Family | null`

- [ ] Step 1: List screen.
  - A `PatternBand` header with the family name, the "N to buy · M overdue" summary and an `AvatarStack` that opens `/family`.
  - A `SectionList` with To buy and Bought sections. Bought has a Clear action.
  - Tap a row to toggle bought. Swipe a row to delete, then an Undo snackbar restores it.
  - An `AddBar` at the bottom opens `AddItemSheet`.
  - An empty state.
- [ ] Step 2: Add sheet.
  - Name field.
  - Stepper, minimum 1.
  - Unit chips.
  - Due chips: No rush / Today / Tomorrow / Pick. "Pick" opens the native date then time picker. On iOS it's an inline `DateTimePicker`, `mode="datetime"`.
  - Submit adds the item, notifies the others and keeps the sheet open for fast entry.
- [ ] Step 3: Family sheet.
  - The members list, with a crown icon for the creator and "(you)".
  - An EN/عربي language switch.
  - Leave for members, Delete for the creator, each behind a confirm alert.
  - Sign out.
- [ ] Step 4: Run `npx tsc --noEmit` and `npm run lint`. Expected: pass.
- [ ] Step 5: Commit `feat: shopping list, add-item sheet and family sheet`.

### Task 8: Push notifications

**Files:**
- Create: `services/push.ts`
- Modify: `hooks/useSession.tsx` (save the token on ready), `components/list/AddItemSheet.tsx`, `app/index.tsx` (send)

**Interfaces:**
- Produces: `registerForPush(): Promise<string | null>`
  - Calls `setNotificationHandler` once at module scope.
  - Passes `projectId` from `Constants.expoConfig?.extra?.eas?.projectId`.
  - Returns `null` on a simulator or when permission is denied. No `alert`.
- Produces: `notifyMembers(members: Member[], excludeUid: string, build: (lang: Lang) => { title: string; body: string }, data: Record<string, string>): Promise<void>`
  - Sends to `https://exp.host/--/api/v2/push/send` in chunks of 100.

- [ ] Step 1: Implement. Text comes from `i18n.getFixedT(member.language)` with the keys `push.added`, `push.bought` and `push.removed`.
- [ ] Step 2: Run `npx tsc --noEmit`. Expected: pass.
- [ ] Step 3: Commit `feat: localized push notifications to family members`.

### Task 9: Cleanup, README, verification

**Files:**
- Delete:
  - `components/{Collapsible,ExternalLink,HapticTab,HelloWave,ParallaxScrollView,ThemedButton,ThemedHeader,ThemedStatusBar,ThemedText,ThemedTextInput,ThemedView}.tsx`
  - `components/ui/{IconSymbol,IconSymbol.ios,TabBarBackground,TabBarBackground.ios}.tsx`
  - `hooks/{useThemeColor,useColorScheme,useColorScheme.web}.ts`
  - `constants/`, `themes/`, `utils/`, `scripts/reset-project.js`
  - `assets/images/{react-logo*,partial-react-logo}.png`
- Rewrite: `README.md`

- [ ] Step 1: Delete the files. Run `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run test:rules`. Expected: all pass.
- [ ] Step 2: Rewrite the README:
  - Features.
  - Setup: copy `.env.example` to `.env.local`.
  - Firebase console: enable Email/Password auth, keep Anonymous auth off.
  - `firebase deploy --only firestore:rules`.
  - Running the tests.
  - The security model and lockout numbers.
  - Screenshots: new shots replace the old ones.
- [ ] Step 3: Visual check.
  - Run `firebase emulators:start --only auth,firestore`, then `EXPO_PUBLIC_USE_EMULATORS=1 npx expo start --web`.
  - Use Playwright to sign up, create a family, add 3 items, mark one bought, and open the family sheet.
  - Take light and dark screenshots of each screen. Fix visible defects.
- [ ] Step 4: Commit `docs: readme, cleanup` and push the branch.
