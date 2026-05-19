# Quick Start — Nostr Translation Client

Drop-in auto-translation for Nostr client apps.

## Install

```bash
npm install nostr-tools
```

## Usage (ESM)

```javascript
import { finalizeEvent, SimplePool } from 'nostr-tools';
import { initTranslationService, processIncomingEvent, setUserLanguage } from './client-ui.mjs';

initTranslationService({ signer: myNsec });
setUserLanguage('en');

// Wrap each incoming event:
const translated = await processIncomingEvent(event);
// event.content is now in user's language (or original if same language)
```

## Usage (script tag / UMD)

```html
<script src="client-ui.js"></script>
<script type="module">
  import { finalizeEvent, SimplePool } from 'https://esm.sh/nostr-tools';
  NostrTranslate.setNostrTools({ finalizeEvent, SimplePool });
  NostrTranslate.initTranslationService({ signer: myNsec });
</script>
```

## How It Works

1. **Detect** source language via heuristic character-set matching (no HTTP)
2. **Publish** kind 5002 NIP-90 translation job to Oracle's relays
3. **Oracle** translates via Ollama, posts kind 6002 result
4. **Cache** result locally (24h TTL in localStorage)
5. **Display** with language badge in client UI

## Requirements

- `nostr-tools` v2+ (SimplePool, finalizeEvent)
- User nsec or NIP-07 signer (for signing kind 5002 jobs)
- Any NIP-90 DVM that handles kind 5002 translation jobs (e.g. [WOPR Oracle](https://github.com/dmcarrington/nostr-oracle))
- Configure the Oracle's pubkey and relay list in `CONFIG` at the top of the client file

## Quick Test

```javascript
import { detectLanguage } from './client-ui.mjs';
console.log(detectLanguage('Hola mundo'));   // → 'es'
console.log(detectLanguage('Bonjour tout')); // → 'fr'
console.log(detectLanguage('Hello world'));  // → 'en'
```

## License

MIT
