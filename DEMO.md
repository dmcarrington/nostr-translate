# Translation Demo Client

A minimal Nostr client built with Svelte that demonstrates the translation service in action.

## Features

- Connect to Nostr relays (Damus, Primal, nos.lol)
- Display events with inline translation badges
- Auto-detect source language
- Cache translations (24h)
- Toggle between original and translated content

## Installation

```bash
npm create vite@latest translation-demo -- --template svelte
cd translation-demo
npm install
npm install nostr-tools
```

Then copy these files:

```bash
# Copy UI components
cp ~/nostr-translate/client-ui.js src/lib/
cp ~/nostr-translate/TranslationBadge.svelte src/lib/

# Copy sample data
cp ~/nostr-translate/demo-events.json src/
```

## Usage

```bash
npm run dev
```

Visit `http://localhost:5173` to test translation.

## Demo Events

The client includes sample events in multiple languages:

| Event | Language | Translation |
|-------|----------|-------------|
| "La reunión es a las 3pm" | Spanish | English |
| "Ciao a tutti!" | Italian | English |
| "¿Vas a la conferencia?" | Spanish | English |
| "Where is the party?" | English | English (no change) |

## Architecture

```
src/
├── lib/
│   ├── client-ui.js          # Core translation logic
│   └── TranslationBadge.svelte # UI component
├── App.svelte                # Main app
├── main.js                   # Entry point
└── demo-events.json          # Sample events for testing
```

## Testing Flow

1. Load app → events displayed in original language
2. See language badge (e.g., `[🇪🇸]`) next to non-English events
3. Click badge → content translates to English
4. Click again → reverts to original
5. Refresh → cached translations load instantly

## Testing Multiple Languages

Add to `demo-events.json`:

```json
{
  "id": "test-ja",
  "content": "こんにちは！元気ですか？",
  "tags": [["language", "ja"]],
  "pubkey": "test",
  "created_at": 1715678400
}
```

Update `client-ui.js` config:

```javascript
const CONFIG = {
  FLAG_EMOJI: {
    // ... existing ...
    ja: '🇯🇵',  // Japanese
    ko: '🇰🇷',  // Korean
  },
  // ... rest
};
```

## Notes

- Translations are cached per `{eventId}:{targetLang}` key
- Cache TTL: 24 hours
- Max content length: 500 characters (configurable)
- Demo uses placeholder translation logic — replace with Oracle API in production
