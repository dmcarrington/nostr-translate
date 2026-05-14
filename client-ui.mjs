/**
 * Translation UI Component for Nostr Clients
 * 
 * Features:
 * - Auto-detects source language on incoming events
 * - Displays language badge (e.g., [🇪🇸], [🇫🇷])
 * - Tap badge to toggle between original and translated content
 * - Caches translations locally
 * - Respects user's preferred language setting
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
  try {
    const response = await fetch('https://nostr-oracle.example.com/api/v1/langdetect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) throw new Error('langdetect failed');
    const data = await response.json();
    return data.language || 'en';
  } catch {
    // Fallback: simple heuristics
    const hasSpanish = /(?:o|a|e|u|ñ|á|é|í|ó|ú|ión|ación|ción|sión|sión|é|í|ó|ú|ñ|¿|¡)/i.test(text);
    const hasFrench = /(?:ç|é|è|ê|ë|â|ä|ô|ö|ù|û|ç|à|â|é|è|ê|ë|î|ï|ô|ö|ù|û|ç|à|â|é|è|ê|ë|î|ï|ô|ö|ù|û|ç|à|â|é|è|ê|ë|î|ï|ô|ö|ù|û|ç|à)/i.test(text);
    const hasGerman = /(?:ä|ö|ü|ß|anch|ung|heit|keit|sch|ich|ung|keit)/i.test(text);
    
    if (hasSpanish) return 'es';
    if (hasFrench) return 'fr';
    if (hasGerman) return 'de';
    
    return 'en';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Translation
// ─────────────────────────────────────────────────────────────────────────────

async function translateEvent(eventId, text, targetLang, sourceLang) {
  // Check cache first
  const cacheKey = `${eventId}:${targetLang}`;
  const cached = state.cached[cacheKey];
  
  if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL) {
    return cached.text;
  }
  
  // Call translation API
  try {
    const response = await fetch(CONFIG.TRANSLATION_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        target_lang: targetLang,
        source_lang: sourceLang || 'auto',
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
    
    throw new Error(data.error || 'translation failed');
  } catch (error) {
    console.warn(`Translation failed: ${error.message}`);
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
  badge.innerHTML = `${getConfigFlag(sourceLang)} ${capitalize(sourceLang)}`;
  badge.title = `Original: ${capitalize(sourceLang)} | Tap to translate to ${capitalize(targetLang)}`;
  
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
  
  // Update UI
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

function getConfigFlag(lang) {
  return CONFIG.FLAG_EMOJI[lang] || '🏳️';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
  const sourceLang = await detectLanguage(event.content);
  
  // Only translate if different from user's language
  if (sourceLang === state.userLang) {
    return event;
  }
  
  // Check if already translated in this session
  const cacheKey = `${event.id}:${state.userLang}`;
  const cached = state.cached[cacheKey];
  
  // Add metadata tags to event
  event.tags = event.tags || [];
  event.tags.push(['language', sourceLang]);
  event.tags.push(['translation_service', 'nostr-oracle']);
  
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

// ─────────────────────────────────────────────────────────────────────────────
// Styles
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

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = STYLES;
  document.head.appendChild(styleSheet);
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
  initTranslationService,
  CONFIG,
};

// Auto-initialize on load
if (typeof window !== 'undefined') {
  initTranslationService();
}
