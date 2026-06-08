# Hobo Enterprise — Staff App (React Native / Expo)

Native staff & operations app for **hobo-enterprise**. It talks to the same
REST API as the web app, using **bearer-token auth** (`POST /api/auth/login`
returns a `token`; every call sends `Authorization: Bearer <token>`).

No Firebase — the backend is hobo-enterprise's Next.js API + Postgres.

## Stack
- Expo SDK 54, React Native 0.81, React 19, TypeScript (strict)
- React Navigation 7 (native-stack + bottom-tabs)
- Zustand (auth store), AsyncStorage (token persistence)
- expo-notifications (Expo push → registered as a `PushDevice` of kind `expo`)

## What's in this first cut
- **Login** → `POST /api/auth/login` → token stored, `GET /api/me/hotels` loads hotels.
- **Dashboard** — active hotel + ticket counts (New / In Progress / Escalated).
- **Tasks** — service tickets from `GET /hotels/:id/whatsapp/tickets`, with the
  field-workflow actions (Accept → On the way → Reached → Mark done) and manager
  Approve/Reject, via `POST …/tickets/:id/action`.
- **Profile** — on-shift presence toggle (`/presence`), hotel switcher, sign out.
- **Push** — registers the Expo push token against the active hotel.

## Run it
```bash
cd hobo-enterprise-app
npm install
npm start            # then press a / i, or scan the QR in Expo Go
```

### Point it at your API
By default the app auto-derives the API host from the Metro dev server and uses
**port 3000** (where `next dev` runs). So if your phone and laptop are on the
same Wi-Fi, just run `next dev` in `hobo-enterprise` and it works.

Override for staging/prod in `app.json`:
```json
"extra": { "apiBaseUrl": "https://your-pms-domain.com" }
```
or set `EXPO_PUBLIC_API_BASE_URL` in the environment. Do **not** add a trailing
slash or `/api` — the client appends `/api` itself.

### Backend env needed for push delivery
On the hobo-enterprise server, Expo push works out of the box (the sender calls
the Expo push API). No extra keys required for `kind: "expo"` devices.

## Project layout
```
src/
  config.ts             API base URL resolution
  api/                  client (bearer) + auth, hotels, tickets, presence
  store/useAuthStore.ts Zustand auth/session store
  services/             session storage, push registration
  navigation/           RootNavigator + bottom tabs
  screens/              Login, Dashboard, Tasks, Profile
  theme.ts              colors + status/priority maps
```

## Next up (roadmap)
- Ticket detail screen (timeline, photos, reassign/transfer).
- Staff Chat (`/chat/threads`, `/chat/messages`) + live SSE (`/hotels/:id/realtime?token=`).
- Notifications/Alerts tab (`/hotels/:id/whatsapp/notifications`).
- Create-task / housekeeping screens, role-based tabs (attendant 3-tab vs manager 6-tab).
