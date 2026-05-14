# Client UI Components for Nostr Translation

This directory contains UI components for integrating the translation service into Nostr clients.

## Components

| File | Framework | Description |
|------|-----------|-------------|
| `client-ui.js` | Vanilla JS | Core translation logic and badge rendering |
| `client-ui.mjs` | ESM | ES Module version of `client-ui.js` |
| `TranslationBadge.svelte` | Svelte | Svelte component with click handlers |
| `TranslationBadge.vue` | Vue.js | Vue component with reactivity |
| `translation-badge.jsx` | React | React component with hooks |

## Quick Start (Vanilla JS)

```javascript
import { initTranslationService, processIncomingEvent, setUserLanguage } from './client-ui.js';

// Initialize on app startup
initTranslationService();

// Set user's preferred language
setUserLanguage('en'); // or 'es', 'fr', etc.

// Process each incoming event
const translatedEvent = await processIncomingEvent(incomingEvent);
// translatedEvent.content is now in user's language
```

## React Example

```jsx
import { TranslationBadge } from './translation-badge.jsx';
import { processIncomingEvent, initTranslationService } from './client-ui.mjs';

function NostrApp() {
  const [uiState, setUiState] = useState({});
  const [userLang, setUserLang] = useState('en');
  
  useEffect(() => {
    initTranslationService();
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
  import { processIncomingEvent, initTranslationService, setUserLanguage } from './client-ui.js';
  
  let events = [];
  let userLang = 'en';
  let uiState = {};
  
  initTranslationService();
  setUserLanguage(userLang);
  
  async function loadEvents() {
    const eventsFromRelay = await fetchEvents();
    const translated = await Promise.all(eventsFromRelay.map(processIncomingEvent));
    events = translated;
  }
  
  function toggleTranslation(eventId) {
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
        on:toggle={() => toggleTranslation(event.id)}
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
import { processIncomingEvent, initTranslationService, setUserLanguage } from './client-ui.js';

export default {
  components: { TranslationBadge },
  data() {
    return {
      events: [],
      userLang: 'en',
      uiState: {},
    };
  },
  async mounted() {
    initTranslationService();
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

## Styling Notes

All components use the same CSS class: `nostr-translate-badge`

### Dark Mode Support

The badge automatically adjusts for dark mode:
- Light mode: `rgba(0, 122, 255, 0.1)` background
- Dark mode: `rgba(0, 122, 255, 0.2)` background

You can override in your app's global CSS:

```css
.nostr-translate-badge {
  /* Your custom styles here */
}
```

## API Reference

### `processIncomingEvent(event)`

Processes an incoming Nostr event:
- Auto-detects source language
- Translates to user's language if different
- Adds metadata tags: `['language', sourceLang]`, `['translation_service', 'nostr-oracle']`
- Returns modified event

### `setUserLanguage(lang)`

Sets the user's preferred language. Accepts ISO 639-1 codes:
`'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'`

### `detectLanguage(text)`

Auto-detects the language of the given text. Uses simple heuristics (can be replaced with API call).

### `translateEvent(eventId, text, targetLang, sourceLang)`

Calls the translation API and caches the result. Returns the translated text.

### `renderTranslationBadge(eventId, content, sourceLang, targetLang)`

Renders a translation badge element. Returns a DOM node.

## Caching

Translations are cached in `localStorage` under the key `nostr_translate_cache`:
- Key format: `{eventId}:{targetLang}`
- TTL: 24 hours

To clear the cache:
```javascript
localStorage.removeItem('nostr_translate_cache');
```

## Configuration

Edit `CONFIG` in `client-ui.js`:

```javascript
const CONFIG = {
  TRANSLATION_API: 'https://nostr-oracle.example.com/api/v1/translate',
  CACHE_TTL: 24 * 60 * 60 * 1000,
  MAX_CHARS: 500, // Don't translate if content exceeds this
  FLAG_EMOJI: { /* ... */ },
};
```

## Status

✅ Vanilla JS client
✅ React component
✅ Svelte component
✅ Vue component
⏳ Integration with specific Nostr clients (Damus, Amethyst, etc.)

## License

MIT
