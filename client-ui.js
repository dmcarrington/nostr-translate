/**
 * Translation UI Component for Nostr Clients
 * 
 * A simple Vanilla JS implementation that can be dropped into any Nostr client.
 * 
 * Usage:
 * 1. Import the module: import { processIncomingEvent, initTranslationService } from './client-ui.js';
 * 2. Call initTranslationService() on app startup
 * 3. Call processIncomingEvent(event) before rendering each event
 * 4. The event content will be automatically translated to user's language
 */

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  TRANSLATION_API: 'https://nostr-oracle.example.com/api/v1/translate',
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  MAX_CHARS: 500, // Don't translate if content exceeds this
  SUPPORTED_LANGS: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'],
  FLAG_EMOJI: {
    'en': '🇬🇧', 'es': '🇪🇸', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹',
    'pt': '🇵🇹', 'ru': '🇷🇺', 'zh': '🇨🇳', 'ja': '🇯🇵', 'ko': '🇰🇷',
    'ar': '🇸🇦', 'hi': '🇮🇳',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// State Management
// ─────────────────────────────────────────────────────────────────────────────

const state = {
  userLang: localStorage.getItem('nostr_translate_userLang') || 'en',
  cached: JSON.parse(localStorage.getItem('nostr_translate_cache') || '{}'),
  uiState: {}, // event_id -> 'original' | 'translated'
};

// ─────────────────────────────────────────────────────────────────────────────
// Language Detection
// ─────────────────────────────────────────────────────────────────────────────

async function detectLanguage(text) {
  // For demo, use simple heuristics. In production, call a langdetect API.
  
  // Spanish indicators
  if (/[áéíóúüñ¡¿]/.test(text)) return 'es';
  // French indicators
  if (/[çéèêëàâäôöùûüîï]/.test(text)) return 'fr';
  // German indicators
  if (/[äöüß]/.test(text)) return 'de';
  // Italian indicators
  if (/[àèéìíòóùú]/.test(text)) return 'it';
  // Portuguese indicators
  if (/[áéíóúâêôãõç]/.test(text)) return 'pt';
  // Chinese indicators
  if (/[一-龯]/.test(text)) return 'zh';
  // Japanese indicators
  if (/[あ-んア-ン一-龯]/.test(text)) return 'ja';
  // Korean indicators
  if (/[가-힣]/.test(text)) return 'ko';
  // Arabic indicators
  if (/[أ-ي]/.test(text)) return 'ar';
  // Hindi indicators
  if (/[ँ-ह]/.test(text)) return 'hi';
  
  return 'en';
}

// ─────────────────────────────────────────────────────────────────────────────
// Translation
// ─────────────────────────────────────────────────────────────────────────────

function getCacheKey(eventId, lang) {
  return `${eventId}:${lang}`;
}

async function translateEvent(eventId, text, targetLang, sourceLang = 'auto') {
  const cacheKey = getCacheKey(eventId, targetLang);
  
  // Check cache first
  const cached = state.cached[cacheKey];
  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
    return cached.text;
  }
  
  // Call translation API (placeholder - replace with real endpoint)
  try {
    // For demo, just return mock translations
    if (text.includes('Hola')) return 'Hello';
    if (text.includes('Bonjour')) return 'Hello';
    if (text.includes('Ciao')) return 'Hello';
    
    // In production, uncomment:
    /*
    const response = await fetch(CONFIG.TRANSLATION_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        target_lang: targetLang,
        source_lang: sourceLang,
        event_id: eventId,
      }),
    });
    
    if (!response.ok) throw new Error('translation failed');
    const data = await response.json();
    
    if (data.success) {
      // Cache result
      state.cached[cacheKey] = {
        text: data.translated_text,
        timestamp: Date.now(),
      };
      saveCache();
      return data.translated_text;
    }
    */
    
    throw new Error('Translation API not configured');
  } catch (error) {
    console.warn(`Translation failed for ${eventId}: ${error.message}`);
    return null;
  }
}

function saveCache() {
  localStorage.setItem('nostr_translate_cache', JSON.stringify(state.cached));
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderTranslationBadge(eventId, content, sourceLang, targetLang) {
  const badge = document.createElement('span');
  badge.className = 'nostr-translate-badge';
  badge.dataset.eventId = eventId;
  badge.innerHTML = `${getFlag(sourceLang)} ${capitalize(sourceLang)}`;
  badge.title = `Tap to translate from ${capitalize(sourceLang)} to ${capitalize(targetLang)}`;
  
  // Add click handler
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
  
  const cacheKey = getCacheKey(eventId, state.userLang);
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

function capitalize(str) {
  const names = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
    'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi',
  };
  return names[lang] || str.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Event Processing (Main Entry Point)
// ─────────────────────────────────────────────────────────────────────────────

async function processIncomingEvent(event) {
  // Skip if too long
  if (event.content.length > CONFIG.MAX_CHARS) {
    return event;
  }
  
  // Auto-detect source language
  const sourceLang = detectLanguage(event.content);
  
  // Only translate if different from user's language
  if (sourceLang === state.userLang) {
    return event;
  }
  
  // Check if already translated in this session
  const cacheKey = getCacheKey(event.id, state.userLang);
  const cached = state.cached[cacheKey];
  
  // If cached, return with translated content
  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
    event.content = cached.text;
    return event;
  }
  
  // Otherwise, translate in background
  const translated = await translateEvent(event.id, event.content, state.userLang, sourceLang);
  
  if (translated) {
    event.content = translated;
  }
  
  return event;
}

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

function initTranslationService() {
  // Load UI state
  const savedUi = localStorage.getItem('nostr_translate_uiState');
  if (savedUi) {
    state.uiState = JSON.parse(savedUi);
  }
  
  // Load cached translations
  const savedCache = localStorage.getItem('nostr_translate_cache');
  if (savedCache) {
    state.cached = JSON.parse(savedCache);
  }
  
  // Load user language preference
  const savedLang = localStorage.getItem('nostr_translate_userLang');
  if (savedLang) {
    state.userLang = savedLang;
  }
  
  // Update all existing events
  document.querySelectorAll('[data-event-id]').forEach((el) => {
    const eventId = el.dataset.eventId;
    if (eventId && state.uiState[eventId]) {
      updateEventDisplay(eventId);
    }
  });
  
  console.log('[Nostr Translate] Service initialized');
}

function saveUiState() {
  localStorage.setItem('nostr_translate_uiState', JSON.stringify(state.uiState));
}

function setUserLanguage(lang) {
  state.userLang = lang;
  localStorage.setItem('nostr_translate_userLang', lang);
  console.log(`[Nostr Translate] User language set to: ${lang}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles (CSS)
// ─────────────────────────────────────────────────────────────────────────────

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

/* Dark mode support */
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

// Inject styles on load
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = STYLES;
  document.head.appendChild(styleSheet);
  
  // Auto-initialize
  initTranslationService();
}

// ─────────────────────────────────────────────────────────────────────────────
// Export API
// ─────────────────────────────────────────────────────────────────────────────

export {
  processIncomingEvent,
  detectLanguage,
  translateEvent,
  renderTranslationBadge,
  toggleTranslation,
  updateEventDisplay,
  initTranslationService,
  setUserLanguage,
  CONFIG,
};
