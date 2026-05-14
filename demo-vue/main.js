import { createApp } from 'vue';
import App from './App.vue';
import { initTranslationService, setUserLanguage } from './client-ui.js';

initTranslationService();
setUserLanguage('en');

createApp(App).mount('#app');
