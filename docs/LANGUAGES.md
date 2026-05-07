# Languages

ScoreMate now has a small local i18n system for common app UI.

## Supported Languages

| Code | Language |
| --- | --- |
| system | System default |
| en | English |
| es | Spanish |
| hi | Hindi |
| te | Telugu |
| ta | Tamil |
| kn | Kannada |
| ml | Malayalam |
| fr | French |
| pt | Portuguese |
| ar | Arabic |

The selected language is stored locally on the device with AsyncStorage key `scoremate_language`.

If the user keeps System default and the phone language is unsupported, ScoreMate falls back to English.

## How To Add Translation Keys

1. Add the new key to `TranslationKey` in `src/i18n/types.ts`.
2. Add the English value and all supported language values in `src/i18n/translations.ts`.
3. Use `const { t } = useI18n()` in the screen/component.
4. Render the text with `t('yourKey')`.
5. Run `npx tsc --noEmit` and `npm run lint`.

## Not Translated Yet

- User-entered player names
- User-entered match names
- Saved match data
- Game preset rules and long rule descriptions
- Some longer helper text and alert body text
- Native navigation headers may remain English until header localization is added

Game rules translation can be added later as a separate pass.

## Arabic / RTL Note

Arabic strings are included, but full RTL layout mirroring is not implemented yet. Add RTL support carefully later after testing on iPhone and Android.

## Store Release Reminder

Have native speakers review every translation before store release. Current translations are a starting point for public testing, not final localization copy.
