# Translation Demo Client

A minimal Nostr client built with Svelte that demonstrates the Nostr-native translation service in action.

## Features

- Connect to Nostr relays (Damus, Primal, nos.lol)
- Display events with inline translation badges
- Auto-detect source language (heuristic, no HTTP)
- Publish kind 5002 jobs to WOPR Oracle
- Receive kind 6002 results
- Cache translations (24h)
- Toggle between original and translated content

## Architecture

The Oracle operates via NIP-90 DVM protocol — no HTTP API:

```
Client                     Relays                    WOPR Oracle
  |                          |                           |
  |-- kind 5002 (translate) ->|                           |
  |                          |--- kind 5002 ----------->|
  |                          |                           | (Ollama translate)
  |                          |<-- kind 6002 ------------|
  |<-- kind 6002 (result) ---|                           |
```

## Installation

```bash
npm create vite@latest translation-demo -- --template svelte
cd translation-demo
npm install
npm install nostr-tools
```

Then copy these files:

```bash
cp ~/nostr-translate/client-ui.mjs src/lib/
cp ~/nostr-translate/TranslationBadge.svelte src/lib/
```

## Usage

```bash
npm run dev
```

Visit `http://localhost:5173` to test translation.

## Demo Events

The client includes sample events in multiple languages:

| Event | Language | Expected |
|-------|----------|----------|
| "La reunión es a las 3pm" | Spanish | "The meeting is at 3pm" |
| "Ciao a tutti!" | Italian | "Hello everyone!" |
| "¿Vas a la conferencia?" | Spanish | "Are you going to the conference?" |
| "Where is the party?" | English | (no translation needed) |

## Project Structure

```
src/
├── lib/
│   ├── client-ui.mjs             # Core Nostr-native translation logic
│   └── TranslationBadge.svelte   # UI badge component
├── App.svelte                    # Main app
└── main.js                       # Entry point
```

## Testing Flow

1. Load app → events displayed in original language
2. See language badge (e.g., `[🇪🇸]`) next to non-English events
3. Click badge → client publishes kind 5002, subscribes for kind 6002
4. Oracle translates via Ollama, posts result
5. Content updates to translated text
6. Click again → reverts to original
7. Refresh → cached translations load instantly (24h TTL)

## Requirements

- nostr-tools v2+ (`npm install nostr-tools`)
- User must provide an nsec or NIP-07 signer for signing kind 5002 jobs
- Oracle must be running and connected to the same relay set

## Notes

- Translations cached per `{eventId}:{targetLang}` key in localStorage
- Cache TTL: 24 hours
- Max content length: 500 characters (configurable)
- Result timeout: 15 seconds
- Language detection is heuristic (no HTTP call needed)
