# Inline Translation Service for Nostr

A Twitter-style automatic translation feature for Nostr clients, using the WOPR Oracle DVM via NIP-90 (kind 5002 → kind 6002).

## Quick Start

```bash
npm install nostr-tools
```

```javascript
import { finalizeEvent, SimplePool } from 'nostr-tools';
import { initTranslationService, processIncomingEvent, setUserLanguage } from './client-ui.mjs';

// Initialize with your nsec
initTranslationService({ signer: myNsec });
setUserLanguage('en');

// Process events
const translated = await processIncomingEvent(event);
```

## How It Works

1. **Detect** source language via heuristic character-set matching (no HTTP)
2. **Publish** kind 5002 NIP-90 translation job to Oracle's relays
3. **Oracle** translates via Ollama, posts kind 6002 result
4. **Cache** result locally (24h TTL)
5. **Display** with language badge in client UI

## Project Structure

```
nostr-translate/
├── client-ui.mjs                       # ESM: Nostr-native translation client
├── client-ui.js                        # UMD: same logic, script-tag compatible
├── translation-badge.jsx               # React badge component
├── TranslationBadge.svelte             # Svelte badge component
├── TranslationBadge.vue                # Vue badge component
├── CLIENT-INTEGRATION.md               # Integration guide with examples
├── DEMO.md                             # Demo client setup
├── NIP-translation-registration.md     # NIP proposal
├── QUICKSTART.md                       # Quick start guide
└── README.md                           # This file
```

## Protocol

NIP-90 DVM — no HTTP API:

- **Request:** kind 5002 with `["i", <text>, "text"]` and `["param", "lang", <code>]` tags
- **Response:** kind 6002 with translated text in `.content`, linked via `["e", <job_id>]`

## Dependencies

- `nostr-tools` v2+ (SimplePool, finalizeEvent)
- WOPR Oracle running with kind 5002 handler (https://github.com/dmcarrington/nostr-oracle)

## Status

✅ Nostr-native translation protocol (kind 5002 → 6002)
✅ Vanilla JS + ESM clients (client-ui.js / client-ui.mjs)
✅ React / Svelte / Vue badge components
✅ Local caching (24h TTL)
✅ Heuristic language detection (no HTTP call needed)
✅ UMD client uses setNostrTools() injection — no build step required

## License

MIT
