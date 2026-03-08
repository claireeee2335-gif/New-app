/* ═══════════════════════════════════════════════════════════════
   THE MIDNIGHT POSTBOX  ·  composer.js  v4
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────────────────────────
   1. AUDIO MANAGER
   No sketching sound. Rain + ambience toggleable.
   All gated behind splash user-gesture.
───────────────────────────────────────────────────────────────── */
const Audio = (() => {
  const $ = id => document.getElementById(id);
  const S = {
    rain:        $('sndRain'),
    ambience:    $('sndAmbience'),
    sealClick:   $('sndSealClick'),
    matchStrike: $('sndMatchStrike'),
    waxStamp:    $('sndWaxStamp'),
  };

  S.rain.volume     = 0.55;
  S.ambience.volume = 0.90;

  let ready  = false;
  let rainOn = false;
  let ambOn  = false;

  function unlock() {
    ready = true;
    Object.values(S).forEach(n => { if (n) n.load(); });
  }

  function play(key) {
    if (!ready) return;
    const n = S[key];
    if (!n) return;
    n.currentTime = 0;
    n.play().catch(() => {});
  }

  function toggleRain() {
    if (!ready) return false;
    rainOn = !rainOn;
    rainOn ? S.rain.play().catch(()=>{}) : (S.rain.pause(), S.rain.currentTime = 0);
    return rainOn;
  }

  function toggleAmbience() {
    if (!ready) return false;
    ambOn = !ambOn;
    ambOn ? S.ambience.play().catch(()=>{}) : (S.ambience.pause(), S.ambience.currentTime = 0);
    return ambOn;
  }

  return { unlock, play, toggleRain, toggleAmbience };
})();


/* ─────────────────────────────────────────────────────────────────
   2. SEAL SYSTEM — names are "Stamp 1" through "Stamp 12"
───────────────────────────────────────────────────────────────── */
let selectedSeal = 'seal1.png';

function buildSeals() {
  const grid = document.getElementById('sealsGrid');
  for (let i = 1; i <= 12; i++) {
    const btn = document.createElement('button');
    btn.className = 'seal-btn' + (i === 1 ? ' selected' : '');
    btn.dataset.seal = `seal${i}.png`;
    btn.setAttribute('aria-label', `Stamp ${i}`);

    const img = document.createElement('img');
    img.src = `seal${i}.png`;
    img.alt = `Stamp ${i}`;
    btn.appendChild(img);
    btn.addEventListener('click', () => pickSeal(btn, i));
    grid.appendChild(btn);
  }
}

function pickSeal(btn, num) {
  // Layered stamp sounds
  Audio.play('sealClick');
  setTimeout(() => Audio.play('matchStrike'), 45);
  setTimeout(() => Audio.play('waxStamp'),    390);

  document.querySelectorAll('.seal-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedSeal = btn.dataset.seal;

  document.getElementById('previewImg').src         = selectedSeal;
  document.getElementById('previewName').textContent = `Stamp ${num}`;
}


/* ─────────────────────────────────────────────────────────────────
   3. TEXTAREA — character count only, no sound
───────────────────────────────────────────────────────────────── */
function initTextarea() {
  const area  = document.getElementById('letterArea');
  const count = document.getElementById('charCount');

  area.addEventListener('input', () => {
    count.textContent = `${area.value.length} / 2000`;
  });
}


/* ─────────────────────────────────────────────────────────────────
   4. URL BUILDER
   Fixed: uses lastIndexOf('/') so any filename (with spaces,
   brackets, etc.) is handled correctly.
   Also detects file:// and warns user they need a web server
   to share between different computers.
───────────────────────────────────────────────────────────────── */
function encodeMsg(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function buildUrl(ts) {
  const msg = document.getElementById('letterArea').value.trim();
  if (!msg) return null;

  // Robust base: strip everything after last slash
  const base = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
  const url  = `${base}/receive.html?msg=${encodeMsg(msg)}&seal=${encodeURIComponent(selectedSeal)}&unlock=${ts}`;
  return url;
}

function isFileProtocol() {
  return window.location.protocol === 'file:';
}


/* ─────────────────────────────────────────────────────────────────
   5. SEALING CEREMONY (composer side)
   Paper drops into open envelope → closes → seal pops on
───────────────────────────────────────────────────────────────── */
let pendingUrl = '';

function runSealingCeremony(url) {
  pendingUrl = url;
  const overlay   = document.getElementById('sealingOverlay');
  const sealPaper = document.getElementById('sealPaper');
  const envOpen   = document.getElementById('sealEnvOpen');
  const envClosed = document.getElementById('sealEnvClosed');
  const badge     = document.getElementById('sealBadge');
  const label     = document.getElementById('sealingLabel');

  badge.src = selectedSeal;

  // Reset
  sealPaper.classList.remove('drop');
  envOpen.style.opacity   = '1';
  envClosed.style.opacity = '0';
  badge.classList.remove('pop');
  label.classList.remove('show');
  void sealPaper.offsetWidth;

  overlay.classList.add('open');

  // Step 1 (0.35s): paper drops in
  setTimeout(() => sealPaper.classList.add('drop'), 350);

  // Step 2 (1.55s): envelope closes
  setTimeout(() => {
    envOpen.style.opacity   = '0';
    envClosed.style.opacity = '1';
  }, 1550);

  // Step 3 (2.15s): seal badge pops on
  setTimeout(() => badge.classList.add('pop'), 2150);

  // Step 4 (2.7s): label
  setTimeout(() => {
    label.textContent = 'Sealed with love ✦';
    label.classList.add('show');
  }, 2700);

  // Step 5 (3.8s): show share modal
  setTimeout(() => {
    overlay.classList.remove('open');
    setTimeout(() => openShareModal(pendingUrl), 500);
  }, 3800);
}


/* ─────────────────────────────────────────────────────────────────
   6. SHARE MODAL
───────────────────────────────────────────────────────────────── */
function openShareModal(url) {
  document.getElementById('urlBox').textContent = url;

  // Show a note if on file:// protocol
  const note = document.getElementById('modalNote');
  if (isFileProtocol()) {
    note.textContent =
      '⚠ You\'re running locally. This link works on the same computer. ' +
      'To share between devices, upload the folder to a web host (Netlify, GitHub Pages, etc.).';
    note.style.display = 'block';
  } else {
    note.style.display = 'none';
  }

  document.getElementById('shareModal').classList.add('open');
}

function showError(msg) {
  const el = document.getElementById('statusMsg');
  el.className   = 'status-msg error';
  el.textContent = msg;
  setTimeout(() => { el.className = 'status-msg'; el.textContent = ''; }, 4500);
}


/* ─────────────────────────────────────────────────────────────────
   7. BUTTONS
───────────────────────────────────────────────────────────────── */
function initButtons() {
  // Audio toggles
  document.getElementById('btnRain').addEventListener('click', function() {
    this.classList.toggle('on', Audio.toggleRain());
  });
  document.getElementById('btnAmbience').addEventListener('click', function() {
    this.classList.toggle('on', Audio.toggleAmbience());
  });

  // Schedule
  document.getElementById('btnSchedule').addEventListener('click', () => {
    const msg  = document.getElementById('letterArea').value.trim();
    const date = document.getElementById('delivDate').value;
    const time = document.getElementById('delivTime').value;
    if (!msg)         return showError('Please write your letter first.');
    if (!date||!time) return showError('Please choose a delivery date and time.');
    const dt = new Date(`${date}T${time}:00`);
    if (isNaN(dt))    return showError('Invalid date or time.');
    if (dt <= new Date()) return showError('Please choose a future time.');
    const url = buildUrl(dt.getTime());
    if (url) runSealingCeremony(url);
  });

  // Express — send now
  document.getElementById('btnExpress').addEventListener('click', () => {
    const msg = document.getElementById('letterArea').value.trim();
    if (!msg) return showError('Please write your letter first.');
    const url = buildUrl(Date.now() + 800);
    if (url) runSealingCeremony(url);
  });

  // Copy link
  document.getElementById('btnCopy').addEventListener('click', function() {
    const url = document.getElementById('urlBox').textContent;
    navigator.clipboard.writeText(url)
      .then(()  => flash(this, '✓ Copied!'))
      .catch(() => {
        // Fallback for browsers that block clipboard API on file://
        try {
          const t = document.createElement('textarea');
          Object.assign(t.style, { position:'fixed', opacity:'0' });
          t.value = url;
          document.body.appendChild(t);
          t.select();
          document.execCommand('copy');
          t.remove();
          flash(this, '✓ Copied!');
        } catch(e) {
          flash(this, 'Select & copy manually');
        }
      });
  });

  const closeModal = () => document.getElementById('shareModal').classList.remove('open');
  document.getElementById('btnModalClose').addEventListener('click', closeModal);
  document.getElementById('shareModal').addEventListener('click', e => {
    if (e.target.id === 'shareModal') closeModal();
  });
}

function flash(btn, label) {
  const orig = btn.textContent;
  btn.textContent = label;
  setTimeout(() => { btn.textContent = orig; }, 2400);
}


/* ─────────────────────────────────────────────────────────────────
   8. DATE DEFAULTS — tomorrow at noon
───────────────────────────────────────────────────────────────── */
function setDefaults() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  document.getElementById('delivDate').value = d.toISOString().slice(0, 10);
  document.getElementById('delivTime').value = '12:00';
}


/* ─────────────────────────────────────────────────────────────────
   9. SPLASH — user-gesture gate for autoplay audio policy
───────────────────────────────────────────────────────────────── */
function initSplash() {
  document.getElementById('btnStart').addEventListener('click', () => {
    Audio.unlock();
    document.getElementById('splash').classList.add('hidden');
    setTimeout(() => document.getElementById('composerPage').classList.add('visible'), 200);
  });
}


/* ─────────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildSeals();
  initTextarea();
  initButtons();
  setDefaults();
  initSplash();
});
