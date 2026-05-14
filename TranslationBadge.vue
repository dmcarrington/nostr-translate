/**
 * Vue Component: Translation Badge
 * 
 * A Vue component for Nostr clients using the translation service.
 * 
 * Usage:
 * <template>
 *   <TranslationBadge 
 *     :event-id="event.id" 
 *     source-lang="es" 
 *     :is-translated="uiState[event.id]"
 *     @toggle="toggleTranslation"
 *   />
 * </template>
 */

<script>
export default {
  name: 'TranslationBadge',
  props: {
    eventId: { type: String, required: true },
    sourceLang: { type: String, default: 'en' },
    targetLang: { type: String, default: 'en' },
    isTranslated: { type: Boolean, default: false },
  },
  emits: ['toggle'],
  computed: {
    flagEmoji() {
      return {
        en: '🇬🇧', es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹',
        pt: '🇵🇹', ru: '🇷🇺', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷',
        ar: '🇸🇦', hi: '🇮🇳',
      }[this.sourceLang] || '🏳️';
    },
    langName() {
      const names = {
        en: 'English', es: 'Spanish', fr: 'French', de: 'German',
        it: 'Italian', pt: 'Portuguese', ru: 'Russian', zh: 'Chinese',
        ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi',
      };
      return names[this.sourceLang] || this.sourceLang.toUpperCase();
    },
    toggleText() {
      return this.isTranslated ? 'Show original' : `Translate to ${this.langName}`;
    },
  },
  methods: {
    handleClick() {
      this.$emit('toggle', this.eventId);
    },
  },
};
</script>

<template>
  <span
    class="nostr-translate-badge"
    @click="handleClick"
    :title="toggleText"
  >
    {{ flagEmoji }} {{ langName }}
  </span>
</template>

<style scoped>
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
