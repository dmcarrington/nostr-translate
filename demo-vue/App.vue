<template>
  <div id="app">
    <header>
      <h1> nostr Translate Demo </h1>
      <p class="subtitle">Auto-translation service for Nostr events</p>
    </header>

    <div class="controls">
      <label for="user-lang">Your language:</label>
      <select id="user-lang" v-model="userLang" @change="setUserLanguage">
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
        <option value="it">Italiano</option>
        <option value="pt">Português</option>
        <option value="ru">Русский</option>
        <option value="zh">中文</option>
        <option value="ja">日本語</option>
        <option value="ko">한국어</option>
        <option value="ar">العربية</option>
        <option value="hi">हिन्दी</option>
      </select>
    </div>

    <main>
      <div class="events-list">
        <div v-for="event in events" :key="event.id" class="event-card" :data-event-id="event.id">
          <div class="event-header">
            <span class="event-id">{{ event.id.slice(0, 16) }}...</span>
            <span class="event-time">{{ formatTime(event.created_at) }}</span>
          </div>

          <div class="event-content" :data-original="event.content">
            {{ displayContent(event.id) }}
          </div>

          <TranslationBadge
            v-if="shouldShowBadge(event)"
            :event-id="event.id"
            :source-lang="getSourceLang(event)"
            :target-lang="userLang"
            :is-translated="isTranslated(event.id)"
            @toggle="toggleTranslation"
          />
        </div>

        <div v-if="events.length === 0" class="loading">
          <p>Loading events...</p>
        </div>
      </div>
    </main>

    <footer>
      <p>Powered by <a href="https://github.com/nostr-oracle" target="_blank">Nostr Oracle</a></p>
    </footer>
  </div>
</template>

<script>
import { TranslationBadge } from './TranslationBadge.vue';
import { processIncomingEvent, initTranslationService, setUserLanguage as setUserLang } from './client-ui.js';
import demoEvents from './demo-events.json';

export default {
  name: 'App',
  components: { TranslationBadge },
  data() {
    return {
      userLang: localStorage.getItem('nostr_translate_userLang') || 'en',
      events: [],
      uiState: JSON.parse(localStorage.getItem('nostr_translate_uiState') || '{}'),
    };
  },
  mounted() {
    initTranslationService();
    this.loadEvents();
  },
  methods: {
    setUserLanguage() {
      setUserLang(this.userLang);
      localStorage.setItem('nostr_translate_userLang', this.userLang);
    },
    async loadEvents() {
      // Use demo events for testing
      this.events = demoEvents.map(event => {
        // Process through translation service
        const translated = processIncomingEvent(event);
        return translated;
      });
    },
    formatTime(ts) {
      const date = new Date(ts * 1000);
      return date.toLocaleTimeString();
    },
    displayContent(eventId) {
      const cacheKey = `${eventId}:${this.userLang}`;
      const cached = localStorage.getItem('nostr_translate_cache');
      if (cached) {
        const cache = JSON.parse(cached);
        if (cache[cacheKey] && this.uiState[eventId] === 'translated') {
          return cache[cacheKey].text;
        }
      }
      const event = this.events.find(e => e.id === eventId);
      return event?.content || '';
    },
    shouldShowBadge(event) {
      const sourceLang = this.getSourceLang(event);
      return sourceLang !== this.userLang;
    },
    getSourceLang(event) {
      const langTag = event.tags?.find(t => t[0] === 'language');
      return langTag?.[1] || 'en';
    },
    isTranslated(eventId) {
      return this.uiState[eventId] === 'translated';
    },
    toggleTranslation(eventId) {
      this.uiState[eventId] = this.uiState[eventId] === 'original' ? 'translated' : 'original';
      localStorage.setItem('nostr_translate_uiState', JSON.stringify(this.uiState));
    },
  },
};
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background: #0a0a0f;
  color: #c8d4e8;
  min-height: 100vh;
}

#app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: rgba(30, 45, 74, 0.3);
  border-radius: 10px;
}

header h1 {
  font-size: 2em;
  color: #f0f4ff;
  margin-bottom: 10px;
}

.subtitle {
  color: #7a8ba8;
}

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 30px;
  padding: 15px;
  background: #1e2d4a;
  border-radius: 10px;
}

.controls label {
  font-weight: 600;
}

.controls select {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: #0a0a0f;
  color: #c8d4e8;
  font-size: 14px;
  cursor: pointer;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.event-card {
  background: #0d101a;
  border: 1px solid #1e2d4a;
  border-radius: 10px;
  padding: 20px;
  position: relative;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-size: 12px;
  color: #3a5070;
}

.event-id {
  font-family: monospace;
  color: #7a8ba8;
}

.event-time {
  color: #f0a500;
}

.event-content {
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 10px;
  white-space: pre-wrap;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #3a5070;
}

footer {
  text-align: center;
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #1e2d4a;
  color: #7a8ba8;
  font-size: 14px;
}

footer a {
  color: #f0a500;
  text-decoration: none;
}

footer a:hover {
  text-decoration: underline;
}
</style>
