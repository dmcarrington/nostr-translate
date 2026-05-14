import { detectLanguage, setUserLanguage, getFlag, capitalize, toggleTranslation, getDisplayContent } from './translation-module.js';

// Demo events
const demoEvents = [
  {
    id: "demo-es-001",
    content: "La reunión es a las 3pm mañana en el centro de la ciudad. ¿Vas a ir?",
    tags: [["language", "es"]],
    pubkey: "demo-user-1",
    created_at: Math.floor(Date.now() / 1000)
  },
  {
    id: "demo-it-001",
    content: "Ciao a tutti! Questa è una demo di traduzione automatica su Nostr.",
    tags: [["language", "it"]],
    pubkey: "demo-user-2",
    created_at: Math.floor(Date.now() / 1000)
  },
  {
    id: "demo-en-001",
    content: "Hello everyone! This is an English event that won't be translated.",
    tags: [["language", "en"]],
    pubkey: "demo-user-3",
    created_at: Math.floor(Date.now() / 1000)
  },
  {
    id: "demo-fr-001",
    content: "Bonjour tout le monde! Voici une démo de traduction automatique sur Nostr.",
    tags: [["language", "fr"]],
    pubkey: "demo-user-4",
    created_at: Math.floor(Date.now() / 1000)
  },
  {
    id: "demo-de-001",
    content: "Guten Tag! Dies ist eine Demo für automatische Übersetzung auf Nostr.",
    tags: [["language", "de"]],
    pubkey: "demo-user-5",
    created_at: Math.floor(Date.now() / 1000)
  }
];

let userLang = localStorage.getItem('nostr_translate_userLang') || 'en';
setUserLanguage(userLang);

// Render
function render() {
  const container = document.querySelector('.events-list');
  container.innerHTML = '';

  demoEvents.forEach(event => {
    const eventEl = document.createElement('div');
    eventEl.className = 'event-card';
    eventEl.dataset.eventId = event.id;

    const sourceLang = event.tags?.find(t => t[0] === 'language')?.[1] || 'en';
    let displayContent = getDisplayContent(event.id, event.content, userLang, sourceLang);

    eventEl.innerHTML = `
      <div class="event-header">
        <span class="event-id">${event.id.slice(0, 16)}...</span>
        <span class="event-time">${new Date(event.created_at * 1000).toLocaleTimeString()}</span>
      </div>
      <div class="event-content" data-original="${event.content}">${displayContent}</div>
    `;

    if (sourceLang !== userLang) {
      const badge = document.createElement('span');
      badge.className = 'nostr-translate-badge';
      badge.dataset.eventId = event.id;
      badge.innerHTML = `${getFlag(sourceLang)} ${capitalize(sourceLang)}`;
      badge.title = `Tap to toggle translation between ${capitalize(sourceLang)} and ${capitalize(userLang)}`;
      
      badge.addEventListener('click', () => {
        toggleTranslation(event.id);
        render();
      });

      eventEl.appendChild(badge);
    }

    container.appendChild(eventEl);
  });
}

// User language selector
document.getElementById('user-lang').addEventListener('change', (e) => {
  setUserLanguage(e.target.value);
  render();
});

// Initial render
render();
