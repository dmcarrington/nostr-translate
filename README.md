# Inline Translation for Nostr

**A Twitter-style automatic translation feature for Nostr clients**

---

## The Problem

Nostr is international — people from all over the world participate in English, Spanish, Chinese, Japanese, Arabic, and dozens of other languages. But when you encounter a post or poll in a language you don't understand, you're out of luck. You either:

1. Skip it entirely
2. Use an external translation tool (breaking the UX flow)
3. Ask someone to translate it for you

There's no seamless, in-client translation like Twitter/X provides.

---

## The Solution

**Auto-translation service** — a Nostr-native translation infrastructure that:

1. **Auto-detects** the source language of incoming events
2. **Translates** to the user's preferred language using Ollama AI
3. **Caches** results to avoid redundant API calls
4. **Integrates** seamlessly into any Nostr client

---

## How It Works

### 1. Service Discovery (NIP-89)

The translation service announces itself via NIP-89. Clients fetch kind 31992 events from relays and discover available translation services.

### 2. Language Detection

On receiving an event, the client (or service) auto-detects the source language using `langdetect` or similar.

### 3. Translation API

The service exposes an HTTP API:

```
POST /api/v1/translate
{
  "text": "¿Dónde está la fiesta?",
  "target_lang": "en",
  "source_lang": "auto"
}
```

Returns:

```
{
  "success": true,
  "translated_text": "Where is the party?",
  "source_lang": "es",
  "confidence": 0.92
}
```

### 4. Client UI

```
Original: "La reunión es a las 3pm mañana"
[🇪🇸]  ← small Spanish flag badge

User taps badge → shows:
"La reunión es a las 3pm tomorrow"
[🇬🇧] ← now shows UK flag indicating English
```

---

## Implementation Details

### Files Created

- `nostr-oracle/modules/translation_service.py` — main translation logic
  - Auto-detects source language
  - Caches translations (24h TTL)
  - Handles both NIP-90 job requests and inline translation
- `nostr-oracle/modules/translation.py` — existing (kind 5002 job handler)
- `nostr-oracle/announce.py` — updated NIP-89 announcement
- `nostr-translate/NIP-translation-registration.md` — NIP proposal draft

### Oracle Integration

The Oracle now exposes:

| Feature | Endpoint | Description |
|---------|----------|-------------|
| NIP-90 Job | `kind 5002` | Explicit translation request |
| Inline Auto | HTTP API | Automatic translation for client UI |
| Cache | Local file | 24h TTL cache per text+lang pair |

---

## Usage Examples

### Python API

```python
from translation_service import translate_event, process_event_for_translation

# Direct translation
result = translate_event("Hola mundo", "en", "auto")
# -> {"success": True, "translated_text": "Hello world", "source_lang": "es"}

# Process an entire event
event = {"kind": 1, "content": "¿Cómo estás?", "tags": []}
translated = process_event_for_translation(event, "en")
# -> event with ["translated_to", "en"] tag added
```

### Client Integration (Pseudocode)

```javascript
// On incoming event
if (!event.hasTag("translated_to", userLang)) {
  const result = await translateApi(event.content, userLang)
  
  if (result.success) {
    event.content = result.translated_text
    event.addTag("translated_to", userLang)
    event.addTag("language", result.source_lang)
    cache.set(event.id, result)
  }
}

// UI rendering
<div>
  {event.content}
  {!event.hasTag("translated_to", userLang) && 
    <span onClick={() => translateEvent(event)}>[🇬🇧]</span>}
</div>
```

---

## Privacy Considerations

- Translations are cached locally (no cloud storage)
- Only plain text is sent to translation API (no metadata)
- Clients should respect `max_chars` limits
- DMs (kind 4) should not be auto-translated without explicit user consent

---

## Open Questions

1. Should we standardize event tags for cached translations?
2. How to handle privacy-sensitive content?
3. Should clients cache translations locally or delegate entirely to the service?
4. Should translation be opt-in or opt-out?

---

## Next Steps

1. **Test** the Oracle translation service
2. **Create** client-side UI component (flag badge, tap-to-toggle)
3. **Deploy** service announcement to relays
4. **Document** client integration guide

---

## Demo Flow

1. User receives event: `"¿Vas a la conferencia de Bitcoin en Calgary?"`
2. Auto-detect: `es` (Spanish)
3. User's language: `en` (English)
4. Translation API call → `"Are you going to the Bitcoin conference in Calgary?"`
5. UI shows: `"Are you going to the Bitcoin conference in Calgary?" [🇬🇧]`
6. User taps badge → reverts to original: `"¿Vas a la conferencia de Bitcoin en Calgary?" [🇪🇸]`

---

**Status:** Implemented in Oracle, ready for client integration.
