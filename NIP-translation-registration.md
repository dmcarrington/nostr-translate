# NIP-86-like: Auto-Translate Service Registration

## Abstract

This document proposes a standard for registering and discovering Nostr translation services, similar to NIP-89 (Recommended Application Handlers). Clients can query relays for available translation services, detect the user's preferred language, and automatically translate incoming events.

## Service Metadata Event (kind 31992)

```
{
  "kind": 31992,
  "created_at": 1715678400,
  "tags": [
    ["d", "Nostr Translate Service"],
    ["description", "Automatic translation of Nostr events to user's local language"],
    ["service", "translate"],
    ["impl", "nostr-oracle"],
    ["url", "https://nostr-oracle.example.com/translate"],
    ["api", "https://nostr-oracle.example.com/api/v1/translate"],
    ["language", "auto"],
    ["language", "en"],
    ["language", "es"],
    ["language", "fr"],
    ["pricing", "free"],
    ["cache", "yes"],
    ["max_chars", "500"]
  ],
  "content": "Auto-translate service for Nostr. Uses NLP to detect source language and translate to user's preferred language."
}
```

### Required tags:
- `d` — service name
- `description` — human-readable description
- `service` — must be `translate`
- `impl` — implementation name (e.g., `nostr-oracle`)
- `api` — HTTP API endpoint for translation requests

### Optional tags:
- `url` — service web page
- `language` — supported language codes (ISO 639-1)
- `pricing` — `free`, `paid`, `donation`
- `cache` — `yes` if translations are cached
- `max_chars` — maximum text length per request

### Optional metadata tags (from NIP-01):
- `pubkey` — service admin pubkey
- `contact` — contact address

## Client Discovery Flow

1. Client fetches kind 31992 events from relays
2. Filters by `service` = `translate` and supported languages
3. Stores service endpoints for use when translating events

## Translation API Request

```
POST /api/v1/translate
Content-Type: application/json

{
  "text": "¿Dónde está la fiesta?",
  "target_lang": "en",
  "source_lang": "auto",  // or explicit language code
  "event_id": "abc123...",  // for caching
  "pubkey": "pubkey_of_original_event"
}
```

## Translation API Response

```
{
  "success": true,
  "translated_text": "Where is the party?",
  "source_lang": "es",
  "confidence": 0.92,
  "cached": false
}
```

## Client Implementation Notes

### 1. Store Translation Services
When a client sees a kind 31992, store the `api` endpoint and supported languages.

### 2. Request User's Language
On first load, ask user: "What's your preferred language?" Store as `user_lang` setting.

### 3. Auto-Detect & Translate
- On incoming event, check if `translated_to_<lang>` tag exists
- If not, check service supports target language
- Call translation API
- Display translated version in UI
- Cache result for future use

### 4. UI Indicators
Show small flag icon or "en" badge on untranslated content. Tap to toggle between original and translated.

## Security Considerations

- Translation API must support CORS for browser clients
- Sensitive events (kind 4 DMs) should not be auto-translated without explicit user consent
- Clients should respect `max_chars` limits to avoid overloading services

## Example: Twitter-Style Inline Translation

```
Original: "La reunión es a las 3pm mañana"
[🇪🇸]  ← small Spanish flag badge

User taps badge → shows:
"La reunión es a las 3pm tomorrow"
[🇬🇧] ← now shows UK flag indicating English
```

## Open Questions

- Should we standardize event tags for cached translations?
- Should clients cache translations locally or delegate entirely to the service?
- How to handle privacy-sensitive content?
