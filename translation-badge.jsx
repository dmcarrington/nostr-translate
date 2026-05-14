/**
 * React Component: Translation Badge
 * 
 * A reusable React component for Nostr clients using the translation service.
 * 
 * Usage:
 * import { TranslationBadge } from './translation-badge';
 * 
 * <TranslationBadge 
 *   eventId="abc123"
 *   sourceLang="es" 
 *   targetLang="en"
 *   onToggle={handleToggle}
 *   isTranslated={state.uiState['abc123'] === 'translated'}
 * />
 */

import React, { useEffect, useState } from 'react';

const CONFIG = {
  TRANSLATION_API: 'https://nostr-oracle.example.com/api/v1/translate',
  CACHE_TTL: 24 * 60 * 60 * 1000,
  FLAG_EMOJI: {
    'en': '🇬🇧', 'es': '🇪🇸', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹',
    'pt': '🇵🇹', 'ru': '🇷🇺', 'zh': '🇨🇳', 'ja': '🇯🇵', 'ko': '🇰🇷',
    'ar': '🇸🇦', 'hi': '🇮🇳',
  },
};

const langNames = {
  'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
  'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
  'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi',
};

function getFlag(lang) {
  return CONFIG.FLAG_EMOJI[lang] || '🏳️';
}

function capitalize(str) {
  return langNames[str] || str.toUpperCase();
}

export function TranslationBadge({ eventId, sourceLang, targetLang, isTranslated, onToggle }) {
  const [hovered, setHovered] = useState(false);
  
  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25em',
    padding: '0.15em 0.4em',
    borderRadius: '0.2em',
    backgroundColor: hovered ? 'rgba(0, 122, 255, 0.3)' : 'rgba(0, 122, 255, 0.1)',
    color: '#007AFF',
    fontSize: '0.75em',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.2s ease',
  };
  
  const handleClick = () => {
    if (onToggle) {
      onToggle(eventId);
    }
  };
  
  return (
    <span
      style={badgeStyle}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`Tap to ${isTranslated ? 'show original' : 'translate to'} ${capitalize(targetLang)}`}
    >
      {getFlag(sourceLang)} {capitalize(sourceLang)}
    </span>
  );
}

// Example usage in a Nostr event component
export function NostrEventWithTranslation({ event, userLang, uiState, onToggleTranslation }) {
  const cacheKey = `${event.id}:${userLang}`;
  const isTranslated = uiState[cacheKey] === 'translated';
  const sourceLang = event.tags?.find(t => t[0] === 'language')?.[1] || 'en';
  
  // Get translated content from cache
  const [cachedContent, setCachedContent] = useState(null);
  useEffect(() => {
    const cached = localStorage.getItem('nostr_translate_cache');
    if (cached) {
      const cache = JSON.parse(cached);
      if (cache[cacheKey]) {
        setCachedContent(cache[cacheKey].text);
      }
    }
  }, [cacheKey]);
  
  const displayContent = isTranslated && cachedContent ? cachedContent : event.content;
  
  return (
    <div data-event-id={event.id} className="nostr-event">
      <div className="nostr-content" data-original={event.content}>
        {displayContent}
      </div>
      
      {/* Show badge if source language != user language */}
      {sourceLang !== userLang && (
        <TranslationBadge
          eventId={event.id}
          sourceLang={sourceLang}
          targetLang={userLang}
          isTranslated={isTranslated}
          onToggle={onToggleTranslation}
        />
      )}
    </div>
  );
}
