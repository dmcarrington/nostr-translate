# Inline Translation Service for Nostr

A Twitter-style automatic translation feature for Nostr clients.

## Quick Start

```bash
pip install langdetect

# Test translation
python3 -c "
from translation_service import translate_event
print(translate_event('Hola mundo', 'en', 'auto'))
"
```

## Project Structure

```
nostr-translate/
├── translation_service.py   # Core translation logic
├── NIP-translation-registration.md  # NIP proposal draft
└── QUICKSTART.md            # This file
```

## How It Works

1. **Auto-detect** source language using `langdetect`
2. **Translate** to user's preferred language using Ollama
3. **Cache** results (24h TTL)
4. **Display** with language badge in client UI

## Status

✅ Translation logic implemented
✅ Cache working
✅ Oracle announcement updated
⏳ Client UI component (flag badge, tap-to-toggle)

## License

MIT

## Push to GitHub

```bash
cd ~/.openclaw/workspace/nostr-translate
git remote set-url origin https://github.com/dmcarrington/nostr-translate.git
git push -u origin master
```
