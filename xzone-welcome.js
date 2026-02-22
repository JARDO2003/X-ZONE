// ============================================================
//  X-ZONE — MESSAGES DE BIENVENUE & AU REVOIR
//  À coller dans le <script type="module"> juste AVANT autoLogin()
// ============================================================

// ─── MESSAGES DE BIENVENUE (à l'entrée) ─────────────────────
const WELCOME_MESSAGES = [
  { icon: '⚡', title: 'Bienvenue dans la Zone', text: 'Content de te revoir. La zone t\'a attendu.' },
  { icon: '🔥', title: 'Tu es de retour', text: 'X-ZONE s\'illumine à ton arrivée. Entre.' },
  { icon: '🏴', title: 'La Zone t\'accueille', text: 'Tes factions t\'ont manqué. Sois le bienvenu.' },
  { icon: '🌙', title: 'Dans l\'ombre, tu arrives', text: 'La zone ne dort jamais. Toi non plus.' },
  { icon: '🔒', title: 'Connexion sécurisée', text: 'Ton identité est protégée. Tu peux parler librement.' },
  { icon: '👁', title: 'On t\'avait presque oublié', text: 'Mais la zone a une bonne mémoire. Bienvenue.' },
];

// ─── MESSAGES D'AU REVOIR (à la sortie) ─────────────────────
const GOODBYE_MESSAGES = [
  { icon: '🌑', title: 'Tu quittes la Zone', text: 'Reviens vite — la zone ne sera pas la même sans toi.' },
  { icon: '🙏', title: 'Merci d\'être passé', text: 'Ta présence a compté. À très bientôt sur X-ZONE.' },
  { icon: '🔐', title: 'Session terminée', text: 'Tes données restent chiffrées. Prends soin de toi.' },
  { icon: '⚡', title: 'La Zone se souvient', text: 'Tu pars, mais X-ZONE t\'attend. Reviens.' },
  { icon: '🌙', title: 'Bonne nuit, membre', text: 'Repose-toi. La zone sera là à ton réveil.' },
  { icon: '🏴', title: 'À bientôt, frère', text: 'Ta faction a besoin de toi. Ne tarde pas trop.' },
];

// ─── BANNIÈRE UNIVERSELLE ────────────────────────────────────
function showXZoneBanner({ icon, title, text, type = 'welcome' }) {
  // Supprimer toute bannière existante
  document.querySelectorAll('.xz-welcome-banner').forEach(b => b.remove());

  const isGoodbye = type === 'goodbye';

  const banner = document.createElement('div');
  banner.className = 'xz-welcome-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 20px;
    background: linear-gradient(135deg, 
      ${isGoodbye ? '#0a0a12' : '#0a0a08'}, 
      ${isGoodbye ? '#12101a' : '#100e00'}
    );
    border-bottom: 1px solid ${isGoodbye ? 'rgba(150,100,255,0.4)' : 'rgba(201,168,76,0.5)'};
    box-shadow: 0 4px 30px ${isGoodbye ? 'rgba(150,100,255,0.15)' : 'rgba(201,168,76,0.15)'};
    transform: translateY(-100%);
    transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
    font-family: 'Syne', sans-serif;
    cursor: pointer;
  `;

  banner.innerHTML = `
    <div style="
      width: 42px; height: 42px;
      border-radius: 50%;
      background: ${isGoodbye 
        ? 'radial-gradient(circle, rgba(150,100,255,0.25) 0%, transparent 70%)' 
        : 'radial-gradient(circle, rgba(201,168,76,0.25) 0%, transparent 70%)'};
      border: 1px solid ${isGoodbye ? 'rgba(150,100,255,0.4)' : 'rgba(201,168,76,0.4)'};
      display: flex; align-items: center; justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
      animation: xzIconPulse 2s ease infinite;
    ">${icon}</div>
    <div style="flex: 1; min-width: 0">
      <div style="
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: ${isGoodbye ? '#a078ff' : '#c9a84c'};
        margin-bottom: 2px;
      ">${title}</div>
      <div style="
        font-size: 13px;
        color: #d0d0d0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      ">${text}</div>
    </div>
    <div style="
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      color: ${isGoodbye ? 'rgba(150,100,255,0.5)' : 'rgba(201,168,76,0.5)'};
      flex-shrink: 0;
    ">X—ZONE</div>

    <style>
      @keyframes xzIconPulse {
        0%, 100% { box-shadow: 0 0 0 0 ${isGoodbye ? 'rgba(150,100,255,0.3)' : 'rgba(201,168,76,0.3)'}; }
        50%       { box-shadow: 0 0 0 8px transparent; }
      }
    </style>
  `;

  // Clic pour fermer
  banner.addEventListener('click', () => dismissBanner(banner));

  document.body.prepend(banner);

  // Slide-in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.style.transform = 'translateY(0)';
    });
  });

  // Auto-dismiss
  const duration = isGoodbye ? 3500 : 4500;
  setTimeout(() => dismissBanner(banner), duration);
}

function dismissBanner(banner) {
  if (!banner || !banner.parentElement) return;
  banner.style.transition = 'transform 0.35s cubic-bezier(0.36, 0, 0.66, -0.56), opacity 0.35s ease';
  banner.style.transform = 'translateY(-100%)';
  banner.style.opacity = '0';
  setTimeout(() => banner.remove(), 380);
}

// ─── AFFICHER LE MESSAGE DE BIENVENUE ────────────────────────
function showWelcomeBanner(isFirstVisit) {
  const msgs = WELCOME_MESSAGES;
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  
  // Légère attente pour laisser l'app se charger visuellement
  setTimeout(() => {
    showXZoneBanner({ ...msg, type: 'welcome' });
    // Son discret de bienvenue
    playWelcomeSound();
  }, 800);
}

// ─── AFFICHER LE MESSAGE D'AU REVOIR ─────────────────────────
function showGoodbyeBanner() {
  const msgs = GOODBYE_MESSAGES;
  const msg = msgs[Math.floor(Math.random() * msgs.length)];
  showXZoneBanner({ ...msg, type: 'goodbye' });
}

// ─── SONS ────────────────────────────────────────────────────
function playWelcomeSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;

    // Accord montant doux (bienvenue)
    const notes = [261, 329, 392, 523]; // Do, Mi, Sol, Do octave
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t + i * 0.08;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });

    setTimeout(() => ctx.close(), 1200);
  } catch(e) {}
}

function playGoodbyeSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;

    // Accord descendant doux (au revoir)
    const notes = [523, 392, 329, 261];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = t + i * 0.1;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.1, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.5);
    });

    setTimeout(() => ctx.close(), 1500);
  } catch(e) {}
}

// ─── DÉTECTION SORTIE DE PAGE ────────────────────────────────

// Méthode 1 : visibilitychange (tab hidden / minimisé)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && currentUser) {
    showGoodbyeBanner();
    playGoodbyeSound();
    // Enregistrer l'heure de sortie
    sessionStorage.setItem('xzone_last_exit', Date.now().toString());
  }
  if (document.visibilityState === 'visible' && currentUser) {
    const lastExit = parseInt(sessionStorage.getItem('xzone_last_exit') || '0');
    const elapsed = Date.now() - lastExit;
    // Si absent > 60 secondes, re-afficher le message de bienvenue
    if (elapsed > 60000) {
      showWelcomeBanner(false);
    }
  }
});

// Méthode 2 : beforeunload (fermeture ou navigation)
window.addEventListener('beforeunload', () => {
  if (currentUser) {
    playGoodbyeSound();
    // (La bannière ne peut pas s'afficher au beforeunload, mais le son oui)
  }
});

// Méthode 3 : pagehide (mobile Safari)
window.addEventListener('pagehide', () => {
  if (currentUser) {
    sessionStorage.setItem('xzone_last_exit', Date.now().toString());
  }
});

// ─── HOOK SUR LA FONCTION loginUser ─────────────────────────
// Intercepte loginUser pour afficher le message de bienvenue
// après la connexion réussie

const _originalLoginUser = typeof loginUser !== 'undefined' ? loginUser : null;

// On surcharge via le système d'événements custom
document.addEventListener('xzone:login', () => {
  showWelcomeBanner(false);
});

document.addEventListener('xzone:logout', () => {
  showGoodbyeBanner();
  playGoodbyeSound();
});

// ─── EXPOSER POUR TESTS ──────────────────────────────────────
window._xzWelcome = () => showWelcomeBanner(false);
window._xzGoodbye = () => { showGoodbyeBanner(); playGoodbyeSound(); };
