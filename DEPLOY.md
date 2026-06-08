# Hobo Enterprise App — Local Run + Play Store Deploy (from scratch)

Yeh guide cover karti hai: **git → GitHub**, **local run with ngrok** (app ↔ local web on :3000),
**Expo/EAS setup**, **OTA updates** (JS change = silent update, native change = Play Store build),
aur **Play Store** par publish.

Stack: Expo SDK 54, EAS Build + EAS Update, `runtimeVersion: fingerprint`.

---

## 0) Ek baar ke prerequisites

```bash
# Node 20+ already hona chahiye
npm install -g eas-cli           # EAS CLI (build/update/submit)
brew install ngrok               # ya: https://ngrok.com/download
eas --version
```

Accounts chahiye:
- **Expo account** (tumhare paas hai) — `eas login`.
- **ngrok account** (free) — `ngrok config add-authtoken <token>` (dashboard se token).
- **Google Play Console** account (one-time $25) — Play Store par publish ke liye.

---

## 1) Locally chalao (app + web + ngrok)

App ko data chahiye hobo-enterprise **web** se (jo `:3000` par chalti hai). Phone us
web tak pahunche, iske liye **ngrok** se ek public HTTPS URL banate hain.

**Teen terminals:**

```bash
# Terminal A — web backend (Next.js)
cd hobo-enterprise
npm run dev                       # http://localhost:3000  (DB local postgres chahiye)

# Terminal B — ngrok tunnel to the web
ngrok http 3000
#  -> "Forwarding https://abcd-1234.ngrok-free.app -> http://localhost:3000"
#  us https URL ko copy karo

# Terminal C — the app
cd hobo-enterprise-app
cp .env.example .env              # pehli baar
# .env me paste karo:  EXPO_PUBLIC_API_BASE_URL=https://abcd-1234.ngrok-free.app
npm install                       # pehli baar
npm start                         # Metro; phir Expo Go me QR scan karo (ya a/i)
```

> **ngrok ka URL har run par badalta hai** (free). Naya URL aaye → `.env` update karo →
> `npm start` restart (ya Metro me `r`). Fixed URL chahiye to ngrok dashboard se ek
> **reserved domain** lo: `ngrok http --domain=your-name.ngrok-free.app 3000`.

> **Bina ngrok** (same Wi-Fi): `.env` me `EXPO_PUBLIC_API_BASE_URL` blank chhod do — app
> khud `http://<laptop-LAN-ip>:3000` detect kar lega. Lekin uploaded images device par
> tabhi load honge jab URL phone se reachable ho, aur Android **release** build me HTTP
> block hota hai → isliye **ngrok (HTTPS) recommended** hai.

**Login:** seed credentials (web ke `credentials.csv` me) — e.g. `sa.taj@test.com` / `sa.taj123`.

---

## 2) Git + GitHub

```bash
cd hobo-enterprise-app
git init
git add .
git commit -m "Hobo Enterprise app: initial"

# GitHub par naya repo banao (gh CLI ho to):
gh repo create hobo-enterprise-app --private --source=. --remote=origin --push
# ya manually github.com par repo bana ke:
git remote add origin https://github.com/<you>/hobo-enterprise-app.git
git branch -M main
git push -u origin main
```

`.gitignore` already secrets ignore karta hai: `.env`, `*.keystore`,
`google-service-account.json`, `credentials.json`. **Inhe kabhi commit mat karo.**

---

## 3) EAS project link karo (ek baar)

```bash
cd hobo-enterprise-app
eas login                         # tumhara Expo account
eas init                          # project banata hai; app.json me projectId + owner + updates.url likh deta hai
eas update:configure              # expo-updates ko wire karta hai (runtimeVersion: fingerprint already set hai)
```

`eas init` ke baad `app.json` me ye aa jayega (commit kar dena):
`extra.eas.projectId`, `owner`, `updates.url`.

---

## 4) JS change vs Native change — kab kya hota hai

`runtimeVersion: { policy: "fingerprint" }` ki wajah se EAS **native code ka hash**
nikalta hai. Isse:

| Tumne kya badla | Kya karna hai | User ko kaise milega |
|---|---|---|
| **Sirf JS/TS/UI** (screens, logic, styles) | `eas update` | **Silent OTA** — agle app-open par auto-download, koi Play Store update nahi |
| **Native** (nayi native lib, SDK bump, app.json native config, permissions, icon/splash) | `eas build` + `eas submit` | **Play Store par naya version** dikhega |

Fingerprint khud decide karta hai: agar native same hai to purane installs OTA le lenge;
agar native badla to fingerprint badal jata hai → purane build ko OTA **nahi** milega →
naya build/submit zaroori.

### JS-only update bhejना (silent)
```bash
# production channel par OTA (production build isi branch ko sunta hai)
eas update --branch production --message "fix tasks list spacing"
# shortcut:  npm run update --m="fix tasks list spacing"
```
Bas. Jin users ke paas current native build hai, unhe agle open par mil jayega.

---

## 5) Pehli baar Play Store par daalna

> Pehli baar Google **manually** AAB upload + listing banwata hai. Uske baad `eas submit`
> automate kar dega.

**Step 5a — production AAB build:**
```bash
# eas.json ke production profile me apna PROD web URL daalo:
#   "env": { "EXPO_PUBLIC_API_BASE_URL": "https://api.yourdomain.com" }
#   (ye wahi domain ho jaha hobo-enterprise web deploy hai — localhost NAHI)

eas build --platform android --profile production
# pehli build par EAS poochega: "Generate a new Android Keystore?" -> YES
# (EAS tumhare liye upload keystore manage karega)
```
Build complete hone par EAS ek `.aab` link dega — download kar lo.

**Step 5b — Play Console me app banao:**
1. https://play.google.com/console → **Create app**.
2. Package name: **`com.hobostays.enterprise`** (app.json wala — baad me change nahi hota).
3. **Production / Internal testing → Create release → Upload** the `.aab`.
4. Google **Play App Signing** enroll kar dega (Google final signing key rakhta hai;
   EAS sirf upload key deta hai). Accept karo.
5. Store listing / content rating / privacy bharke release roll out karo.

> Tumhara purana "Hobo Experience" app alag listing hai (`com.hobostays.hoboexp`).
> Yeh **naya** app hai (`com.hobostays.enterprise`) — alag Play Store listing banegी.

**Step 5c — `eas submit` ke liye service account (taaki aage manual upload na karna pade):**
1. Play Console → **Setup → API access** → ek Google Cloud **service account** link karo,
   usse ek **JSON key** download karo.
2. JSON ko `hobo-enterprise-app/google-service-account.json` save karo (gitignored).
3. Service account ko Play Console me **Release manager** permission do.

---

## 6) Aage ke native updates (Play Store)

```bash
eas build --platform android --profile production      # versionCode auto-increment (eas.json: autoIncrement+remote)
eas submit --platform android --profile production --latest   # seedha Play (internal track) par bhej deta hai
# shortcut:  npm run build:prod   &&   npm run submit
```
`eas submit` Play Console me upload kar dega; phir wahan se **promote to Production**.

> Har Play Store submission ka **versionCode** pichle se bada hona chahiye — `eas.json` me
> `appVersionSource: "remote"` + `autoIncrement: true` ye apne aap kar deta hai.

---

## 7) Internal testing build (jaldi, APK)

Team ko test karwane ke liye (Play Store ke bina):
```bash
eas build --platform android --profile preview         # ek APK link deta hai
# npm run build:preview
```
preview profile ka `EXPO_PUBLIC_API_BASE_URL` (eas.json me) staging/ngrok par set kar do.

---

## 8) Push notifications (production)

Expo Go me push limited hai. **Production build** me Expo push ke liye ek baar
**FCM** wire karna hota hai:
```bash
eas credentials       # Android -> push notifications -> upload FCM key (Firebase project se)
```
App pehle se Expo push token register karti hai (`/push/devices`, kind=expo); enterprise
ka sender (`src/lib/push/send.ts`) Expo API se deliver karta hai.

---

## Command cheat-sheet

```bash
# LOCAL DEV (3 terminals)
cd hobo-enterprise && npm run dev          # web :3000
ngrok http 3000                            # public https
cd hobo-enterprise-app && npm start        # app (.env me ngrok URL)

# OTA (JS-only, silent)
eas update --branch production --message "..."

# NATIVE (Play Store)
eas build  --platform android --profile production
eas submit --platform android --profile production --latest

# Internal APK
eas build  --platform android --profile preview

# Health
npm run typecheck
```

## Rules of thumb
- **Sirf JS badla?** → `eas update` (version mat badlo).
- **Native badla** (lib add, SDK bump, app.json native, permission, icon)? → `eas build` + `eas submit`.
- **API URL:** local = ngrok (`.env`), production = real domain (`eas.json` production env). Kabhi `localhost` ko prod build me mat daalo.
- Secrets (`.env`, keystore, service-account JSON) **kabhi commit mat karo**.
