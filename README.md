# ScoreMate Developer Commands

Run commands from the project folder:

```bash
cd ~/scoremate
```

If a command says project/config is missing, run `pwd` and `ls`. You should see `package.json`, `app.json`, `eas.json`, and `app/`.

## Daily Commands

| Task | Command | Notes |
| --- | --- | --- |
| Install dependencies | `npm install` | After clone/pull dependency changes |
| Start app | `npx expo start` | Local dev server |
| Test on phone | `npx expo start` | Scan QR with Expo Go |
| Refresh Expo Go | `r` | Press in Expo terminal |
| Stop server | `Ctrl + C` | Press in terminal |
| Lint after changes | `npm run lint` | Skip only if script is missing |

## Git

| Task | Command |
| --- | --- |
| Check changes | `git status` |
| Save changes | `git add .` |
| Commit | `git commit -m "describe change"` |
| Push | `git push` |
| Pull then push if remote has work | `git pull origin main --allow-unrelated-histories` then `git push -u origin main` |
| Replace remote with local code | `git push -u origin main --force` |

Use force only when sure. If GitHub asks for a password, use a GitHub Personal Access Token, not your account password.

## Expo / EAS

| Task | Command | Notes |
| --- | --- | --- |
| Login to EAS | `npx eas-cli login` | Use this, not `npx eas login` |
| Configure EAS | `npx eas-cli build:configure` | First time or after config reset |
| Android test APK | `npx eas-cli build --platform android --profile preview` | Download APK from Expo build page |
| Android Play Store AAB | `npx eas-cli build --platform android --profile production` | For Google Play upload |
| iPhone local test | `npx expo start` | Scan QR with Expo Go |
| iOS build | `npx eas-cli build --platform ios --profile preview` | Needs Apple setup |

APK = Android install file. AAB = Google Play upload file. IPA = iPhone app file. iPhone cannot install APK; official iPhone testing uses TestFlight.

## Common Fixes

| Problem | Fix |
| --- | --- |
| QR code does not open app | Try `npx expo start --tunnel` |
| Tunnel/ngrok install fails | Use `npx expo start`; keep Mac and phone on same Wi-Fi, VPN off |
| `npm install -g eas-cli` gives `EACCES` | Use local CLI: `npm install --save-dev eas-cli` then `npx eas-cli login` |
| `npx eas login` fails | Use `npx eas-cli login` |
| GitHub rejects password | Use GitHub username + Personal Access Token |
| Git push rejected | Pull first: `git pull origin main --allow-unrelated-histories` |
| AsyncStorage Android EAS error | Run `npx expo install @react-native-async-storage/async-storage`, then `npm install`, then rebuild |

AsyncStorage error example:

```text
Could not find org.asyncstorage.shared_storage:storage-android:1.0.0
```

## After Code Changes

```bash
npm run lint
npx expo start
git add .
git commit -m "describe change"
git push
```

## Docs

| Topic | File |
| --- | --- |
| App context | `docs/APP_CONTEXT.md` |
| Least Count rules | `docs/LEAST_COUNT_RULES.md` |

Keep README command-focused. Put app explanation in docs files only.
