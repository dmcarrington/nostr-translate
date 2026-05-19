/**
 * Nostr-Native Translation Client (Vanilla JS / UMD)
 *
 * Translates Nostr events via the WOPR Oracle DVM (NIP-90).
 * Publishes kind 5002 job requests, subscribes for kind 6002 results.
 *
 * This file is ESM-free — works as a <script> tag or CommonJS.
 * The caller must provide nostr-tools via setNostrTools().
 *
 * Usage (browser):
 *   <script type="module">
 *     import { finalizeEvent, SimplePool } from 'https://esm.sh/nostr-tools';
 *     window.NostrTranslate.setNostrTools({ finalizeEvent, SimplePool });
 *     window.NostrTranslate.initTranslationService({ signer: myNsec });
 *   </script>
 *
 * Usage (CommonJS):
 *   const nt = require('nostr-tools');
 *   const NostrTranslate = require('./client-ui.js');
 *   NostrTranslate.setNostrTools({ finalizeEvent: nt.finalizeEvent, SimplePool: nt.SimplePool });
 */

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.NostrTranslate = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // ═════════════════════════════════════════════════════════════════════════════
  // nostr-tools injection
  // ═════════════════════════════════════════════════════════════════════════════

  var _finalizeEvent = null;
  var _SimplePool = null;

  /**
   * Provide nostr-tools functions. Call once before initTranslationService().
   * @param {Object} tools — { finalizeEvent, SimplePool }
   */
  function setNostrTools(tools) {
    _finalizeEvent = tools.finalizeEvent;
    _SimplePool = tools.SimplePool;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Configuration
  // ═════════════════════════════════════════════════════════════════════════════

  var CONFIG = {
    ORACLE_PUBKEY: '7e3d8c8f9a5b1c2d4e6f8a0b2c4d6e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',
    ORACLE_RELAYS: [
      'wss://relay.damus.io',
      'wss://relay.nostr.net',
      'wss://nos.lol',
      'wss://relay.primal.net',
    ],
    RESULT_TIMEOUT: 15_000,
    CACHE_TTL: 24 * 60 * 60 * 1000,
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

  // ═════════════════════════════════════════════════════════════════════════════
  // State
  // ═════════════════════════════════════════════════════════════════════════════

  var state = {
    pool: null,
    userPubkey: null,
    signer: null,
    relays: [],
    userLang: 'en',
    cached: {},
    uiState: {},
    pending: {},
  };

  // Load persisted state on startup
  function __loadPersisted() {
    try {
      var ul = localStorage.getItem('nostr_translate_userLang');
      if (ul) state.userLang = ul;
      var c = localStorage.getItem('nostr_translate_cache');
      if (c) state.cached = JSON.parse(c);
      var u = localStorage.getItem('nostr_translate_uiState');
      if (u) state.uiState = JSON.parse(u);
    } catch (e) { /* localStorage unavailable */ }
  }

  __loadPersisted();

  // ═════════════════════════════════════════════════════════════════════════════
  // Language Detection
  // ═════════════════════════════════════════════════════════════════════════════

  function detectLanguage(text) {
    if (text.length > 200) text = text.slice(0, 200); // check first 200 chars
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    if (/[\u0900-\u097f]/.test(text)) return 'hi';
    if (/[äöüß]/.test(text)) return 'de';
    if (/[çéèêëàâäôöùûüîï]/.test(text)) return 'fr';
    if (/[áéíóúüñ¡¿]/.test(text)) return 'es';
    if (/[àèéìíòóùú]/.test(text)) return 'it';
    if (/[áéíóúâêôãõç]/.test(text)) return 'pt';
    if (/[\u0400-\u04ff]/.test(text)) return 'ru';
    return 'en';
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Translation (Nostr-native)
  // ═════════════════════════════════════════════════════════════════════════════

  function getCacheKey(eventId, lang) {
    return eventId + ':' + lang;
  }

  async function translateEvent(eventId, text, targetLang, sourceLang) {
    var cacheKey = getCacheKey(eventId, targetLang);
    var cached = state.cached[cacheKey];
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
      return cached.text;
    }

    if (!_finalizeEvent || !_SimplePool || !state.signer || !state.pool) {
      console.warn('[Nostr Translate] No signer/pool configured. Skipping network translation.');
      return null;
    }

    try {
      // Build kind 5002 tags
      var tags = [
        ['i', text, 'text'],
        ['param', 'lang', targetLang],
      ];
      if (sourceLang && sourceLang !== 'auto') {
        tags.push(['param', 'source_lang', sourceLang]);
      }

      var jobEvent = _finalizeEvent({
        kind: 5002,
        created_at: Math.floor(Date.now() / 1000),
        tags: tags,
        content: text,
      }, state.signer);

      var resultPromise = new Promise(function (resolve, reject) {
        var timer = setTimeout(function () {
          cleanup();
          reject(new Error('Translation timed out after ' + (CONFIG.RESULT_TIMEOUT / 1000) + 's'));
        }, CONFIG.RESULT_TIMEOUT);

        var sub = state.pool.subscribeMany(
          state.relays,
          [{
            kinds: [6002],
            '#e': [jobEvent.id],
            authors: [CONFIG.ORACLE_PUBKEY],
            since: Math.floor(Date.now() / 1000),
          }],
          {
            onevent: function (evt) {
              var content = (evt.content || '').trim();
              if (content) {
                cleanup();
                resolve(content);
              }
            },
            oneose: function () {},
          }
        );

        function cleanup() {
          clearTimeout(timer);
          sub.close();
        }
      });

      // Ensure relay connections, then publish
      await Promise.all(state.relays.map(function (url) {
        return state.pool.ensureRelay(url).catch(function () { });
      }));
      await state.pool.publish(state.relays, jobEvent);

      var translated = await resultPromise;

      state.cached[cacheKey] = { text: translated, timestamp: Date.now() };
      saveCache();

      return translated;
    } catch (error) {
      console.warn('[Nostr Translate] Translation failed: ' + error.message);
      return null;
    }
  }

  function saveCache() {
    try {
      localStorage.setItem('nostr_translate_cache', JSON.stringify(state.cached));
    } catch (e) { /* quota exceeded */ }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // UI Rendering
  // ═════════════════════════════════════════════════════════════════════════════

  function renderTranslationBadge(eventId, content, sourceLang, targetLang) {
    var badge = document.createElement('span');
    badge.className = 'nostr-translate-badge';
    badge.dataset.eventId = eventId;
    badge.innerHTML = getFlag(sourceLang) + ' ' + capitalize(sourceLang);
    badge.title = 'Original: ' + capitalize(sourceLang) + ' | Tap to translate to ' + capitalize(targetLang);

    badge.addEventListener('click', function (e) {
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
    var eventEl = document.querySelector('[data-event-id="' + eventId + '"]');
    if (!eventEl) return;

    var contentEl = eventEl.querySelector('.nostr-content');
    if (!contentEl) return;

    var cacheKey = getCacheKey(eventId, state.userLang);
    var cached = state.cached[cacheKey];

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

  // ═════════════════════════════════════════════════════════════════════════════
  // Event Processing
  // ═════════════════════════════════════════════════════════════════════════════

  async function processIncomingEvent(event) {
    if (!event.content || event.content.length > CONFIG.MAX_CHARS) {
      return event;
    }

    var sourceLang = detectLanguage(event.content);

    if (sourceLang === state.userLang) {
      return event;
    }

    event.tags = event.tags || [];
    event.tags.push(['language', sourceLang]);
    event.tags.push(['translation_service', 'nostr-oracle']);

    var cacheKey = getCacheKey(event.id, state.userLang);
    var cached = state.cached[cacheKey];

    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
      event.content = cached.text;
      return event;
    }

    var translated = await translateEvent(event.id, event.content, state.userLang, sourceLang);
    if (translated) {
      event.content = translated;
    }

    return event;
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Initialization
  // ═════════════════════════════════════════════════════════════════════════════

  function initTranslationService(opts) {
    opts = opts || {};
    var relays = opts.relays || CONFIG.ORACLE_RELAYS;
    state.relays = relays;

    if (opts.userPubkey) state.userPubkey = opts.userPubkey;
    if (opts.signer) state.signer = opts.signer;

    if (_SimplePool) {
      state.pool = new _SimplePool();
    }

    console.log('[Nostr Translate] Initialized. Oracle: ' + CONFIG.ORACLE_PUBKEY.slice(0, 8) + '..., Relays: ' + relays.length);

    // Update existing DOM elements
    if (typeof document !== 'undefined') {
      var els = document.querySelectorAll('[data-event-id]');
      for (var i = 0; i < els.length; i++) {
        var eventId = els[i].dataset.eventId;
        if (eventId && state.uiState[eventId]) {
          updateEventDisplay(eventId);
        }
      }
    }
  }

  function setUserLanguage(lang) {
    state.userLang = lang;
    try {
      localStorage.setItem('nostr_translate_userLang', lang);
    } catch (e) { }
    console.log('[Nostr Translate] User language set to: ' + lang);
  }

  function saveUiState() {
    try {
      localStorage.setItem('nostr_translate_uiState', JSON.stringify(state.uiState));
    } catch (e) { }
  }

  function destroy() {
    if (state.pool) {
      state.pool.close(state.relays);
      state.pool = null;
    }
    console.log('[Nostr Translate] Destroyed.');
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Styles
  // ═════════════════════════════════════════════════════════════════════════════

  var STYLES = [
    '.nostr-translate-badge{display:inline-flex;align-items:center;gap:.25em;padding:.15em .4em;border-radius:.2em;background:rgba(0,122,255,.1);color:#007AFF;font-size:.75em;cursor:pointer;user-select:none;transition:background .2s,color .2s}',
    '.nostr-translate-badge:hover{background:rgba(0,122,255,.2);color:#0069d9}',
    '.nostr-translate-badge:active{background:rgba(0,122,255,.3)}',
    '@media(prefers-color-scheme:dark){.nostr-translate-badge{background:rgba(0,122,255,.2);color:#008AFF}.nostr-translate-badge:hover{background:rgba(0,122,255,.3)}}',
  ].join('\n');

  if (typeof document !== 'undefined') {
    var styleSheet = document.createElement('style');
    styleSheet.textContent = STYLES;
    document.head.appendChild(styleSheet);
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // Public API
  // ═════════════════════════════════════════════════════════════════════════════

  return {
    CONFIG: CONFIG,
    setNostrTools: setNostrTools,
    initTranslationService: initTranslationService,
    processIncomingEvent: processIncomingEvent,
    detectLanguage: detectLanguage,
    translateEvent: translateEvent,
    renderTranslationBadge: renderTranslationBadge,
    toggleTranslation: toggleTranslation,
    updateEventDisplay: updateEventDisplay,
    setUserLanguage: setUserLanguage,
    destroy: destroy,
  };
}));
