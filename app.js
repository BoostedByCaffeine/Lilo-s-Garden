/*************************************************************************
 * 0. PROJECT DIRECTORY PHOTO PATHS & PWA SERVICE WORKER REGISTRATION
 *************************************************************************/
const DEFAULT_PHOTO_PATHS = {
  lilo: './assets/lilo.jpg',
  cheeto: './assets/cheeto.jpg'
};

let deferredInstallPrompt = null;

// Register Service Worker for offline caching & Home Screen installation
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// Capture Android/Desktop native PWA install prompt
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

// Generate a pixel-art Lilo & Cheeto app icon for Apple Touch Icon / Favicon fallback
function generateCustomAppIconDataURL(size = 192) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;

  // Cozy rounded forest background
  g.fillStyle = '#2e4736';
  g.fillRect(0, 0, size, size);
  g.fillStyle = '#68a357';
  g.fillRect(0, Math.round(size * 0.68), size, Math.round(size * 0.32));

  const s = size / 64;
  // Lilo (left) & Cheeto (right) side-by-side pixel icon

  // Lilo head & ears (Pure White coat)
  g.fillStyle = '#ffffff';
  g.fillRect(8 * s, 24 * s, 22 * s, 20 * s);
  g.fillRect(8 * s, 18 * s, 6 * s, 6 * s);
  g.fillRect(24 * s, 18 * s, 6 * s, 6 * s);
  // Lilo inner ears
  g.fillStyle = '#ffccd5';
  g.fillRect(10 * s, 20 * s, 3 * s, 3 * s);
  g.fillRect(25 * s, 20 * s, 3 * s, 3 * s);
  // Lilo blue eyes
  g.fillStyle = '#29b6f6';
  g.fillRect(12 * s, 31 * s, 4 * s, 4 * s);
  g.fillRect(22 * s, 31 * s, 4 * s, 4 * s);
  // Lilo blue collar & gold bell
  g.fillStyle = '#1e88e5';
  g.fillRect(9 * s, 42 * s, 20 * s, 4 * s);
  g.fillStyle = '#ffd54f';
  g.fillRect(17 * s, 44 * s, 4 * s, 4 * s);

  // Cheeto head & ears (Pure White coat)
  g.fillStyle = '#ffffff';
  g.fillRect(34 * s, 24 * s, 22 * s, 20 * s);
  g.fillRect(34 * s, 18 * s, 6 * s, 6 * s);
  g.fillRect(50 * s, 18 * s, 6 * s, 6 * s);
  // Cheeto inner ears
  g.fillStyle = '#ffccd5';
  g.fillRect(36 * s, 20 * s, 3 * s, 3 * s);
  g.fillRect(51 * s, 20 * s, 3 * s, 3 * s);
  // Cheeto odd eyes: Left Amber (#ffb300), Right Blue (#29b6f6)
  g.fillStyle = '#ffb300';
  g.fillRect(38 * s, 31 * s, 4 * s, 4 * s);
  g.fillStyle = '#29b6f6';
  g.fillRect(48 * s, 31 * s, 4 * s, 4 * s);

  return c.toDataURL('image/png');
}

// Helper callable from browser DevTools console: downloadAppIcons()
window.downloadAppIcons = function () {
  [192, 512].forEach(sz => {
    const a = document.createElement('a');
    a.href = generateCustomAppIconDataURL(sz);
    a.download = `icon-${sz}.png`;
    a.click();
  });
};

// Set fallback Apple Touch Icon if ./assets/icon-192.png isn't added yet
window.addEventListener('DOMContentLoaded', () => {
  const testImg = new Image();
  testImg.onerror = () => {
    const iconUrl = generateCustomAppIconDataURL(192);
    const appleLink = document.getElementById('dynamic-apple-icon');
    const favLink = document.getElementById('dynamic-favicon');
    if (appleLink) appleLink.href = iconUrl;
    if (favLink) favLink.href = iconUrl;
  };
  testImg.src = './assets/icon-192.png';
});

/*************************************************************************
 * 1. AUDIBLE WEB AUDIO SYNTHESIZER (CLEAR MEOWS, PURRS, BOWL & RAIN)
 *************************************************************************/
const CozyAudio = {
  ctx: null,
  muted: false,
  rainNode: null,
  rainGain: null,

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  playMeow(profile = 'lilo') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    let fStart = 520, fPeak = 860, fEnd = 610, dur = 0.38;
    if (profile === 'lilo') {
      fStart = 540; fPeak = 890; fEnd = 640; dur = 0.36;
    } else if (profile === 'cheeto') {
      fStart = 460; fPeak = 760; fEnd = 520; dur = 0.42;
    } else if (profile === 'playful') {
      fStart = 620; fPeak = 980; fEnd = 720; dur = 0.30;
    } else if (profile === 'sleepy') {
      fStart = 400; fPeak = 620; fEnd = 430; dur = 0.46;
    }

    osc1.frequency.setValueAtTime(fStart, now);
    osc1.frequency.exponentialRampToValueAtTime(fPeak, now + dur * 0.38);
    osc1.frequency.exponentialRampToValueAtTime(fEnd, now + dur);

    osc2.frequency.setValueAtTime(fStart * 2, now);
    osc2.frequency.exponentialRampToValueAtTime(fPeak * 2, now + dur * 0.38);
    osc2.frequency.exponentialRampToValueAtTime(fEnd * 2, now + dur);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(fPeak * 1.2, now);
    filter.Q.value = 1.6;

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + dur + 0.02);
    osc2.stop(now + dur + 0.02);
  },

  playPurr() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    const masterGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.linearRampToValueAtTime(175, now + 0.7);
    osc.frequency.linearRampToValueAtTime(140, now + 1.5);

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(220, now);

    lfo.type = 'sine';
    lfo.frequency.value = 19;
    lfoGain.gain.value = 65;

    filter.type = 'lowpass';
    filter.frequency.value = 340;

    masterGain.gain.setValueAtTime(0.001, now);
    masterGain.gain.linearRampToValueAtTime(0.22, now + 0.18);
    masterGain.gain.setValueAtTime(0.20, now + 1.0);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.55);

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    osc.start(now);
    subOsc.start(now);
    lfo.start(now);
    osc.stop(now + 1.6);
    subOsc.stop(now + 1.6);
    lfo.stop(now + 1.6);
  },

  playChime() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const now = this.ctx.currentTime + i * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.48);
    });
  },

  playYarnTap() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  },

  updateRainAmbience(isRaining) {
    if (!this.ctx) return;
    if (isRaining && !this.muted) {
      if (!this.rainNode) {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.15;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 950;
        filter.Q.value = 0.7;

        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.value = 0.06;

        noise.connect(filter);
        filter.connect(this.rainGain);
        this.rainGain.connect(this.ctx.destination);
        noise.start();
        this.rainNode = noise;
      }
    } else if (this.rainNode) {
      try { this.rainNode.stop(); } catch (e) {}
      this.rainNode.disconnect();
      this.rainNode = null;
    }
  }
};

/*************************************************************************
 * 2. PERSISTENCE ENGINE & POLAROID PHOTO LOADER
 *************************************************************************/
const STORAGE_KEY = 'lilos_garden_v4_responsive_save';

const LILO_ENTITY = {
  id: 'lilo',
  name: 'Lilo',
  isDefault: true,
  coatColor: '#ffffff',
  shadeColor: '#dbe7f5',
  pattern: 'solid',
  eyeLeftColor: '#29b6f6',
  eyeRightColor: '#29b6f6',
  collarColor: '#1e88e5',
  hasBell: true,
  personality: 'lilo',
  affection: 12
};

// Cheeto: Pure White coat, Amber Left eye, Blue Right eye
const CHEETO_ENTITY = {
  id: 'cheeto',
  name: 'Cheeto',
  isDefault: true,
  coatColor: '#ffffff',
  shadeColor: '#eee8dc',
  pattern: 'solid',
  eyeLeftColor: '#ffb300', // Left eye: Amber
  eyeRightColor: '#29b6f6', // Right eye: Blue
  collarColor: null,
  hasBell: false,
  personality: 'cheeto',
  affection: 12
};

const DEFAULT_TRIBUTE =
  "In loving memory of Lilo, in his little blue collar with bright blue eyes, and his white brother Cheeto with amber and blue eyes. Here in this quiet garden, you are forever safe, fed, and reunited side by side. 💙💛";

const gardenState = {
  foodLevel: 2,
  totalPets: 12,
  flowersCount: 8,
  tributeNote: DEFAULT_TRIBUTE,
  liloPhotoData: null,
  cheetoPhotoData: null,
  weatherMode: 'AUTO',
  currentSky: 'SUNNY',
  tempC: null,
  cats: [],
  brotherBondCooldown: 0
};

function drawPolaroidFallback(canvasId, isLilo) {
  const c = document.getElementById(canvasId);
  if (!c) return;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 120, 120);

  g.fillStyle = isLilo ? '#d8effc' : '#fef7e6';
  g.fillRect(0, 0, 120, 120);
  g.fillStyle = '#7bb369';
  g.fillRect(0, 82, 120, 38);

  [[22, 92], [96, 94], [32, 104], [86, 106]].forEach(([fx, fy]) => {
    g.fillStyle = isLilo ? '#29b6f6' : '#ffd54f';
    g.fillRect(fx, fy, 6, 6);
    g.fillStyle = '#fff59d';
    g.fillRect(fx + 2, fy + 2, 2, 2);
  });

  g.save();
  g.translate(60, 74);
  g.fillStyle = isLilo ? '#dbe7f5' : '#eee8dc';
  g.fillRect(-24, -6, 48, 28);
  g.fillStyle = '#ffffff';
  g.fillRect(-22, -8, 44, 26);

  g.fillStyle = '#ffffff';
  g.fillRect(-20, -36, 40, 30);

  g.fillRect(-20, -46, 11, 10);
  g.fillRect(9, -46, 11, 10);
  g.fillStyle = '#ffccd5';
  g.fillRect(-17, -43, 5, 7);
  g.fillRect(12, -43, 5, 7);

  if (isLilo) {
    g.fillStyle = '#1e88e5';
    g.fillRect(-18, -7, 36, 6);
    g.fillStyle = '#ffd54f';
    g.fillRect(-4, -4, 8, 7);
  }

  // Left Eye (viewer's left, x=-12):
  // Lilo: Blue (#29b6f6) | Cheeto: Amber (#ffb300)
  g.fillStyle = isLilo ? '#29b6f6' : '#ffb300';
  g.fillRect(-12, -24, 7, 7);

  // Right Eye (viewer's right, x=5):
  // Lilo: Blue (#29b6f6) | Cheeto: Blue (#29b6f6)
  g.fillStyle = '#29b6f6';
  g.fillRect(5, -24, 7, 7);

  g.fillStyle = '#ffffff';
  g.fillRect(-10, -23, 2, 2);
  g.fillRect(7, -23, 2, 2);

  g.fillStyle = '#ff9ebb';
  g.fillRect(-3, -15, 6, 4);
  g.restore();
}

function initPolaroidFrames() {
  drawPolaroidFallback('lilo-fallback-canvas', true);
  drawPolaroidFallback('cheeto-fallback-canvas', false);

  setupSinglePolaroid(
    'lilo',
    'lilo-photo-img',
    'lilo-fallback-canvas',
    'lilo-polaroid-card',
    'lilo-file-input'
  );
  setupSinglePolaroid(
    'cheeto',
    'cheeto-photo-img',
    'cheeto-fallback-canvas',
    'cheeto-polaroid-card',
    'cheeto-file-input'
  );
}

function setupSinglePolaroid(key, imgId, canvasId, cardId, inputId) {
  const imgEl = document.getElementById(imgId);
  const canvasEl = document.getElementById(canvasId);
  const cardEl = document.getElementById(cardId);
  const inputEl = document.getElementById(inputId);

  const savedData = key === 'lilo' ? gardenState.liloPhotoData : gardenState.cheetoPhotoData;

  imgEl.onload = () => {
    imgEl.style.display = 'block';
    canvasEl.style.display = 'none';
  };

  imgEl.onerror = () => {
    imgEl.style.display = 'none';
    canvasEl.style.display = 'block';
  };

  if (savedData) {
    imgEl.src = savedData;
  } else {
    imgEl.src = DEFAULT_PHOTO_PATHS[key];
  }

  cardEl.addEventListener('click', () => inputEl.click());

  inputEl.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const tempImg = new Image();
      tempImg.onload = () => {
        const off = document.createElement('canvas');
        off.width = 260;
        off.height = 260;
        const octx = off.getContext('2d');
        const minSide = Math.min(tempImg.width, tempImg.height);
        const sx = (tempImg.width - minSide) / 2;
        const sy = (tempImg.height - minSide) / 2;
        octx.drawImage(tempImg, sx, sy, minSide, minSide, 0, 0, 260, 260);
        const dataUrl = off.toDataURL('image/jpeg', 0.82);

        if (key === 'lilo') {
          gardenState.liloPhotoData = dataUrl;
        } else {
          gardenState.cheetoPhotoData = dataUrl;
        }
        imgEl.src = dataUrl;
        saveGarden();
        showToast(`Updated ${key === 'lilo' ? 'Lilo' : 'Cheeto'}'s Polaroid photo 📷`);
      };
      tempImg.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function encodeSaveToHash() {
  const customCats = gardenState.cats
    .filter(c => !c.isDefault)
    .map(c => ({
      n: c.name,
      c: c.coatColor,
      p: c.pattern,
      el: c.eyeLeftColor,
      er: c.eyeRightColor,
      pe: c.personality,
      a: c.affection
    }));
  const lilo = gardenState.cats.find(c => c.id === 'lilo');
  const cheeto = gardenState.cats.find(c => c.id === 'cheeto');
  const payload = {
    tp: gardenState.totalPets,
    fl: gardenState.flowersCount,
    tn: gardenState.tributeNote,
    la: lilo ? lilo.affection : 12,
    ca: cheeto ? cheeto.affection : 12,
    cc: customCats
  };
  try {
    return btoa(encodeURIComponent(JSON.stringify(payload)));
  } catch (e) {
    return '';
  }
}

function decodeSaveFromHash(hashStr) {
  try {
    const json = decodeURIComponent(atob(hashStr));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function saveGarden() {
  const customCats = gardenState.cats
    .filter(c => !c.isDefault)
    .map(c => ({
      id: c.id,
      name: c.name,
      coatColor: c.coatColor,
      pattern: c.pattern,
      eyeLeftColor: c.eyeLeftColor,
      eyeRightColor: c.eyeRightColor,
      personality: c.personality,
      affection: c.affection
    }));

  const lilo = gardenState.cats.find(c => c.id === 'lilo');
  const cheeto = gardenState.cats.find(c => c.id === 'cheeto');

  const data = {
    foodLevel: gardenState.foodLevel,
    totalPets: gardenState.totalPets,
    flowersCount: gardenState.flowersCount,
    tributeNote: gardenState.tributeNote,
    liloPhotoData: gardenState.liloPhotoData,
    cheetoPhotoData: gardenState.cheetoPhotoData,
    liloAffection: lilo ? lilo.affection : 12,
    cheetoAffection: cheeto ? cheeto.affection : 12,
    customCats
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

function createRuntimeCat(spec, startX, startY) {
  return {
    ...spec,
    x: startX,
    y: startY,
    vx: 0,
    vy: 0,
    targetX: startX,
    targetY: startY,
    facing: Math.random() > 0.5 ? 1 : -1,
    state: 'IDLE',
    stateTimer: 120 + Math.random() * 140,
    animFrame: Math.random() * 100,
    blinkTimer: 90 + Math.random() * 120,
    isBlinking: false,
    pose: 'sit'
  };
}

function loadGarden() {
  let saved = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) saved = JSON.parse(raw);
  } catch (e) {}

  if (window.location.hash && window.location.hash.startsWith('#garden=')) {
    const encoded = window.location.hash.replace('#garden=', '');
    const fromHash = decodeSaveFromHash(encoded);
    if (fromHash) {
      saved = {
        ...saved,
        foodLevel: 2,
        totalPets: fromHash.tp ?? 12,
        flowersCount: fromHash.fl ?? 8,
        tributeNote: fromHash.tn || DEFAULT_TRIBUTE,
        liloAffection: fromHash.la ?? 12,
        cheetoAffection: fromHash.ca ?? 12,
        customCats: (fromHash.cc || []).map((item, idx) => ({
          id: 'friend_' + idx + '_' + Date.now(),
          name: item.n || 'Friend',
          coatColor: item.c || '#f4a261',
          pattern: item.p || 'solid',
          eyeLeftColor: item.el || '#66bb6a',
          eyeRightColor: item.er || item.el || '#66bb6a',
          personality: item.pe || 'gentle',
          affection: item.a || 1
        }))
      };
    }
  }

  const lilo = createRuntimeCat(
    { ...LILO_ENTITY, affection: saved?.liloAffection ?? 12 },
    450,
    330
  );
  const cheeto = createRuntimeCat(
    { ...CHEETO_ENTITY, affection: saved?.cheetoAffection ?? 12 },
    505,
    336
  );

  gardenState.cats = [lilo, cheeto];

  if (saved) {
    gardenState.foodLevel = saved.foodLevel ?? 2;
    gardenState.totalPets = saved.totalPets ?? 12;
    gardenState.flowersCount = Math.min(28, Math.max(6, saved.flowersCount ?? 8));
    gardenState.tributeNote = saved.tributeNote || DEFAULT_TRIBUTE;
    gardenState.liloPhotoData = saved.liloPhotoData || null;
    gardenState.cheetoPhotoData = saved.cheetoPhotoData || null;

    if (Array.isArray(saved.customCats)) {
      saved.customCats.forEach(c => {
        gardenState.cats.push(
          createRuntimeCat(
            {
              id: c.id || 'cat_' + Math.random(),
              name: c.name || 'Mochi',
              isDefault: false,
              coatColor: c.coatColor || '#f4a261',
              shadeColor: 'rgba(0,0,0,0.12)',
              pattern: c.pattern || 'solid',
              eyeLeftColor: c.eyeLeftColor || '#66bb6a',
              eyeRightColor: c.eyeRightColor || c.eyeLeftColor || '#66bb6a',
              collarColor: null,
              hasBell: false,
              personality: c.personality || 'gentle',
              affection: c.affection || 1
            },
            380 + Math.random() * 200,
            270 + Math.random() * 160
          )
        );
      });
    }
  }
  saveGarden();
}

/*************************************************************************
 * 3. INTRO SCREEN PORTRAIT (SLEEPING LILO & CHEETO)
 *************************************************************************/
const introCanvas = document.getElementById('intro-canvas');
const introCtx = introCanvas.getContext('2d');
let introAwake = false;
let introTick = 0;

function drawIntroPortrait() {
  introTick++;
  introCtx.clearRect(0, 0, 220, 128);

  introCtx.fillStyle = '#7bb369';
  introCtx.fillRect(0, 82, 220, 46);
  introCtx.fillStyle = '#d97f6c';
  introCtx.beginPath();
  introCtx.ellipse(110, 94, 68, 20, 0, Math.PI * 2);
  introCtx.fill();

  const flowerSpots = [[28, 96], [42, 108], [176, 98], [192, 106], [110, 116]];
  flowerSpots.forEach(([fx, fy]) => {
    introCtx.fillStyle = '#29b6f6';
    introCtx.fillRect(fx - 2, fy, 4, 4);
    introCtx.fillStyle = '#fff59d';
    introCtx.fillRect(fx - 1, fy + 1, 2, 2);
  });

  const breath = Math.sin(introTick * 0.06) * 1.2;

  // Lilo (Left) - Pure White coat, Blue Eyes & Collar
  introCtx.save();
  introCtx.translate(84, 84 + breath * 0.5);
  introCtx.fillStyle = '#dbe7f5';
  introCtx.fillRect(-22, -12, 36, 18);
  introCtx.fillStyle = '#ffffff';
  introCtx.fillRect(-20, -14, 34, 17);
  introCtx.fillRect(-14, -28, 26, 20);
  introCtx.fillRect(-14, -34, 7, 6);
  introCtx.fillRect(5, -34, 7, 6);
  introCtx.fillStyle = '#ffccd5';
  introCtx.fillRect(-12, -32, 3, 4);
  introCtx.fillRect(7, -32, 3, 4);
  introCtx.fillStyle = '#1e88e5';
  introCtx.fillRect(-12, -9, 22, 4);
  introCtx.fillStyle = '#ffd54f';
  introCtx.fillRect(-2, -7, 4, 4);
  if (!introAwake) {
    introCtx.fillStyle = '#5c768d';
    introCtx.fillRect(-9, -19, 5, 2);
    introCtx.fillRect(2, -19, 5, 2);
  } else {
    introCtx.fillStyle = '#29b6f6';
    introCtx.fillRect(-9, -21, 5, 5);
    introCtx.fillRect(2, -21, 5, 5);
    introCtx.fillStyle = '#ffffff';
    introCtx.fillRect(-8, -21, 2, 2);
    introCtx.fillRect(3, -21, 2, 2);
  }
  introCtx.fillStyle = '#ff9ebb';
  introCtx.fillRect(-2, -15, 3, 2);
  introCtx.restore();

  // Cheeto (Right) - Pure White coat, Amber Left Eye, Blue Right Eye
  introCtx.save();
  introCtx.translate(132, 85 - breath * 0.5);
  introCtx.fillStyle = '#eee8dc';
  introCtx.fillRect(-14, -12, 36, 18);
  introCtx.fillStyle = '#ffffff';
  introCtx.fillRect(-12, -14, 34, 17);
  introCtx.fillRect(-12, -27, 26, 20);
  introCtx.fillRect(-12, -33, 7, 6);
  introCtx.fillRect(7, -33, 7, 6);
  introCtx.fillStyle = '#ffccd5';
  introCtx.fillRect(-10, -31, 3, 4);
  introCtx.fillRect(9, -31, 3, 4);
  if (!introAwake) {
    introCtx.fillStyle = '#7a6f63';
    introCtx.fillRect(-7, -18, 5, 2);
    introCtx.fillRect(4, -18, 5, 2);
  } else {
    // Cheeto awake: Left Amber (#ffb300), Right Blue (#29b6f6)
    introCtx.fillStyle = '#ffb300';
    introCtx.fillRect(-7, -20, 5, 5);
    introCtx.fillStyle = '#29b6f6';
    introCtx.fillRect(4, -20, 5, 5);
    introCtx.fillStyle = '#ffffff';
    introCtx.fillRect(-6, -20, 2, 2);
    introCtx.fillRect(5, -20, 2, 2);
  }
  introCtx.fillStyle = '#ff9ebb';
  introCtx.fillRect(0, -14, 3, 2);
  introCtx.restore();

  introCtx.font = '8px "Press Start 2P", monospace';
  if (!introAwake) {
    introCtx.fillStyle = 'rgba(74, 53, 37, 0.65)';
    const zy = Math.sin(introTick * 0.05) * 3;
    introCtx.fillText('z', 105, 42 + zy);
    introCtx.fillText('Z', 115, 32 - zy);
  } else {
    introCtx.fillStyle = '#29b6f6';
    introCtx.fillText('♥', 96, 36);
    introCtx.fillStyle = '#ffb300';
    introCtx.fillText('♥', 114, 36);
  }

  if (!document.getElementById('intro-overlay').classList.contains('hidden-intro')) {
    requestAnimationFrame(drawIntroPortrait);
  }
}

/*************************************************************************
 * 4. LIVE OPEN-METEO WEATHER & SKY CONTROLLER
 *************************************************************************/
const WEATHER_MODES = ['AUTO', 'SUNNY', 'RAIN', 'NIGHT', 'CLOUDY'];

async function fetchLocalWeather() {
  if (!navigator.geolocation) {
    applyFallbackClockSky();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        const { latitude, longitude } = pos.coords;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.current) {
          gardenState.tempC = Math.round(data.current.temperature_2m);
          const code = data.current.weather_code;
          const isDay = data.current.is_day === 1;
          if (code >= 51 && code <= 99) {
            gardenState.currentSky = 'RAIN';
          } else if (!isDay) {
            gardenState.currentSky = 'NIGHT';
          } else if (code >= 2 && code <= 48) {
            gardenState.currentSky = 'CLOUDY';
          } else {
            gardenState.currentSky = 'SUNNY';
          }
          updateWeatherHUD();
        }
      } catch (e) {
        applyFallbackClockSky();
      }
    },
    () => applyFallbackClockSky(),
    { timeout: 6000 }
  );
}

function applyFallbackClockSky() {
  const hr = new Date().getHours();
  gardenState.currentSky = (hr >= 19 || hr < 6) ? 'NIGHT' : 'SUNNY';
  updateWeatherHUD();
}

function updateWeatherHUD() {
  const sky = gardenState.weatherMode === 'AUTO' ? gardenState.currentSky : gardenState.weatherMode;
  const iconEl = document.getElementById('weather-icon');
  const labelEl = document.getElementById('weather-label');
  const tempSuffix = gardenState.tempC !== null && gardenState.weatherMode === 'AUTO' ? ` ${gardenState.tempC}°C` : '';

  const map = {
    SUNNY: { icon: '☀️', text: `Sunny${tempSuffix}` },
    RAIN: { icon: '🌧️', text: `Rain${tempSuffix}` },
    NIGHT: { icon: '🌙', text: `Night${tempSuffix}` },
    CLOUDY: { icon: '⛅', text: `Cloudy${tempSuffix}` }
  };
  const info = map[sky] || map.SUNNY;
  iconEl.textContent = info.icon;
  labelEl.textContent = info.text;

  CozyAudio.updateRainAmbience(sky === 'RAIN');
}

/*************************************************************************
 * 5. RESPONSIVE CAMERA VIEWPORT & GARDEN WORLD OBJECTS
 *************************************************************************/
const canvas = document.getElementById('garden-canvas');
const ctx = canvas.getContext('2d');

const worldBounds = {
  width: 960,
  height: 600,
  isPortrait: false,
  minX: 90,
  maxX: 870,
  minY: 130,
  maxY: 510
};

const MEMORIAL_STONE = { x: 255, y: 205, radius: 48 };
const FOOD_BOWL = { x: 520, y: 425, radius: 32 };
const PICNIC_BLANKET = { x: 370, y: 390, w: 116, h: 72 };
const RAIN_SHELTER = { x: 700, y: 195, w: 145, h: 110 };

const yarnBall = {
  x: 430,
  y: 455,
  vx: 0,
  vy: 0,
  radius: 11,
  angle: 0
};

function resizeGardenViewport() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isPortraitMobile = vw < 720 && vh > vw;

  worldBounds.isPortrait = isPortraitMobile;

  if (isPortraitMobile) {
    canvas.width = 540;
    canvas.height = Math.min(960, Math.max(720, Math.round(540 * (vh / vw))));

    worldBounds.width = canvas.width;
    worldBounds.height = canvas.height;
    worldBounds.minX = 55;
    worldBounds.maxX = canvas.width - 55;
    worldBounds.minY = 135;
    worldBounds.maxY = canvas.height - 115;

    MEMORIAL_STONE.x = 145;
    MEMORIAL_STONE.y = 225;

    RAIN_SHELTER.x = canvas.width - 135;
    RAIN_SHELTER.y = 225;

    PICNIC_BLANKET.x = Math.round(canvas.width * 0.38);
    PICNIC_BLANKET.y = Math.round(canvas.height * 0.54);

    FOOD_BOWL.x = Math.round(canvas.width * 0.68);
    FOOD_BOWL.y = Math.round(canvas.height * 0.60);
  } else {
    canvas.width = 960;
    canvas.height = 600;

    worldBounds.width = 960;
    worldBounds.height = 600;
    worldBounds.minX = 90;
    worldBounds.maxX = 870;
    worldBounds.minY = 130;
    worldBounds.maxY = 510;

    MEMORIAL_STONE.x = 235;
    MEMORIAL_STONE.y = 205;

    RAIN_SHELTER.x = 735;
    RAIN_SHELTER.y = 190;

    PICNIC_BLANKET.x = 365;
    PICNIC_BLANKET.y = 390;

    FOOD_BOWL.x = 535;
    FOOD_BOWL.y = 425;
  }

  yarnBall.x = Math.min(worldBounds.maxX, Math.max(worldBounds.minX, yarnBall.x));
  yarnBall.y = Math.min(worldBounds.maxY, Math.max(worldBounds.minY, yarnBall.y));

  gardenState.cats.forEach(cat => {
    cat.x = Math.min(worldBounds.maxX, Math.max(worldBounds.minX, cat.x));
    cat.y = Math.min(worldBounds.maxY, Math.max(worldBounds.minY, cat.y));
    cat.targetX = Math.min(worldBounds.maxX, Math.max(worldBounds.minX, cat.targetX));
    cat.targetY = Math.min(worldBounds.maxY, Math.max(worldBounds.minY, cat.targetY));
  });
}

window.addEventListener('resize', resizeGardenViewport);

const particles = [];
const raindrops = Array.from({ length: 65 }, () => ({
  x: Math.random() * 960,
  y: Math.random() * 960,
  len: 10 + Math.random() * 8,
  speed: 7 + Math.random() * 4
}));

const critters = Array.from({ length: 5 }, (_, i) => ({
  x: 150 + Math.random() * 350,
  y: 160 + Math.random() * 320,
  phase: Math.random() * Math.PI * 2,
  color: i % 2 === 0 ? '#29b6f6' : '#fff59d'
}));

function spawnHeart(x, y, color = '#ff6b8b', text = '♥') {
  particles.push({
    x,
    y,
    vy: -0.9 - Math.random() * 0.4,
    vx: (Math.random() - 0.5) * 0.6,
    alpha: 1,
    color,
    text,
    life: 65
  });
}

function kickYarnBall(fromX, fromY) {
  const dx = yarnBall.x - (fromX ?? (yarnBall.x - (Math.random() - 0.5) * 40));
  const dy = yarnBall.y - (fromY ?? (yarnBall.y - (Math.random() - 0.5) * 40));
  const dist = Math.hypot(dx, dy) || 1;
  yarnBall.vx = (dx / dist) * (4.5 + Math.random() * 2.5) + (Math.random() - 0.5) * 2;
  yarnBall.vy = (dy / dist) * (4.5 + Math.random() * 2.5) + (Math.random() - 0.5) * 2;
  CozyAudio.playYarnTap();

  const activeSky = gardenState.weatherMode === 'AUTO' ? gardenState.currentSky : gardenState.weatherMode;
  if (activeSky !== 'RAIN') {
    gardenState.cats.forEach((cat, idx) => {
      if (idx < 2 || Math.random() < 0.6) {
        cat.state = 'PLAY_YARN';
        cat.stateTimer = 190;
      }
    });
  }
}

/*************************************************************************
 * 6. FINITE STATE MACHINE (FSM) & BROTHER REUNION LOGIC
 *************************************************************************/
function updateCatsAndWorld() {
  const activeSky = gardenState.weatherMode === 'AUTO' ? gardenState.currentSky : gardenState.weatherMode;

  yarnBall.x += yarnBall.vx;
  yarnBall.y += yarnBall.vy;
  yarnBall.vx *= 0.95;
  yarnBall.vy *= 0.95;
  yarnBall.angle += (yarnBall.vx + yarnBall.vy) * 0.1;

  if (yarnBall.x < worldBounds.minX) { yarnBall.x = worldBounds.minX; yarnBall.vx *= -0.8; }
  if (yarnBall.x > worldBounds.maxX) { yarnBall.x = worldBounds.maxX; yarnBall.vx *= -0.8; }
  if (yarnBall.y < worldBounds.minY) { yarnBall.y = worldBounds.minY; yarnBall.vy *= -0.8; }
  if (yarnBall.y > worldBounds.maxY) { yarnBall.y = worldBounds.maxY; yarnBall.vy *= -0.8; }

  critters.forEach(c => {
    c.phase += 0.04;
    c.x += Math.cos(c.phase) * 0.6;
    c.y += Math.sin(c.phase * 1.4) * 0.45;
  });

  if (gardenState.brotherBondCooldown > 0) gardenState.brotherBondCooldown--;
  const lilo = gardenState.cats.find(c => c.id === 'lilo');
  const cheeto = gardenState.cats.find(c => c.id === 'cheeto');
  if (
    lilo &&
    cheeto &&
    gardenState.brotherBondCooldown === 0 &&
    lilo.state !== 'EATING' &&
    cheeto.state !== 'EATING'
  ) {
    const bDist = Math.hypot(lilo.x - cheeto.x, lilo.y - cheeto.y);
    if (bDist < 46) {
      gardenState.brotherBondCooldown = 720;
      lilo.state = 'INTERACT';
      cheeto.state = 'INTERACT';
      lilo.stateTimer = 110;
      cheeto.stateTimer = 110;
      lilo.facing = cheeto.x >= lilo.x ? 1 : -1;
      cheeto.facing = lilo.x >= cheeto.x ? 1 : -1;
      spawnHeart(lilo.x, lilo.y - 28, '#29b6f6', '♥');
      spawnHeart(cheeto.x, cheeto.y - 28, '#ffb300', '♥');
      document.getElementById('lilo-mood-pill').textContent = 'Lilo & Cheeto nose-booped 💙💛';
    }
  }

  gardenState.cats.forEach((cat, idx) => {
    cat.animFrame += 1;

    cat.blinkTimer--;
    if (cat.blinkTimer <= 0) {
      cat.isBlinking = !cat.isBlinking;
      cat.blinkTimer = cat.isBlinking ? 10 : 100 + Math.random() * 140;
    }

    if (activeSky === 'RAIN' && cat.state !== 'INTERACT' && cat.state !== 'EATING') {
      const shelterTargetX = RAIN_SHELTER.x - 28 + (idx % 3) * 28;
      const shelterTargetY = RAIN_SHELTER.y + 10 + Math.floor(idx / 3) * 20;
      const distToShelter = Math.hypot(shelterTargetX - cat.x, shelterTargetY - cat.y);
      if (distToShelter > 14) {
        cat.state = 'WANDER';
        cat.targetX = shelterTargetX;
        cat.targetY = shelterTargetY;
      } else {
        cat.state = 'IDLE';
        cat.pose = 'sleep';
        cat.stateTimer = 100;
      }
    }

    switch (cat.state) {
      case 'IDLE': {
        cat.vx = 0;
        cat.vy = 0;
        cat.stateTimer--;
        if (cat.stateTimer <= 0) {
          if (gardenState.foodLevel > 0 && Math.random() < 0.28) {
            cat.state = 'SEEK_FOOD';
          } else {
            cat.state = 'WANDER';
            cat.pose = 'walk';
            cat.targetX = worldBounds.minX + Math.random() * (worldBounds.maxX - worldBounds.minX);
            cat.targetY = worldBounds.minY + Math.random() * (worldBounds.maxY - worldBounds.minY);
            cat.stateTimer = 180 + Math.random() * 180;
          }
        }
        break;
      }

      case 'WANDER': {
        const dx = cat.targetX - cat.x;
        const dy = cat.targetY - cat.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 8 || cat.stateTimer <= 0) {
          cat.state = 'IDLE';
          cat.pose = Math.random() < 0.35 ? 'sleep' : 'sit';
          cat.stateTimer = 140 + Math.random() * 180;
        } else {
          const speed = 1.05;
          cat.vx = (dx / dist) * speed;
          cat.vy = (dy / dist) * speed;
          cat.x += cat.vx;
          cat.y += cat.vy;
          if (Math.abs(cat.vx) > 0.1) cat.facing = cat.vx > 0 ? 1 : -1;
          cat.pose = 'walk';
          cat.stateTimer--;
        }
        break;
      }

      case 'SEEK_FOOD': {
        if (gardenState.foodLevel <= 0) {
          cat.state = 'IDLE';
          cat.stateTimer = 100;
          break;
        }
        const angleOffset = idx * 0.9;
        const tx = FOOD_BOWL.x + Math.cos(angleOffset) * 22;
        const ty = FOOD_BOWL.y + Math.sin(angleOffset) * 14;
        const dx = tx - cat.x;
        const dy = ty - cat.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) {
          cat.state = 'EATING';
          cat.pose = 'sit';
          cat.stateTimer = 150;
          cat.facing = FOOD_BOWL.x >= cat.x ? 1 : -1;
        } else {
          const speed = 1.45;
          cat.x += (dx / dist) * speed;
          cat.y += (dy / dist) * speed;
          cat.facing = dx >= 0 ? 1 : -1;
          cat.pose = 'walk';
        }
        break;
      }

      case 'EATING': {
        cat.stateTimer--;
        if (cat.stateTimer % 38 === 0) {
          spawnHeart(cat.x, cat.y - 26, '#ffb300', '♪');
        }
        if (cat.stateTimer <= 0) {
          if (gardenState.foodLevel > 0) {
            gardenState.foodLevel = Math.max(0, gardenState.foodLevel - 0.5);
            saveGarden();
          }
          spawnHeart(cat.x, cat.y - 28, '#ff6b8b', '♥');
          cat.state = 'IDLE';
          cat.pose = 'sit';
          cat.stateTimer = 180;
        }
        break;
      }

      case 'PLAY_YARN': {
        cat.stateTimer--;
        const dx = yarnBall.x - cat.x;
        const dy = yarnBall.y - cat.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 18) {
          yarnBall.vx = (Math.random() - 0.5) * 6;
          yarnBall.vy = (Math.random() - 0.5) * 6;
          CozyAudio.playYarnTap();
          spawnHeart(cat.x, cat.y - 26, '#29b6f6', '♪');
          cat.state = 'IDLE';
          cat.pose = 'sit';
          cat.stateTimer = 110;
        } else if (cat.stateTimer <= 0) {
          cat.state = 'IDLE';
          cat.pose = 'sit';
          cat.stateTimer = 120;
        } else {
          const speed = 1.65;
          cat.x += (dx / dist) * speed;
          cat.y += (dy / dist) * speed;
          cat.facing = dx >= 0 ? 1 : -1;
          cat.pose = 'walk';
        }
        break;
      }

      case 'INTERACT': {
        cat.stateTimer--;
        cat.pose = 'sit';
        if (cat.stateTimer <= 0) {
          cat.state = 'IDLE';
          cat.stateTimer = 140;
        }
        break;
      }
    }
  });

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    p.alpha = Math.max(0, p.life / 65);
    if (p.life <= 0) particles.splice(i, 1);
  }
}

/*************************************************************************
 * 7. PIXEL-ART RENDERING PIPELINE
 *************************************************************************/
function drawGardenScene() {
  const W = canvas.width;
  const H = canvas.height;
  const activeSky = gardenState.weatherMode === 'AUTO' ? gardenState.currentSky : gardenState.weatherMode;

  ctx.fillStyle = activeSky === 'NIGHT' ? '#2c4c3e' : activeSky === 'RAIN' ? '#4f7d58' : '#68a357';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = activeSky === 'NIGHT' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)';
  for (let gx = 32; gx < W - 32; gx += 64) {
    for (let gy = 64; gy < H - 40; gy += 64) {
      if ((gx + gy) % 128 === 0) {
        ctx.fillRect(gx, gy, 28, 12);
      }
    }
  }

  ctx.fillStyle = '#8b5e3c';
  for (let fx = 36; fx <= W - 44; fx += 36) {
    ctx.fillRect(fx, 72, 14, 34);
    ctx.fillStyle = '#a47449';
    ctx.fillRect(fx + 2, 74, 10, 10);
    ctx.fillStyle = '#8b5e3c';
  }
  ctx.fillRect(36, 84, W - 72, 8);
  ctx.fillRect(36, 96, W - 72, 6);

  drawMemorialMonument();

  ctx.save();
  ctx.translate(PICNIC_BLANKET.x, PICNIC_BLANKET.y);
  ctx.fillStyle = '#e8d8c8';
  ctx.fillRect(-58, -36, 116, 72);
  ctx.fillStyle = '#d97f6c';
  for (let bx = -58; bx < 58; bx += 24) {
    for (let by = -36; by < 36; by += 24) {
      if (Math.abs(bx + by) % 48 === 0) ctx.fillRect(bx, by, 24, 24);
    }
  }
  ctx.restore();

  drawRainShelter();
  drawFoodBowl();
  drawBlueYarnBall();

  const sortedCats = [...gardenState.cats].sort((a, b) => a.y - b.y);
  sortedCats.forEach(cat => drawPixelCat(cat));

  drawShelterRoof(activeSky);
  drawCritters(activeSky);

  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x - 6, p.y);
    ctx.restore();
  });

  drawAtmosphereOverlay(activeSky, W, H);
}

function drawMemorialMonument() {
  const { x, y } = MEMORIAL_STONE;

  for (let i = 0; i < gardenState.flowersCount; i++) {
    const angle = (i / Math.max(1, gardenState.flowersCount)) * Math.PI * 2 + i * 0.4;
    const radius = 38 + (i % 3) * 10;
    const fx = x + Math.cos(angle) * radius;
    const fy = y + 8 + Math.sin(angle) * (radius * 0.62);

    ctx.fillStyle = '#3b7a57';
    ctx.fillRect(fx - 1, fy + 2, 3, 5);
    ctx.fillStyle = '#29b6f6';
    ctx.fillRect(fx - 4, fy - 3, 8, 7);
    ctx.fillStyle = i % 5 === 0 ? '#ffb300' : '#fff59d';
    ctx.fillRect(fx - 1, fy - 1, 3, 3);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 26, 36, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7f8c8d';
  ctx.fillRect(x - 28, y - 22, 56, 46);
  ctx.fillStyle = '#95a5a6';
  ctx.fillRect(x - 24, y - 28, 48, 48);

  // Twin eyes icons on stone: Blue for Lilo, Amber for Cheeto
  ctx.fillStyle = '#29b6f6';
  ctx.fillRect(x - 9, y - 10, 7, 7);
  ctx.fillStyle = '#ffb300';
  ctx.fillRect(x + 2, y - 10, 7, 7);

  ctx.font = '700 10px Quicksand, sans-serif';
  ctx.fillStyle = '#fffaf0';
  ctx.textAlign = 'center';
  ctx.fillText('Lilo & Cheeto', x, y + 13);
}

function drawRainShelter() {
  const { x, y } = RAIN_SHELTER;
  ctx.fillStyle = '#7c5338';
  ctx.fillRect(x - 66, y - 20, 132, 66);
  ctx.fillStyle = '#946646';
  ctx.fillRect(x - 62, y - 16, 124, 58);

  ctx.fillStyle = '#c86d75';
  ctx.beginPath();
  ctx.ellipse(x, y + 15, 44, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5c3c26';
  ctx.fillRect(x - 58, y - 56, 10, 48);
  ctx.fillRect(x + 48, y - 56, 10, 48);
}

function drawShelterRoof(activeSky) {
  const { x, y } = RAIN_SHELTER;
  ctx.fillStyle = '#6d452b';
  ctx.beginPath();
  ctx.moveTo(x - 74, y - 40);
  ctx.lineTo(x, y - 78);
  ctx.lineTo(x + 74, y - 40);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#875738';
  ctx.fillRect(x - 68, y - 44, 136, 8);

  const lanternGlow = activeSky === 'NIGHT' || activeSky === 'RAIN';
  if (lanternGlow) {
    const grad = ctx.createRadialGradient(x, y - 32, 4, x, y - 32, 68);
    grad.addColorStop(0, 'rgba(255, 213, 79, 0.55)');
    grad.addColorStop(1, 'rgba(255, 213, 79, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y - 32, 68, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = lanternGlow ? '#ffd54f' : '#d7ccc8';
  ctx.fillRect(x - 5, y - 36, 10, 12);
}

function drawFoodBowl() {
  const { x, y } = FOOD_BOWL;
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#29b6f6';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (gardenState.foodLevel > 0) {
    ctx.fillStyle = '#8d5524';
    const count = gardenState.foodLevel > 1 ? 9 : 4;
    for (let i = 0; i < count; i++) {
      const kx = x - 10 + (i % 4) * 6;
      const ky = y - 3 + Math.floor(i / 4) * 4;
      ctx.fillRect(kx, ky, 4, 4);
    }
  }
}

function drawBlueYarnBall() {
  ctx.save();
  ctx.translate(yarnBall.x, yarnBall.y);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(yarnBall.angle);
  ctx.fillStyle = '#1e88e5';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#64b5f6';
  ctx.fillRect(-6, -4, 12, 3);
  ctx.fillRect(-3, -7, 3, 14);
  ctx.restore();
}

function drawPixelCat(cat) {
  ctx.save();
  ctx.translate(Math.round(cat.x), Math.round(cat.y));

  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 11, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(cat.facing, 1);

  const walkBob = cat.pose === 'walk' ? Math.abs(Math.sin(cat.animFrame * 0.22)) * 3 : 0;
  const breath = Math.sin(cat.animFrame * 0.06) * 0.8;

  const tailWag = Math.sin(cat.animFrame * 0.12) * 3;
  ctx.fillStyle = cat.coatColor;
  ctx.fillRect(-20, -6 - walkBob + tailWag * 0.4, 8, 5);
  ctx.fillRect(-24, -11 - walkBob + tailWag, 6, 7);

  ctx.fillStyle = cat.coatColor;
  ctx.fillRect(-14, -10 - walkBob, 26, 16);

  ctx.fillStyle = cat.shadeColor || 'rgba(0,0,0,0.1)';
  ctx.fillRect(-14, 2 - walkBob, 26, 4);

  if (cat.pattern === 'tuxedo') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, -6 - walkBob, 8, 10);
  } else if (cat.pattern === 'tabby') {
    ctx.fillStyle = 'rgba(74, 53, 37, 0.28)';
    ctx.fillRect(-8, -10 - walkBob, 4, 8);
    ctx.fillRect(0, -10 - walkBob, 4, 8);
  } else if (cat.pattern === 'calico') {
    ctx.fillStyle = '#e76f51';
    ctx.fillRect(-10, -9 - walkBob, 9, 8);
    ctx.fillStyle = '#3d405b';
    ctx.fillRect(1, -8 - walkBob, 7, 7);
  }

  const pawShift = cat.pose === 'walk' ? Math.sin(cat.animFrame * 0.25) * 3 : 0;
  ctx.fillStyle = cat.coatColor;
  ctx.fillRect(-11 + pawShift, 5, 6, 5);
  ctx.fillRect(5 - pawShift, 5, 6, 5);

  ctx.fillStyle = cat.coatColor;
  ctx.fillRect(-4, -23 - walkBob + breath, 22, 16);

  ctx.fillRect(-3, -28 - walkBob + breath, 6, 5);
  ctx.fillRect(11, -28 - walkBob + breath, 6, 5);
  ctx.fillStyle = '#ffccd5';
  ctx.fillRect(-1, -26 - walkBob + breath, 3, 3);
  ctx.fillRect(12, -26 - walkBob + breath, 3, 3);

  if (cat.collarColor) {
    ctx.fillStyle = cat.collarColor;
    ctx.fillRect(-2, -8 - walkBob + breath, 18, 3);
    if (cat.hasBell) {
      ctx.fillStyle = '#ffd54f';
      ctx.fillRect(6, -6 - walkBob + breath, 4, 4);
    }
  }

  const sleeping = cat.pose === 'sleep' || cat.isBlinking;
  if (sleeping) {
    ctx.fillStyle = '#5c768d';
    ctx.fillRect(1, -16 - walkBob + breath, 4, 2);
    ctx.fillRect(11, -16 - walkBob + breath, 4, 2);
  } else {
    // When facing right (1), x=1 is left eye and x=11 is right eye.
    // When facing left (-1), scale flips x axis, so swapping keeps anatomical side consistent.
    const leftEyeCol = cat.facing === 1 ? cat.eyeLeftColor : cat.eyeRightColor;
    const rightEyeCol = cat.facing === 1 ? cat.eyeRightColor : cat.eyeLeftColor;

    ctx.fillStyle = leftEyeCol;
    ctx.fillRect(1, -18 - walkBob + breath, 4, 4);
    ctx.fillStyle = rightEyeCol;
    ctx.fillRect(11, -18 - walkBob + breath, 4, 4);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, -18 - walkBob + breath, 1.5, 1.5);
    ctx.fillRect(11, -18 - walkBob + breath, 1.5, 1.5);
  }

  ctx.fillStyle = '#ff9ebb';
  ctx.fillRect(7, -14 - walkBob + breath, 3, 2);

  ctx.restore();

  ctx.font = '700 11px Quicksand, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 250, 240, 0.94)';
  ctx.fillText(cat.name, 0, 24);

  if (cat.pose === 'sleep') {
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillStyle = 'rgba(255,250,240,0.8)';
    ctx.fillText('z', 14, -26 - Math.sin(cat.animFrame * 0.06) * 3);
  }

  ctx.restore();
}

function drawCritters(activeSky) {
  critters.forEach(c => {
    ctx.save();
    ctx.translate(c.x % canvas.width, c.y % canvas.height);
    if (activeSky === 'NIGHT') {
      ctx.fillStyle = 'rgba(255, 213, 79, 0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, 3 + Math.sin(c.phase * 2) * 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (activeSky !== 'RAIN') {
      const wing = Math.abs(Math.sin(c.phase * 3)) * 4;
      ctx.fillStyle = c.color;
      ctx.fillRect(-wing, -2, wing, 4);
      ctx.fillRect(1, -2, wing, 4);
    }
    ctx.restore();
  });
}

function drawAtmosphereOverlay(activeSky, W, H) {
  if (activeSky === 'NIGHT') {
    ctx.fillStyle = 'rgba(18, 28, 52, 0.36)';
    ctx.fillRect(0, 0, W, H);
  } else if (activeSky === 'RAIN') {
    ctx.fillStyle = 'rgba(34, 52, 68, 0.24)';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(180, 218, 255, 0.55)';
    ctx.lineWidth = 1.5;
    raindrops.forEach(r => {
      r.y += r.speed;
      r.x -= 1.2;
      if (r.y > H) { r.y = -10; r.x = Math.random() * W; }
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 3, r.y + r.len);
      ctx.stroke();
    });
  }
}

/*************************************************************************
 * 8. INTERACTIONS & UI EVENT LISTENERS
 *************************************************************************/
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast-whisper');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

function refreshStatsPills() {
  document.getElementById('flower-pill').textContent = `✿ ${gardenState.flowersCount}`;
  document.getElementById('tribute-flower-count').textContent = gardenState.flowersCount;
  document.getElementById('tribute-pet-count').textContent = gardenState.totalPets;
  document.getElementById('intro-stats-note').textContent =
    `${gardenState.cats.length} cats in sanctuary • ${gardenState.flowersCount} Forget-Me-Nots blooming`;
}

canvas.addEventListener('pointerdown', e => {
  CozyAudio.init();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  const touchBoost = e.pointerType === 'touch' ? 1.45 : 1.0;

  for (let i = gardenState.cats.length - 1; i >= 0; i--) {
    const cat = gardenState.cats[i];
    if (Math.hypot(mx - cat.x, my - (cat.y - 8)) < 34 * touchBoost) {
      cat.state = 'INTERACT';
      cat.stateTimer = 110;
      cat.affection = (cat.affection || 0) + 1;
      gardenState.totalPets++;

      CozyAudio.playMeow(cat.personality || 'lilo');
      setTimeout(() => CozyAudio.playPurr(), 160);

      if (cat.id === 'lilo') {
        spawnHeart(cat.x, cat.y - 28, '#29b6f6', '♥');
      } else if (cat.id === 'cheeto') {
        spawnHeart(cat.x, cat.y - 28, '#ffb300', '♥');
      } else {
        spawnHeart(cat.x, cat.y - 28, '#ff6b8b', '♥');
      }

      if (gardenState.totalPets % 3 === 0 && gardenState.flowersCount < 28) {
        gardenState.flowersCount++;
        showToast('A new blue Forget-Me-Not bloomed for Lilo & Cheeto! ✿');
      } else {
        showToast(`${cat.name} chirped and purred warmly ♥`);
      }

      document.getElementById('lilo-mood-pill').textContent = `${cat.name} is purring ♥`;
      refreshStatsPills();
      saveGarden();
      return;
    }
  }

  if (Math.hypot(mx - yarnBall.x, my - yarnBall.y) < 28 * touchBoost) {
    kickYarnBall(mx, my);
    showToast('Lilo & Cheeto noticed the rolling blue yarn! 🧶');
    return;
  }

  if (Math.hypot(mx - FOOD_BOWL.x, my - FOOD_BOWL.y) < 36 * touchBoost) {
    refillFoodBowl();
    return;
  }

  if (Math.hypot(mx - MEMORIAL_STONE.x, my - MEMORIAL_STONE.y) < 50 * touchBoost) {
    document.getElementById('tribute-note-input').value = gardenState.tributeNote;
    refreshStatsPills();
    document.getElementById('tribute-modal').classList.add('open');
    return;
  }
});

function refillFoodBowl() {
  CozyAudio.init();
  gardenState.foodLevel = 2;
  CozyAudio.playChime();
  gardenState.cats.forEach(cat => {
    cat.state = 'SEEK_FOOD';
  });
  showToast('Bowl filled! Lilo, Cheeto & friends are trotting over 🥣');
  saveGarden();
}

document.getElementById('enter-garden-btn').addEventListener('click', () => {
  CozyAudio.init();
  introAwake = true;
  CozyAudio.playMeow('lilo');
  setTimeout(() => CozyAudio.playMeow('cheeto'), 220);
  setTimeout(() => CozyAudio.playPurr(), 420);

  setTimeout(() => {
    document.getElementById('intro-overlay').classList.add('hidden-intro');
    showToast('Tap the Memorial Stone anytime to see Lilo & Cheeto’s Polaroids 💙💛');
  }, 650);
});

document.getElementById('feed-dock-btn').addEventListener('click', refillFoodBowl);
document.getElementById('kick-yarn-btn').addEventListener('click', () => {
  kickYarnBall();
  showToast('Rolled the blue yarn ball across the grass! 🧶');
});

document.getElementById('weather-Btn').addEventListener('click', () => {
  CozyAudio.init();
  const idx = WEATHER_MODES.indexOf(gardenState.weatherMode);
  gardenState.weatherMode = WEATHER_MODES[(idx + 1) % WEATHER_MODES.length];
  updateWeatherHUD();
});

document.getElementById('audio-btn').addEventListener('click', () => {
  CozyAudio.muted = !CozyAudio.muted;
  document.getElementById('audio-btn').textContent = CozyAudio.muted ? '🔇' : '🔊';
  const activeSky = gardenState.weatherMode === 'AUTO' ? gardenState.currentSky : gardenState.weatherMode;
  CozyAudio.updateRainAmbience(activeSky === 'RAIN');
  if (!CozyAudio.muted) CozyAudio.playMeow('lilo');
});

const COAT_COLORS = ['#ffffff', '#f4a261', '#2b2d42', '#e9c46a', '#a8dadc', '#d4a373', '#b5838d'];
const EYE_COLORS = ['#29b6f6', '#ffb300', '#66bb6a', '#ab47bc', '#26a69a'];
let selectedCoat = COAT_COLORS[0];
let selectedEye = EYE_COLORS[0];

function initCustomizerSwatches() {
  const coatWrap = document.getElementById('coat-swatches');
  COAT_COLORS.forEach(col => {
    const s = document.createElement('button');
    s.className = 'color-swatch' + (col === selectedCoat ? ' active' : '');
    s.style.background = col;
    s.onclick = () => {
      selectedCoat = col;
      coatWrap.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
      s.classList.add('active');
    };
    coatWrap.appendChild(s);
  });

  const eyeWrap = document.getElementById('eye-swatches');
  EYE_COLORS.forEach(col => {
    const s = document.createElement('button');
    s.className = 'color-swatch' + (col === selectedEye ? ' active' : '');
    s.style.background = col;
    s.onclick = () => {
      selectedEye = col;
      eyeWrap.querySelectorAll('.color-swatch').forEach(b => b.classList.remove('active'));
      s.classList.add('active');
    };
    eyeWrap.appendChild(s);
  });
}

function renderCatRoster() {
  const list = document.getElementById('cat-roster-list');
  list.innerHTML = '';
  gardenState.cats.forEach(cat => {
    const row = document.createElement('div');
    row.className = 'roster-item';
    const info = document.createElement('div');
    info.className = 'roster-info';
    info.innerHTML = `
      <span style="width:14px;height:14px;border-radius:50%;background:${cat.coatColor};border:1px solid #999;display:inline-block;"></span>
      <span>${cat.name}</span>
      <span style="font-size:0.78rem;color:var(--wood-muted);">♥ ${cat.affection || 0}</span>
    `;
    row.appendChild(info);

    if (cat.isDefault) {
      const badge = document.createElement('span');
      badge.className = 'badge-eternal';
      badge.textContent = cat.id === 'lilo' ? '💙 Blue Collar' : '💛💙 Amber & Blue Eyes';
      row.appendChild(badge);
    } else {
      const del = document.createElement('button');
      del.className = 'remove-cat-btn';
      del.textContent = 'Remove';
      del.onclick = () => {
        gardenState.cats = gardenState.cats.filter(c => c.id !== cat.id);
        saveGarden();
        renderCatRoster();
        refreshStatsPills();
      };
      row.appendChild(del);
    }
    list.appendChild(row);
  });
}

document.getElementById('friends-dock-btn').addEventListener('click', () => {
  renderCatRoster();
  document.getElementById('friends-modal').classList.add('open');
});
document.getElementById('close-friends-modal').addEventListener('click', () => {
  document.getElementById('friends-modal').classList.remove('open');
});

document.getElementById('add-friend-submit').addEventListener('click', () => {
  const nameInput = document.getElementById('friend-name');
  const name = nameInput.value.trim() || 'Mochi';
  const pattern = document.getElementById('friend-pattern').value;
  const personality = document.getElementById('friend-personality').value;

  const newCat = createRuntimeCat(
    {
      id: 'cat_' + Date.now(),
      name,
      isDefault: false,
      coatColor: selectedCoat,
      shadeColor: 'rgba(0,0,0,0.12)',
      pattern,
      eyeLeftColor: selectedEye,
      eyeRightColor: selectedEye,
      collarColor: null,
      hasBell: false,
      personality,
      affection: 1
    },
    canvas.width * 0.5 + (Math.random() - 0.5) * 80,
    canvas.height * 0.5 + (Math.random() - 0.5) * 60
  );

  gardenState.cats.push(newCat);
  nameInput.value = '';
  CozyAudio.playMeow(personality);
  saveGarden();
  renderCatRoster();
  refreshStatsPills();
  showToast(`${name} joined Lilo & Cheeto in the garden! 🐾`);
});

document.getElementById('copy-garden-link-btn').addEventListener('click', () => {
  const hash = encodeSaveToHash();
  if (hash) {
    window.location.hash = 'garden=' + hash;
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
    }
    showToast('Cross-device Garden Link copied to clipboard! 🔗');
  }
});

// PWA Install Button Handler
document.getElementById('install-pwa-btn').addEventListener('click', async () => {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      showToast('Lilo’s Garden installed to your Home Screen! 🌿');
    }
    deferredInstallPrompt = null;
  } else {
    showToast('On iPhone/Android browser menu, tap "Add to Home Screen" 📲');
  }
});

document.getElementById('close-tribute-modal').addEventListener('click', () => {
  document.getElementById('tribute-modal').classList.remove('open');
});
document.getElementById('save-tribute-btn').addEventListener('click', () => {
  gardenState.tributeNote = document.getElementById('tribute-note-input').value.trim() || DEFAULT_TRIBUTE;
  saveGarden();
  document.getElementById('tribute-modal').classList.remove('open');
  showToast('Dedication note saved to Lilo & Cheeto’s monument 🌿');
});

/*************************************************************************
 * 9. BOOTSTRAP & 60FPS SANCTUARY LOOP
 *************************************************************************/
loadGarden();
resizeGardenViewport();
initPolaroidFrames();
initCustomizerSwatches();
refreshStatsPills();
fetchLocalWeather();
drawIntroPortrait();

function mainLoop() {
  updateCatsAndWorld();
  drawGardenScene();
  requestAnimationFrame(mainLoop);
}
requestAnimationFrame(mainLoop);
