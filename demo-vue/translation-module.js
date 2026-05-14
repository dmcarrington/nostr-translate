/**
 * Nostr Translation Demo - Standalone Module
 * Self-contained translation logic for Vercel deployment
 */

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  CACHE_TTL: 24 * 60 * 60 * 1000,
  MAX_CHARS: 500,
  FLAG_EMOJI: {
    en: '🇬🇧', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹',
    pt: '🇵🇹', ru: '🇷🇺', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷',
    ar: '🇸🇦', hi: '🇮🇳',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

let userLang = localStorage.getItem('nostr_translate_userLang') || 'en';
let cached = JSON.parse(localStorage.getItem('nostr_translate_cache') || '{}');
let uiState = JSON.parse(localStorage.getItem('nostr_translate_uiState') || '{}');

// ─────────────────────────────────────────────────────────────────────────────
// Language Detection (Heuristics)
// ─────────────────────────────────────────────────────────────────────────────

function detectLanguage(text) {
  if (/[áéíóúüñ¡¿]/.test(text)) return 'es';
  if (/[çéèêëàâäôöùûüîï]/.test(text)) return 'fr';
  if (/[äöüß]/.test(text)) return 'de';
  if (/[àèéìíòóùú]/.test(text)) return 'it';
  if (/[áéíóúâêôãõç]/.test(text)) return 'pt';
  if (/[一-龯]/.test(text)) return 'zh';
  if (/[あ-んア-ン一-龯]/.test(text)) return 'ja';
  if (/[가-힣]/.test(text)) return 'ko';
  if (/[أ-ي]/.test(text)) return 'ar';
  if (/[ँ-ह]/.test(text)) return 'hi';
  return 'en';
}

// ─────────────────────────────────────────────────────────────────────────────
// Translation (Mock for demo)
// ─────────────────────────────────────────────────────────────────────────────

function translateText(text, targetLang, sourceLang) {
  // Mock translations for demo
  const mock = {
    'es': { 'La reunión es': 'The meeting is', '¿Vas a ir?': 'Are you going?', 'centro de la ciudad': 'city center' },
    'it': { 'Ciao a tutti': 'Hello everyone', 'demo di traduzione': 'translation demo' },
    'fr': { 'Bonjour tout le monde': 'Hello everyone', 'démo de traduction': 'translation demo' },
    'de': { 'Guten Tag': 'Good day', 'Demo für automatische': 'demo for automatic' },
  };
  
  const source = sourceLang || detectLanguage(text);
  const translations = mock[source] || {};
  
  let result = text;
  for (const [k, v] of Object.entries(translations)) {
    result = result.replace(new RegExp(k, 'gi'), v);
  }
  
  // Fallback
  if (result === text) {
    if (source !== targetLang) {
      return `(${source.toUpperCase()} → ${targetLang.toUpperCase()}) ${text.substring(0, 30)}...`;
    }
    return text;
  }
  
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────────────────────────────────────

function getCacheKey(eventId, lang) {
  return `${eventId}:${lang}`;
}

function getTranslation(eventId, text, targetLang, sourceLang) {
  const cacheKey = getCacheKey(eventId, targetLang);
  const cachedItem = cached[cacheKey];
  
  if (cachedItem && Date.now() - cachedItem.timestamp < CONFIG.CACHE_TTL) {
    return cachedItem.text;
  }
  
  const translated = translateText(text, targetLang, sourceLang);
  
  cached[cacheKey] = {
    text: translated,
    timestamp: Date.now(),
  };
  
  localStorage.setItem('nostr_translate_cache', JSON.stringify(cached));
  return translated;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getFlag(lang) {
  return CONFIG.FLAG_EMOJI[lang] || '🏳️';
}

function capitalize(str) {
  const names = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
    'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi',
  };
  return names[str] || str.toUpperCase();
}

function setUserLanguage(lang) {
  userLang = lang;
  localStorage.setItem('nostr_translate_userLang', lang);
}

function toggleTranslation(eventId) {
  uiState[eventId] = uiState[eventId] === 'original' ? 'translated' : 'original';
  localStorage.setItem('nostr_translate_uiState', JSON.stringify(uiState));
}

function getDisplayContent(eventId, text, targetLang, sourceLang) {
  const cacheKey = getCacheKey(eventId, targetLang);
  const cachedItem = cached[cacheKey];
  
  if (cachedItem && uiState[eventId] === 'translated') {
    return cachedItem.text;
  }
  
  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export API
// ─────────────────────────────────────────────────────────────────────────────

export {
  userLang,
  uiState,
  detectLanguage,
  getTranslation,
  getFlag,
  capitalize,
  setUserLanguage,
  toggleTranslation,
  getDisplayContent,
  getCacheKey,
  CONFIG,
};
