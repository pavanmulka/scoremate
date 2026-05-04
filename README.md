# ScoreMate Developer Commands

## Always run commands from project folder

Project folder example:

```bash
cd ~/scoremate
```

If command fails with missing project/config, first check:

```bash
pwd
ls
```

You should see files like:

```text
package.json
app.json
eas.json
app/
```

## Install dependencies

```bash
npm install
```

Use this after cloning repo or after pulling new dependency changes.

## Start app locally

```bash
npx expo start
```

Expo = local development server for testing app before publishing.

## Test on phone with Expo Go

Expo Go = phone app used to preview the app during development.

1. Install Expo Go on phone
2. Run from project folder:

```bash
npx expo start
```

3. Scan QR code

If phone does not update, press:

```bash
r
```

To stop server:

```bash
Ctrl + C
```

## If QR code does not open app

Try tunnel:

```bash
npx expo start --tunnel
```

If tunnel asks to install ngrok and global install fails, skip tunnel and use normal local Wi-Fi:

```bash
npx expo start
```

Make sure:

- Mac and phone are on same Wi-Fi
- VPN is off
- Expo Go is installed

## Git save and push

```bash
git status
git add .
git commit -m "your message"
git push
```

If push asks for GitHub password, use GitHub token, not account password.

## If GitHub push says password authentication is not supported

GitHub does not accept normal password in terminal.

Use:

```text
Username: GitHub username
Password: GitHub Personal Access Token
```

Then push again:

```bash
git push
```

## If Git push is rejected because remote has work

Try:

```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

If GitHub repo has nothing important and you intentionally want local code to replace remote:

```bash
git push -u origin main --force
```

Use force only when sure.

## Login to EAS

EAS = Expo cloud build service. It creates APK/AAB/IPA files.

Use local EAS CLI from project:

```bash
npx eas-cli login
```

## If npx eas login fails

Use this instead:

```bash
npx eas-cli login
```

Do not use:

```bash
npx eas login
```

## If global npm install gives EACCES permission error on Mac

Example failing command:

```bash
npm install -g eas-cli
```

Error may say:

```text
EACCES: permission denied, mkdir '/usr/local/lib/node_modules/...'
```

Use local install instead:

```bash
npm install --save-dev eas-cli
npx eas-cli login
```

Same idea for Expo CLI.

Prefer using:

```bash
npx expo start
```

instead of installing Expo globally.

## Configure EAS build

Only needed first time or after config reset:

```bash
npx eas-cli build:configure
```

Choose Android first if asked.

## Build Android test APK

APK = Android install file for testing/share with Android users.

```bash
npx eas-cli build --platform android --profile preview
```

After build finishes, download APK from Expo build page and share it.

## Build Android Play Store AAB

AAB = Android App Bundle for Google Play Store upload.

```bash
npx eas-cli build --platform android --profile production
```

## If Android EAS build fails because AsyncStorage cannot resolve

Example error:

```text
Could not find org.asyncstorage.shared_storage:storage-android:1.0.0
```

Fix by installing Expo-compatible AsyncStorage:

```bash
npx expo install @react-native-async-storage/async-storage
npm install
```

Then rebuild:

```bash
npx eas-cli build --platform android --profile preview
```

## iPhone / iOS testing

iPhone cannot install APK.

Quick local iPhone test:

```bash
npx expo start
```

Then scan QR code with Expo Go.

Official iPhone testing uses TestFlight.

IPA = iPhone app build file.

Apple Developer account is needed for TestFlight/App Store.

## Build iOS file

Only after Apple setup is ready:

```bash
npx eas-cli build --platform ios --profile preview
```

## After Codex or manual code changes

Run:

```bash
npm run lint
```

If lint script does not exist, skip.

Then test:

```bash
npx expo start
```

Then save:

```bash
git add .
git commit -m "describe change"
git push
```

## Helpful docs

App context: docs/APP_CONTEXT.md

Least Count rules: docs/LEAST_COUNT_RULES.md

Important:

- Keep README short and command-focused.
- Put app explanation in docs files only.
