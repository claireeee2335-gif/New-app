/* ═══════════════════════════════════════════════════════════════
   THE MIDNIGHT POSTBOX  ·  receive.js  v4
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ─────────────────────────────────────────────────────────────────
   1. URL PARAMS
───────────────────────────────────────────────────────────────── */
const params     = new URLSearchParams(window.location.search);
const msgEncoded = params.get('msg')    || '';
const sealFile   = params.get('seal')   || 'seal1.png';
const unlockTs   = parseInt(params.get('unlock') || '0', 10);

let decoded = '';
try { decoded = decodeURIComponent(escape(atob(msgEncoded))); }
catch { decoded = '(This letter could not be decoded — the link may be incomplete or corrupted.)'; }

function safeHtml(s) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML.replace(/\n/g, '<br/>');
}


/* ─────────────────────────────────────────────────────────────────
   2. AUDIO — auto-starts ambience after splash, immediate sounds
───────────────────────────────────────────────────────────────── */
const Audio = (() => {
  const $ = id => document.getElementById(id);
  const S = {
    postboxOpen: $('sndPostboxOpen'),
    envTear:     $('sndEnvTear'),
    paperSlide:  $('sndPaperSlide'),
    ambience:    $('sndAmbience'),
  };
  S.ambience.volume = 0.90;
  let ready = false;

  function unlock() {
    ready = true;
    Object.values(S).forEach(n => n && n.load());
    // Start ambience straight away for atmosphere
    S.ambience.play().catch(() => {});
  }

  // play() with optional ms delay
  function play(key, delay) {
    if (!ready) return;
    const n = S[key]; if (!n) return;
    const go = () => { n.currentTime = 0; n.play().catch(() => {}); };
    delay > 0 ? setTimeout(go, delay) : go();
  }

  return { unlock, play };
})();


/* ─────────────────────────────────────────────────────────────────
   3. PARTICLES
───────────────────────────────────────────────────────────────── */
function burst(anchorEl) {
  const c = document.getElementById('particles');
  const r = anchorEl.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const COLS = ['#c8a96e','#e8d5a3','#f8b84a','#ffd700','#fff4d6','#e0a040'];

  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    p.className = 'p';
    const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 200;
    const dx = (Math.cos(a) * d).toFixed(1), dy = (Math.sin(a) * d - 80).toFixed(1);
    const sz = (2.5 + Math.random() * 6.5).toFixed(1);
    const delay = (Math.random() * .32).toFixed(2), dur = (.6 + Math.random() * .85).toFixed(2);
    const dr = `${Math.round((Math.random() - .5) * 720)}deg`;
    p.style.cssText = `left:${cx}px;top:${cy}px;width:${sz}px;height:${sz}px;border-radius:50%;background:${COLS[Math.floor(Math.random()*COLS.length)]};--dx:${dx}px;--dy:${dy}px;--dr:${dr};animation-duration:${dur}s;animation-delay:${delay}s;`;
    c.appendChild(p);
    setTimeout(() => p.remove(), (parseFloat(delay) + parseFloat(dur) + .15) * 1000);
  }
}


/* ─────────────────────────────────────────────────────────────────
   4. COUNTDOWN
───────────────────────────────────────────────────────────────── */
let interval = null, launched = false;
const pad = n => String(n).padStart(2, '0');

function pulse(id) {
  const el = document.getElementById(id);
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
}

function tick() {
  const diff = unlockTs - Date.now();
  if (diff <= 0) {
    if (!launched) { launched = true; clearInterval(interval); startCeremony(); }
    return;
  }
  const ts = Math.floor(diff / 1000);
  const d = Math.floor(ts / 86400), h = Math.floor((ts % 86400) / 3600),
        m = Math.floor((ts % 3600) / 60), s = ts % 60;
  const prev = tick._p || {};
  if (prev.s !== s) { document.getElementById('cdS').textContent = pad(s); pulse('cdS'); }
  if (prev.m !== m) { document.getElementById('cdM').textContent = pad(m); pulse('cdM'); }
  if (prev.h !== h) { document.getElementById('cdH').textContent = pad(h); pulse('cdH'); }
  if (prev.d !== d) { document.getElementById('cdD').textContent = pad(d); pulse('cdD'); }
  tick._p = { d, h, m, s };
}


/* ─────────────────────────────────────────────────────────────────
   5. CEREMONY SEQUENCE
   A  → postbox-open plays immediately
   B  → waiting room fades out, ceremony appears with hint
   C  → user clicks envelope/seal
   D  → tear sound + particles + seal cracks
   E  → envelope opens, paper slides up 38% (stays on screen)
   F  → Read button appears
───────────────────────────────────────────────────────────────── */
function startCeremony() {
  const waitingRoom  = document.getElementById('waitingRoom');
  const ceremony     = document.getElementById('ceremony');
  const envClosed    = document.getElementById('envClosed');
  const envOpen      = document.getElementById('envOpen');
  const ceremonySeal = document.getElementById('ceremonySeal');
  const letterReveal = document.getElementById('letterReveal');
  const revealText   = document.getElementById('revealText');
  const openHint     = document.getElementById('openHint');
  const btnRead      = document.getElementById('btnRead');

  // Populate message text
  const html = safeHtml(decoded);
  revealText.innerHTML                         = html;
  document.getElementById('fpText').innerHTML = html;

  // ── A: play postbox-open IMMEDIATELY ─────────────────────────
  Audio.play('postboxOpen');

  // ── B: fade out waiting room, show ceremony ───────────────────
  waitingRoom.classList.add('fade-out');
  setTimeout(() => {
    waitingRoom.style.display = 'none';
    ceremony.classList.add('active');
    setTimeout(() => openHint.classList.add('visible'), 650);
  }, 850);

  // ── C/D/E/F: click handler ────────────────────────────────────
  let opened = false;

  function onOpen() {
    if (opened) return;
    opened = true;
    openHint.classList.remove('visible');

    // Tear sound immediately
    Audio.play('envTear');
    burst(ceremonySeal);

    // Seal cracks off
    ceremonySeal.classList.add('cracking');

    // Envelope swaps (480ms)
    setTimeout(() => {
      envClosed.style.opacity = '0';
      envOpen.style.opacity   = '1';
    }, 480);

    // Paper slides up — play on cue with animation start (850ms)
    setTimeout(() => {
      Audio.play('paperSlide');
      letterReveal.classList.add('sliding');
    }, 850);

    // Read button (2.8s after click)
    setTimeout(() => btnRead.classList.add('visible'), 2800);
  }

  envClosed.addEventListener('click', onOpen);
  ceremonySeal.addEventListener('click', onOpen);
  envOpen.addEventListener('click', onOpen);
}


/* ─────────────────────────────────────────────────────────────────
   6. LETTER VIEW
───────────────────────────────────────────────────────────────── */
function initLetterView() {
  document.getElementById('btnRead').addEventListener('click', () => {
    const c = document.getElementById('ceremony');
    const l = document.getElementById('letterView');
    c.style.transition = 'opacity .5s ease, visibility .5s';
    c.style.opacity = '0'; c.style.visibility = 'hidden';
    setTimeout(() => {
      c.classList.remove('active'); c.style.cssText = '';
      l.classList.add('active');
    }, 510);
  });

  document.getElementById('closeLetterBtn').addEventListener('click', () => {
    document.getElementById('letterView').classList.remove('active');
  });
}


/* ─────────────────────────────────────────────────────────────────
   7. SPLASH
───────────────────────────────────────────────────────────────── */
function initSplash() {
  const splash  = document.getElementById('splash');
  const waiting = document.getElementById('waitingRoom');

  document.getElementById('btnStart').addEventListener('click', () => {
    Audio.unlock();
    splash.classList.add('hidden');

    if (!msgEncoded || !unlockTs) {
      waiting.style.display = 'flex';
      document.getElementById('waitingTitle').textContent = 'No letter found here';
      waiting.querySelector('.waiting-sub').textContent   = 'This link may be incomplete.';
      document.getElementById('countdownEl').style.display = 'none';
      document.getElementById('unlockInfo').style.display  = 'none';
      return;
    }

    // Show unlock date
    const dt   = new Date(unlockTs);
    const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' };
    document.getElementById('unlockInfo').textContent = `Unlocks ${dt.toLocaleDateString('en-US', opts)}`;

    if (Date.now() >= unlockTs) {
      // Already past unlock time — go straight to ceremony
      launched = true;
      startCeremony();
    } else {
      waiting.style.display = 'flex';
      tick();
      interval = setInterval(tick, 1000);
    }
  });
}


/* ─────────────────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Apply chosen seal from URL param before page renders
  document.getElementById('ceremonySeal').src = sealFile;

  initSplash();
  initLetterView();
});
