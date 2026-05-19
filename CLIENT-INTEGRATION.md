# Client UI Components for Nostr Translation

This directory contains UI components for integrating the Nostr-native translation service into Nostr clients.

## Architecture

Translation uses the **WOPR Oracle** via the NIP-90 Data Vending Machine protocol:

1. Client detects source language (heuristic, no HTTP call)
2. Client publishes **kind 5002** job to Oracle's relays
3. Oracle translates via Ollama and publishes **kind 6002** result
4. Client picks up result, caches locally (24h TTL)

No HTTP API. Everything over Nostr.

## Components

| File | Framework | Description |
|------|-----------|-------------|
| `client-ui.mjs` | ESM | Core Nostr-native translation logic + badge rendering |
| `client-ui.js` | Vanilla JS / UMD | Same logic, script-tag / CommonJS compatible |
| `TranslationBadge.svelte` | Svelte | Svelte component with click handlers |
| `TranslationBadge.vue` | Vue.js | Vue component with reactivity |
| `translation-badge.jsx` | React | React component with hooks |

## Quick Start (ESM)

```javascript
import { finalizeEvent, SimplePool } from 'nostr-tools';
import { initTranslationService, processIncomingEvent, setUserLanguage } from './client-ui.mjs';

// Initialize with user's nsec (Uint8Array) or NIP-07 signer
initTranslationService({
  signer: myNsec,           // Uint8Array or { sign(template) } for NIP-07
  userPubkey: myHexPubkey,  // optional, for logging
});

setUserLanguage('en');

// Process each incoming event
const translatedEvent = await processIncomingEvent(incomingEvent);
// translatedEvent.content is now in user's language
```

## Quick Start (Vanilla JS / UMD)

```html
<script type="module">
  import { finalizeEvent, SimplePool } from 'https://esm.sh/nostr-tools';
  
  window.NostrTranslate.setNostrTools({ finalizeEvent, SimplePool });
  window.NostrTranslate.initTranslationService({
    signer: myNsec,
    userPubkey: myHexPubkey,
  });
  window.NostrTranslate.setUserLanguage('en');
  
  // translate events:
  const translated = await window.NostrTranslate.processIncomingEvent(event);
</script>
```

## React Example

```jsx
import { TranslationBadge } from './translation-badge.jsx';
import { processIncomingEvent, initTranslationService } from './client-ui.mjs';
import { finalizeEvent, SimplePool } from 'nostr-tools';

function NostrApp() {
  const [uiState, setUiState] = useState({});
  const [userLang, setUserLang] = useState('en');

  useEffect(() => {
    initTranslationService({ signer: myNsec });
  }, []);

  async function handleEvent(event) {
    const translated = await processIncomingEvent(event);
    setEvents(prev => [...prev, translated]);
  }

  function toggleTranslation(eventId) {
    setUiState(prev => ({
      ...prev,
      [eventId]: prev[eventId] === 'original' ? 'translated' : 'original',
    }));
  }

  return events.map(event => (
    <div key={event.id} data-event-id={event.id}>
      <p>{event.content}</p>
      {event.tags?.find(t => t[0] === 'language')?.[1] !== userLang && (
        <TranslationBadge
          eventId={event.id}
          sourceLang={event.tags?.find(t => t[0] === 'language')?.[1] || 'en'}
          targetLang={userLang}
          isTranslated={uiState[event.id] === 'translated'}
          onToggle={toggleTranslation}
        />
      )}
    </div>
  ));
}
```

## Svelte Example

```svelte
<script>
  import { TranslationBadge } from './TranslationBadge.svelte';
  import { processIncomingEvent, initTranslationService, setUserLanguage } from './client-ui.mjs';
  import { finalizeEvent, SimplePool } from 'nostr-tools';

  let events = [];
  let userLang = 'en';
  let uiState = {};

  initTranslationService({ signer: myNsec });
  setUserLanguage(userLang);

  async function loadEvents() {
    const eventsFromRelay = await fetchEvents();
    const translated = await Promise.all(eventsFromRelay.map(processIncomingEvent));
    events = translated;
  }

  function toggleTranslation(event) {
    const eventId = event.detail.eventId;
    uiState[eventId] = uiState[eventId] === 'original' ? 'translated' : 'original';
  }
</script>

{#each events as event (event.id)}
  <div data-event-id={event.id}>
    <p>{event.content}</p>
    {#if event.tags?.find(t => t[0] === 'language')?.[1] !== userLang}
      <TranslationBadge
        eventId={event.id}
        sourceLang={event.tags?.find(t => t[0] === 'language')?.[1] || 'en'}
        targetLang={userLang}
        isTranslated={uiState[event.id] === 'translated'}
        on:toggle={toggleTranslation}
      />
    {/if}
  </div>
{/each}
```

## Vue Example

```vue
<template>
  <div v-for="event in events" :key="event.id" :data-event-id="event.id">
    <p>{{ event.content }}</p>
    <TranslationBadge
      v-if="getSourceLang(event) !== userLang"
      :event-id="event.id"
      :source-lang="getSourceLang(event)"
      :target-lang="userLang"
      :is-translated="uiState[event.id] === 'translated'"
      @toggle="toggleTranslation(event.id)"
    />
  </div>
</template>

<script>
import { TranslationBadge } from './TranslationBadge.vue';
import { processIncomingEvent, initTranslationService, setUserLanguage } from './client-ui.mjs';
import { finalizeEvent, SimplePool } from 'nostr-tools';

export default {
  components: { TranslationBadge },
  data() {
    return { events: [], userLang: 'en', uiState: {} };
  },
  async mounted() {
    initTranslationService({ signer: myNsec });
    setUserLanguage(this.userLang);
    const eventsFromRelay = await fetchEvents();
    const translated = await Promise.all(eventsFromRelay.map(processIncomingEvent));
    this.events = translated;
  },
  methods: {
    getSourceLang(event) {
      return event.tags?.find(t => t[0] === 'language')?.[1] || 'en';
    },
    toggleTranslation(eventId) {
      this.uiState[eventId] = this.uiState[eventId] === 'original'
        ? 'translated'
        : 'original';
    },
  },
};
</script>
```

## API Reference

### `initTranslationService(opts)`

Initialize the service. Must be called before translation.

```javascript
initTranslationService({
  signer: myNsec,           // required — Uint8Array or NIP-07 { sign() }
  userPubkey: myHexPubkey,  // optional
  relays: [...],            // optional, defaults to Oracle relay set
});
```

### `processIncomingEvent(event)`

Processes an incoming Nostr event:
- Auto-detects source language (heuristic, no HTTP call)
- If different from user's language, publishes kind 5002 and waits for kind 6002
- Caches result locally
- Adds metadata tags: `['language', sourceLang]`, `['translation_service', 'nostr-oracle']`
- Returns modified event (with translated content)

### `setUserLanguage(lang)`

Sets the user's preferred language. Accepts ISO 639-1 codes:
`'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'`

### `detectLanguage(text)`

Auto-detects language via heuristic character set matching. No network call.

### `translateEvent(eventId, text, targetLang, sourceLang)`

Publishes kind 5002 job and returns translated text (or null on failure).

### `renderTranslationBadge(eventId, content, sourceLang, targetLang)`

Creates a DOM badge element for displaying language and toggling translation.

### `destroy()`

Cleans up relay connections. Call on app teardown.

## Configuration

The Oracle pubkey and relay list are in `CONFIG` within each client file:

```javascript
const CONFIG = {
  ORACLE_PUBKEY: '7e3d8c8f...',     // WOPR Oracle hex pubkey
  ORACLE_RELAYS: [...],             // Relays the Oracle listens on
  RESULT_TIMEOUT: 15_000,           // Timeout waiting for kind 6002 (ms)
  CACHE_TTL: 24 * 60 * 60 * 1000,   // 24 hours
  MAX_CHARS: 500,                   // Don't translate longer content
};
```

## Caching

Translations are cached in `localStorage` under `nostr_translate_cache`:
- Key format: `{eventId}:{targetLang}`
- TTL: 24 hours

To clear: `localStorage.removeItem('nostr_translate_cache')`

## Status

✅ Nostr-native translation (kind 5002 → kind 6002)
✅ Vanilla JS client (UMD + ESM)
✅ React component
✅ Svelte component
✅ Vue component
✅ Local caching
✅ Heuristic language detection (no HTTP)
