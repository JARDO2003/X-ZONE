

function playXZoneSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Son composé de 3 couches pour un effet unique
    const t = ctx.currentTime;

    // Couche 1 : Bip grave (impact)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(180, t);
    osc1.frequency.exponentialRampToValueAtTime(90, t + 0.15);
    gain1.gain.setValueAtTime(0.4, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.3);

    // Couche 2 : Bip aigu (alerte)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(880, t + 0.05);
    osc2.frequency.setValueAtTime(1100, t + 0.15);
    osc2.frequency.setValueAtTime(880, t + 0.25);
    gain2.gain.setValueAtTime(0.0, t);
    gain2.gain.setValueAtTime(0.15, t + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.05);
    osc2.stop(t + 0.4);

    // Couche 3 : Shimmer doré (signature X-ZONE)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(440, t + 0.2);
    osc3.frequency.exponentialRampToValueAtTime(660, t + 0.45);
    gain3.gain.setValueAtTime(0.0, t + 0.2);
    gain3.gain.setValueAtTime(0.2, t + 0.25);
    gain3.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(t + 0.2);
    osc3.stop(t + 0.6);

    // Fermer le contexte proprement
    setTimeout(() => ctx.close(), 800);
  } catch (err) {
    console.log('[X-ZONE] Audio non disponible:', err.message);
  }
}

// ─── ÉCOUTER LES MESSAGES DU SERVICE WORKER ──────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    // Son déclenché par le SW lors d'une notification programmée
    if (e.data?.type === 'PLAY_NOTIF_SOUND') {
      playXZoneSound();
    }
    // Navigation depuis un clic de notification
    if (e.data?.type === 'NAVIGATE') {
      const url = new URL(e.data.url, location.origin);
      const section = url.searchParams.get('section');
      const tab = url.searchParams.get('tab');

      if (section && document.getElementById('section-' + section)) {
        const navBtns = document.querySelectorAll('.nav-item');
        const labels = { flux: 'Flux', factions: 'Factions', market: 'Market', msgs: 'Messages', profil: 'Profil' };
        const btn = Array.from(navBtns).find(b => b.textContent.trim().includes(labels[section] || ''));
        if (btn) switchSection(section, btn);
        if (section === 'msgs' && tab) {
          setTimeout(() => switchMsgsTab(tab), 300);
        }
      }
    }
  });
}

// ─── GARDIEN DE VIE DU SERVICE WORKER ────────────────────────
// Ping le SW toutes les 20 min pour l'empêcher de s'endormir
// et relance le scheduler si nécessaire

function keepSwAlive() {
  if (!navigator.serviceWorker.controller) return;
  navigator.serviceWorker.controller.postMessage({ type: 'PING' });
}

setInterval(keepSwAlive, 20 * 60 * 1000); // toutes les 20 min

// ─── NOTIFICATION IN-APP (toast doré) ────────────────────────
// Affiche un toast visuel à chaque heure paire pendant que l'app est ouverte

function checkAndShowInAppNotif() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  // À heure paire pile (±30s de tolérance)
  if (h % 2 === 0 && m === 0 && s <= 30) {
    const lastShown = parseInt(sessionStorage.getItem('xzone_last_inapp_notif') || '0');
    const key = h; // clé = heure

    if (lastShown !== key) {
      sessionStorage.setItem('xzone_last_inapp_notif', String(key));
      showInAppNotifBanner(h);
      playXZoneSound();
    }
  }
}

function showInAppNotifBanner(hour) {
  const messages = [
    { icon: '⚡', text: 'Le Flux s\'embrase — nouveaux posts en live' },
    { icon: '💬', text: 'Des messages t\'attendent dans la zone' },
    { icon: '🏴', text: 'Tes factions sont actives en ce moment' },
    { icon: '🛒', text: 'Nouvelles annonces crypto sur le Market' },
    { icon: '🌐', text: 'Le Salon Anonyme est en feu' },
    { icon: '🌙', text: 'X-ZONE ne dort jamais — entre dans la zone' },
  ];

  const isNight = hour === 22;
  const msg = isNight
    ? { icon: '🌙', text: '22h — La nuit de X-ZONE commence. Secrets et vérités.' }
    : messages[Math.floor(Math.random() * messages.length)];

  // Créer un banner premium
  const banner = document.createElement('div');
  banner.style.cssText = `
    position: fixed;
    top: 66px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    background: linear-gradient(135deg, #0f0f0f, #1a1500);
    border: 1px solid rgba(201,168,76,0.6);
    border-radius: 14px;
    padding: 12px 18px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 999;
    box-shadow: 0 8px 32px rgba(201,168,76,0.25), 0 2px 8px rgba(0,0,0,0.6);
    max-width: calc(100vw - 32px);
    width: 360px;
    animation: xzBannerIn 0.4s cubic-bezier(.175,.885,.32,1.275) forwards;
    font-family: 'Syne', sans-serif;
  `;

  banner.innerHTML = `
    <style>
      @keyframes xzBannerIn {
        from { opacity:0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
        to   { opacity:1; transform: translateX(-50%) translateY(0)     scale(1); }
      }
      @keyframes xzBannerOut {
        to   { opacity:0; transform: translateX(-50%) translateY(-20px) scale(0.9); }
      }
      .xz-banner-pulse {
        width: 36px; height: 36px;
        background: radial-gradient(circle, rgba(201,168,76,0.3) 0%, transparent 70%);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
        animation: xzPulse 1.5s ease infinite;
      }
      @keyframes xzPulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); }
        50%      { box-shadow: 0 0 0 8px rgba(201,168,76,0); }
      }
    </style>
    <div class="xz-banner-pulse">${msg.icon}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:11px;font-weight:700;color:#c9a84c;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px">X—ZONE</div>
      <div style="font-size:13px;color:#e8e8e8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${msg.text}</div>
    </div>
    <button onclick="this.parentElement.remove()" style="
      width:24px;height:24px;
      background:rgba(255,255,255,0.05);
      border:1px solid rgba(201,168,76,0.2);
      border-radius:50%;
      color:#888;
      cursor:pointer;
      font-size:12px;
      display:flex;align-items:center;justify-content:center;
      flex-shrink:0;
      transition: all 0.2s;
    " onmouseover="this.style.color='#c9a84c'" onmouseout="this.style.color='#888'">✕</button>
  `;

  document.body.appendChild(banner);

  // Auto-dismiss après 6 secondes
  setTimeout(() => {
    if (banner.parentElement) {
      banner.style.animation = 'xzBannerOut 0.3s ease forwards';
      setTimeout(() => banner.remove(), 300);
    }
  }, 6000);
}

// Vérifier toutes les 30 secondes
setInterval(checkAndShowInAppNotif, 30000);

// ─── EXPOSER LE SON POUR LES TESTS ───────────────────────────
window._xzPlaySound = playXZoneSound;
window._xzTestNotif = () => {
  // Test depuis la console : _xzTestNotif()
  playXZoneSound();
  showInAppNotifBanner(new Date().getHours());
};
