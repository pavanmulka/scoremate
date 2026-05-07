# Monetization Plan

## Free

- Create matches
- Basic scoring
- Limited match history: 5 saved matches

## Pro One-Time Unlock

- Unlimited match history
- Custom scoring rules
- Game presets
- Share/export scoreboard
- Themes
- Player stats
- Backup/export

## Implemented Pro-Style Tools

- Player stats from local match history
- Backup/export with local JSON
- Share scoreboard through phone share sheet
- Local themes
- Game presets for common scoring styles

## Current Public Testing Approach

- No visible Pro, payment, unlock, or testing controls in normal UI.
- Existing Pro-style feature code can stay in place for future planning.
- Public testing should focus on offline scoring, recent matches, themes, stats, backup/restore, and share/export.
- Do not add real purchase UI until store billing is ready.

## Real Purchase Later

- Use Apple/Google in-app purchases for real paid unlocks.
- Expo Go cannot test native in-app purchase libraries.
- Use an EAS development build plus Apple sandbox or Google Play internal testing.
