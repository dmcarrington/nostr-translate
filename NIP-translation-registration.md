# NIP-86-like: Auto-Translate Service Registration

## Abstract

This document proposes a standard for registering and discovering Nostr translation services, similar to NIP-89 (Recommended Application Handlers). Clients can query relays for available translation services, detect the user's preferred language, and automatically translate incoming events.

Translation jobs follow the NIP-90 Data Vending Machine protocol: clients publish kind 5002 job requests to the Oracle, which responds with kind 6002 results over the same relay set.

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
    ["url", "https://github.com/dmcarrington/nostr-oracle"],
    ["language", "auto"],
    ["language", "en"],
    ["language", "es"],
    ["language", "fr"],
    ["pricing", "free"],
    ["cache", "yes"],
    ["max_chars", "500"]
  ],
  "content": "Auto-translate service for Nostr. Uses NIP-90 DVM protocol — submit kind 5002 jobs, receive kind 6002 results."
}
```

### Required tags:
- `d` — service name
- `description` — human-readable description
- `service` — must be `translate`
- `impl` — implementation name (e.g., `nostr-oracle`)

### Optional tags:
- `url` — service documentation or repo
- `language` — supported language codes (ISO 639-1)
- `pricing` — `free`, `paid`, `donation`
- `cache` — `yes` if translations are cached
- `max_chars` — maximum text length per request

## Protocol: Nostr-Native (NIP-90 DVM)

The WOPR Oracle uses the NIP-90 Data Vending Machine protocol. No HTTP API — everything over Nostr.

### Translation Job Request (kind 5002)

Published by the client to the Oracle's known relays:

```
{
  "kind": 5002,
  "content": "¿Dónde está la fiesta?",
  "tags": [
    ["i", "¿Dónde está la fiesta?", "text"],
    ["param", "lang", "en"],
    ["param", "source_lang", "es"]
  ]
}
```

Tags:
- `["i", <text>, "text"]` — text to translate
- `["param", "lang", <code>]` — target language (required)
- `["param", "source_lang", <code>]` — source language hint (optional)

### Translation Result (kind 6002)

Published by the Oracle in response, with an `e` tag referencing the job event:

```
{
  "kind": 6002,
  "content": "Where is the party?",
  "tags": [
    ["e", "<job_event_id>"],
    ["p", "<client_pubkey>"]
  ]
}
```

The content field contains the translated text. The `e` tag links back to the kind 5002 request so the client can correlate results.

### Client Discovery / Subscription

To receive results, clients subscribe to kind 6002 events matching their job ID:

```
["REQ", "translate-xyz", {
  "kinds": [6002],
  "#e": ["<job_event_id>"],
  "authors": ["<oracle_pubkey>"]
}]
```

## Client Implementation Notes

### 1. Discovery
Clients should hardcode or fetch the Oracle's pubkey and relay list. The kind 31992 event above documents the service but runtime discovery is optional.

### 2. User Language Preference
On first load, ask user: "What's your preferred language?" Store as `user_lang` setting.

### 3. Auto-Detect & Translate
- On incoming event, detect source language via heuristics
- If different from user's language, publish kind 5002
- Subscribe for kind 6002 (filtered by job event `#e` tag + Oracle pubkey)
- Cache results locally (24h TTL)

### 4. UI Indicators
Show small flag icon or language badge on untranslated content. Tap to toggle between original and translated.

## Security Considerations

- Oracle pubkey and relay list should be pinned/verified
- Sensitive events (kind 4 DMs) should not be auto-translated without explicit user consent
- Clients should respect `max_chars` limits to avoid overloading the service

## Example: Twitter-Style Inline Translation

```
Original: "La reunión es a las 3pm mañana"
[🇪🇸]  ← small Spanish flag badge

User taps badge → shows:
"The meeting is at 3pm tomorrow"
[🇬🇧] ← now shows UK flag indicating English
```

## Open Questions

- Should we standardize event tags for cached translations?
- Should clients cache translations locally or re-query the Oracle?
- How to handle privacy-sensitive content?
