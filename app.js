/********************************************************************
 * 0. PWA SERVICE WORKER & INSTALL PROMPT
 ********************************************************************/
let deferredInstallPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { });
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

/********************************************************************
 * 1. WORLD CONSTANTS & PERMANENT CAT BROTHERS (LILO & CHEETO)
 ********************************************************************/
const STORAGE_KEY = 'lilos_garden_save_v1';
const canvas = document.getElementById('garden-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const WORLD_CENTER = { x: 480, y: 310 };

const LANDMARKS = {
  shrine: { x: 340, y: 240, radius: 28, label: "Memorial Stone for Lilo & Cheeto" },
  bowl: { x: 480, y: 370, radius: 22, label: "Ceramic Cat Bowl" },
  shelter: { x: 620, y: 240, radius: 30, label: "Covered Gazebo Shelter" },
  pond: { x: 330, y: 380, radius: 24, label: "Birdbath Pond" },
  rug: { x: 550, y: 340, radius: 24, label: "Sunny Nap Rug" }
};

const GARDEN_BOUNDS = {
  minX: 250,
  maxX: 710,
  minY: 195,
  maxY: 445
};

const COAT_SWATCHES = [
  { name: 'Orange Ginger', hex: '#f59e42', shade: '#c96f18' },
  { name: 'Tuxedo Charcoal', hex: '#374151', shade: '#1f2937' },
  { name: 'Russian Blue', hex: '#7c98b3', shade: '#536b82' },
  { name: 'Warm Cream', hex: '#f5deb3', shade: '#d4b47c' },
  { name: 'Cinnamon Cocoa', hex: '#8d5b4c', shade: '#5e3a2f' },
  { name: 'Lilac Lavender', hex: '#c4b5fd', shade: '#8b74d9' },
  { name: 'Cloud White', hex: '#ffffff', shade: '#dbe7f5' },
  { name: 'Golden Honey', hex: '#fbbf24', shade: '#d97706' }
];

const EYE_SWATCHES = [
  { name: 'Lilo Sky Blue', hex: '#29b6f6' },
  { name: 'Cheeto Amber', hex: '#ffb300' },
  { name: 'Emerald Green', hex: '#4ade80' },
  { name: 'Amethyst Violet', hex: '#c084fc' },
  { name: 'Copper Gold', hex: '#f97316' }
];

const DEFAULT_LILO = Object.freeze({
  id: 'lilo',
  name: 'Lilo',
  isDefault: true,
  coatColor: '#ffffff',
  shadeColor: '#dbe7f5',
  eyeColor: '#29b6f6',
  eyeColorRight: '#29b6f6',
  noseColor: '#ff9ebb',
  collarColor: '#1e88e5',
  pattern: 'solid'
});

const DEFAULT_CHEETO = Object.freeze({
  id: 'cheeto',
  name: 'Cheeto',
  isDefault: true,
  coatColor: '#ffffff',
  shadeColor: '#eee8dc',
  eyeColor: '#ffb300',      // Left eye Amber
  eyeColorRight: '#29b6f6', // Right eye Sky Blue
  noseColor: '#ff9ebb',
  collarColor: null,
  pattern: 'solid'
});

const MEMORIAL_BLOOM_COORDS = [
  [-18, 4], [-15, 11], [15, 6], [18, 11], [-13, -7], [14, -6], [-7, 15], [8, 15],
  [-23, 7], [-21, 17], [21, 8], [23, 17], [-18, -14], [17, -13], [-14, 19], [15, 19],
  [-28, 12], [-25, 22], [26, 12], [28, 22], [-23, -18], [22, -18], [-5, 22], [6, 22]
];

/********************************************************************
 * 2. AUDIBLE COZY AUDIO SYNTHESIZER (Speaker-Friendly Harmonics)
 ********************************************************************/
class CozyAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.rainGain = null;
    this.rainSource = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMeow(catType = 'lilo') {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const isLilo = catType === 'lilo';
      const baseFreq = isLilo ? 540 : 460;
      const peakFreq = isLilo ? 860 : 740;
      const endFreq = isLilo ? 600 : 510;

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(peakFreq, now + 0.12);
      osc1.frequency.exponentialRampToValueAtTime(endFreq, now + 0.36);

      osc2.frequency.setValueAtTime(baseFreq * 1.5, now);
      osc2.frequency.exponentialRampToValueAtTime(peakFreq * 1.5, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.5, now + 0.36);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.24, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.4);
    } catch (e) { }
  }

  playPurr() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const masterGain = this.ctx.createGain();

      // Audible upper-harmonic purr (145Hz - 210Hz) so phone/laptop speakers play it clearly
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.linearRampToValueAtTime(170, now + 0.6);
      osc.frequency.linearRampToValueAtTime(138, now + 1.3);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(215, now);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(19, now);
      lfoGain.gain.setValueAtTime(65, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(340, now);

      masterGain.gain.setValueAtTime(0.001, now);
      masterGain.gain.linearRampToValueAtTime(0.20, now + 0.15);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(this.ctx.destination);

      osc.start(now);
      subOsc.start(now);
      lfo.start(now);
      osc.stop(now + 1.45);
      subOsc.stop(now + 1.45);
      lfo.stop(now + 1.45);
    } catch (e) { }
  }

  startRain() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx || this.rainSource) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.04 * white) / 1.04;
        lastOut = data[i];
        data[i] *= 1.6;
      }
      this.rainSource = this.ctx.createBufferSource();
      this.rainSource.buffer = buffer;
      this.rainSource.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(750, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.rainGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 1.2);

      this.rainSource.connect(filter);
      filter.connect(this.rainGain);
      this.rainGain.connect(this.ctx.destination);
      this.rainSource.start();
    } catch (e) { }
  }

  stopRain() {
    if (!this.rainGain || !this.ctx) return;
    try {
      this.rainGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.8);
      setTimeout(() => {
        if (this.rainSource) {
          try {
            this.rainSource.stop();
            this.rainSource.disconnect();
          } catch (e) { }
          this.rainSource = null;
        }
      }, 900);
    } catch (e) { }
  }

  playFeedSound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [392.0, 440.0, 523.25, 659.25];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.055);
        gain.gain.setValueAtTime(0.001, now + i * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.14, now + i * 0.055 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.055 + 0.28);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.055);
        osc.stop(now + i * 0.055 + 0.3);
      });
    } catch (e) { }
  }

  playMunchPop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) { }
  }
}

const sound = new CozyAudio();

/********************************************************************
 * 3. SAFE DOM HELPERS & TOAST NOTIFICATIONS
 ********************************************************************/
const PIXEL_ICONS = {
  heart: 'M13 22h-2v-2h2v2Zm-2-2H9v-2h2v2Zm4 0h-2v-2h2v2Zm-6-2H7v-2h2v2Zm8 0h-2v-2h2v2ZM7 16H5v-2h2v2Zm12 0h-2v-2h2v2ZM5 14H3v-2h2v2Zm16 0h-2v-2h2v2ZM3 12H1V6h2v6Zm20 0h-2V6h2v6ZM13 8h-2V6h2v2ZM5 6H3V4h2v2Zm6 0H9V4h2v2Zm4 0h-2V4h2v2Zm6 0h-2V4h2v2ZM9 4H5V2h4v2Zm10 0h-4V2h4v2Z',
  'heart-solid': 'M5 2h4v2h2v2h2V4h2V2h4v2h2v2h2v6h-2v2h-2v2h-2v2h-2v2h-2v2h-2v-2H9v-2H7v-2H5v-2H3v-2H1V6h2V4h2V2z',
  paw: 'M4 5h3v4H4V5zm4-2h3v4H8V3zm5 0h3v4h-3V3zm4 2h3v4h-3V5zm-9 5h8v2h2v4h-2v4H8v-4H6v-4h2v-2z',
  sun: 'M13 22h-2v-3h2v3Zm-6-3H5v-2h2v2Zm12 0h-2v-2h2v2Zm-4-2H9v-2h6v2Zm-6-2H7V9h2v6Zm8 0h-2V9h2v6ZM5 13H2v-2h3v2Zm17 0h-3v-2h3v2Zm-7-4H9V7h6v2ZM7 7H5V5h2v2Zm12 0h-2V5h2v2Zm-6-2h-2V2h2v3Z',
  'cloud-sun': 'M14 22H4v-2h10v2ZM4 20H2v-4h2v4Zm12 0h-2v-4h2v4Zm-6-2H8v-2h2v2Zm-2-2H4v-2h4v2Zm6 0h-2v-2h2v2Zm-2-2H8v-2h4v2Zm12-1h-4v-2h4v2Zm-6-1h-2v-2h2v2ZM8 10H6V8h2v2Zm8 0h-2V8h2v2Zm-2-2H8V6h6v2ZM6 6H4V4h2v2Zm14 0h-2V4h2v2ZM4 4H2V2h2v2Zm9 0h-2V0h2v4Zm9 0h-2V2h2v2Z',
  cloud: 'M22 20H2v-2h20v2ZM2 18H0v-6h2v6Zm22 0h-2v-6h2v6Zm-6-6v2h-2v-2h2ZM4 12H2v-2h2v2Zm6 0H8v-2h2v2Zm10-2h2v2h-4V8h2v2ZM8 10H4V8h4v2Zm2-2H8V6h2v2Zm8 0h-2V6h2v2Zm-2-2h-6V4h6v2Z',
  moon: 'M18 22H8v-2h10v2ZM8 20H6v-2h2v2Zm12 0h-2v-2h2v2ZM6 18H4v-2h2v2Zm16 0h-2v-4h-2v-2h2v-2h2v8ZM4 16H2V6h2v10Zm14 0h-6v-2h6v2Zm-6-2h-2v-2h2v2Zm-2-2H8V6h2v6ZM6 6H4V4h2v2Zm8-2h-2v2h-2V4H6V2h8v2Z',
  waves: 'M10 20H6v-2h4v2Zm8 0h-4v-2h4v2ZM6 18H2v-2h4v2Zm8 0h-4v-2h4v2Zm8 0h-4v-2h4v2Zm-12-4H6v-2h4v2Zm8 0h-4v-2h4v2ZM6 12H2v-2h4v2Zm8 0h-4v-2h4v2Zm8 0h-4v-2h4v2ZM10 8H6V6h4v2Zm8 0h-4V6h4v2ZM6 6H2V4h4v2Zm8 0h-4V4h4v2Zm8-2v2h-4V4h4Z',
  'volume-3': 'M11 22H9v-2H7v-2h2V6H7V4h2V2h2v20Zm8 0h-6v-2h6v2Zm2-2h-2v-2h2v2ZM7 18H5v-2h2v2Zm10 0h-4v-2h4v2Zm6 0h-2V6h2v12ZM5 10H3v4h2v2H1V8h4v2Zm14 6h-2V8h2v8Zm-4-2h-2v-4h2v4ZM7 8H5V6h2v2Zm10 0h-4V6h4v2Zm4-2h-2V4h2v2Zm-2-2h-6V2h6v2Z',
  'volume-x': 'M13 22h-2v-2H9v-2h2V6H9V4h2V2h2v20Zm-4-4H7v-2h2v2Zm-2-8H5v4h2v2H3V8h4v2Zm10.001 5.224h-2v-2H17v-2h-1.999v-2h2v2H19v2h-1.999v2Zm3.999 0h-2v-2h2v2Zm0-4h-2v-2h2v2ZM9 8H7V6h2v2Z',
  target: 'M19 23H5v-2h14v2ZM5 21H3v-2h2v2Zm16 0h-2v-2h2v2ZM3 19H1V5h2v14Zm12 0H9v-2h6v2Zm8 0h-2V5h2v14ZM9 17H7v-2h2v2Zm8 0h-2v-2h2v2ZM7 15H5V9h2v6Zm6 0h-2v-2h2v2Zm6 0h-2V9h2v6Zm-8-2H9v-2h2v2Zm4 0h-2v-2h2v2Zm-2-2h-2V9h2v2ZM9 9H7V7h2v2Zm8 0h-2V7h2v2Zm-2-2H9V5h6v2ZM5 5H3V3h2v2Zm16 0h-2V3h2v2Zm-2-2H5V1h14v2Z',
  map: 'M4 20h2v2H2V6h2v14Zm12 0h2v2h-4v-2h-2v-2h2V8h-2V6h4v14Zm-8 0H6v-2h2v2Zm12 0h-2v-2h2v2ZM10 4h2v2h-2v10h2v2H8V4H6V2h4v2Zm12 14h-2V4h-2V2h4v16ZM6 6H4V4h2v2Zm12 0h-2V4h2v2Z',
  'zoom-in': 'M22 22h-2v-2h2v2Zm-2-2h-2v-2h2v2Zm-6-2H6v-2h8v2Zm4 0h-2v-2h2v2ZM6 16H4v-2h2v2Zm10 0h-2v-2h2v2ZM4 14H2V6h2v8Zm7-5h3v2h-3v3H9v-3H6V9h3V6h2v3Zm7 5h-2V6h2v8ZM6 6H4V4h2v2Zm10 0h-2V4h2v2Zm-2-2H6V2h8v2Z',
  camera: 'M20 21H4v-2h16v2ZM4 19H2V7h2v12Zm18 0h-2V7h2v12Zm-8-3h-4v-2h4v2Zm-4-2H8v-4h2v4Zm6 0h-2v-4h2v4Zm-2-4h-4V8h4v2ZM8 7H4V5h4v2Zm12 0h-4V5h4v2Zm-4-2H8V3h8v2Z',
  link: 'M11 18H4v-2h7v2Zm9 0h-7v-2h7v2ZM4 16H2V8h2v8Zm18 0h-2V8h2v8Zm-5-3H7v-2h10v2Zm-6-5H4V6h7v2Zm9 0h-7V6h7v2Z',
  download: 'M19 21H5v-2h14v2ZM5 19H3v-4h2v4Zm16 0h-2v-4h2v4Zm-8-8h4v2h-2v2h-2v2h-2v-2H9v-2H7v-2h4V3h2v8Z',
  smartphone: 'M18 22H6v-2h12v2ZM6 20H4V4h2v16Zm14 0h-2V4h2v16Zm-7-1h-2v-2h2v2Zm5-15H6V2h12v2Z',
  image: 'M8 20h6v-2h2v2h4v2H4v-2h2v-2h2v2Zm-4 0H2V4h2v16Zm18 0h-2v-4h-2v-2h2V4h2v16Zm-12-2H8v-2h2v2Zm4 0h-2v-2h2v2Zm-2-2h-2v-2h2v2Zm4 0h-2v-2h2v2Zm2-2h-2v-2h2v2Zm-8-2H8v-2h2v2Zm-2-2H6V8h2v2Zm4 0h-2V8h2v2Zm-2-2H8V6h2v2Zm10-4H4V2h16v2Z',
  'grid-2x2': 'M20 4h-7v7h7V4h2v16h-2v-7h-7v7h7v2H4v-2h7v-7H4v7H2V4h2v7h7V4H4V2h16v2Z',
  close: 'M7 19H5v-2h2v2Zm12 0h-2v-2h2v2ZM9 15v2H7v-2h2Zm8 2h-2v-2h2v2Zm-6-2H9v-2h2v2Zm4 0h-2v-2h2v2Zm-2-2h-2v-2h2v2Zm-2-2H9V9h2v2Zm4 0h-2V9h2v2ZM9 9H7V7h2v2Zm8 0h-2V7h2v2ZM7 7H5V5h2v2Zm12 0h-2V5h2v2Z',
  leaf: 'M3 22H1v-4h2v4Zm10 0H9v-2h4v2Zm-4-2H5v-2h4v2Zm8 0h-4v-2h4v2ZM5 18H3v-2h2v2Zm14 0h-2v-2h2v2Zm-8-2H5v-2h6v2Zm10 0h-2V4h2v12ZM5 14H3v-4h2v4Zm8 0h-2v-2h2v2Zm-6-4H5V8h2v2Zm6-2H7V6h6v2Zm4-2h-4V4h4v2Zm2-2h-2V2h2v2Z',
  coffee: 'M20 20H2v-2h18v2Zm-4-4H6v-2h10v2Zm4-10h-2v4h2v2h-2v2h-2V6H6v8H4V4h16v2Zm2 4h-2V6h2v4Z',
  fish: 'M18 19h-6v-2h6v2ZM4 9h2v2H4v2h2v2H4v2H2V7h2v2Zm8 8h-2v-2h2v2Zm8 0h-2v-2h2v2Zm-10-2H8v-2h2v2Zm12 0h-2V9h2v6ZM8 13H6v-2h2v2Zm9-1h-2v-2h2v2Zm-7-1H8V9h2v2Zm2-2h-2V7h2v2Zm8 0h-2V7h2v2Zm-2-2h-6V5h6v2Z',
  users: 'M2 22H0v-4h2v4Zm14 0h-2v-4h2v4Zm8 0h-2v-4h2v4ZM4 18H2v-2h2v2Zm10 0h-2v-2h2v2Zm8 0h-2v-2h2v2Zm-10-2H4v-2h8v2Zm8 0h-4v-2h4v2Zm-9-4H5v-2h6v2Zm8 0h-4v-2h4v2ZM5 10H3V4h2v6Zm8 0h-2V4h2v6Zm8 0h-2V4h2v6ZM11 4H5V2h6v2Zm8 0h-4V2h4v2Z',
  sparkle: 'M13 23h-2v-4h2v4Zm-2-4H9v-4h2v4Zm4 0h-2v-4h2v4Zm-6-4H5v-2h4v2Zm10-2v2h-4v-2h4ZM5 13H1v-2h4v2Zm18 0h-4v-2h4v2ZM9 11H5V9h4v2Zm10 0h-4V9h4v2Zm-8-2H9V5h2v4Zm4 0h-2V5h2v4Zm-2-4h-2V1h2v4Z'
};

function getPixelIcon(name, extraClass = '', extraStyle = '') {
  const d = PIXEL_ICONS[name] || PIXEL_ICONS['sparkle'];
  return `<svg class="pixel-icon ${extraClass}" style="${extraStyle}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" shape-rendering="crispEdges"><path d="${d}"/></svg>`;
}

function safeOn(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

function safeText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showToast(message, icon = 'heart-solid', iconColor = '') {
  const box = document.getElementById('toastBox');
  if (!box) return;
  safeText('toastText', message);
  const iconEl = document.getElementById('toastIcon');
  if (iconEl) {
    let iconName = icon;
    if (icon === '💙' || icon === '💛' || icon === '♥' || icon === 'heart') iconName = 'heart-solid';
    else if (icon === '🐾') iconName = 'paw';
    else if (icon === '🌿') iconName = 'leaf';
    else if (icon === '🔊') iconName = 'volume-3';
    else if (icon === '🔇') iconName = 'volume-x';
    else if (icon === '🔗') iconName = 'link';
    else if (icon === '📲') iconName = 'download';
    else if (icon === '🖼️') iconName = 'image';
    else if (icon === '📌') iconName = 'grid-2x2';
    else if (icon === '📷') iconName = 'camera';
    else if (icon === '🎯') iconName = 'target';
    else if (icon === '🗺️') iconName = 'map';
    else if (icon === '🔍') iconName = 'zoom-in';
    else if (icon === '🥣') iconName = 'fish';
    else if (icon === '☀️') iconName = 'sun';
    else if (icon === '⛅') iconName = 'cloud-sun';
    else if (icon === '🌧️') iconName = 'waves';
    else if (icon === '🌙') iconName = 'moon';

    let colorStyle = iconColor ? `color: ${iconColor};` : '';
    if (!iconColor) {
      if (iconName === 'heart-solid' || iconName === 'heart') colorStyle = 'color: #38bdf8;';
      else if (iconName === 'paw') colorStyle = 'color: #d97706;';
      else if (iconName === 'leaf') colorStyle = 'color: #4ade80;';
      else if (iconName === 'fish') colorStyle = 'color: #fbbf24;';
    }
    iconEl.innerHTML = getPixelIcon(iconName, '', colorStyle);
  }
  box.classList.remove('opacity-0', '-translate-y-2');
  box.classList.add('opacity-100', 'translate-y-0');
  clearTimeout(box._timer);
  box._timer = setTimeout(() => {
    box.classList.add('opacity-0', '-translate-y-2');
    box.classList.remove('opacity-100', 'translate-y-0');
  }, 2500);
}

/********************************************************************
 * 4. OPEN-METEO LIVE WEATHER INTEGRATION
 ********************************************************************/
async function syncLiveWeather(w) {
  if (w.weatherMode !== 'AUTO') return;
  if (!navigator.geolocation) {
    w.applyClockFallback();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`;
        const res = await fetch(url);
        const data = await res.json();
        const cur = data.current;
        w.tempC = Math.round(cur.temperature_2m);
        const code = cur.weather_code;
        if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(code)) {
          w.weather = 'RAIN';
          w.skyDesc = 'Rain Shower';
        } else if (cur.is_day === 0) {
          w.weather = 'NIGHT';
          w.skyDesc = 'Starry Night';
        } else if ([2, 3, 45, 48].includes(code)) {
          w.weather = 'CLOUDY';
          w.skyDesc = 'Cloudy Sky';
        } else {
          w.weather = 'SUNNY';
          w.skyDesc = 'Sunny Sky';
        }
        w.onWeatherUpdated();
      } catch (e) {
        w.applyClockFallback();
      }
    },
    () => w.applyClockFallback(),
    { timeout: 6000 }
  );
}

/********************************************************************
 * 5. WORLD ENGINE & FINITE STATE MACHINE
 ********************************************************************/
const world = {
  stats: { pets: 0, meals: 0 },
  petProgress: 0,
  blooms: 8,
  bowlLevel: 3,
  weatherMode: 'AUTO',
  weather: 'SUNNY',
  skyDesc: 'Sunny Sky',
  tempC: 24,
  tributeNote: "Forever loved, forever missed. Enjoy the endless sunshine, crunchy kibble, and cozy gazebo naps, sweet Lilo and Cheeto.",
  cats: [],
  particles: [],
  critters: [],
  rainDrops: [],
  pointer: { x: -100, y: -100, hoveredEntity: null },

  init() {
    this.load();
    this.initCritters();
    this.initRain();
    syncLiveWeather(this);
    this.syncUI();
  },

  applyClockFallback() {
    const hour = new Date().getHours();
    if (hour < 6 || hour >= 19) {
      this.weather = 'NIGHT';
      this.skyDesc = 'Firefly Night';
      this.tempC = 18;
    } else {
      this.weather = 'SUNNY';
      this.skyDesc = 'Sunny Sky';
      this.tempC = 25;
    }
    this.onWeatherUpdated();
  },

  onWeatherUpdated() {
    if (this.weather === 'RAIN') {
      sound.startRain();
      this.cats.forEach((c, idx) => {
        if (c.state !== 'SHELTERED') {
          c.state = 'SEEK_SHELTER';
          c.targetX = 610 + ((idx % 2) * 16);
          c.targetY = 238 + (idx % 2 === 0 ? 0 : 6);
        }
      });
    } else {
      sound.stopRain();
      this.cats.forEach((c) => {
        if (c.state === 'SHELTERED') {
          c.state = 'IDLE';
          c.stateTimer = 2.5;
        }
      });
    }
    if (window.AndroidBridge && typeof window.AndroidBridge.syncGardenToWidget === 'function') {
      try {
        window.AndroidBridge.syncGardenToWidget(JSON.stringify(this.serialize()));
      } catch (e) {}
    }
    this.syncUI();
  },

  cycleWeather() {
    const modes = ['AUTO', 'SUNNY', 'CLOUDY', 'RAIN', 'NIGHT'];
    const nextIdx = (modes.indexOf(this.weatherMode) + 1) % modes.length;
    this.weatherMode = modes[nextIdx];
    if (this.weatherMode === 'AUTO') {
      syncLiveWeather(this);
      showToast('Live Weather: Open-Meteo GPS', 'cloud-sun');
    } else {
      this.weather = this.weatherMode;
      const map = {
        SUNNY: { desc: 'Sunny Sky', temp: 25, icon: 'sun' },
        CLOUDY: { desc: 'Cloudy Sky', temp: 21, icon: 'cloud-sun' },
        RAIN: { desc: 'Rain Shower', temp: 18, icon: 'waves' },
        NIGHT: { desc: 'Firefly Night', temp: 16, icon: 'moon' }
      };
      this.skyDesc = map[this.weather].desc;
      this.tempC = map[this.weather].temp;
      this.onWeatherUpdated();
      showToast(`Weather: ${this.skyDesc}`, map[this.weather].icon);
    }
    this.save();
  },

  createCatRuntime(spec, index = 0) {
    let startX = 460 + ((index * 36) % 100);
    let startY = 310 + ((index * 24) % 55);
    if (spec.id === 'lilo') { startX = 455; startY = 315; }
    if (spec.id === 'cheeto') { startX = 500; startY = 322; }
    return {
      ...spec,
      x: startX,
      y: startY,
      targetX: startX,
      targetY: startY,
      facing: index % 2 === 0 ? 1 : -1,
      state: 'IDLE',
      pose: 'sit',
      stateTimer: 3 + Math.random() * 4,
      animTime: Math.random() * 10,
      playTimer: 0,
      seed: Math.random() * 100,
      labelAlpha: 1.4,
      socialCooldown: 0
    };
  },

  load() {
    let saved = null;
    try {
      if (window.location.hash && window.location.hash.includes('garden=')) {
        const rawHash = window.location.hash.split('garden=')[1];
        if (rawHash) {
          const decodedStr = decodeURIComponent(rawHash);
          try {
            saved = JSON.parse(decodeURIComponent(escape(atob(decodedStr))));
          } catch (e1) {
            try { saved = JSON.parse(decodedStr); } catch (e2) { }
          }
          if (saved) {
            setTimeout(() => showToast('Garden loaded from shared link!', 'leaf'), 600);
          }
        }
      }
    } catch (e) { }

    if (!saved) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) saved = JSON.parse(raw);
      } catch (e) {
        saved = null;
      }
    }

    if (saved && typeof saved === 'object') {
      this.stats.pets = Number(saved.stats?.pets) || 0;
      this.stats.meals = Number(saved.stats?.meals) || 0;
      this.petProgress = Number(saved.petProgress) || 0;
      this.blooms = typeof saved.blooms === 'number' ? Math.max(1, Math.min(24, saved.blooms)) : 8;
      this.bowlLevel = typeof saved.bowlLevel === 'number' ? Math.max(0, Math.min(3, saved.bowlLevel)) : 3;
      if (saved.tributeNote) this.tributeNote = String(saved.tributeNote);
      if (saved.weatherMode) this.weatherMode = saved.weatherMode;

      const companions = Array.isArray(saved.companions)
        ? saved.companions.filter((c) => c && c.id !== 'lilo' && c.id !== 'cheeto')
        : [];

      this.cats = [
        this.createCatRuntime(DEFAULT_LILO, 0),
        this.createCatRuntime(DEFAULT_CHEETO, 1),
        ...companions.map((c, idx) => this.createCatRuntime(c, idx + 2))
      ];
    } else {
      this.cats = [
        this.createCatRuntime(DEFAULT_LILO, 0),
        this.createCatRuntime(DEFAULT_CHEETO, 1)
      ];
      this.save();
    }
  },

  serialize() {
    const companions = this.cats
      .filter((c) => !c.isDefault && c.id !== 'lilo' && c.id !== 'cheeto')
      .map((c) => ({
        id: c.id,
        name: c.name,
        coatColor: c.coatColor,
        shadeColor: c.shadeColor,
        eyeColor: c.eyeColor,
        eyeColorRight: c.eyeColorRight || c.eyeColor,
        noseColor: c.noseColor || '#ff9ebb',
        pattern: c.pattern || 'solid'
      }));
    return {
      version: 4,
      updatedAt: new Date().toISOString(),
      stats: this.stats,
      petProgress: this.petProgress,
      blooms: this.blooms,
      bowlLevel: this.bowlLevel,
      weatherMode: this.weatherMode,
      tributeNote: this.tributeNote,
      companions
    };
  },

  save() {
    const payload = JSON.stringify(this.serialize());
    try {
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (e) {}
    if (window.AndroidBridge && typeof window.AndroidBridge.syncGardenToWidget === 'function') {
      try {
        window.AndroidBridge.syncGardenToWidget(payload);
      } catch (e) {}
    }
    this.syncUI();
  },

  initCritters() {
    this.critters = [];
    for (let i = 0; i < 4; i++) {
      this.critters.push({
        type: 'butterfly',
        x: 320 + Math.random() * 320,
        y: 220 + Math.random() * 180,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 12,
        phase: Math.random() * Math.PI * 2,
        color: ['#38bdf8', '#f472b6', '#fde047', '#a78bfa'][i % 4]
      });
    }
    for (let i = 0; i < 14; i++) {
      this.critters.push({
        type: 'firefly',
        x: 240 + Math.random() * 480,
        y: 190 + Math.random() * 260,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 6,
        phase: Math.random() * Math.PI * 2
      });
    }
  },

  initRain() {
    this.rainDrops = [];
    for (let i = 0; i < 80; i++) {
      this.rainDrops.push({
        x: 180 + Math.random() * 600,
        y: 100 + Math.random() * 400,
        speed: 210 + Math.random() * 90,
        len: 5 + Math.random() * 4
      });
    }
  },

  spawnHeart(x, y, type = 'heart') {
    const count = type === 'heart' ? 3 : 4;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() * 10 - 5),
        y: y - 8 + (Math.random() * 4 - 2),
        vx: (Math.random() - 0.5) * 14,
        vy: -15 - Math.random() * 12,
        life: 1.1 + Math.random() * 0.4,
        maxLife: 1.5,
        type
      });
    }
  },

  spawnSleepZ(x, y) {
    this.particles.push({
      x: x + 5,
      y: y - 12,
      vx: 4,
      vy: -8,
      life: 1.4,
      maxLife: 1.4,
      type: 'z'
    });
  },

  petCat(cat) {
    cat.state = 'INTERACT';
    cat.pose = 'sit';
    cat.stateTimer = 2.4;
    cat.labelAlpha = 1.8;
    this.stats.pets++;
    this.petProgress = (this.petProgress || 0) + 1;

    sound.playMeow(cat.id === 'cheeto' ? 'cheeto' : 'lilo');
    setTimeout(() => sound.playPurr(), 150);

    if (this.petProgress >= 3) {
      this.petProgress = 0;
      if (this.blooms < 24) {
        this.blooms++;
        this.spawnHeart(LANDMARKS.shrine.x, LANDMARKS.shrine.y - 10, 'sparkle');
        showToast('A new blue forget-me-not bloomed!', 'sparkle', '#38bdf8');
      } else {
        showToast(`${cat.name} purred warmly!`, 'heart-solid', '#f43f5e');
      }
    } else {
      showToast(`${cat.name} chirped & purred!`, 'heart-solid', '#38bdf8');
    }

    this.spawnHeart(cat.x, cat.y - 6, 'heart');
    this.save();
  },

  feedBowl() {
    this.bowlLevel = 3;
    sound.playFeedSound();
    this.spawnHeart(LANDMARKS.bowl.x, LANDMARKS.bowl.y - 4, 'sparkle');
    this.cats.forEach((cat, idx) => {
      cat.state = 'SEEK_FOOD';
      cat.pose = 'sit';
      cat.targetX = LANDMARKS.bowl.x + (idx * 16 - 12);
      cat.targetY = LANDMARKS.bowl.y + 2;
    });
    showToast('Ceramic bowl filled with crunchy kibble!', 'fish', '#fbbf24');
    this.save();
  },

  pickRandomGardenPoint() {
    if (Math.random() < 0.28) {
      return {
        x: LANDMARKS.rug.x + (Math.random() * 22 - 11),
        y: LANDMARKS.rug.y + (Math.random() * 16 - 8)
      };
    }
    for (let tries = 0; tries < 10; tries++) {
      const tx = GARDEN_BOUNDS.minX + Math.random() * (GARDEN_BOUNDS.maxX - GARDEN_BOUNDS.minX);
      const ty = GARDEN_BOUNDS.minY + Math.random() * (GARDEN_BOUNDS.maxY - GARDEN_BOUNDS.minY);
      if (
        Math.hypot(tx - LANDMARKS.pond.x, ty - LANDMARKS.pond.y) > 28 &&
        Math.hypot(tx - LANDMARKS.shrine.x, ty - LANDMARKS.shrine.y) > 26
      ) {
        return { x: tx, y: ty };
      }
    }
    return { x: 480, y: 320 };
  },

  update(dt, time) {
    if (this.weather === 'RAIN') {
      for (let i = 0; i < this.rainDrops.length; i++) {
        const drop = this.rainDrops[i];
        drop.y += drop.speed * dt;
        drop.x -= 30 * dt;
        if (drop.y > 520) {
          drop.y = 120;
          drop.x = 180 + Math.random() * 600;
        }
      }
    }

    this.critters.forEach((cr) => {
      cr.x += cr.vx * dt + Math.sin(time * 2 + cr.phase) * 12 * dt;
      cr.y += cr.vy * dt + Math.cos(time * 1.5 + cr.phase) * 10 * dt;
      if (cr.x < GARDEN_BOUNDS.minX) { cr.x = GARDEN_BOUNDS.minX; cr.vx = Math.abs(cr.vx); }
      if (cr.x > GARDEN_BOUNDS.maxX) { cr.x = GARDEN_BOUNDS.maxX; cr.vx = -Math.abs(cr.vx); }
      if (cr.y < GARDEN_BOUNDS.minY - 20) { cr.y = GARDEN_BOUNDS.minY - 20; cr.vy = Math.abs(cr.vy); }
      if (cr.y > GARDEN_BOUNDS.maxY + 10) { cr.y = GARDEN_BOUNDS.maxY + 10; cr.vy = -Math.abs(cr.vy); }
    });

    for (let i = 0; i < this.cats.length; i++) {
      const cat = this.cats[i];
      cat.stateTimer -= dt;
      cat.animTime += dt;
      if (cat.socialCooldown > 0) cat.socialCooldown -= dt;
      if (cat.labelAlpha > 0) cat.labelAlpha = Math.max(0, cat.labelAlpha - dt * 0.25);

      if ((cat.state === 'IDLE' || cat.state === 'SHELTERED') && cat.pose === 'sleep' && Math.random() < dt * 0.6) {
        this.spawnSleepZ(cat.x, cat.y);
      }

      if (this.weather === 'RAIN' && cat.state !== 'SHELTERED' && cat.state !== 'SEEK_SHELTER' && cat.state !== 'INTERACT') {
        cat.state = 'SEEK_SHELTER';
        cat.targetX = 610 + ((i % 2) * 16);
        cat.targetY = 238 + (i % 2 === 0 ? 0 : 6);
      }

      if ((cat.state === 'IDLE' || cat.state === 'WANDER') && this.weather !== 'RAIN') {
        for (const cr of this.critters) {
          const active = (this.weather === 'NIGHT' && cr.type === 'firefly') || (this.weather !== 'NIGHT' && cr.type === 'butterfly');
          if (active && Math.hypot(cat.x - cr.x, cat.y - cr.y) < 24 && Math.random() < dt * 0.5) {
            cat.state = 'PLAYFUL';
            cat.playTimer = 2.2;
            cat.targetX = cr.x;
            cat.targetY = cr.y + 4;
            this.spawnHeart(cat.x, cat.y - 12, 'sparkle');
            break;
          }
        }
      }

      switch (cat.state) {
        case 'IDLE': {
          if (this.bowlLevel > 0 && Math.random() < dt * 0.08) {
            cat.state = 'SEEK_FOOD';
            cat.targetX = LANDMARKS.bowl.x + (Math.random() * 16 - 8);
            cat.targetY = LANDMARKS.bowl.y + (Math.random() * 6 - 2);
            break;
          }
          if (cat.stateTimer <= 0) {
            const pt = this.pickRandomGardenPoint();
            cat.state = 'WANDER';
            cat.pose = 'sit';
            cat.targetX = pt.x;
            cat.targetY = pt.y;
            cat.stateTimer = 4 + Math.random() * 5;
          }
          break;
        }
        case 'WANDER':
        case 'SEEK_FOOD':
        case 'SEEK_SHELTER': {
          const dx = cat.targetX - cat.x;
          const dy = cat.targetY - cat.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 4) {
            if (cat.state === 'SEEK_FOOD' && this.bowlLevel > 0) {
              cat.state = 'EATING';
              cat.stateTimer = 3.5;
              cat.facing = LANDMARKS.bowl.x >= cat.x ? 1 : -1;
              sound.playMunchPop();
            } else if (cat.state === 'SEEK_SHELTER') {
              cat.state = 'SHELTERED';
              cat.pose = Math.random() < 0.65 ? 'sleep' : 'sit';
              cat.stateTimer = 6;
            } else {
              cat.state = 'IDLE';
              const onRug = Math.hypot(cat.x - LANDMARKS.rug.x, cat.y - LANDMARKS.rug.y) < 24;
              cat.pose = onRug || Math.random() < 0.32 ? 'sleep' : 'sit';
              cat.stateTimer = 4 + Math.random() * 5;
            }
          } else {
            const speed = cat.state === 'SEEK_FOOD' ? 36 : cat.state === 'SEEK_SHELTER' ? 38 : 26;
            cat.x += (dx / dist) * speed * dt;
            cat.y += (dy / dist) * speed * dt;
            if (Math.abs(dx) > 0.4) cat.facing = dx < 0 ? -1 : 1;
          }
          break;
        }
        case 'SHELTERED': {
          if (this.weather !== 'RAIN') {
            cat.state = 'IDLE';
            cat.stateTimer = 3;
          }
          break;
        }
        case 'PLAYFUL': {
          cat.playTimer -= dt;
          if (cat.playTimer <= 0) {
            cat.state = 'IDLE';
            cat.pose = 'sit';
            cat.stateTimer = 3;
          }
          break;
        }
        case 'EATING': {
          if (Math.random() < dt * 2.5) {
            this.spawnHeart(cat.x, cat.y - 6, 'sparkle');
          }
          if (cat.stateTimer <= 0) {
            if (this.bowlLevel > 0) {
              this.bowlLevel = Math.max(0, this.bowlLevel - 1);
              this.stats.meals++;
              this.spawnHeart(cat.x, cat.y - 8, 'heart');
              sound.playPurr();
              this.save();
            }
            cat.state = 'IDLE';
            cat.pose = 'sit';
            cat.stateTimer = 5 + Math.random() * 4;
          }
          break;
        }
        case 'INTERACT': {
          if (cat.stateTimer <= 0) {
            cat.state = 'IDLE';
            cat.pose = 'sit';
            cat.stateTimer = 4;
          }
          break;
        }
      }
    }

    // Brother nose-boop interaction
    if (this.cats.length > 1) {
      for (let i = 0; i < this.cats.length; i++) {
        for (let j = i + 1; j < this.cats.length; j++) {
          const a = this.cats[i];
          const b = this.cats[j];
          if (a.socialCooldown <= 0 && b.socialCooldown <= 0) {
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 20 && Math.random() < dt * 0.5) {
              a.socialCooldown = 18;
              b.socialCooldown = 18;
              this.spawnHeart((a.x + b.x) / 2, Math.min(a.y, b.y) - 8, 'heart');
            }
          }
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    this.updateLiveMoodTicker();
  },

  updateLiveMoodTicker() {
    const lilo = this.cats[0];
    const el = document.getElementById('whisperMood');
    if (!lilo || !el) return;
    let moodText = "Lilo & Cheeto: Reunited";
    if (lilo.state === 'SHELTERED') moodText = "Lilo: Cozy under gazebo";
    else if (lilo.state === 'SEEK_SHELTER') moodText = "Lilo: Trotting to shelter";
    else if (lilo.state === 'EATING') moodText = "Lilo: Munching kibble";
    else if (lilo.state === 'SEEK_FOOD') moodText = "Lilo: Running to bowl";
    else if (lilo.state === 'INTERACT') moodText = "Lilo: Purring happily";
    else if (lilo.state === 'PLAYFUL') moodText = "Lilo: Chasing butterflies";
    else if (lilo.state === 'IDLE' && lilo.pose === 'sleep') moodText = "Lilo: Napping in sun";
    else if (lilo.state === 'WANDER') moodText = "Lilo: Exploring with Cheeto";
    el.textContent = moodText;
  },

  syncUI() {
    safeText('statBlooms', this.blooms);
    safeText('modalBloomCount', `${this.blooms} / 24`);
    safeText('catCountBadge', this.cats.length);

    const bowlLabels = ['Empty', 'Low', 'Half', 'Full'];
    safeText('bowlBadge', bowlLabels[this.bowlLevel] || 'Full');

    const weatherIconEl = document.getElementById('weatherIcon');
    if (weatherIconEl) {
      const weatherMap = {
        SUNNY: { icon: 'sun', color: '#f59e0b' },
        CLOUDY: { icon: 'cloud-sun', color: '#38bdf8' },
        RAIN: { icon: 'waves', color: '#60a5fa' },
        NIGHT: { icon: 'moon', color: '#a78bfa' }
      };
      const w = weatherMap[this.weather] || weatherMap.SUNNY;
      weatherIconEl.innerHTML = getPixelIcon(w.icon, '', `color: ${w.color};`);
    }
    safeText(
      'weatherText',
      `${this.tempC}°C • ${this.skyDesc}${this.weatherMode === 'AUTO' ? ' (Live)' : ''}`
    );

    renderFriendsList();
  }
};

/********************************************************************
 * 6. HIGH-MAGNIFICATION PAN, PINCH & FOLLOW CAMERA
 ********************************************************************/
const camera = {
  x: 480,
  y: 310,
  baseScale: 2.5,
  userZoom: window.innerWidth < 768 ? 1.45 : 1.0,
  minZoom: 0.75,
  maxZoom: 2.6,
  followCatId: 'lilo',
  isDragging: false,
  dragMoved: false,
  isMouseDown: false,
  startX: 0,
  startY: 0,
  camStartX: 480,
  camStartY: 310,
  pinchStartDist: 0,
  pinchStartZoom: 1.45,

  getEffectiveScale() {
    return this.baseScale * this.userZoom;
  }
};

function clampCamera() {
  if (!canvas) return;
  const scale = camera.getEffectiveScale();
  const halfW = (canvas.width / 2) / scale;
  const halfH = (canvas.height / 2) / scale;

  // Keep camera within the lush garden bounds (180..780 x 120..500)
  const minX = Math.min(480, 170 + halfW);
  const maxX = Math.max(480, 790 - halfW);
  const minY = Math.min(310, 110 + halfH);
  const maxY = Math.max(310, 510 - halfH);

  camera.x = Math.max(minX, Math.min(maxX, camera.x));
  camera.y = Math.max(minY, Math.min(maxY, camera.y));
}

function updateCanvasResolution() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const isPortrait = canvas.height > canvas.width;
  if (isPortrait) {
    // On portrait phones, fit ~280px of garden width across the screen so 16px cats are large!
    camera.baseScale = Math.max(2.2, canvas.width / 270);
  } else {
    // On desktop / landscape, fit the 560x350 garden comfortably
    camera.baseScale = Math.max(1.8, Math.min(canvas.width / 540, canvas.height / 340));
  }
  clampCamera();
}

function screenToWorld(clientX, clientY) {
  if (!canvas) return { x: clientX, y: clientY };
  const rect = canvas.getBoundingClientRect();
  const sx = (clientX - rect.left) * (canvas.width / rect.width);
  const sy = (clientY - rect.top) * (canvas.height / rect.height);
  const scale = camera.getEffectiveScale();
  return {
    x: (sx - canvas.width / 2) / scale + camera.x,
    y: (sy - canvas.height / 2) / scale + camera.y
  };
}

function updateCameraBtnUI() {
  const icon = document.getElementById('cameraBtnIcon');
  const text = document.getElementById('cameraBtnText');
  if (!icon || !text) return;
  if (!camera.followCatId) {
    icon.innerHTML = getPixelIcon('target', 'text-sky-200');
    text.textContent = 'Follow Lilo';
  } else if (camera.userZoom >= 1.3) {
    icon.innerHTML = getPixelIcon('map', 'text-sky-200');
    text.textContent = 'Wide View';
  } else {
    icon.innerHTML = getPixelIcon('zoom-in', 'text-sky-200');
    text.textContent = 'Zoom In';
  }
}

/********************************************************************
 * 7. SPRITE PACK ENVIRONMENT & ORIGINAL PROCEDURAL PIXEL CAT ENGINE
 ********************************************************************/
const SPRITE_BANK = {
  // Seamless Grass Tile
  grassTile: './assets/sprites/tileSprite/1 Tiles/FieldsTile_38.png',

  // The 1 Cozy Tree inside the Garden
  tree1: './assets/sprites/tileSprite/2 Objects/7 Decor/Tree1.png',

  // Garden Bushes
  bush1: './assets/sprites/tileSprite/2 Objects/9 Bush/1.png',
  bush2: './assets/sprites/tileSprite/2 Objects/9 Bush/2.png',
  bush3: './assets/sprites/tileSprite/2 Objects/9 Bush/3.png',
  bush4: './assets/sprites/tileSprite/2 Objects/9 Bush/4.png',

  // Pond Accent Stones
  stone7: './assets/sprites/tileSprite/2 Objects/4 Stone/7.png',
  stone8: './assets/sprites/tileSprite/2 Objects/4 Stone/8.png',

  // Grass Blades (1..6)
  grass1: './assets/sprites/tileSprite/2 Objects/5 Grass/1.png',
  grass2: './assets/sprites/tileSprite/2 Objects/5 Grass/2.png',
  grass3: './assets/sprites/tileSprite/2 Objects/5 Grass/3.png',
  grass4: './assets/sprites/tileSprite/2 Objects/5 Grass/4.png',
  grass5: './assets/sprites/tileSprite/2 Objects/5 Grass/5.png',
  grass6: './assets/sprites/tileSprite/2 Objects/5 Grass/6.png',

  // Wildflowers (1..12)
  flower1: './assets/sprites/tileSprite/2 Objects/6 Flower/1.png',
  flower2: './assets/sprites/tileSprite/2 Objects/6 Flower/2.png',
  flower3: './assets/sprites/tileSprite/2 Objects/6 Flower/3.png',
  flower4: './assets/sprites/tileSprite/2 Objects/6 Flower/4.png',
  flower5: './assets/sprites/tileSprite/2 Objects/6 Flower/5.png',
  flower6: './assets/sprites/tileSprite/2 Objects/6 Flower/6.png',
  flower7: './assets/sprites/tileSprite/2 Objects/6 Flower/7.png',
  flower8: './assets/sprites/tileSprite/2 Objects/6 Flower/8.png',
  flower9: './assets/sprites/tileSprite/2 Objects/6 Flower/9.png',
  flower10: './assets/sprites/tileSprite/2 Objects/6 Flower/10.png',
  flower11: './assets/sprites/tileSprite/2 Objects/6 Flower/11.png',
  flower12: './assets/sprites/tileSprite/2 Objects/6 Flower/12.png',

  // Garden Decor (Shrine Lamp & Campfire Log)
  lamp1: './assets/sprites/tileSprite/2 Objects/7 Decor/Lamp1.png',
  log1: './assets/sprites/tileSprite/2 Objects/7 Decor/Log1.png',

  // Bonfire Animated Strips (2.png = active flames, 1.png = rain smoke)
  campfireActive: './assets/sprites/tileSprite/3 Animated Objects/2 Campfire/2.png',
  campfireSmoke: './assets/sprites/tileSprite/3 Animated Objects/2 Campfire/1.png'
};

const loadedSprites = {};

(function preloadGardenSprites() {
  Object.entries(SPRITE_BANK).forEach(([key, src]) => {
    const img = new Image();
    img.onload = () => {
      loadedSprites[key] = img;
    };
    img.src = encodeURI(src);
  });
})();

function drawLoadedSprite(c, key, x, y, w, h, animTime) {
  const img = loadedSprites[key];
  if (!img || !img.complete || img.naturalWidth === 0) return false;
  const dw = w !== undefined ? w : img.naturalWidth;
  const dh = h !== undefined ? h : img.naturalHeight;

  // 6-frame horizontal sprite strips (192px wide = 6 frames of 32px)
  if (img.naturalWidth === 192 && dw <= 48 && animTime !== undefined) {
    const frameIdx = Math.floor(animTime * 7) % 6;
    c.drawImage(
      img,
      frameIdx * 32,
      0,
      32,
      img.naturalHeight,
      Math.round(x),
      Math.round(y),
      Math.round(dw),
      Math.round(dh)
    );
  } else {
    c.drawImage(img, Math.round(x), Math.round(y), Math.round(dw), Math.round(dh));
  }
  return true;
}

/**
 * ORIGINAL AUTHENTIC PROCEDURAL PIXEL CAT RENDERER
 * Restores 100% original cute pixel art cats with sleeping breath, walking leg cycles,
 * blinking heterochromia eyes, purring blush cheeks, and Lilo's blue collar + bell.
 */
function drawPixelCat(c, cat, time) {
  const x = Math.round(cat.x);
  const y = Math.round(cat.y);
  const isWalking = cat.state === 'WANDER' || cat.state === 'SEEK_FOOD' || cat.state === 'SEEK_SHELTER';
  const isEating = cat.state === 'EATING';
  const isPetted = cat.state === 'INTERACT';
  const isSleeping = (cat.state === 'IDLE' || cat.state === 'SHELTERED') && cat.pose === 'sleep';
  const isPlayful = cat.state === 'PLAYFUL';

  c.save();
  c.translate(x, y);

  c.fillStyle = 'rgba(15, 28, 17, 0.32)';
  if (isSleeping) {
    c.fillRect(-8, -1, 16, 4);
  } else {
    c.fillRect(-7, -1, 14, 3);
  }

  if (cat.facing < 0 && !isSleeping) {
    c.scale(-1, 1);
  }

  const coat = cat.coatColor || '#ffffff';
  const shade = cat.shadeColor || '#dbe7f5';
  const eyeLeft = cat.eyeColor || '#29b6f6';
  const eyeRight = cat.eyeColorRight || cat.eyeColor || '#29b6f6';
  const nose = cat.noseColor || '#ff9ebb';
  const pattern = cat.pattern || 'solid';

  const px = (rx, ry, w, h, color) => {
    c.fillStyle = color;
    c.fillRect(Math.round(rx), Math.round(ry), w, h);
  };

  if (isSleeping) {
    const breath = Math.sin(time * 2.4 + cat.seed) > 0 ? 1 : 0;
    px(-7, -7 + breath, 14, 6, coat);
    px(-6, -8 + breath, 12, 2, coat);
    px(-7, -3, 14, 2, shade);
    if (pattern === 'tabby') {
      px(-3, -8 + breath, 2, 3, shade);
      px(1, -8 + breath, 2, 3, shade);
    } else if (pattern === 'patches') {
      px(-4, -7 + breath, 4, 3, '#d97706');
      px(1, -6 + breath, 3, 3, '#374151');
    } else if (pattern === 'tuxedo') {
      px(-2, -4, 6, 2, '#ffffff');
    }
    px(1, -9 + breath, 6, 5, coat);
    px(2, -11 + breath, 2, 2, coat);
    px(5, -11 + breath, 2, 2, coat);
    px(2, -10 + breath, 1, 1, nose);
    px(5, -10 + breath, 1, 1, nose);
    px(3, -7 + breath, 2, 1, '#475569');
    px(6, -7 + breath, 1, 1, nose);
    px(-8, -5, 2, 3, shade);
    px(-7, -3, 3, 1, shade);
    c.restore();
    return;
  }

  const walkCycle = isWalking ? Math.floor(time * 9 + cat.seed) % 4 : 0;
  const hopY = isPlayful ? Math.round(Math.abs(Math.sin(time * 10)) * -3) : 0;
  const bounceY = hopY + (isWalking ? (walkCycle % 2 === 1 ? -1 : 0) : isPetted ? -1 : 0);
  const headDipY = isEating ? (Math.floor(time * 8) % 2 === 0 ? 3 : 2) : 0;
  const tailWag = Math.sin(time * (isPetted || isPlayful ? 12 : 4.5) + cat.seed);
  const tailOffsetY = tailWag > 0.35 ? -1 : tailWag < -0.35 ? 1 : 0;

  px(-8, -8 + bounceY, 2, 3, coat);
  px(-9, -11 + bounceY + tailOffsetY, 2, 4, coat);
  px(-9, -8 + bounceY, 1, 2, shade);
  px(-6, -8 + bounceY, 11, 6, coat);
  px(-6, -4 + bounceY, 11, 2, shade);

  if (pattern === 'tuxedo') {
    px(2, -6 + bounceY, 3, 4, '#ffffff');
  } else if (pattern === 'tabby') {
    px(-4, -8 + bounceY, 1, 4, shade);
    px(-1, -8 + bounceY, 1, 4, shade);
    px(2, -8 + bounceY, 1, 3, shade);
  } else if (pattern === 'patches') {
    px(-5, -8 + bounceY, 4, 3, '#e07a2b');
    px(0, -7 + bounceY, 3, 3, '#2d3748');
  }

  // Lilo's Blue Collar + Gold Bell
  if (cat.collarColor || cat.id === 'lilo') {
    px(2, -5 + bounceY, 3, 1, cat.collarColor || '#1e88e5');
    px(4, -4 + bounceY, 1, 1, '#fde047');
  }

  const pawColor = pattern === 'tuxedo' ? '#ffffff' : coat;
  if (isWalking) {
    const legA = walkCycle === 0 || walkCycle === 3 ? 0 : -1;
    const legB = walkCycle === 1 || walkCycle === 2 ? 0 : -1;
    px(-5, -2 + legA, 2, 2, shade);
    px(-3, -2 + legB, 2, 2, pawColor);
    px(1, -2 + legB, 2, 2, shade);
    px(3, -2 + legA, 2, 2, pawColor);
  } else {
    px(-5, -2, 2, 2, shade);
    px(-2, -2, 2, 2, pawColor);
    px(1, -2, 2, 2, shade);
    px(3, -2, 2, 2, pawColor);
  }

  const hx = 0;
  const hy = -13 + bounceY + headDipY;
  px(hx, hy, 8, 6, coat);
  px(hx + 1, hy - 1, 6, 1, coat);
  px(hx, hy + 5, 8, 1, shade);
  px(hx + 1, hy - 3, 2, 2, coat);
  px(hx + 5, hy - 3, 2, 2, coat);
  px(hx + 1, hy - 2, 1, 1, nose);
  px(hx + 6, hy - 2, 1, 1, nose);

  if (pattern === 'tabby') {
    px(hx + 3, hy - 1, 2, 2, shade);
  } else if (pattern === 'patches') {
    px(hx + 1, hy - 1, 3, 2, '#e07a2b');
  } else if (pattern === 'tuxedo') {
    px(hx + 2, hy + 4, 4, 2, '#ffffff');
  }

  const isBlinking = Math.sin(time * 1.7 + cat.seed * 3) > 0.94 || isEating;
  if (isPetted || isBlinking) {
    px(hx + 2, hy + 2, 2, 1, '#334155');
    px(hx + 5, hy + 2, 2, 1, '#334155');
  } else {
    px(hx + 2, hy + 1, 2, 2, eyeLeft);
    px(hx + 5, hy + 1, 2, 2, eyeRight);
    px(hx + 2, hy + 1, 1, 1, '#ffffff');
    px(hx + 5, hy + 1, 1, 1, '#ffffff');
  }

  px(hx + 4, hy + 3, 1, 1, nose);
  if (isPetted) {
    px(hx + 1, hy + 3, 1, 1, '#fda4af');
    px(hx + 6, hy + 3, 1, 1, '#fda4af');
  }

  c.restore();

  if (cat.labelAlpha > 0.02) {
    c.save();
    c.globalAlpha = Math.min(1, cat.labelAlpha);
    c.font = 'bold 7px Quicksand, sans-serif';
    c.textAlign = 'center';
    const textW = c.measureText(cat.name).width + 8;
    c.fillStyle = 'rgba(24, 16, 10, 0.78)';
    c.fillRect(Math.round(x - textW / 2), Math.round(y - 25), Math.round(textW), 9);
    c.fillStyle = cat.isDefault ? '#7dd3fc' : '#fde68a';
    c.fillText(cat.name, Math.round(x), Math.round(y - 18));
    c.restore();
  }
}

const GRASS_TUFT_LIST = [];
const GENERAL_FLOWERS = [];

// A few bushes nestled neatly along the inside base of the top fence
const FENCE_BUSHES = [
  { key: 'bush1', x: 215, y: 146, w: 26, h: 22 },
  { key: 'bush2', x: 310, y: 144, w: 36, h: 24 },
  { key: 'bush3', x: 405, y: 145, w: 32, h: 23 },
  { key: 'bush4', x: 525, y: 145, w: 30, h: 23 },
  { key: 'bush2', x: 675, y: 144, w: 36, h: 24 }
];

// 4 bushes scattered around the garden lawn (zero bushes outside the garden)
const GARDEN_BUSHES = [
  { key: 'bush3', x: 200, y: 280, w: 28, h: 22 },
  { key: 'bush4', x: 295, y: 395, w: 28, h: 21 },
  { key: 'bush1', x: 668, y: 255, w: 26, h: 20 },
  { key: 'bush2', x: 712, y: 380, w: 32, h: 23 }
];

(function initStaticGarden() {
  let seed = 3050;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 90; i++) {
    const gx = Math.floor(220 + rand() * 520);
    const gy = Math.floor(180 + rand() * 280);
    if (Math.hypot(gx - LANDMARKS.pond.x, gy - LANDMARKS.pond.y) < 32) continue;
    if (Math.hypot(gx - LANDMARKS.shelter.x, gy - LANDMARKS.shelter.y) < 40) continue;
    if (Math.hypot(gx - 640, gy - 380) < 35) continue;
    if (Math.hypot(gx - 250, gy - 235) < 36) continue; // Keep clear of the 1 garden tree
    if (Math.hypot(gx - 200, gy - 280) < 22) continue;
    if (Math.hypot(gx - 295, gy - 395) < 22) continue;
    if (Math.hypot(gx - 668, gy - 255) < 22) continue;
    if (Math.hypot(gx - 712, gy - 380) < 22) continue;
    GRASS_TUFT_LIST.push({
      x: gx,
      y: gy,
      spriteKey: 'grass' + ((i % 6) + 1),
      shade: rand() > 0.5 ? '#3f7d3b' : '#579c4c',
      phase: rand() * Math.PI * 2
    });
  }
  const colors = ['#fde047', '#f472b6', '#ffffff', '#bae6fd'];
  for (let i = 0; i < 38; i++) {
    const fx = Math.floor(225 + rand() * 500);
    const fy = Math.floor(185 + rand() * 270);
    if (Math.hypot(fx - LANDMARKS.pond.x, fy - LANDMARKS.pond.y) < 34) continue;
    if (Math.hypot(fx - LANDMARKS.shelter.x, fy - LANDMARKS.shelter.y) < 42) continue;
    if (Math.hypot(fx - LANDMARKS.shrine.x, fy - LANDMARKS.shrine.y) < 36) continue;
    if (Math.hypot(fx - 640, fy - 380) < 36) continue;
    if (Math.hypot(fx - 250, fy - 235) < 38) continue; // Keep clear of the 1 garden tree
    if (Math.hypot(fx - 200, fy - 280) < 22) continue;
    if (Math.hypot(fx - 295, fy - 395) < 22) continue;
    if (Math.hypot(fx - 668, fy - 255) < 22) continue;
    if (Math.hypot(fx - 712, fy - 380) < 22) continue;
    GENERAL_FLOWERS.push({
      x: fx,
      y: fy,
      spriteKey: 'flower' + ((i % 12) + 1),
      color: colors[Math.floor(rand() * colors.length)],
      phase: rand() * Math.PI * 2
    });
  }
})();

const PATH_STONES = [
  { x: 476, y: 180, w: 14, h: 8 }, { x: 472, y: 194, w: 16, h: 9 },
  { x: 466, y: 208, w: 15, h: 8 }, { x: 454, y: 222, w: 16, h: 9 },
  { x: 438, y: 232, w: 14, h: 8 }, { x: 416, y: 236, w: 15, h: 8 },
  { x: 394, y: 238, w: 14, h: 8 }, { x: 372, y: 239, w: 14, h: 8 },
  { x: 470, y: 246, w: 15, h: 8 }, { x: 474, y: 262, w: 14, h: 8 },
  { x: 478, y: 278, w: 16, h: 9 }, { x: 480, y: 294, w: 15, h: 8 },
  { x: 478, y: 310, w: 16, h: 9 }, { x: 476, y: 326, w: 15, h: 8 },
  { x: 478, y: 342, w: 16, h: 9 }
];

function drawGardenScenery(c, time) {
  const scale = camera.getEffectiveScale();
  const halfViewW = (canvas.width / 2) / scale;
  const halfViewH = (canvas.height / 2) / scale;
  const viewLeft = Math.min(0, camera.x - halfViewW - 80);
  const viewTop = Math.min(0, camera.y - halfViewH - 80);
  const viewRight = Math.max(960, camera.x + halfViewW + 80);
  const viewBottom = Math.max(600, camera.y + halfViewH + 80);
  const viewW = viewRight - viewLeft;
  const viewH = viewBottom - viewTop;

  // 1. Deep Forest Surround
  c.fillStyle = '#224426';
  c.fillRect(viewLeft, viewTop, viewW, viewH);

  // North Dark Forest Strip (stops above lawn at y=120)
  if (viewTop < 120) {
    c.fillStyle = '#172d1a';
    c.fillRect(viewLeft, viewTop, viewW, 120 - viewTop);
  }

  // South Dark Forest Strip (below lawn at y=500)
  if (viewBottom > 500) {
    c.fillStyle = '#1a3520';
    c.fillRect(viewLeft, 500, viewW, viewBottom - 500);
  }

  // 2. Tiled Garden Lawn using FieldsTile_38.png
  const grassTile = loadedSprites.grassTile;
  if (grassTile && grassTile.complete && grassTile.naturalWidth > 0) {
    for (let ty = 120; ty < 504; ty += 32) {
      for (let tx = 176; tx < 784; tx += 32) {
        c.drawImage(grassTile, tx, ty, 32, 32);
      }
    }
  } else {
    c.fillStyle = '#a6b04f';
    c.fillRect(180, 120, 600, 380);
  }

  // 3. Top Hedge Background
  c.fillStyle = '#2d5c2b';
  c.fillRect(180, 120, 600, 36);
  c.fillStyle = '#386e35';
  for (let hx = 180; hx < 780; hx += 14) {
    c.fillRect(hx, 134 + (hx % 28 === 0 ? 3 : 0), 12, 18);
  }

  // 4. Clean Wooden Fence Along Top Border
  c.fillStyle = 'rgba(15, 28, 17, 0.28)';
  c.fillRect(190, 162, 580, 5);
  c.fillStyle = '#8c5832';
  c.fillRect(190, 146, 580, 4);
  c.fillRect(190, 155, 580, 4);
  for (let fx = 195; fx < 770; fx += 26) {
    if (fx > 455 && fx < 505) continue; // Center gate opening
    c.fillStyle = '#6e4223';
    c.fillRect(fx, 139, 7, 23);
    c.fillStyle = '#a86e42';
    c.fillRect(fx + 1, 140, 5, 20);
    c.fillStyle = '#c98d5c';
    c.fillRect(fx + 1, 139, 5, 3);
  }

  // 5. Bushes inside the fence along the fence line
  FENCE_BUSHES.forEach((b) => {
    drawLoadedSprite(c, b.key, b.x, b.y, b.w, b.h);
  });

  // 6. Bushes scattered around the garden
  GARDEN_BUSHES.forEach((b) => {
    drawLoadedSprite(c, b.key, b.x, b.y, b.w, b.h);
  });

  // 7. Stepping Stone Path (Retained original stones)
  PATH_STONES.forEach((st) => {
    c.fillStyle = '#64748b';
    c.fillRect(st.x, st.y + 1, st.w, st.h);
    c.fillStyle = '#94a3b8';
    c.fillRect(st.x, st.y, st.w - 1, st.h - 1);
    c.fillStyle = '#cbd5e1';
    c.fillRect(st.x + 1, st.y + 1, st.w - 4, 2);
  });

  // 8. Swaying Grass Blades & Wildflower Sprites
  GRASS_TUFT_LIST.forEach((g) => {
    const sway = Math.round(Math.sin(time * 2 + g.phase) * 0.7);
    if (!drawLoadedSprite(c, g.spriteKey, g.x + sway, g.y, 8, 8)) {
      c.fillStyle = g.shade;
      c.fillRect(g.x + sway, g.y, 1, 3);
    }
  });

  GENERAL_FLOWERS.forEach((f) => {
    const bob = Math.sin(time * 2.5 + f.phase) > 0.6 ? -1 : 0;
    if (!drawLoadedSprite(c, f.spriteKey, f.x - 3, f.y - 3 + bob, 8, 8)) {
      c.fillStyle = f.color;
      c.fillRect(f.x - 1, f.y + bob, 3, 2);
    }
  });

  // 9. Birdbath Pond with Corner Accent Rocks (Retained original water & rocks)
  const px = LANDMARKS.pond.x;
  const py = LANDMARKS.pond.y;
  c.fillStyle = '#57534e';
  c.fillRect(px - 18, py - 10, 36, 20);
  c.fillStyle = '#78716c';
  c.fillRect(px - 16, py - 12, 32, 22);
  c.fillStyle = '#0284c7';
  c.fillRect(px - 14, py - 9, 28, 16);
  c.fillStyle = '#38bdf8';
  c.fillRect(px - 12, py - 7, 24, 12);
  const rip = Math.floor(Math.sin(time * 2) * 2);
  c.fillStyle = '#bae6fd';
  c.fillRect(px - 6 + rip, py - 3, 6, 1);
  c.fillRect(px + 2 - rip, py + 2, 5, 1);
  drawLoadedSprite(c, 'stone7', px - 22, py - 12, 14, 12);
  drawLoadedSprite(c, 'stone8', px + 10, py + 2, 12, 10);

  // 10. Sunny Nap Picnic Rug
  const rx = LANDMARKS.rug.x;
  const ry = LANDMARKS.rug.y;
  c.fillStyle = 'rgba(15, 28, 17, 0.25)';
  c.fillRect(rx - 20, ry - 12, 40, 24);
  c.fillStyle = '#fef3c7';
  c.fillRect(rx - 19, ry - 13, 38, 24);
  c.fillStyle = '#f59e0b';
  for (let bx = rx - 17; bx < rx + 17; bx += 8) {
    for (let by = ry - 11; by < ry + 9; by += 8) {
      if (((bx + by) / 8) % 2 === 0) c.fillRect(bx, by, 4, 4);
    }
  }

  // 11. Shrine Lantern, Cozy Bonfire & Camp Log (Retained original bonfire & log)
  drawLoadedSprite(c, 'lamp1', 304, 210, 20, 35);
  drawLoadedSprite(c, 'log1', 668, 376, 34, 21);

  const isRaining = world.weather === 'RAIN';
  const fireKey = isRaining ? 'campfireSmoke' : 'campfireActive';
  if (!isRaining) {
    const flicker = Math.sin(time * 7) * 0.08 + 0.30;
    const fireGrad = c.createRadialGradient(644, 384, 2, 644, 384, 38);
    fireGrad.addColorStop(0, 'rgba(251, 146, 60, ' + flicker + ')');
    fireGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
    c.fillStyle = fireGrad;
    c.beginPath();
    c.arc(644, 384, 38, 0, Math.PI * 2);
    c.fill();
  }
  drawLoadedSprite(c, fireKey, 628, 366, 32, 32, time);
}

function drawShelterDeck(c) {
  const sx = LANDMARKS.shelter.x;
  const sy = LANDMARKS.shelter.y;
  c.fillStyle = 'rgba(15, 28, 17, 0.4)';
  c.fillRect(sx - 28, sy - 10, 56, 30);
  c.fillStyle = '#532e16';
  c.fillRect(sx - 26, sy - 8, 52, 26);
  c.fillStyle = '#78431e';
  c.fillRect(sx - 25, sy - 9, 50, 26);
  c.fillStyle = '#452310';
  for (let py = sy - 6; py < sy + 16; py += 5) {
    c.fillRect(sx - 25, py, 50, 1);
  }
  c.fillStyle = '#831843';
  c.fillRect(sx - 16, sy - 4, 32, 15);
  c.fillStyle = '#9f1239';
  c.fillRect(sx - 15, sy - 5, 30, 14);
  c.fillStyle = '#be123c';
  c.fillRect(sx - 13, sy - 4, 26, 2);
  c.fillStyle = '#fbbf24';
  c.fillRect(sx - 8, sy + 2, 2, 2);
  c.fillRect(sx + 7, sy + 2, 2, 2);
  c.fillStyle = '#532e16';
  c.fillRect(sx - 24, sy - 30, 4, 22);
  c.fillRect(sx + 20, sy - 30, 4, 22);
}

function drawShelterRoofOverhead(c, time) {
  const sx = LANDMARKS.shelter.x;
  const sy = LANDMARKS.shelter.y;
  c.fillStyle = '#532e16';
  c.fillRect(sx - 24, sy - 10, 4, 26);
  c.fillRect(sx + 20, sy - 10, 4, 26);
  c.fillStyle = '#8c5832';
  c.fillRect(sx - 23, sy - 10, 2, 26);
  c.fillRect(sx + 21, sy - 10, 2, 26);

  const lanternGlow = Math.sin(time * 3) * 0.15 + 0.85;
  c.fillStyle = '#1e1e24';
  c.fillRect(sx - 1, sy - 26, 2, 8);
  c.fillRect(sx - 4, sy - 18, 8, 10);
  c.fillStyle = '#fef08a';
  c.fillRect(sx - 2, sy - 16, 4, 6);

  const grad = c.createRadialGradient(sx, sy - 13, 2, sx, sy - 13, 38);
  grad.addColorStop(0, `rgba(253, 224, 71, ${0.35 * lanternGlow})`);
  grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
  c.fillStyle = grad;
  c.beginPath();
  c.arc(sx, sy - 13, 38, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = '#452310';
  c.fillRect(sx - 30, sy - 36, 60, 15);
  c.fillStyle = '#6e3818';
  c.fillRect(sx - 28, sy - 38, 56, 14);
  c.fillStyle = '#8c4820';
  c.fillRect(sx - 26, sy - 40, 52, 13);
  c.fillStyle = '#a85828';
  c.fillRect(sx - 20, sy - 44, 40, 10);
  c.fillStyle = '#c86f34';
  c.fillRect(sx - 12, sy - 47, 24, 7);
  c.fillStyle = '#5c2a10';
  c.fillRect(sx - 2, sy - 49, 4, 4);
}

function drawMemorialStone(c, time, hovered) {
  const sx = LANDMARKS.shrine.x;
  const sy = LANDMARKS.shrine.y;
  c.fillStyle = 'rgba(15, 28, 17, 0.35)';
  c.fillRect(sx - 16, sy + 2, 32, 6);
  c.fillStyle = '#64748b';
  c.fillRect(sx - 14, sy - 4, 28, 9);
  c.fillStyle = '#94a3b8';
  c.fillRect(sx - 13, sy - 5, 26, 7);
  c.fillStyle = '#64748b';
  c.fillRect(sx - 11, sy - 23, 22, 19);
  c.fillStyle = '#94a3b8';
  c.fillRect(sx - 10, sy - 25, 20, 20);
  c.fillStyle = '#cbd5e1';
  c.fillRect(sx - 8, sy - 26, 16, 2);

  const glowLilo = Math.sin(time * 3) > 0 ? '#38bdf8' : '#7dd3fc';
  const glowCheeto = Math.sin(time * 3 + 1.5) > 0 ? '#ffb300' : '#fde047';
  c.fillStyle = glowLilo;
  c.fillRect(sx - 5, sy - 17, 3, 3);
  c.fillRect(sx - 7, sy - 19, 2, 2);
  c.fillRect(sx - 4, sy - 20, 2, 2);

  c.fillStyle = glowCheeto;
  c.fillRect(sx + 2, sy - 17, 3, 3);
  c.fillRect(sx + 1, sy - 20, 2, 2);
  c.fillRect(sx + 4, sy - 19, 2, 2);

  const bloomCount = Math.min(world.blooms, MEMORIAL_BLOOM_COORDS.length);
  for (let i = 0; i < bloomCount; i++) {
    const [ox, oy] = MEMORIAL_BLOOM_COORDS[i];
    const fx = sx + ox;
    const fy = sy + oy;
    const bob = Math.sin(time * 2.8 + i) > 0.65 ? -1 : 0;
    c.fillStyle = '#256d27';
    c.fillRect(fx, fy + 1, 1, 2);
    c.fillStyle = i % 2 === 0 ? '#38bdf8' : '#60a5fa';
    c.fillRect(fx - 1, fy + bob, 3, 2);
    c.fillStyle = '#fef08a';
    c.fillRect(fx, fy + bob, 1, 1);
  }

  if (hovered) {
    c.font = 'bold 7px Quicksand, sans-serif';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(15, 23, 42, 0.88)';
    c.fillRect(sx - 45, sy - 40, 90, 11);
    c.fillStyle = '#bae6fd';
    c.fillText('Lilo & Cheeto Sanctuary', sx, sy - 32);
  }
}

function drawFoodBowl(c, bowlLevel, hovered) {
  const bx = LANDMARKS.bowl.x;
  const by = LANDMARKS.bowl.y;
  c.fillStyle = 'rgba(15, 28, 17, 0.3)';
  c.fillRect(bx - 12, by - 4, 24, 10);
  c.fillStyle = '#cbd5e1';
  c.fillRect(bx - 11, by - 5, 22, 10);
  c.fillStyle = '#94a3b8';
  c.fillRect(bx - 10, by - 4, 20, 8);
  c.fillStyle = '#0284c7';
  c.fillRect(bx - 8, by - 3, 16, 7);
  c.fillStyle = '#38bdf8';
  c.fillRect(bx - 7, by - 4, 14, 6);
  c.fillStyle = '#e0f2fe';
  c.fillRect(bx - 6, by - 3, 12, 4);

  if (bowlLevel >= 1) {
    c.fillStyle = '#92400e';
    c.fillRect(bx - 5, by - 3, 10, 2);
  }
  if (bowlLevel >= 2) {
    c.fillStyle = '#b45309';
    c.fillRect(bx - 6, by - 4, 12, 2);
  }
  if (bowlLevel >= 3) {
    c.fillStyle = '#d97706';
    c.fillRect(bx - 4, by - 5, 8, 2);
  }

  if (hovered) {
    c.font = 'bold 7px Quicksand, sans-serif';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(24, 16, 10, 0.88)';
    c.fillRect(bx - 30, by - 17, 60, 9);
    c.fillStyle = '#fde68a';
    c.fillText(bowlLevel > 0 ? 'Food Bowl' : 'Tap to Refill', bx, by - 10);
  }
}

function drawGardenScene(time = 0) {
  if (!canvas || !ctx) return;
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = '#224426';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = camera.getEffectiveScale();
  ctx.save();
  ctx.translate(Math.round(canvas.width / 2), Math.round(canvas.height / 2));
  ctx.scale(scale, scale);
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

  drawGardenScenery(ctx, time);
  drawShelterDeck(ctx);

  const renderables = [
    {
      y: LANDMARKS.shrine.y,
      draw: () => drawMemorialStone(ctx, time, world.pointer.hoveredEntity === 'shrine')
    },
    {
      y: LANDMARKS.bowl.y - 2,
      draw: () => drawFoodBowl(ctx, world.bowlLevel, world.pointer.hoveredEntity === 'bowl')
    },
    {
      y: 254,
      draw: () => drawShelterRoofOverhead(ctx, time)
    },
    {
      // The 1 tree inside the garden (depth-sorted at trunk base y=258)
      y: 258,
      draw: () => {
        ctx.fillStyle = 'rgba(15, 28, 17, 0.28)';
        ctx.fillRect(244, 256, 30, 6);
        if (!drawLoadedSprite(ctx, 'tree1', 226, 185, 66, 77)) {
          ctx.fillStyle = '#5c2d12';
          ctx.fillRect(254, 226, 10, 32);
          ctx.fillStyle = '#2d5c2b';
          ctx.fillRect(230, 185, 58, 48);
          ctx.fillStyle = '#3f7d3b';
          ctx.fillRect(234, 189, 50, 40);
        }
      }
    },
    ...world.cats.map((cat) => ({
      y: cat.y,
      draw: () => drawPixelCat(ctx, cat, time)
    }))
  ];

  renderables.sort((a, b) => a.y - b.y);
  renderables.forEach((item) => item.draw());

  world.critters.forEach((cr) => {
    const cx = Math.round(cr.x);
    const cy = Math.round(cr.y);
    if (cr.type === 'butterfly' && world.weather !== 'NIGHT' && world.weather !== 'RAIN') {
      const wing = Math.floor(time * 10) % 2 === 0;
      ctx.fillStyle = cr.color || '#38bdf8';
      if (wing) ctx.fillRect(cx - 1, cy, 3, 2);
      else ctx.fillRect(cx, cy - 1, 1, 3);
    } else if (cr.type === 'firefly' && world.weather === 'NIGHT') {
      const pulse = (Math.sin(time * 4 + cr.phase) + 1) * 0.5;
      ctx.fillStyle = `rgba(250, 204, 21, ${0.3 + pulse * 0.7})`;
      ctx.fillRect(cx, cy, 2, 2);
    }
  });

  world.particles.forEach((p) => {
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.save();
    ctx.globalAlpha = alpha;
    const px = Math.round(p.x);
    const py = Math.round(p.y);
    if (p.type === 'heart') {
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(px - 2, py - 2, 2, 2);
      ctx.fillRect(px + 1, py - 2, 2, 2);
      ctx.fillRect(px - 3, py - 1, 7, 2);
      ctx.fillRect(px - 2, py + 1, 5, 1);
      ctx.fillRect(px - 1, py + 2, 3, 1);
      ctx.fillRect(px, py + 3, 1, 1);
    } else if (p.type === 'sparkle') {
      ctx.fillStyle = '#fde047';
      ctx.fillRect(px - 1, py, 3, 1);
      ctx.fillRect(px, py - 1, 1, 3);
    } else if (p.type === 'z') {
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(px - 1, py - 2, 3, 1);
      ctx.fillRect(px, py - 1, 1, 1);
      ctx.fillRect(px - 1, py, 3, 1);
    }
    ctx.restore();
  });

  if (world.weather === 'RAIN') {
    ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
    world.rainDrops.forEach((d) => {
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, Math.round(d.len));
    });
  }

  ctx.restore();

  // Screen-space atmospheric tint
  if (world.weather === 'CLOUDY') {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (world.weather === 'RAIN') {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.30)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (world.weather === 'NIGHT') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

/********************************************************************
 * 8. TOUCH, PINCH, PAN & CLICK INTERACTIONS
 ********************************************************************/
let lastTouchTime = 0;

function findCatAt(px, py, isTouch = false) {
  const mult = isTouch ? 1.55 : 1.15;
  const sorted = [...world.cats].sort((a, b) => b.y - a.y);
  for (const cat of sorted) {
    if (Math.abs(px - cat.x) <= 16 * mult && py >= cat.y - 22 * mult && py <= cat.y + 10 * mult) {
      return cat;
    }
  }
  return null;
}

function handleCanvasTap(clientX, clientY, isTouch = false) {
  const touchMult = isTouch ? 1.45 : 1.0;
  const pt = screenToWorld(clientX, clientY);

  const hitCat = findCatAt(pt.x, pt.y, isTouch);
  if (hitCat) {
    world.petCat(hitCat);
    return;
  }

  if (Math.hypot(pt.x - LANDMARKS.shrine.x, pt.y - (LANDMARKS.shrine.y - 10)) <= LANDMARKS.shrine.radius * touchMult) {
    openModal('tribute-modal');
    return;
  }

  if (Math.hypot(pt.x - LANDMARKS.bowl.x, pt.y - LANDMARKS.bowl.y) <= LANDMARKS.bowl.radius * touchMult) {
    world.feedBowl();
    return;
  }

  if (
    pt.x >= GARDEN_BOUNDS.minX &&
    pt.x <= GARDEN_BOUNDS.maxX &&
    pt.y >= GARDEN_BOUNDS.minY &&
    pt.y <= GARDEN_BOUNDS.maxY
  ) {
    const cat = world.cats[Math.floor(Math.random() * Math.min(2, world.cats.length))];
    if (cat && cat.state !== 'EATING' && cat.state !== 'SHELTERED') {
      cat.state = 'WANDER';
      cat.pose = 'sit';
      cat.targetX = pt.x;
      cat.targetY = pt.y;
      cat.labelAlpha = 1.4;
      world.spawnHeart(pt.x, pt.y, 'sparkle');
    }
  }
}

if (canvas) {
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      camera.isDragging = true;
      camera.dragMoved = false;
      camera.startX = e.touches[0].clientX;
      camera.startY = e.touches[0].clientY;
      camera.camStartX = camera.x;
      camera.camStartY = camera.y;
    } else if (e.touches.length === 2) {
      camera.isDragging = false;
      camera.dragMoved = true;
      camera.pinchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      camera.pinchStartZoom = camera.userZoom;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const scale = camera.getEffectiveScale();
    if (e.touches.length === 1 && camera.isDragging) {
      const dx = e.touches[0].clientX - camera.startX;
      const dy = e.touches[0].clientY - camera.startY;
      if (Math.hypot(dx, dy) > 8) {
        camera.dragMoved = true;
        camera.followCatId = null;
        updateCameraBtnUI();
      }
      camera.x = camera.camStartX - dx / scale;
      camera.y = camera.camStartY - dy / scale;
      clampCamera();
    } else if (e.touches.length === 2 && camera.pinchStartDist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / camera.pinchStartDist;
      camera.userZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.pinchStartZoom * ratio));
      clampCamera();
      updateCameraBtnUI();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    camera.isDragging = false;
    camera.pinchStartDist = 0;
    if (!camera.dragMoved && e.changedTouches && e.changedTouches.length === 1) {
      lastTouchTime = Date.now();
      handleCanvasTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY, true);
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    camera.userZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.userZoom * factor));
    clampCamera();
    updateCameraBtnUI();
  }, { passive: false });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    camera.isMouseDown = true;
    camera.dragMoved = false;
    camera.startX = e.clientX;
    camera.startY = e.clientY;
    camera.camStartX = camera.x;
    camera.camStartY = camera.y;
  });

  window.addEventListener('mousemove', (e) => {
    if (camera.isMouseDown) {
      const scale = camera.getEffectiveScale();
      const dx = e.clientX - camera.startX;
      const dy = e.clientY - camera.startY;
      if (Math.hypot(dx, dy) > 6) {
        camera.dragMoved = true;
        camera.followCatId = null;
        updateCameraBtnUI();
      }
      camera.x = camera.camStartX - dx / scale;
      camera.y = camera.camStartY - dy / scale;
      clampCamera();
    }
  });

  window.addEventListener('mouseup', () => {
    camera.isMouseDown = false;
  });

  canvas.addEventListener('mousemove', (evt) => {
    const pt = screenToWorld(evt.clientX, evt.clientY);
    world.pointer.x = pt.x;
    world.pointer.y = pt.y;
    const hitCat = findCatAt(pt.x, pt.y);
    if (hitCat) {
      hitCat.labelAlpha = Math.max(hitCat.labelAlpha, 0.9);
      world.pointer.hoveredEntity = 'cat';
    } else if (Math.hypot(pt.x - LANDMARKS.shrine.x, pt.y - (LANDMARKS.shrine.y - 10)) <= LANDMARKS.shrine.radius) {
      world.pointer.hoveredEntity = 'shrine';
    } else if (Math.hypot(pt.x - LANDMARKS.bowl.x, pt.y - LANDMARKS.bowl.y) <= LANDMARKS.bowl.radius) {
      world.pointer.hoveredEntity = 'bowl';
    } else {
      world.pointer.hoveredEntity = null;
    }
  });

  canvas.addEventListener('click', (evt) => {
    if (Date.now() - lastTouchTime < 450) return;
    if (camera.dragMoved) return;
    handleCanvasTap(evt.clientX, evt.clientY, false);
  });
}

/********************************************************************
 * 9. TWIN POLAROID FRAMES & INTRO PREVIEW CANVAS
 ********************************************************************/
function drawPixelArtPortrait(canvasEl, catType) {
  if (!canvasEl) return;
  canvasEl.width = 64;
  canvasEl.height = 64;
  const c = canvasEl.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.clearRect(0, 0, 64, 64);

  if (catType === 'lilo') {
    c.fillStyle = '#0f172a';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#225528';
    c.fillRect(0, 42, 64, 22);
    drawPixelCat(c, { ...DEFAULT_LILO, x: 32, y: 52, facing: 1, state: 'IDLE', pose: 'sit', seed: 0, labelAlpha: 0 }, 0);
  } else {
    c.fillStyle = '#451a03';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#225528';
    c.fillRect(0, 42, 64, 22);
    drawPixelCat(c, { ...DEFAULT_CHEETO, x: 32, y: 52, facing: -1, state: 'IDLE', pose: 'sit', seed: 1, labelAlpha: 0 }, 0);
  }
}

function initPolaroidFrame(catType, imgEl, canvasEl, inputEl, storageKey, defaultSrc, cardEl) {
  if (!imgEl || !canvasEl || !inputEl || !cardEl) return;

  const renderFallback = () => {
    imgEl.style.display = 'none';
    canvasEl.style.display = 'block';
    drawPixelArtPortrait(canvasEl, catType);
  };

  const showImage = () => {
    imgEl.style.display = 'block';
    canvasEl.style.display = 'none';
  };

  imgEl.onerror = renderFallback;
  imgEl.onload = showImage;

  const userPhoto = localStorage.getItem(storageKey);
  imgEl.src = userPhoto || defaultSrc;

  if (imgEl.complete) {
    if (imgEl.naturalWidth === 0) renderFallback();
    else showImage();
  }

  inputEl.addEventListener('click', (e) => e.stopPropagation());
  cardEl.addEventListener('click', (e) => {
    if (e.target === inputEl) return;
    inputEl.click();
  });

  inputEl.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
      const tempImg = new Image();
      tempImg.onload = () => {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = 260;
        offCanvas.height = 260;
        const offCtx = offCanvas.getContext('2d');
        const minDim = Math.min(tempImg.width, tempImg.height);
        const sx = (tempImg.width - minDim) / 2;
        const sy = (tempImg.height - minDim) / 2;
        offCtx.drawImage(tempImg, sx, sy, minDim, minDim, 0, 0, 260, 260);
        const compressedDataUrl = offCanvas.toDataURL('image/jpeg', 0.82);
        try {
          localStorage.setItem(storageKey, compressedDataUrl);
        } catch (err) { }
        imgEl.src = compressedDataUrl;
        showImage();
        showToast(`Updated ${catType === 'lilo' ? 'Lilo' : 'Cheeto'}'s photo!`, 'camera');
      };
      tempImg.src = re.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderIntroCanvas() {
  const c = document.getElementById('intro-canvas');
  if (!c) return;
  const ictx = c.getContext('2d');
  ictx.imageSmoothingEnabled = false;
  ictx.clearRect(0, 0, c.width, c.height);

  ictx.fillStyle = '#1e3a24';
  ictx.fillRect(0, 0, c.width, c.height);
  ictx.fillStyle = '#4ade80';
  ictx.fillRect(20, 10, 2, 2);
  ictx.fillRect(85, 12, 2, 2);
  ictx.fillStyle = '#3f7d3b';
  ictx.fillRect(0, 36, c.width, 26);

  drawPixelCat(ictx, { ...DEFAULT_LILO, x: 44, y: 44, facing: 1, state: 'IDLE', pose: 'sit', seed: 0, labelAlpha: 0 }, 0);
  drawPixelCat(ictx, { ...DEFAULT_CHEETO, x: 66, y: 44, facing: -1, state: 'IDLE', pose: 'sit', seed: 1, labelAlpha: 0 }, 0);

  ictx.fillStyle = '#fb7185';
  ictx.fillRect(53, 24, 2, 2);
  ictx.fillRect(56, 24, 2, 2);
  ictx.fillRect(52, 25, 7, 2);
  ictx.fillRect(53, 27, 5, 1);
  ictx.fillRect(54, 28, 3, 1);
  ictx.fillRect(55, 29, 1, 1);
}

/********************************************************************
 * 10. MODALS, CUSTOMIZER & BUTTON BINDINGS
 ********************************************************************/
const customizerState = {
  name: 'Mochi',
  pattern: 'solid',
  coatColor: COAT_SWATCHES[0].hex,
  shadeColor: COAT_SWATCHES[0].shade,
  eyeColor: EYE_SWATCHES[0].hex
};

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');
  if (id === 'tribute-modal') {
    const noteEl = document.getElementById('inputTributeNote');
    if (noteEl) noteEl.value = world.tributeNote;
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active');
}

document.querySelectorAll('[data-close-modal]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close-modal')));
});

document.querySelectorAll('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

function renderFriendsList() {
  const list = document.getElementById('residentList');
  if (!list) return;
  list.innerHTML = '';
  const env = getAppEnvironment();
  world.cats.forEach((cat) => {
    const badge = document.createElement('div');
    badge.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#f3dfc1] border border-[#b88b5a] text-[#3d2516] shadow-sm';

    const dot = document.createElement('span');
    dot.className = 'w-3 h-3 rounded-full border border-black/30';
    dot.style.backgroundColor = cat.coatColor;
    badge.appendChild(dot);

    const nameLabel = document.createElement('span');
    nameLabel.className = 'inline-flex items-center gap-1';
    if (cat.isDefault) {
      nameLabel.innerHTML = `${getPixelIcon('paw', 'pixel-icon-sm')}<span>${cat.name}</span>`;
    } else {
      nameLabel.textContent = cat.name;
    }
    badge.appendChild(nameLabel);

    const petBtn = document.createElement('button');
    petBtn.type = 'button';
    petBtn.className = 'ml-1 px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-bold hover:bg-rose-300 cursor-pointer inline-flex items-center gap-1';
    petBtn.innerHTML = `${getPixelIcon('heart-solid', 'pixel-icon-sm')}<span>Pet</span>`;
    petBtn.addEventListener('click', () => {
      world.petCat(cat);
      camera.followCatId = cat.id;
      updateCameraBtnUI();
    });
    badge.appendChild(petBtn);

    // Native APK: Feature this cat in the Companion Widget
    if (env.isNativeApk) {
      const widgetBtn = document.createElement('button');
      widgetBtn.type = 'button';
      widgetBtn.className = 'ml-1 px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold hover:bg-amber-300 cursor-pointer inline-flex items-center gap-1';
      widgetBtn.title = `Feature ${cat.name} in Companion Widget`;
      widgetBtn.innerHTML = `${getPixelIcon('grid-2x2', 'pixel-icon-sm')}<span>Widget</span>`;
      widgetBtn.addEventListener('click', () => {
        if (window.AndroidBridge && typeof window.AndroidBridge.setCompanionWidgetCat === 'function') {
          window.AndroidBridge.setCompanionWidgetCat(cat.id, cat.name);
        } else {
          showToast(`${cat.name} set for Companion Widget`, 'grid-2x2');
        }
      });
      badge.appendChild(widgetBtn);
    }

    if (!cat.isDefault) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'ml-1 text-stone-500 hover:text-rose-700 font-bold cursor-pointer text-xs inline-flex items-center';
      delBtn.innerHTML = getPixelIcon('close', 'pixel-icon-sm');
      delBtn.addEventListener('click', () => {
        world.cats = world.cats.filter((c) => c.id !== cat.id);
        world.save();
        showToast(`${cat.name} headed home for a nap.`, 'paw');
      });
      badge.appendChild(delBtn);
    }

    list.appendChild(badge);
  });
}

function initCustomizerUI() {
  const coatContainer = document.getElementById('coatColorSelector');
  if (coatContainer) {
    coatContainer.innerHTML = '';
    COAT_SWATCHES.forEach((sw, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `w-7 h-7 rounded-lg border-2 transition transform hover:scale-105 cursor-pointer ${i === 0 ? 'border-[#3d2516] ring-2 ring-amber-500' : 'border-[#b88b5a]'
        }`;
      btn.style.backgroundColor = sw.hex;
      btn.title = sw.name;
      btn.addEventListener('click', () => {
        customizerState.coatColor = sw.hex;
        customizerState.shadeColor = sw.shade;
        Array.from(coatContainer.children).forEach((c) => {
          c.className = 'w-7 h-7 rounded-lg border-2 border-[#b88b5a] transition transform hover:scale-105 cursor-pointer';
        });
        btn.className = 'w-7 h-7 rounded-lg border-2 border-[#3d2516] ring-2 ring-amber-500 transition transform scale-105 cursor-pointer';
      });
      coatContainer.appendChild(btn);
    });
  }

  const eyeContainer = document.getElementById('eyeColorSelector');
  if (eyeContainer) {
    eyeContainer.innerHTML = '';
    EYE_SWATCHES.forEach((sw, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `px-2 py-1 rounded-lg border-2 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${i === 0 ? 'border-[#3d2516] bg-[#f3dfc1]' : 'border-[#c8ab89] bg-[#fff9ea]'
        }`;
      const dot = document.createElement('span');
      dot.className = 'w-2.5 h-2.5 rounded-full border border-black/30';
      dot.style.backgroundColor = sw.hex;
      const txt = document.createElement('span');
      txt.textContent = sw.name.split(' ').pop();
      btn.appendChild(dot);
      btn.appendChild(txt);
      btn.addEventListener('click', () => {
        customizerState.eyeColor = sw.hex;
        Array.from(eyeContainer.children).forEach((c) => {
          c.className = 'px-2 py-1 rounded-lg border-2 border-[#c8ab89] bg-[#fff9ea] text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer';
        });
        btn.className = 'px-2 py-1 rounded-lg border-2 border-[#3d2516] bg-[#f3dfc1] text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer';
      });
      eyeContainer.appendChild(btn);
    });
  }

  document.querySelectorAll('.pattern-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      customizerState.pattern = btn.getAttribute('data-pattern');
      document.querySelectorAll('.pattern-opt').forEach((b) => {
        b.className = 'pattern-opt rounded-lg border-2 border-[#c8ab89] bg-[#fff9ea] py-1.5 px-2 font-semibold text-[#5c3820] text-center cursor-pointer';
      });
      btn.className = 'pattern-opt rounded-lg border-2 border-[#5c3820] bg-[#f3dfc1] py-1.5 px-2 font-bold text-[#3d2516] text-center cursor-pointer';
    });
  });

  const nameInput = document.getElementById('inputCatName');
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      customizerState.name = nameInput.value.trim() || 'Mochi';
      safeText('previewCatTitle', customizerState.name);
    });
  }
}

const previewCanvas = document.getElementById('previewCatCanvas');
const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;

function renderMiniCanvases(time) {
  const modal = document.getElementById('modalFriends');
  if (modal && modal.classList.contains('active') && previewCtx) {
    previewCtx.imageSmoothingEnabled = false;
    previewCtx.clearRect(0, 0, 64, 48);
    previewCtx.fillStyle = '#3f7d3b';
    previewCtx.fillRect(0, 32, 64, 16);
    drawPixelCat(previewCtx, {
      ...customizerState,
      x: 32,
      y: 36,
      facing: 1,
      state: 'WANDER',
      pose: 'sit',
      seed: 1,
      labelAlpha: 0
    }, time);
  }
}

// Dismiss Intro Overlay & Play Welcome Duet
function dismissIntroOverlay() {
  sound.init();
  sound.playMeow('lilo');
  setTimeout(() => sound.playMeow('cheeto'), 220);
  setTimeout(() => sound.playPurr(), 420);

  const overlay = document.getElementById('intro-overlay');
  if (overlay) {
    overlay.classList.add('hidden-intro');
  }
}

safeOn('enter-garden-btn', 'click', dismissIntroOverlay);
safeOn('btnFeed', 'click', () => world.feedBowl());
safeOn('btnOpenFriends', 'click', () => openModal('modalFriends'));
safeOn('btnWeather', 'click', () => world.cycleWeather());

safeOn('btnAudio', 'click', () => {
  sound.enabled = !sound.enabled;
  const audioEl = document.getElementById('audioIcon');
  if (audioEl) {
    audioEl.innerHTML = getPixelIcon(sound.enabled ? 'volume-3' : 'volume-x');
  }
  if (!sound.enabled) sound.stopRain();
  else if (world.weather === 'RAIN') sound.startRain();
  showToast(sound.enabled ? 'Cozy audio enabled' : 'Cozy audio muted', sound.enabled ? 'volume-3' : 'volume-x');
});

safeOn('btnCameraMode', 'click', () => {
  if (camera.followCatId !== 'lilo') {
    camera.followCatId = 'lilo';
    camera.userZoom = window.innerWidth < 768 ? 1.45 : 1.15;
    showToast('Camera following Lilo', 'target');
  } else if (camera.userZoom >= 1.3) {
    camera.userZoom = 0.85;
    camera.x = 480;
    camera.y = 310;
    showToast('Garden Wide Overview', 'map');
  } else {
    camera.userZoom = 1.65;
    showToast('Zoomed in on Lilo', 'zoom-in');
  }
  clampCamera();
  updateCameraBtnUI();
});

safeOn('btnConfirmAddCat', 'click', () => {
  const nameInput = document.getElementById('inputCatName');
  const name = (nameInput ? nameInput.value : 'Mochi').trim().slice(0, 16) || 'Mochi';
  const newSpec = {
    id: 'cat_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name,
    isDefault: false,
    coatColor: customizerState.coatColor,
    shadeColor: customizerState.shadeColor,
    eyeColor: customizerState.eyeColor,
    eyeColorRight: customizerState.eyeColor,
    noseColor: '#ff9ebb',
    pattern: customizerState.pattern
  };
  const runtimeCat = world.createCatRuntime(newSpec, world.cats.length);
  world.cats.push(runtimeCat);
  world.spawnHeart(runtimeCat.x, runtimeCat.y - 6, 'heart');
  sound.playMeow('lilo');
  world.save();
  if (nameInput) nameInput.value = '';
  closeModal('modalFriends');
  showToast(`${name} joined Lilo and Cheeto!`, 'paw');
});

// Cross-Device Save Link & PWA Install Handlers
safeOn('copy-garden-link-btn', 'click', async () => {
  const state = world.serialize();
  const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(state)))));
  const baseUrl = `${window.location.origin}${window.location.pathname}`.replace(/#.*$/, '');
  const shareUrl = `${baseUrl}#garden=${encoded}`;
  window.location.hash = `garden=${encoded}`;
  try {
    await navigator.clipboard.writeText(shareUrl);
    showToast('Garden Save URL copied to clipboard!', 'link');
  } catch (err) {
    prompt('Copy your Garden Save URL:', shareUrl);
  }
});

/********************************************************************
 * RUNTIME ENVIRONMENT DETECTION (LIVE WEB vs INSTALLED PWA vs APK)
 ********************************************************************/
const GITHUB_APK_BUILD_URL = 'https://github.com/BoostedByCaffeine/Lilo-s-Garden/actions/runs/3882873335';

function getAppEnvironment() {
  const isNativeApk = Boolean(
    window.AndroidBridge && typeof window.AndroidBridge.isNativeApp === 'function'
  );
  const isStandalonePwa =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  return {
    isNativeApk,
    isStandalonePwa,
    isLiveBrowserWeb: !isNativeApk && !isStandalonePwa
  };
}

function syncInstallButtonsVisibility() {
  const env = getAppEnvironment();
  const installBtn = document.getElementById('install-pwa-btn');
  const wallBtn = document.getElementById('btnAndroidWallpaper');
  const widgBtn = document.getElementById('btnAndroidWidget');

  // Hide "Install App" when already inside the installed Android APK or installed Offline Web PWA
  if (installBtn) {
    installBtn.style.display = env.isLiveBrowserWeb ? 'inline-flex' : 'none';
  }
  // Only show Native Wallpaper & Widget buttons inside the Android APK
  if (wallBtn) {
    wallBtn.style.display = env.isNativeApk ? 'inline-flex' : 'none';
  }
  if (widgBtn) {
    widgBtn.style.display = env.isNativeApk ? 'inline-flex' : 'none';
  }
}

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  closeModal('install-choice-modal');
  closeModal('apk-tutorial-modal');
  syncInstallButtonsVisibility();
  showToast("Lilo's Garden installed to Home Screen!", 'download');
});

// 1. Clicking "Install App" on the live web opens the Chooser Modal
safeOn('install-pwa-btn', 'click', () => {
  const env = getAppEnvironment();
  if (!env.isLiveBrowserWeb) {
    showToast('App is already installed offline!', 'leaf');
    return;
  }
  openModal('install-choice-modal');
});

// 2. Choice A: Open the Non-Tech-Savvy Android APK Tutorial Modal
safeOn('btnOpenApkTutorial', 'click', () => {
  closeModal('install-choice-modal');
  openModal('apk-tutorial-modal');
});

// 3. Inside Tutorial Modal: Open GitHub Actions Run 3882873335 (or direct ./lilos-garden.apk if present)
safeOn('btnProceedApkDownload', 'click', async () => {
  try {
    const check = await fetch('./lilos-garden.apk', { method: 'HEAD' });
    if (check.ok) {
      const a = document.createElement('a');
      a.href = './lilos-garden.apk';
      a.download = 'lilos-garden.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast('Downloading lilos-garden.apk directly...', 'download');
      return;
    }
  } catch (e) {}

  window.open(GITHUB_APK_BUILD_URL, '_blank', 'noopener,noreferrer');
  showToast('Opened GitHub Build Page! Scroll to Artifacts -> lilos-garden-apk', 'download');
});

// 4. Choice B: Instant Offline Web App (PWA) for All Devices
safeOn('btnInstallWebPwa', 'click', async () => {
  closeModal('install-choice-modal');
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    try {
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        syncInstallButtonsVisibility();
        showToast("Lilo's Garden Offline Web App installed!", 'download');
      }
    } catch (e) {}
    deferredInstallPrompt = null;
  } else {
    showToast("Tap your browser menu (⋮ or Share) -> 'Add to Home Screen'", 'smartphone');
  }
});

// Native Android Bridge Handlers (Live Wallpaper & Home Screen Widget)
safeOn('btnAndroidWallpaper', 'click', () => {
  if (window.AndroidBridge && typeof window.AndroidBridge.openWallpaperPicker === 'function') {
    window.AndroidBridge.openWallpaperPicker();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'image');
  }
});

safeOn('btnAndroidWidget', 'click', () => {
  if (window.AndroidBridge && typeof window.AndroidBridge.pinWidget === 'function') {
    window.AndroidBridge.pinWidget();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'grid-2x2');
  }
});

safeOn('btnSaveTributeNote', 'click', () => {
  const input = document.getElementById('inputTributeNote');
  const note = input ? input.value.trim() : '';
  if (note) {
    world.tributeNote = note;
    world.save();
    closeModal('tribute-modal');
    showToast("Lilo & Cheeto's tribute note saved", 'leaf');
  }
});

safeOn('btnPetLiloNow', 'click', () => {
  world.cats.slice(0, 2).forEach((c) => world.petCat(c));
  closeModal('tribute-modal');
});

/********************************************************************
 * 11. MAIN GAME LOOP & INITIALIZATION
 ********************************************************************/
let lastTimestamp = 0;

function gameLoop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const dt = Math.min(0.1, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;
  const elapsedSeconds = timestamp / 1000;

  if (camera.followCatId && !camera.isDragging && !camera.isMouseDown && camera.userZoom >= 1.1) {
    const targetCat = world.cats.find((c) => c.id === camera.followCatId);
    if (targetCat) {
      camera.x += (targetCat.x - camera.x) * 0.05;
      camera.y += (targetCat.y - camera.y) * 0.05;
      clampCamera();
    }
  }

  world.update(dt, elapsedSeconds);
  drawGardenScene(elapsedSeconds);
  renderMiniCanvases(elapsedSeconds);
  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', updateCanvasResolution);
window.addEventListener('orientationchange', updateCanvasResolution);

function initGame() {
  initCustomizerUI();
  world.init();
  updateCanvasResolution();
  updateCameraBtnUI();
  renderIntroCanvas();
  syncInstallButtonsVisibility();

  initPolaroidFrame(
    'lilo',
    document.getElementById('lilo-polaroid-img'),
    document.getElementById('lilo-polaroid-canvas'),
    document.getElementById('lilo-photo-input'),
    'liloPhotoData',
    './assets/lilo.jpg',
    document.getElementById('polaroidLilo')
  );

  initPolaroidFrame(
    'cheeto',
    document.getElementById('cheeto-polaroid-img'),
    document.getElementById('cheeto-polaroid-canvas'),
    document.getElementById('cheeto-photo-input'),
    'cheetoPhotoData',
    './assets/cheeto.jpg',
    document.getElementById('polaroidCheeto')
  );

  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

/********************************************************************
 * 12. HOME SCREEN WIDGET MODE (?widget=1)
 ********************************************************************/
(function checkWidgetMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('widget') === '1' || params.get('widget') === 'true') {
    document.body.classList.add('widget-mode');
    camera.followCatId = 'lilo';
    camera.userZoom = 1.65;
    clampCamera();
  }
})();