# Nostr Translate Demo

A standalone demo Nostr client that shows the translation service in action.

## Quick Start

```bash
cd demo-vue
npm install -g serve
npm run dev
```

Or just open `index.html` in your browser (no build step needed!).

## What You'll See

The demo includes 5 sample events in different languages:

| Event | Language | Original Text |
|-------|----------|---------------|
| demo-es-001 | Spanish | "La reunión es a las 3pm..." |
| demo-it-001 | Italian | "Ciao a tutti! Questa è una demo..." |
| demo-en-001 | English | "Hello everyone! This is an English..." |
| demo-fr-001 | French | "Bonjour tout le monde! Voici une démo..." |
| demo-de-001 | German | "Guten Tag! Dies ist eine Demo..." |

## Features

- **Language selector** — Choose your preferred language from 12 options
- **Auto-detect** — Source language detected from `["language", "es"]` tag
- **Inline badge** — Small `[🇪🇸]` badge next to translated content
- **Tap to toggle** — Click badge to show/hide translation
- **Local cache** — Translations persist in `localStorage` (24h TTL)

## How It Works

1. Loads demo events from `index.html`
2. Processes each event through `processIncomingEvent()`
3. Detects source language from tags
4. Shows badge only if source != user's language
5. Caches translations for faster reloads

## Testing Flow

1. **Open in browser** → See all events
2. **Change your language** (top dropdown) → Events re-render
3. **Click Spanish badge** → Shows `[🇪🇸]` (Spanish)
4. **Click badge** → Content translates to English
5. **Click again** → Reverts to Spanish
6. **Refresh page** → Cached translations appear instantly

## The Code

The entire demo is self-contained in `index.html`:
- Vanilla JS (no framework dependencies)
- Uses the same translation logic as `client-ui.js`
- No build step required

```javascript
// Process incoming events
const events = demoEvents.map(event => processIncomingEvent(event));

// Toggle translation
badge.addEventListener('click', () => {
  uiState[event.id] = uiState[event.id] === 'original' ? 'translated' : 'original';
  localStorage.setItem('nostr_translate_uiState', JSON.stringify(uiState));
  render(); // Re-render to show translated content
});
```

## Production Integration

To integrate into a real Nostr client:

1. Replace demo events with live relay subscriptions
2. Connect to Oracle translation API: `https://nostr-oracle.example.com/api/v1/translate`
3. Store user preference in their profile (kind 0)
4. Add "show original" option for privacy-sensitive content

## License

MIT
