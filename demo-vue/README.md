# Nostr Translate Demo

A standalone Nostr client that demonstrates inline translation.

## Deploy to Vercel

```bash
cd demo-vue
vercel
```

Or connect your GitHub repo to Vercel and deploy automatically.

## Quick Start (Local)

```bash
npm install
npm run dev
```

## Features

- Auto-translation for incoming Nostr events
- Language selector (12 languages)
- Inline badges with tap-to-toggle
- Local cache (24h TTL)

## Demo Events

| Event | Language | Text |
|-------|----------|------|
| demo-es-001 | Spanish | "La reunión es a las 3pm..." |
| demo-it-001 | Italian | "Ciao a tutti! Questa è una demo..." |
| demo-en-001 | English | "Hello everyone! This is an English..." |
| demo-fr-001 | French | "Bonjour tout le monde!" |
| demo-de-001 | German | "Guten Tag! Dies ist eine Demo..." |

## Testing

1. Open in browser → See all events
2. Change language dropdown → Events re-render
3. Click badge → Shows original language flag (e.g., `[🇪🇸]`)
4. Click again → Content translates to your language
5. Refresh → Cached translations load instantly

## Production Integration

To use with real Nostr events:

1. Replace demo events with relay subscriptions
2. Connect to Oracle translation API
3. Store user preference in their profile (kind 0)

## License

MIT
