/**
 * Nostr-Native Translation Client
 *
 * Translates Nostr events via the WOPR Oracle DVM (NIP-90).
 * Publishes kind 5002 job requests, subscribes for kind 6002 results.
 *
 * Requirements: nostr-tools v2+
 *   npm install nostr-tools
 *
 * Usage:
 *   import { initTranslationService, processIncomingEvent, setUserLanguage } from './client-ui.mjs';
 *   initTranslationService({ relays: ['wss://relay.damus.io'], userPubkey: '...' });
 *   const translated = await processIncomingEvent(event);
 */

import { finalizeEvent, getPublicKey } from 'nostr-tools';
import { SimplePool } from 'nostr-tools/pool';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  /** WOPR Oracle hex pubkey (posts kind 6002 results) */
  ORACLE_PUBKEY: '7e3d8c8f9a5b1c2d4e6f8a0b2c4d6e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',

  /** Relays the Oracle listens on — must match oracle.py RELAYS */
  ORACLE_RELAYS: [
    'wss://relay.damus.io',
    'wss://relay.nostr.net',
    'wss://nos.lol',
    'wss://relay.primal.net',
  ],

  /** How long to wait for a translation result (ms) */
  RESULT_TIMEOUT: 15_000,

  /** Local cache TTL (ms) */
  CACHE_TTL: 24 * 60 * 60 * 1000,

  /** Don't translate content longer than this */
  MAX_CHARS: 500,

  SUPPORTED_LANGS: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'],

  FLAG_EMOJI: {
    'en': '🇬🇧', 'es': '🇪🇸', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹',
    'pt': '🇵🇹', 'ru': '🇷🇺', 'zh': '🇨🇳', 'ja': '🇯🇵', 'ko': '🇰🇷',
    'ar': '🇸🇦', 'hi': '🇮🇳',
  },

  LANG_NAMES: {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
    'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════════════════

const state = {
  /** nostr-tools SimplePool instance, created on init */
  pool: null,

  /** User's hex pubkey (required for NIP-90 job signing) */
  userPubkey: null,

  /** User's nsec or signer function (required for signing kind 5002) */
  signer: null,

  /** Connected relay URLs */
  relays: [],

  /** User's preferred target language */
  userLang: localStorage.getItem('nostr_translate_userLang') || 'en',

  /** Translation cache: { "eventId:lang" -> { text, timestamp } } */
  cached: JSON.parse(localStorage.getItem('nostr_translate_cache') || '{}'),

  /** UI toggle state: event_id -> 'original' | 'translated' */
  uiState: JSON.parse(localStorage.getItem('nostr_translate_uiState') || '{}'),

  /** In-flight translations: jobId -> { resolve, reject, timer } */
  pending: {},
};

// ═══════════════════════════════════════════════════════════════════════════════
// Language Detection (heuristic, no HTTP dependency)
// ═══════════════════════════════════════════════════════════════════════════════

function detectLanguage(text) {
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';    // CJK Unified
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'; // Hiragana + Katakana
  if (/[\uac00-\ud7af]/.test(text)) return 'ko';    // Hangul
  if (/[\u0600-\u06ff]/.test(text)) return 'ar';    // Arabic
  if (/[\u0900-\u097f]/.test(text)) return 'hi';    // Devanagari
  if (/[äöüß]/.test(text)) return 'de';
  if (/[çéèêëàâäôöùûüîï]/.test(text)) return 'fr';
  if (/[áéíóúüñ¡¿]/.test(text)) return 'es';
  if (/[àèéìíòóùú]/.test(text)) return 'it';
  if (/[áéíóúâêôãõç]/.test(text)) return 'pt';
  if (/[\u0400-\u04ff]/.test(text)) return 'ru';    // Cyrillic
  return 'en';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Nostr-Native Translation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Translate text by publishing a kind 5002 job to the WOPR Oracle
 * and waiting for a kind 6002 result.
 */
async function translateEvent(eventId, text, targetLang, sourceLang) {
  // 1. Check local cache
  const cacheKey = `${eventId}:${targetLang}`;
  const cached = state.cached[cacheKey];
  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
    return cached.text;
  }

  // 2. Need a signer and pool to proceed
  if (!state.signer || !state.pool) {
    console.warn('[Nostr Translate] No signer/pool configured. Skipping network translation.');
    return null;
  }

  try {
    // 3. Create kind 5002 translation job
    const jobEvent = finalizeEvent(
      {
        kind: 5002,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['i', text, 'text'],
          ['param', 'lang', targetLang],
          ...(sourceLang && sourceLang !== 'auto' ? [['param', 'source_lang', sourceLang]] : []),
        ],
        content: text,
      },
      state.signer,
    );

    // 4. Subscribe for kind 6002 result before publishing
    const resultPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Translation timed out after ${CONFIG.RESULT_TIMEOUT / 1000}s`));
      }, CONFIG.RESULT_TIMEOUT);

      const sub = state.pool.subscribeMany(
        state.relays,
        [
          {
            kinds: [6002],
            '#e': [jobEvent.id],
            authors: [CONFIG.ORACLE_PUBKEY],
            since: Math.floor(Date.now() / 1000),
          },
        ],
        {
          onevent(evt) {
            const content = evt.content?.trim();
            if (content) {
              cleanup();
              resolve(content);
            }
          },
          oneose() {
            // EOSE reached without result — keep waiting for timeout
          },
        },
      );

      function cleanup() {
        clearTimeout(timer);
        sub.close();
      }

      state.pending[jobEvent.id] = { cleanup, timer };
    });

    // 5. Publish the job
    await Promise.any(state.relays.map(url => state.pool.ensureRelay(url)));
    await state.pool.publish(state.relays, jobEvent);

    // 6. Wait for result
    const translated = await resultPromise;

    // 7. Cache
    state.cached[cacheKey] = { text: translated, timestamp: Date.now() };
    saveCache();

    return translated;
  } catch (error) {
    console.warn(`[Nostr Translate] Translation failed: ${error.message}`);
    return null;
  }
}

function saveCache() {
  localStorage.setItem('nostr_translate_cache', JSON.stringify(state.cached));
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI Rendering
// ═══════════════════════════════════════════════════════════════════════════════

function renderTranslationBadge(eventId, content, sourceLang, targetLang) {
  const badge = document.createElement('span');
  badge.className = 'nostr-translate-badge';
  badge.dataset.eventId = eventId;
  badge.innerHTML = `${getFlag(sourceLang)} ${capitalize(sourceLang)}`;
  badge.title = `Original: ${capitalize(sourceLang)} | Tap to translate to ${capitalize(targetLang)}`;

  badge.addEventListener('click', (e) => {
    e.preventDefault();
    toggleTranslation(eventId);
  });

  return badge;
}

function toggleTranslation(eventId) {
  state.uiState[eventId] = state.uiState[eventId] === 'original' ? 'translated' : 'original';
  saveUiState();
  updateEventDisplay(eventId);
}

function updateEventDisplay(eventId) {
  const eventEl = document.querySelector(`[data-event-id="${eventId}"]`);
  if (!eventEl) return;

  const contentEl = eventEl.querySelector('.nostr-content');
  if (!contentEl) return;

  const cacheKey = `${eventId}:${state.userLang}`;
  const cached = state.cached[cacheKey];

  if (state.uiState[eventId] === 'translated' && cached) {
    contentEl.textContent = cached.text;
  } else {
    contentEl.textContent = contentEl.dataset.original;
  }
}

function getFlag(lang) {
  return CONFIG.FLAG_EMOJI[lang] || '🏳️';
}

function capitalize(lang) {
  return CONFIG.LANG_NAMES[lang] || lang.toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Processing (Main Entry Point)
// ═══════════════════════════════════════════════════════════════════════════════

async function processIncomingEvent(event) {
  // Skip if too long
  if (!event.content || event.content.length > CONFIG.MAX_CHARS) {
    return event;
  }

  // Auto-detect source language
  const sourceLang = detectLanguage(event.content);

  // Only translate if different from user's language
  if (sourceLang === state.userLang) {
    return event;
  }

  // Add metadata tags
  event.tags = event.tags || [];
  event.tags.push(['language', sourceLang]);
  event.tags.push(['translation_service', 'nostr-oracle']);

  // Check cache
  const cacheKey = `${event.id}:${state.userLang}`;
  const cached = state.cached[cacheKey];

  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
    event.content = cached.text;
    return event;
  }

  // Translate in background
  const translated = await translateEvent(event.id, event.content, state.userLang, sourceLang);
  if (translated) {
    event.content = translated;
  }

  return event;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Initialization
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize the translation service.
 *
 * @param {Object} opts
 * @param {string[]} [opts.relays] - Relay URLs (defaults to Oracle relays)
 * @param {string} [opts.userPubkey] - User's hex pubkey
 * @param {Object} [opts.signer] - nsec as Uint8Array, or { sign(template) } for NIP-07
 */
function initTranslationService(opts = {}) {
  const relays = opts.relays || CONFIG.ORACLE_RELAYS;
  state.relays = relays;

  if (opts.userPubkey) state.userPubkey = opts.userPubkey;
  if (opts.signer) state.signer = opts.signer;

  // Create pool
  state.pool = new SimplePool();

  console.log(`[Nostr Translate] Initialized. Oracle: ${CONFIG.ORACLE_PUBKEY.slice(0, 8)}..., Relays: ${relays.length}`);

  // Load persisted state
  loadPersistedState();

  // Update all existing events
  if (typeof document !== 'undefined') {
    document.querySelectorAll('[data-event-id]').forEach((el) => {
      const eventId = el.dataset.eventId;
      if (eventId && state.uiState[eventId]) {
        updateEventDisplay(eventId);
      }
    });
  }
}

function loadPersistedState() {
  const ui = localStorage.getItem('nostr_translate_uiState');
  if (ui) state.uiState = JSON.parse(ui);

  const cache = localStorage.getItem('nostr_translate_cache');
  if (cache) state.cached = JSON.parse(cache);

  const lang = localStorage.getItem('nostr_translate_userLang');
  if (lang) state.userLang = lang;
}

function setUserLanguage(lang) {
  state.userLang = lang;
  localStorage.setItem('nostr_translate_userLang', lang);
  console.log(`[Nostr Translate] User language set to: ${lang}`);
}

function saveUiState() {
  localStorage.setItem('nostr_translate_uiState', JSON.stringify(state.uiState));
}

/**
 * Clean up — close pool subscriptions. Call on app teardown.
 */
function destroy() {
  if (state.pool) {
    state.pool.close(state.relays);
    state.pool = null;
  }
  console.log('[Nostr Translate] Destroyed.');
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const STYLES = `
.nostr-translate-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  padding: 0.15em 0.4em;
  border-radius: 0.2em;
  background: rgba(0, 122, 255, 0.1);
  color: #007AFF;
  font-size: 0.75em;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s, color 0.2s;
}

.nostr-translate-badge:hover {
  background: rgba(0, 122, 255, 0.2);
  color: #0069d9;
}

.nostr-translate-badge:active {
  background: rgba(0, 122, 255, 0.3);
}

@media (prefers-color-scheme: dark) {
  .nostr-translate-badge {
    background: rgba(0, 122, 255, 0.2);
    color: #008AFF;
  }
  .nostr-translate-badge:hover {
    background: rgba(0, 122, 255, 0.3);
  }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = STYLES;
  document.head.appendChild(styleSheet);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════════

export {
  CONFIG,
  initTranslationService,
  processIncomingEvent,
  detectLanguage,
  translateEvent,
  renderTranslationBadge,
  toggleTranslation,
  updateEventDisplay,
  setUserLanguage,
  destroy,
};
