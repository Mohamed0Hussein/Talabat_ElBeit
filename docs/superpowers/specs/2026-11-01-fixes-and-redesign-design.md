# Talabat ElBeit: fixes, security and Mashrabiya redesign

Date: 2026-11-01
Status: decisions made (owner asked Claude to "take decisions" after the data/security section)

## 1. Intent

A family shopping list for Egyptian households. Family members share one list,
see changes live and get a push notification when someone adds, buys or removes
an item.

This change:

- fixes every issue found in the code review (security, bugs, cleanup);
- adds join lockout so family passwords can't be guessed at speed;
- replaces the look with the "Mashrabiya" direction
  (`docs/design/redesign-directions.html`, direction 3);
- adds Arabic alongside English, with right-to-left layout.

Owner decisions: test data only, so the data model can change freely; Arabic + English;
security option A (Firestore rules, Spark/free plan, no Cloud Functions);
Mashrabiya look. Everything else below was decided by Claude.

Success criteria:

- `npx tsc --noEmit` and `npm run lint` pass.
- Unit tests pass for the pure logic (`lib/`).
- Firestore rules tests pass against the emulator. They cover create, join (right/wrong
  password), lockout, per-family cap, member-only reads, leave and delete.
- The web build renders sign-in → create family → list → add item against
  the Firebase emulators, checked with screenshots.

## 2. Data model

```
users/{uid}                            { displayName, familyId | null, language, updatedAt }
familyNames/{nameKey}                  { familyId }
families/{familyId}                    { name, nameKey, creatorId, createdAt }
families/{familyId}/secret/password    { hash }
families/{familyId}/meta/joinLimit     { windowStart, count }
families/{familyId}/joinAttempts/{uid} { proof, count, at }
families/{familyId}/members/{uid}      { displayName, expoPushToken, language, joinedAt }
families/{familyId}/items/{itemId}     { name, quantity, unit, dueAt | null, bought,
                                         boughtBy | null, addedBy, addedById, createdAt }
```

- `familyId` is a random Firestore auto-ID. The typed name maps to it through
  `familyNames/{nameKey}`, where `nameKey` = name trimmed, inner spaces collapsed,
  lowercased. Names: 2–40 characters, no `/`.
  - Random IDs mean a deleted family's leftover docs (join attempts) can never
    collide with a new family that reuses the name.
- Password hash = hex SHA-256 of `familyId + ":" + password`. The random ID acts as a salt.
- Family password minimum: 8 characters (checked in the app; rules can't see the
  password).
- `quantity` is a number (stepper). `unit` is one of `pcs, kg, g, L, mL, pack, box`.
  `dueAt` is optional: `null` means "no rush".
- `language` on the member doc lets the sender write each push notification in the
  recipient's language.

## 3. Security rules (`firestore.rules`)

| Path | Read | Write |
|---|---|---|
| `users/{uid}` | self | self |
| `familyNames/{key}` | get: signed in | create: same batch as its family, by the creator. Delete: that family's creator |
| `families/{id}` | members | create: `creatorId == uid`, with the `familyNames`, secret, `joinLimit` and creator's member doc in the same batch. Delete: creator |
| `secret/password` | nobody | create: in the family's creation batch. Delete: creator |
| `meta/joinLimit` | get: signed in | create: in the creation batch (`count 0`). Update: only together with a join attempt in the same batch (see 3.1). Delete: creator |
| `joinAttempts/{uid}` | get: self | create/update: self, rate-limited (see 3.1). Delete: never |
| `members/{uid}` | members | create: creator at family creation, or a user whose committed join attempt matches the hash. Update: self, only `displayName`, `expoPushToken`, `language`. Delete: self (leave) or creator |
| `items/{id}` | members | members. Create validates fields and `addedById == uid`. Update may only touch `bought`, `boughtBy`. Delete: members |

### 3.1 Join lockout

A guess has to be committed before it can be used.

1. **Attempt (one batch).** Write `joinAttempts/{uid} = { proof: <hash guess>, count: n+1, at: request.time }`
   and bump `meta/joinLimit`. The rules only accept this batch if both limits allow it:
   - **Per account:** the first 5 attempts are free. After 5, one attempt per 15 minutes.
     After 10, one per hour.
   - **Per family:** at most 10 attempts per rolling hour window, from all accounts
     combined. The window resets when `request.time >= windowStart + 1h`.
2. **Join (second batch).** Create `members/{uid}` and update `users/{uid}`.
   The member create is allowed only if `get(joinAttempts/{uid}).proof == get(secret).hash`.
   A denied join therefore means "wrong password". It reveals nothing new, because
   that guess was already counted.

This gives at most 10 guesses per hour (240 per day) against any family, however
many accounts the attacker creates.

**Remaining risk (accepted):**
- Someone who keeps failing on purpose can block new members of one family from
  joining for an hour at a time. Using the list is not affected.
- A very common 8+ character password could still be guessed over weeks.
- Optional later hardening: Firebase App Check (needs a native module and console setup).

The app shows the limits:
- "Wrong password. 3 tries left before a 15-minute wait."
- "Too many attempts. Try again at 14:32." (time from the attempt doc or `joinLimit`)

### 3.2 Flows

- **Create:** one batch with `familyNames`, family, secret, `joinLimit`, the creator's
  member doc and `users.familyId`. If the name is taken, the batch fails on
  `familyNames` (it already exists, so the write counts as an update and is denied).
  The app checks `familyNames` first so it can show a clear message.
- **Join:** read `familyNames/{key}`, then the attempt batch, then the join batch.
- **Leave:** batch deleting own member doc and clearing `users.familyId`.
  The creator can't leave and must delete the family.
- **Delete (creator):** delete items (batches of up to 450), then other members, then
  a final batch with secret, `joinLimit`, `familyNames`, own member doc, family doc
  and `users.familyId`.
  - Join attempts are left behind. They are tiny, readable only by their owners,
    and harmless because of the random IDs.
- **Self-repair:** the session watches `users/{uid}`. When it has a `familyId`, the
  session also watches the family doc and its own member doc.
  - If either is missing or reads are denied, it clears `users.familyId`.
  - The guard then routes to family setup, with a message: "This family was deleted"
    or "You're no longer in this family".
  - Other members of a deleted family are handled this way too.

## 4. App structure

- **Routing:** expo-router routes with `Stack.Protected` guards. The hand-made
  React Navigation stack inside `_layout.tsx` and the drawer are removed.
  - `app/_layout.tsx`: fonts, providers, guarded stack
  - `app/sign-in.tsx`: Sign in / Create account tabs
  - `app/family-setup.tsx`: Join / Create tabs
  - `app/index.tsx`: shopping list
  - `app/family.tsx`: family sheet (modal). Members, language, leave or delete, sign out.
- **`lib/` (pure, unit-tested):**
  - `familyName.ts`: normalize and validate
  - `password.ts`: hash input, strength check
  - `items.ts`: split into to-buy/bought, sort, due status
  - `format.ts`: numbers, dates, units per language
  - `joinLimits.ts`: client-side copy of the lockout maths for messages
  - `errors.ts`: Firebase error code → translation key
- **`services/` (Firestore and push):**
  - `firebase.ts`: init from `EXPO_PUBLIC_FIREBASE_*` env vars; auth persistence
    through AsyncStorage; connects to emulators when `EXPO_PUBLIC_USE_EMULATORS=1`
  - `families.ts`: create, join, leave, delete
  - `items.ts`: add, toggle, delete, restore (undo), clear bought
  - `push.ts`: register, save token, send to members in their language
- **`hooks/`:** `useSession` (context), `useItems`, `useMembers`, `useFamily`, `useNow`
  (one-minute tick with proper cleanup, used for "overdue").
- **`i18n/`:** i18next + react-i18next + expo-localization. `en.json`, `ar.json`.
  - The language is saved in AsyncStorage and starts from the device language.
  - Switching between Arabic and English calls `I18nManager.forceRTL` and reloads
    once with `expo-updates` `reloadAsync`. If reload is unavailable, the app asks
    the user to reopen it.
  - Arabic uses `ar-EG` number and date formatting, so digits are Arabic-Indic.
- **`theme/`:** `tokens.ts` holds the Mashrabiya light/dark palettes, spacing, radii and
  type scale (Cairo 400/600/700/800 via `@expo-google-fonts/cairo`). `ThemeProvider`
  and `useTheme()` provide them.
  - `themes/colors.ts` and `constants/Colors.ts` are removed.
- **`components/ui/`:** `AppText`, `Button`, `TextField`, `SegmentedTabs`, `Chip`,
  `Stepper`, `Checkbox`, `AvatarStack`, `Sheet`, `Snackbar`, `PatternBand` (SVG
  mashrabiya pattern via `react-native-svg`), `Screen`.
- **`components/list/`:** `ItemRow` (swipe to delete with `ReanimatedSwipeable`),
  `AddBar`, `AddItemSheet`, `SectionHeader`.
- **Icons:** Ionicons from `@expo/vector-icons`. No emoji in the UI.

### 4.1 Mashrabiya tokens

| Token | Light | Dark |
|---|---|---|
| bg | `#F2F5F6` | `#08171B` |
| surface | `#FFFFFF` | `#0F242A` |
| field | `#E9EEF0` | `#163038` |
| text | `#0F232A` | `#E3EFF1` |
| muted | `#56676E` | `#8FA7AE` |
| line | `#DCE3E6` | `#1C363E` |
| primary | `#0B5E6B` | `#4FBFCC` |
| onPrimary | `#FFFFFF` | `#04252B` |
| accent (saffron) | `#E39B2D` | `#F0B457` |
| onAccent | `#2A1A00` | `#2A1A00` |
| dueBg / dueText | `#FBE7C4` / `#714500` | `#3F2E0E` / `#F7CB7E` |
| danger | `#C2412B` | `#FF7E66` |
| band (header) | `#0B5E6B` | `#0D3B43` |

Never use letter-spacing on Arabic text.

## 5. Bugs and cleanup

| Issue | Fix |
|---|---|
| Deleting a family leaves users stuck | Full delete plus session self-repair (3.2) |
| Interval never cleared | Removed. `useNow` hook with cleanup |
| Member list loaded once | Live `useMembers` listener |
| Leave rewrites the shared array (race) | Delete own member doc |
| `doc(db, "users", undefined)` | Session guarantees a uid before data hooks run |
| Due date defaults to "now" (instantly overdue) | Optional due date: No rush / Today / Tomorrow / Pick |
| One-tap delete with no confirmation | Swipe to delete, then Undo snackbar (restores the doc) |
| Push token without `projectId`; handler set twice; `alert()` on simulator | Fixed in `services/push.ts` |
| Self "Item added" local notification | Removed |
| Anonymous sign-in fallback | Removed (anonymous members with no name) |
| Raw Firebase error messages | Mapped to translated messages |
| `KeyboardAvoidingView` "padding" on Android | `padding` on iOS, `height` on Android |
| Auth not persisted on React Native | `initializeAuth` + `getReactNativePersistence(AsyncStorage)` |
| Unused template files | Removed: `ParallaxScrollView`, `HelloWave`, `Collapsible`, `ExternalLink`, `ThemedHeader`, `ThemedStatusBar`, `Themed*`, `IconSymbol*`, `TabBarBackground*`, `HapticTab`, `hooks/useThemeColor`, `useColorScheme*`, `constants/`, `themes/`, `scripts/reset-project.js`, unused images |
| Unused or stray packages | Removed: `@react-native-firebase/*`, `react-native-dropdown-picker`, `@react-native-picker/picker`, `moment`, `install`, `npm`. Added explicitly: `expo-crypto` |
| Stray root files `expo`, `talabat_elbeit@1.0.0` | Deleted |
| iOS `bundleIdentifier: "IOS"` | `com.mohamed0x1hussein.TalabatElBeit`. The Android package is unchanged so existing installs keep updating |
| README out of date | Rewritten: setup with `.env.local`, deploying rules, running tests |
| Gitignored config file | `services/firebase.ts` committed, reading env vars. `.env.example` added |

## 6. Testing

- **Unit (Jest, `jest-expo` preset):** `lib/*`.
- **Rules (Jest, node environment, `@firebase/rules-unit-testing`):** `tests/rules/*`.
  Run with `npm run test:rules`, which uses `firebase emulators:exec`.
- **Static:** `tsc --noEmit`, `expo lint`.
- **Visual:** Expo web build against the auth and Firestore emulators. Playwright
  screenshots of sign-in, family setup and list, in light and dark. English only on
  web: RTL is native-only.

## 7. Out of scope

Invite links, App Check, Cloud Functions, removing other members, renaming a family,
changing the family password.
