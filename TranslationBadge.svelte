/**
 * Svelte Component: Translation Badge
 * 
 * A Svelte component for Nostr clients using the translation service.
 * 
 * Usage:
 * <script>
 *   import { TranslationBadge } from './TranslationBadge.svelte';
 *   import { processIncomingEvent, initTranslationService } from './client-ui.js';
 *   
 *   initTranslationService();
 * </script>
 * 
 * <TranslationBadge eventId={event.id} sourceLang="es" />
 */

<script>
  import { createEventDispatcher } from 'svelte';
  
  export let eventId;
  export let sourceLang = 'en';
  export let targetLang = 'en';
  export let isTranslated = false;
  
  const dispatch = createEventDispatcher();
  const flagEmoji = {
    en: '🇬🇧', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹',
    pt: '🇵🇹', ru: '🇷🇺', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷',
    ar: '🇸🇦', hi: '🇮🇳',
  };
  
  const langNames = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
    ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi',
  };
  
  function getFlag(lang) {
    return flagEmoji[lang] || '🏳️';
  }
  
  function capitalize(str) {
    return langNames[str] || str.toUpperCase();
  }
  
  function handleClick() {
    dispatch('toggle', { eventId });
  }
</script>

<span 
  class="nostr-translate-badge"
  on:click={handleClick}
  title="Tap to toggle translation"
>
  {getFlag(sourceLang)} {capitalize(sourceLang)}
</span>

<style>
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
</style>
