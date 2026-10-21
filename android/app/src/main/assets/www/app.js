/********************************************************************
 * 0. PWA SERVICE WORKER & INSTALL PROMPT
 ********************************************************************/
let deferredInstallPrompt = null;

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.update();
    }).catch(() => {});
  });
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
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
  bowl: { x: 480, y: 374, radius: 22, label: "Ceramic Cat Bowl" },
  shelter: { x: 620, y: 240, radius: 30, label: "Covered Gazebo Shelter" },
  porch: { x: 682, y: 332, radius: 26, label: "Covered Campfire Porch" },
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

const CARETAKER_SKIN_SWATCHES = [
  { name: 'Warm Peach', hex: '#ffdbb5', shade: '#e0b183' },
  { name: 'Golden Tan', hex: '#eab676', shade: '#c68b45' },
  { name: 'Honey Bronze', hex: '#c68642', shade: '#995f22' },
  { name: 'Rich Espresso', hex: '#8d5524', shade: '#5e3511' },
  { name: 'Fair Ivory', hex: '#ffe9d6', shade: '#deb896' },
  { name: 'Olive Warm', hex: '#d9a16c', shade: '#ad7642' }
];

const CARETAKER_HAIR_SWATCHES = [
  { name: 'Espresso Black', hex: '#1e1b18' },
  { name: 'Chestnut Brown', hex: '#5c3317' },
  { name: 'Golden Blonde', hex: '#eab308' },
  { name: 'Auburn Copper', hex: '#b45309' },
  { name: 'Sakura Pink', hex: '#f472b6' },
  { name: 'Silver Ash', hex: '#94a3b8' }
];

const CARETAKER_OUTFIT_SWATCHES = [
  { name: 'Forest Hoodie', hex: '#15803d', pants: '#1e293b' },
  { name: 'Sky Blue', hex: '#0284c7', pants: '#1e293b' },
  { name: 'Berry Cardigan', hex: '#be123c', pants: '#334155' },
  { name: 'Mustard Gold', hex: '#d97706', pants: '#3b1d0a' },
  { name: 'Lavender Knit', hex: '#7c3aed', pants: '#1e293b' },
  { name: 'Charcoal Jacket', hex: '#374151', pants: '#111827' },
  { name: 'Sunset Coral', hex: '#ea580c', pants: '#1e293b' },
  { name: 'Cream Sweater', hex: '#fef3c7', pants: '#532e16' }
];

const DEFAULT_CARETAKER = Object.freeze({
  name: 'Dom',
  skinColor: '#eab676',
  skinShade: '#c68b45',
  hairStyle: 'short',     // 'short' | 'long' | 'spiky' | 'bun'
  hairColor: '#1e1b18',
  outfitColor: '#0284c7',
  pantsColor: '#1e293b',
  accessory: 'glasses',   // 'none' | 'glasses' | 'catears' | 'hat'
  activity: 'AUTO'        // 'AUTO' | 'READ' | 'COFFEE' | 'CODE'
});

const COTTAGE_BOUNDS = {
  minX: 405,
  maxX: 575,
  minY: 268,
  maxY: 392
};

const COTTAGE_SPOTS = {
  hearth: { x: 544, y: 224, radius: 32, label: 'Memorial Bookcase & Tribute' },
  sofa:   { x: 608, y: 336, radius: 30, label: 'Cozy Cream Sofa' },
  bed:    { x: 465, y: 215, radius: 32, label: 'Cozy Yellow Quilt Bed' },
  desk:   { x: 598, y: 248, radius: 26, label: 'Wooden Study Desk' },
  rug:    { x: 476, y: 266, radius: 28, label: 'Warm Crimson Bedside Rug' },
  table:  { x: 364, y: 312, radius: 32, label: 'Dining Table' },
  bowl:   { x: 480, y: 368, radius: 24, label: 'Indoor Ceramic Bowls' },
  door:   { x: 480, y: 436, radius: 34, label: 'Cottage Entrance Hallway' }
};

// Furniture collision bounding boxes inside the Cottage so cats & Caretaker never step on furniture
const COTTAGE_OBSTACLES = [
  { minX: 320, maxX: 382, minY: 160, maxY: 232 }, // Top-Left Wardrobe
  { minX: 404, maxX: 440, minY: 160, maxY: 236 }, // Bedside Table
  { minX: 442, maxX: 510, minY: 160, maxY: 256 }, // Double Bed Frame
  { minX: 518, maxX: 576, minY: 160, maxY: 244 }, // Bookcase & Books
  { minX: 576, maxX: 640, minY: 160, maxY: 254 }, // Top-Right Study Desk
  { minX: 330, maxX: 402, minY: 274, maxY: 346 }, // Left Dining Table & Chairs
  { minX: 390, maxX: 422, minY: 348, maxY: 402 }, // Bottom-Left Coat Stand
  { minX: 590, maxX: 640, minY: 266, maxY: 370 }, // Right Vase & Cream Sofa
  { minX: 550, maxX: 640, minY: 372, maxY: 412 }  // Bottom-Right Chest & Barrel
];

function isCottagePointWalkable(x, y) {
  if (x < 336 || x > 618 || y < 234 || y > 404) return false;
  for (let i = 0; i < COTTAGE_OBSTACLES.length; i++) {
    const b = COTTAGE_OBSTACLES[i];
    if (x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY) {
      return false;
    }
  }
  return true;
}

// Dynamic Exclusive Bowl Position for Each Cat (index 0..N-1)
function getCatBowlPos(catIndex, totalCats, scene) {
  const count = Math.max(1, totalCats);
  const maxPerRow = 4;
  const row = Math.floor(catIndex / maxPerRow);
  const col = catIndex % maxPerRow;
  const colsInThisRow = Math.min(maxPerRow, count - row * maxPerRow);
  const spacingX = scene === 'COTTAGE' ? 24 : 26;
  const spacingY = 16;
  const base = scene === 'COTTAGE' ? COTTAGE_SPOTS.bowl : LANDMARKS.bowl;
  const startX = base.x - ((colsInThisRow - 1) * spacingX) / 2;
  return {
    x: Math.round(startX + col * spacingX),
    y: Math.round(base.y + row * spacingY)
  };
}

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
    this.bgmVolume = 0.70;
    this.rainVolume = 0.50;
    this.sfxVolume = 0.65;

    // Background Music Tracks (.ogg)
    this.bgmTracks = {
      sun_and_moon: new Audio('./assets/bgm/Mage tears - Sun and moonInstrumental.ogg'),
      cats_in_the_cold: new Audio('./assets/bgm/Cats In The Cold - Mage Tears (Instrumental).ogg')
    };
    this.activeBgmKey = null;
    this.fadeInterval = null;

    for (const key in this.bgmTracks) {
      const a = this.bgmTracks[key];
      a.loop = true;
      a.volume = 0;
      a.preload = 'auto';
    }

    // High quality real recorded Sound Effects (.wav)
    this.sfx = {
      purr: new Audio('./assets/sfx/newsfx/catpurr.wav'),
      rain: new Audio('./assets/sfx/newsfx/rainsfx.wav')
    };

    // 9 Unique realistic cat meows (meow1.wav - meow9.wav)
    this.meows = [];
    for (let i = 1; i <= 9; i++) {
      const m = new Audio(`./assets/sfx/newsfx/meow${i}.wav`);
      m.preload = 'auto';
      this.meows.push(m);
    }

    // Direct references for compatibility
    this.sfx.lilo = this.meows[0]; // meow1
    this.sfx.cheeto = this.meows[3]; // meow4

    // Rain loops continuously during storms
    if (this.sfx.rain) {
      this.sfx.rain.loop = true;
      this.sfx.rain.preload = 'auto';
    }
    // Cat purrs on pet or feed - NOT infinite loop!
    if (this.sfx.purr) {
      this.sfx.purr.loop = false;
      this.sfx.purr.preload = 'auto';
    }

    this.lastPurrTime = 0;
    this.purrFadeTimer = null;
    this.purrFadeInterval = null;
    this.rainFadeInterval = null;
    this.lastMeowTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playMeow(catTypeOrIndex = 'lilo') {
    if (!this.enabled) return;
    this.init();

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Reduce meowing frequency: enforce cooldown to avoid sound stacking/annoyance
    if (now - this.lastMeowTime < 2500) return;
    this.lastMeowTime = now;

    try {
      let soundObj = null;
      if (typeof catTypeOrIndex === 'number') {
        const idx = Math.abs(catTypeOrIndex) % this.meows.length;
        soundObj = this.meows[idx];
      } else if (typeof catTypeOrIndex === 'string') {
        if (catTypeOrIndex === 'lilo') {
          // Lilo signature meow voice pool: meow1, meow2, meow3
          const liloPool = [0, 1, 2];
          soundObj = this.meows[liloPool[Math.floor(Math.random() * liloPool.length)]];
        } else if (catTypeOrIndex === 'cheeto') {
          // Cheeto signature meow voice pool: meow4, meow5, meow6
          const cheetoPool = [3, 4, 5];
          soundObj = this.meows[cheetoPool[Math.floor(Math.random() * cheetoPool.length)]];
        } else {
          let hash = 0;
          for (let i = 0; i < catTypeOrIndex.length; i++) {
            hash = (hash * 31 + catTypeOrIndex.charCodeAt(i)) >>> 0;
          }
          // Companions & custom cats pool across meow7, meow8, meow9 or full 9
          soundObj = this.meows[(hash + Math.floor(Math.random() * 2)) % this.meows.length];
        }
      } else {
        soundObj = this.meows[Math.floor(Math.random() * this.meows.length)];
      }

      if (soundObj) {
        soundObj.currentTime = 0;
        soundObj.volume = this.sfxVolume;
        const playPromise = soundObj.play();
        if (playPromise) playPromise.catch(() => this.synthesizeMeow(catTypeOrIndex));
        return;
      }
    } catch (_) {}
    this.synthesizeMeow(catTypeOrIndex);
  }

  synthesizeMeow(catType = 'lilo') {
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
      gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
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

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    // Debounce re-trigger within 1.8s so rapid taps do not stutter-restart audio
    if (now - this.lastPurrTime < 1800) {
      return;
    }
    this.lastPurrTime = now;

    if (this.purrFadeTimer) {
      clearTimeout(this.purrFadeTimer);
      this.purrFadeTimer = null;
    }
    if (this.purrFadeInterval) {
      clearInterval(this.purrFadeInterval);
      this.purrFadeInterval = null;
    }

    try {
      const p = this.sfx.purr;
      if (p) {
        p.currentTime = 0;
        p.volume = this.sfxVolume;
        const playPromise = p.play();
        if (playPromise) playPromise.catch(() => this.synthesizePurr());

        // Cozy purr plays comfortably for ~4.2s (2 breath cycles), then softly fades
        this.purrFadeTimer = setTimeout(() => {
          this.fadeAndStopPurr();
        }, 4200);
        return;
      }
    } catch (_) {}
    this.synthesizePurr();
  }

  fadeAndStopPurr() {
    const p = this.sfx.purr;
    if (!p || p.paused) return;
    if (this.purrFadeInterval) {
      clearInterval(this.purrFadeInterval);
      this.purrFadeInterval = null;
    }
    let vol = p.volume;
    this.purrFadeInterval = setInterval(() => {
      vol -= 0.05;
      if (vol <= 0.05) {
        clearInterval(this.purrFadeInterval);
        this.purrFadeInterval = null;
        p.pause();
        p.currentTime = 0;
        p.volume = this.sfxVolume;
      } else {
        p.volume = Math.max(0, vol);
      }
    }, 50);
  }

  stopPurr() {
    if (this.purrFadeTimer) {
      clearTimeout(this.purrFadeTimer);
      this.purrFadeTimer = null;
    }
    if (this.purrFadeInterval) {
      clearInterval(this.purrFadeInterval);
      this.purrFadeInterval = null;
    }
    const p = this.sfx.purr;
    if (p) {
      p.pause();
      p.currentTime = 0;
      p.volume = this.sfxVolume;
    }
  }

  synthesizePurr() {
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      const masterGain = this.ctx.createGain();

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
      masterGain.gain.linearRampToValueAtTime(0.28, now + 0.15);
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
    if (this.rainFadeInterval) {
      clearInterval(this.rainFadeInterval);
      this.rainFadeInterval = null;
    }
    try {
      const r = this.sfx.rain;
      if (r) {
        r.volume = this.rainVolume;
        const playPromise = r.play();
        if (playPromise) playPromise.catch(() => this.synthesizeRain());
        return;
      }
    } catch (_) {}
    this.synthesizeRain();
  }

  synthesizeRain() {
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
      filter.frequency.setValueAtTime(850, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.rainGain.gain.linearRampToValueAtTime(0.18 * (this.rainVolume || 0.50), this.ctx.currentTime + 1.2);

      this.rainSource.connect(filter);
      filter.connect(this.rainGain);
      this.rainGain.connect(this.ctx.destination);
      this.rainSource.start();
    } catch (e) { }
  }

  stopRain() {
    if (this.rainFadeInterval) {
      clearInterval(this.rainFadeInterval);
      this.rainFadeInterval = null;
    }
    try {
      const r = this.sfx.rain;
      if (r && !r.paused) {
        let vol = r.volume;
        this.rainFadeInterval = setInterval(() => {
          vol -= 0.04;
          if (vol <= 0.02) {
            clearInterval(this.rainFadeInterval);
            this.rainFadeInterval = null;
            r.pause();
            r.currentTime = 0;
            r.volume = this.rainVolume;
          } else {
            r.volume = Math.max(0, vol);
          }
        }, 50);
      }
    } catch (_) {}

    if (this.rainGain && this.ctx) {
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
  }

  // Dynamic Background Music (BGM) Manager with 1.5s crossfade
  updateBgm(immediate = false) {
    if (!this.enabled) {
      this.pauseAllBgm();
      return;
    }

    const isRain = (typeof world !== 'undefined' && world && world.weather === 'RAIN');
    const isNight = (typeof world !== 'undefined' && world && (world.weather === 'NIGHT' || world.isNight));
    const targetKey = (isRain || isNight) ? 'cats_in_the_cold' : 'sun_and_moon';

    if (this.activeBgmKey === targetKey) {
      const activeAudio = this.bgmTracks[this.activeBgmKey];
      if (activeAudio && activeAudio.paused) {
        activeAudio.volume = this.bgmVolume;
        activeAudio.play().catch(() => {});
      }
      return;
    }

    const prevAudio = this.activeBgmKey ? this.bgmTracks[this.activeBgmKey] : null;
    const nextAudio = this.bgmTracks[targetKey];
    this.activeBgmKey = targetKey;

    if (!nextAudio) return;

    if (immediate || !prevAudio) {
      if (prevAudio) {
        prevAudio.pause();
        prevAudio.currentTime = 0;
      }
      nextAudio.currentTime = 0;
      nextAudio.volume = this.bgmVolume;
      nextAudio.play().catch(() => {});
      return;
    }

    // Smooth 1.5s crossfade
    nextAudio.currentTime = 0;
    nextAudio.volume = 0;
    nextAudio.play().catch(() => {});

    const steps = 15;
    const intervalTime = 100;
    let step = 0;

    if (this.fadeInterval) clearInterval(this.fadeInterval);
    this.fadeInterval = setInterval(() => {
      step++;
      const ratio = step / steps;
      if (prevAudio && !prevAudio.paused) {
        prevAudio.volume = Math.max(0, this.bgmVolume * (1.0 - ratio));
      }
      if (nextAudio && !nextAudio.paused) {
        nextAudio.volume = Math.min(this.bgmVolume, this.bgmVolume * ratio);
      }
      if (step >= steps) {
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        if (prevAudio) {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        }
        nextAudio.volume = this.bgmVolume;
      }
    }, intervalTime);
  }

  pauseAllBgm() {
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    for (const key in this.bgmTracks) {
      const a = this.bgmTracks[key];
      a.pause();
      a.volume = 0;
    }
  }

  toggleMaster() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.pauseAllBgm();
      this.stopRain();
      this.stopPurr();
      if (Array.isArray(this.meows)) {
        this.meows.forEach((m) => {
          try {
            m.pause();
            m.currentTime = 0;
          } catch (_) {}
        });
      }
    } else {
      this.updateBgm(true);
      if (typeof world !== 'undefined' && world && world.weather === 'RAIN') {
        this.startRain();
      }
    }
    return this.enabled;
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
 * 4. ENHANCED OPEN-METEO LIVE WEATHER & FORECAST SYSTEM
 ********************************************************************/
const WEATHER_CACHE_KEY = 'lilos_garden_weather_cache_v1';
const WEATHER_CUSTOM_LOC_KEY = 'lilos_garden_custom_loc';
const WEATHER_TEMP_UNIT_KEY = 'lilos_garden_temp_unit';
const WEATHER_FULL_FORECAST_KEY = 'lilos_garden_full_forecast_v1';

function getTempUnit() {
  try {
    return localStorage.getItem(WEATHER_TEMP_UNIT_KEY) || 'C';
  } catch (e) {
    return 'C';
  }
}

function setTempUnit(unit) {
  try {
    localStorage.setItem(WEATHER_TEMP_UNIT_KEY, unit);
  } catch (e) {}
}

function convertTemp(celsius, unit) {
  if (typeof celsius !== 'number' || Number.isNaN(celsius)) return '--';
  if (unit === 'F') {
    return Math.round((celsius * 9) / 5 + 32);
  }
  return Math.round(celsius);
}

function formatTemp(celsius, unit = getTempUnit()) {
  if (typeof celsius !== 'number' || Number.isNaN(celsius)) return '--°' + unit;
  return `${convertTemp(celsius, unit)}°${unit}`;
}

function toggleTempUnit() {
  const current = getTempUnit();
  const next = current === 'C' ? 'F' : 'C';
  setTempUnit(next);

  const lbl = document.getElementById('lblTempUnit');
  if (lbl) lbl.textContent = `°${next}`;

  if (typeof world !== 'undefined') {
    world.syncUI();
    if (window.AndroidBridge && typeof window.AndroidBridge.syncGardenToWidget === 'function') {
      try {
        window.AndroidBridge.syncGardenToWidget(JSON.stringify(world.serialize()));
      } catch (e) {}
    }
  }

  const cachedForecast = loadCachedFullForecast();
  if (cachedForecast) {
    renderWeatherForecastModal(cachedForecast);
  }
  showToast(`Temperature unit: °${next}`, 'sun');
}

function getCustomLocation() {
  try {
    const raw = localStorage.getItem(WEATHER_CUSTOM_LOC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setCustomLocation(loc) {
  try {
    localStorage.setItem(WEATHER_CUSTOM_LOC_KEY, JSON.stringify(loc));
  } catch (e) {}
}

function clearCustomLocation() {
  try {
    localStorage.removeItem(WEATHER_CUSTOM_LOC_KEY);
  } catch (e) {}
}

function loadCachedWeather() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveCachedWeather(lat, lon, tempC, weather, skyDesc, city = '') {
  try {
    localStorage.setItem(
      WEATHER_CACHE_KEY,
      JSON.stringify({
        lat,
        lon,
        tempC,
        weather,
        skyDesc,
        city,
        updatedAt: Date.now()
      })
    );
  } catch (e) {}
}

function loadCachedFullForecast() {
  try {
    const raw = localStorage.getItem(WEATHER_FULL_FORECAST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveCachedFullForecast(data) {
  try {
    localStorage.setItem(WEATHER_FULL_FORECAST_KEY, JSON.stringify(data));
  } catch (e) {}
}

async function searchOpenMeteoCities(query) {
  const trimmed = (query || '').trim();
  if (trimmed.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=6&language=en&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.results)) return [];
    return data.results.map((r) => ({
      name: r.name,
      country: r.country || '',
      admin1: r.admin1 || '',
      lat: r.latitude,
      lon: r.longitude
    }));
  } catch (e) {
    return [];
  }
}

function mapWeatherCodeToCondition(code, isDay, precip = 0, cloudCover = 0) {
  const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
  const cloudyCodes = [2, 3, 45, 48];
  const isRain = rainCodes.includes(code) || precip > 0.05;
  const isCloudy = cloudyCodes.includes(code) || cloudCover >= 65;

  if (isRain) {
    return {
      weather: 'RAIN',
      desc: [95, 96, 99].includes(code) ? 'Thunderstorm' : 'Rain Shower',
      icon: 'waves',
      color: '#38bdf8'
    };
  }
  if (!isDay) {
    return {
      weather: 'NIGHT',
      desc: isCloudy ? 'Cloudy Night' : 'Starry Night',
      icon: 'moon',
      color: '#fef08a'
    };
  }
  if (isCloudy) {
    return {
      weather: 'CLOUDY',
      desc: code === 3 ? 'Overcast Sky' : 'Cloudy Sky',
      icon: 'cloud-sun',
      color: '#cbd5e1'
    };
  }
  return {
    weather: 'SUNNY',
    desc: code === 1 ? 'Mostly Sunny' : 'Sunny Sky',
    icon: 'sun',
    color: '#fbbf24'
  };
}

function getDeviceCoordinates() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'GPS' }),
      () => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, source: 'GPS' }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
    );
  });
}

async function getIpCoordinatesFallback() {
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
    if (res.ok) {
      const data = await res.json();
      const lat = parseFloat(data.latitude);
      const lon = parseFloat(data.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        return { lat, lon, city: data.city || '', country: data.country || '', source: 'IP' };
      }
    }
  } catch (e) {}

  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      const lat = parseFloat(data.latitude);
      const lon = parseFloat(data.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        return { lat, lon, city: data.city || '', country: data.country || '', source: 'IP' };
      }
    }
  } catch (e) {}

  const cached = loadCachedWeather();
  if (cached && typeof cached.lat === 'number' && typeof cached.lon === 'number') {
    return { lat: cached.lat, lon: cached.lon, city: cached.city || '', source: 'CACHE' };
  }
  throw new Error('All location providers failed');
}

async function fetchFullWeatherForecast(w, lat, lon, locationLabel = null) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,showers,weather_code,cloud_cover,is_day&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Open-Meteo HTTP error: ' + res.status);
  const data = await res.json();
  const cur = data.current;
  if (!cur) throw new Error('Missing current weather payload');

  const curTemp = Math.round(cur.temperature_2m);
  const code = Number(cur.weather_code || 0);
  const isDay = Number(cur.is_day) === 1;
  const precip = Number(cur.precipitation || 0) + Number(cur.rain || 0) + Number(cur.showers || 0);
  const cloudCover = Number(cur.cloud_cover || 0);

  const mapped = mapWeatherCodeToCondition(code, isDay, precip, cloudCover);

  let finalCity = locationLabel;
  if (!finalCity) {
    const custom = getCustomLocation();
    finalCity = custom ? custom.city : (w.city || 'My Location');
  }

  w.lat = lat;
  w.lon = lon;
  w.tempC = curTemp;
  w.weather = mapped.weather;
  w.skyDesc = mapped.desc;
  w.city = finalCity;

  saveCachedWeather(lat, lon, w.tempC, w.weather, w.skyDesc, finalCity);

  const payload = {
    city: finalCity,
    lat,
    lon,
    current: {
      tempC: curTemp,
      humidity: Math.round(cur.relative_humidity_2m || 50),
      weather: mapped.weather,
      skyDesc: mapped.desc,
      icon: mapped.icon,
      color: mapped.color,
      isDay,
      precipProb: Math.round(data.daily?.precipitation_probability_max?.[0] || 0),
      tempMax: Math.round(data.daily?.temperature_2m_max?.[0] || curTemp),
      tempMin: Math.round(data.daily?.temperature_2m_min?.[0] || curTemp - 4)
    },
    hourly: (data.hourly?.time || []).slice(0, 24).map((timeStr, idx) => {
      const hTemp = Math.round(data.hourly.temperature_2m[idx]);
      const hCode = Number(data.hourly.weather_code[idx]);
      const hIsDay = Number(data.hourly.is_day[idx]) === 1;
      const hProb = Math.round(data.hourly.precipitation_probability?.[idx] || 0);
      const hMap = mapWeatherCodeToCondition(hCode, hIsDay, hProb > 30 ? 1 : 0);
      const hourDate = new Date(timeStr);
      let hourLabel = hourDate.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      if (idx === 0) hourLabel = 'Now';
      return {
        time: hourLabel,
        tempC: hTemp,
        weather: hMap.weather,
        icon: hMap.icon,
        color: hMap.color,
        prob: hProb
      };
    }),
    daily: (data.daily?.time || []).map((dateStr, idx) => {
      const dCode = Number(data.daily.weather_code[idx]);
      const dMax = Math.round(data.daily.temperature_2m_max[idx]);
      const dMin = Math.round(data.daily.temperature_2m_min[idx]);
      const dProb = Math.round(data.daily.precipitation_probability_max?.[idx] || 0);
      const dMap = mapWeatherCodeToCondition(dCode, true, dProb > 40 ? 1 : 0);
      const dateObj = new Date(dateStr + 'T12:00:00');
      const dayName = idx === 0 ? 'Today' : dateObj.toLocaleDateString([], { weekday: 'short' });
      return {
        day: dayName,
        maxTempC: dMax,
        minTempC: dMin,
        weather: dMap.weather,
        desc: dMap.desc,
        icon: dMap.icon,
        color: dMap.color,
        prob: dProb
      };
    }),
    updatedAt: Date.now()
  };

  saveCachedFullForecast(payload);
  w.onWeatherUpdated();
  renderWeatherForecastModal(payload);
  return payload;
}

function renderWeatherForecastModal(payload) {
  if (!payload || !payload.current) return;
  const unit = getTempUnit();

  safeText('lblTempUnit', `°${unit}`);
  safeText('wfLocationName', payload.city || 'Sanctuary Haven');
  safeText('wfCurrentTemp', formatTemp(payload.current.tempC, unit));
  safeText('wfSkyDesc', payload.current.skyDesc);
  safeText('wfHighLow', `${formatTemp(payload.current.tempMax, unit)} / ${formatTemp(payload.current.tempMin, unit)}`);
  safeText('wfHumidity', `${payload.current.humidity}%`);
  safeText('wfRainProb', `${payload.current.precipProb}%`);

  const glyphEl = document.getElementById('wfBigSkyGlyph');
  if (glyphEl) {
    glyphEl.innerHTML = `<svg class="w-12 h-12" style="color:${payload.current.color || '#38bdf8'};"><use href="#pi-${payload.current.icon || 'sun'}"/></svg>`;
  }

  const hourlyEl = document.getElementById('wfHourlyScroll');
  if (hourlyEl && Array.isArray(payload.hourly)) {
    hourlyEl.innerHTML = payload.hourly
      .map(
        (h) => `
      <div class="forecast-hourly-card">
        <span class="text-[10px] font-bold text-[#7c624c] whitespace-nowrap">${h.time}</span>
        <svg class="pixel-icon pixel-icon-lg" style="color:${h.color};"><use href="#pi-${h.icon}"/></svg>
        <span class="text-xs font-pixel font-bold text-[#3b1d0a]">${formatTemp(h.tempC, unit)}</span>
        ${h.prob > 0 ? `<span class="text-[9px] font-bold text-sky-600">${h.prob}%</span>` : ''}
      </div>`
      )
      .join('');
  }

  const dailyEl = document.getElementById('wfDailyList');
  if (dailyEl && Array.isArray(payload.daily)) {
    dailyEl.innerHTML = payload.daily
      .map(
        (d) => `
      <div class="forecast-daily-card">
        <div class="flex items-center gap-2 min-w-[72px]">
          <span class="text-xs font-bold text-[#3b1d0a]">${d.day}</span>
        </div>
        <div class="flex items-center gap-1.5 flex-1">
          <svg class="pixel-icon" style="color:${d.color};"><use href="#pi-${d.icon}"/></svg>
          <span class="text-[11px] font-semibold text-[#5c3820] truncate">${d.desc}</span>
        </div>
        <div class="flex items-center gap-2 text-xs font-pixel font-bold text-right">
          <span class="text-[#0c4a6e]">${formatTemp(d.maxTempC, unit)}</span>
          <span class="text-[#64748b] text-[10px]">${formatTemp(d.minTempC, unit)}</span>
          ${d.prob > 15 ? `<span class="text-[9px] font-bold text-sky-600 min-w-[28px]">${d.prob}%</span>` : `<span class="min-w-[28px]"></span>`}
        </div>
      </div>`
      )
      .join('');
  }
}

function openWeatherForecastModal() {
  openModal('modalWeatherForecast');
  const cached = loadCachedFullForecast();
  if (cached) {
    renderWeatherForecastModal(cached);
  }
  const custom = getCustomLocation();
  if (custom) {
    fetchFullWeatherForecast(world, custom.lat, custom.lon, custom.city).catch(() => {});
  } else if (world.lat && world.lon) {
    fetchFullWeatherForecast(world, world.lat, world.lon, world.city).catch(() => {});
  } else {
    syncLiveWeather(world);
  }
}

let citySearchDebounceTimer = null;

function setupCitySearchAutocomplete() {
  const input = document.getElementById('inputCitySearch');
  const resultsContainer = document.getElementById('citySearchResults');
  if (!input || !resultsContainer) return;

  input.addEventListener('input', () => {
    clearTimeout(citySearchDebounceTimer);
    const query = input.value.trim();
    if (query.length < 2) {
      resultsContainer.classList.add('hidden');
      resultsContainer.innerHTML = '';
      return;
    }

    citySearchDebounceTimer = setTimeout(async () => {
      const cities = await searchOpenMeteoCities(query);
      if (cities.length === 0) {
        resultsContainer.innerHTML = '<div class="p-2.5 text-xs text-[#7c624c] italic">No cities found</div>';
        resultsContainer.classList.remove('hidden');
        return;
      }
      resultsContainer.innerHTML = cities
        .map(
          (c, idx) => `
        <div class="city-search-item" data-city-idx="${idx}">
          <div class="font-bold">${c.name}</div>
          <div class="text-[10px] text-[#7c624c]">${c.admin1 ? c.admin1 + ', ' : ''}${c.country}</div>
        </div>`
        )
        .join('');
      resultsContainer.classList.remove('hidden');

      resultsContainer.querySelectorAll('.city-search-item').forEach((item) => {
        item.addEventListener('click', async () => {
          const idx = Number(item.getAttribute('data-city-idx'));
          const selected = cities[idx];
          if (!selected) return;

          input.value = `${selected.name}${selected.country ? ', ' + selected.country : ''}`;
          resultsContainer.classList.add('hidden');

          const locObj = {
            city: selected.name,
            country: selected.country,
            lat: selected.lat,
            lon: selected.lon,
            custom: true
          };
          setCustomLocation(locObj);

          try {
            await fetchFullWeatherForecast(world, selected.lat, selected.lon, selected.name);
            showToast(`Weather updated to ${selected.name}!`, 'map');
          } catch (e) {
            showToast(`Failed to fetch weather for ${selected.name}`, 'cloud-sun');
          }
        });
      });
    }, 280);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.classList.add('hidden');
    }
  });

  safeOn('btnWeatherUseGps', 'click', async () => {
    clearCustomLocation();
    if (input) input.value = '';
    resultsContainer.classList.add('hidden');
    showToast('Locating with GPS...', 'target');
    try {
      const loc = await getDeviceCoordinates();
      await fetchFullWeatherForecast(world, loc.lat, loc.lon, 'Device GPS');
      showToast('Switched to Live GPS weather!', 'map');
    } catch (e1) {
      try {
        const ipLoc = await getIpCoordinatesFallback();
        await fetchFullWeatherForecast(world, ipLoc.lat, ipLoc.lon, ipLoc.city || 'IP Location');
        showToast('Switched to IP Location weather!', 'map');
      } catch (e2) {
        showToast('Could not detect location', 'cloud-sun');
      }
    }
  });
}

async function syncLiveWeather(w) {
  if (w.weatherMode !== 'AUTO') return;

  const custom = getCustomLocation();
  if (custom && typeof custom.lat === 'number' && typeof custom.lon === 'number') {
    w.city = custom.city;
    try {
      await fetchFullWeatherForecast(w, custom.lat, custom.lon, custom.city);
      return;
    } catch (e) {}
  }

  const cached = loadCachedWeather();
  if (cached && typeof cached.tempC === 'number') {
    w.tempC = cached.tempC;
    w.lat = cached.lat;
    w.lon = cached.lon;
    w.city = cached.city || 'GPS Location';
    const hour = new Date().getHours();
    const isNightNow = hour < 6 || hour >= 18;
    if (cached.weather === 'RAIN') {
      w.weather = 'RAIN';
      w.skyDesc = cached.skyDesc || 'Rain Shower';
    } else if (isNightNow) {
      w.weather = 'NIGHT';
      w.skyDesc = 'Starry Night';
    } else {
      w.weather = cached.weather === 'NIGHT' ? 'SUNNY' : (cached.weather || 'SUNNY');
      w.skyDesc = cached.skyDesc || 'Sunny Sky';
    }
    w.syncUI();
  }

  try {
    const loc = await getDeviceCoordinates();
    await fetchFullWeatherForecast(w, loc.lat, loc.lon, 'Device GPS');
  } catch (gpsErr) {
    try {
      const ipLoc = await getIpCoordinatesFallback();
      await fetchFullWeatherForecast(w, ipLoc.lat, ipLoc.lon, ipLoc.city || 'IP Location');
    } catch (ipErr) {
      w.applyClockFallback();
    }
  }
}

setInterval(() => {
  if (typeof world !== 'undefined' && world.weatherMode === 'AUTO') {
    syncLiveWeather(world);
  }
}, 15 * 60 * 1000);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && typeof world !== 'undefined' && world.weatherMode === 'AUTO') {
    syncLiveWeather(world);
  }
});


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
  tasks: [],
  stickyNote: '',
  cats: [],
  particles: [],
  critters: [],
  rainDrops: [],
  pointer: { x: -100, y: -100, hoveredEntity: null },
  scene: 'GARDEN',
  caretaker: {
    ...DEFAULT_CARETAKER,
    x: 650,
    y: 378,
    targetX: 650,
    targetY: 378,
    facing: -1,
    state: 'IDLE',
    stateTimer: 6,
    effectiveActivity: 'COFFEE',
    labelAlpha: 1.5
  },
  callCatsToCaretaker() {
    this.caretaker.labelAlpha = 2.0;
    this.spawnHeart(this.caretaker.x, this.caretaker.y - 16, 'heart');
    sound.playFeedSound();
    sound.playPurr();
    this.cats.forEach((cat, idx) => {
      cat.state = 'WANDER';
      cat.pose = 'sit';
      cat.targetX = this.caretaker.x + (idx % 2 === 0 ? -18 : 18);
      cat.targetY = this.caretaker.y + 4 + (idx * 3);
      cat.stateTimer = 6;
    });
    showToast(`${this.caretaker.name} called Lilo & Cheeto over for cuddles!`, 'heart-solid', '#fb7185');
  },

  tablePopupOpen: false,

  showTableEatPopup(screenX, screenY) {
    const btn = document.getElementById('tableEatBtn');
    if (!btn) return;
    this.tablePopupOpen = true;
    btn.style.left = `${Math.round(screenX)}px`;
    btn.style.top = `${Math.round(screenY - 14)}px`;
    btn.classList.remove('hidden');
  },

  hideTableEatPopup() {
    const btn = document.getElementById('tableEatBtn');
    if (btn) btn.classList.add('hidden');
    this.tablePopupOpen = false;
  },

  toggleCaretakerBedSleep() {
    this.hideTableEatPopup();
    const ct = this.caretaker;
    if (ct.state === 'SLEEPING_BED') {
      this.wakeCaretaker(false);
    } else {
      ct.state = 'SLEEPING_BED';
      ct.x = COTTAGE_SPOTS.bed.x;
      ct.y = COTTAGE_SPOTS.bed.y;
      ct.targetX = ct.x;
      ct.targetY = ct.y;
      ct.sleepStartedHour = new Date().getHours();
      ct.sleepStartedNight = this.weather === 'NIGHT';
      ct.labelAlpha = 1.8;
      this.spawnSleepZ(ct.x, ct.y - 6);
      showToast(`${ct.name} tucked into bed for a sleep! (Tap bed to wake)`, 'moon', '#a78bfa');
    }
  },

  wakeCaretaker(isAutoMorning = false) {
    const ct = this.caretaker;
    if (ct.state !== 'SLEEPING_BED' && ct.state !== 'NAPPING_COUCH') return;
    const wasBed = ct.state === 'SLEEPING_BED';
    ct.state = 'IDLE';
    ct.stateTimer = 6;
    if (wasBed) {
      ct.x = COTTAGE_SPOTS.rug.x;
      ct.y = COTTAGE_SPOTS.rug.y + 6;
    } else {
      ct.x = 574;
      ct.y = 334;
    }
    ct.targetX = ct.x;
    ct.targetY = ct.y;
    ct.labelAlpha = 1.8;
    this.spawnHeart(ct.x, ct.y - 14, 'sparkle');
    showToast(
      isAutoMorning
        ? `Good morning! ${ct.name} woke up refreshed!`
        : `${ct.name} woke up refreshed!`,
      'sun',
      '#fbbf24'
    );
  },

  toggleCaretakerCouchNap() {
    this.hideTableEatPopup();
    const ct = this.caretaker;
    if (ct.state === 'NAPPING_COUCH') {
      this.wakeCaretaker(false);
    } else {
      ct.state = 'NAPPING_COUCH';
      ct.x = COTTAGE_SPOTS.sofa.x;
      ct.y = COTTAGE_SPOTS.sofa.y;
      ct.targetX = ct.x;
      ct.targetY = ct.y;
      ct.facing = -1;
      ct.labelAlpha = 1.8;
      this.spawnSleepZ(ct.x, ct.y - 8);
      showToast(`${ct.name} curled up on the couch for a cozy nap!`, 'heart-solid', '#f43f5e');
    }
  },

  startCaretakerTableMeal() {
    this.hideTableEatPopup();
    const ct = this.caretaker;
    ct.state = 'SEEK_TABLE_MEAL';
    ct.targetX = 364;
    ct.targetY = 277;
    ct.labelAlpha = 1.8;
    showToast(`${ct.name} is sitting down at the table to eat!`, 'fish', '#fbbf24');
  },

  toggleScene() {
    this.hideTableEatPopup();
    this.scene = this.scene === 'COTTAGE' ? 'GARDEN' : 'COTTAGE';
    safeText('sceneBtnText', this.scene === 'COTTAGE' ? 'Garden' : 'Cottage');
    const ct = this.caretaker;
    if (ct.state !== 'SLEEPING_BED') {
      if (this.scene === 'COTTAGE') {
        ct.x = 598;
        ct.y = 248;
        ct.targetX = 598;
        ct.targetY = 248;
        ct.state = 'IDLE';
      } else {
        ct.x = LANDMARKS.porch.x;
        ct.y = LANDMARKS.porch.y;
        ct.targetX = LANDMARKS.porch.x;
        ct.targetY = LANDMARKS.porch.y;
        ct.state = this.weather === 'RAIN' ? 'PORCH_SHELTERED' : 'IDLE';
      }
    }
    this.cats.forEach((c, i) => {
      c.state = 'IDLE';
      c.pose = i % 2 === 0 ? 'sleep' : 'sit';
      if (this.scene === 'COTTAGE') {
        c.x = 456 + ((i * 22) % 64);
        c.y = 290 + ((i * 18) % 50);
      } else {
        c.x = 455 + ((i * 28) % 90);
        c.y = 310 + ((i * 18) % 50);
      }
      c.targetX = c.x;
      c.targetY = c.y;
    });
    camera.x = 480;
    camera.y = 310;
    clampCamera();
    showToast(
      this.scene === 'COTTAGE'
        ? 'Stepped inside the Cozy Cottage!'
        : 'Stepped out into the Garden!',
      this.scene === 'COTTAGE' ? 'coffee' : 'leaf'
    );
  },

  init() {
    this.load();
    this.initCritters();
    this.initRain();
    syncLiveWeather(this);
    this.syncUI();
  },

  applyClockFallback() {
    const cached = loadCachedWeather();
    const hour = new Date().getHours();
    if (hour < 6 || hour >= 18) {
      this.weather = 'NIGHT';
      this.skyDesc = 'Firefly Night';
      this.tempC = cached && typeof cached.tempC === 'number' ? cached.tempC : 26;
    } else {
      this.weather = 'SUNNY';
      this.skyDesc = 'Sunny Sky';
      this.tempC = cached && typeof cached.tempC === 'number' ? cached.tempC : 30;
    }
    this.onWeatherUpdated();
  },

  onWeatherUpdated() {
    sound.updateBgm();
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
      socialCooldown: 0,
      bowlLevel: typeof spec.bowlLevel === 'number' ? spec.bowlLevel : 3
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
      if (Array.isArray(saved.tasks)) {
        this.tasks = saved.tasks.filter(
          (t) => t && t.id !== 'task-1' && t.id !== 'task-2' && t.id !== 'task-3'
        );
      }
      if (typeof saved.stickyNote === 'string') this.stickyNote = saved.stickyNote;
      if (saved.weatherMode) this.weatherMode = saved.weatherMode;
      if (saved.caretaker && typeof saved.caretaker === 'object') {
        this.caretaker = {
          ...this.caretaker,
          ...saved.caretaker
        };
      }

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
      lat: this.lat || null,
      lon: this.lon || null,
      stats: this.stats,
      petProgress: this.petProgress,
      blooms: this.blooms,
      bowlLevel: this.bowlLevel,
      weatherMode: this.weatherMode,
      weather: this.weather,
      skyDesc: this.skyDesc || 'Sunny Sky',
      tempC: this.tempC,
      city: this.city || '',
      tempUnit: getTempUnit(),
      tributeNote: this.tributeNote,
      tasks: this.tasks || [],
      stickyNote: this.stickyNote || '',
      caretaker: this.caretaker ? {
        name: this.caretaker.name,
        skinColor: this.caretaker.skinColor,
        skinShade: this.caretaker.skinShade,
        hairStyle: this.caretaker.hairStyle,
        hairColor: this.caretaker.hairColor,
        outfitColor: this.caretaker.outfitColor,
        pantsColor: this.caretaker.pantsColor,
        accessory: this.caretaker.accessory,
        activity: this.caretaker.activity
      } : DEFAULT_CARETAKER,
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

    // Cats always purr when petted/tapped
    sound.playPurr();

    if (this.petProgress >= 3) {
      this.petProgress = 0;
      // Happy meow on 3-pet milestone
      sound.playMeow(cat.id);
      if (this.blooms < 24) {
        this.blooms++;
        this.spawnHeart(LANDMARKS.shrine.x, LANDMARKS.shrine.y - 10, 'sparkle');
        showToast('A new blue forget-me-not bloomed!', 'sparkle', '#38bdf8');
      } else {
        showToast(`${cat.name} purred warmly!`, 'heart-solid', '#f43f5e');
      }
    } else {
      showToast(`${cat.name} purred warmly!`, 'heart-solid', '#f43f5e');
    }

    this.spawnHeart(cat.x, cat.y - 6, 'heart');
    this.save();
  },

  feedBowl() {
    this.bowlLevel = 3;
    sound.playFeedSound();
    sound.playPurr();
    const total = this.cats.length;
    this.cats.forEach((cat, idx) => {
      cat.bowlLevel = 3;
      const bPos = getCatBowlPos(idx, total, this.scene);
      this.spawnHeart(bPos.x, bPos.y - 4, 'sparkle');
      cat.state = 'SEEK_FOOD';
      cat.pose = 'sit';
      cat.targetX = bPos.x;
      cat.targetY = bPos.y + 3;
    });
    showToast(
      total > 1
        ? `Filled all ${total} exclusive cat bowls with crunchy kibble!`
        : 'Ceramic bowl filled with crunchy kibble!',
      'fish',
      '#fbbf24'
    );
    this.save();
  },

  pickRandomGardenPoint() {
    if (this.scene === 'COTTAGE') {
      if (Math.random() < 0.35) {
        return {
          x: COTTAGE_SPOTS.rug.x + (Math.random() * 20 - 10),
          y: COTTAGE_SPOTS.rug.y + (Math.random() * 10 - 5)
        };
      }
      for (let t = 0; t < 15; t++) {
        const tx = COTTAGE_BOUNDS.minX + Math.random() * (COTTAGE_BOUNDS.maxX - COTTAGE_BOUNDS.minX);
        const ty = COTTAGE_BOUNDS.minY + Math.random() * (COTTAGE_BOUNDS.maxY - COTTAGE_BOUNDS.minY);
        if (isCottagePointWalkable(tx, ty)) return { x: tx, y: ty };
      }
      return { x: 480, y: 315 };
    }
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

      if (this.scene !== 'COTTAGE' && this.weather === 'RAIN' && cat.state !== 'SHELTERED' && cat.state !== 'SEEK_SHELTER' && cat.state !== 'INTERACT') {
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
          const catBowlLvl = typeof cat.bowlLevel === 'number' ? cat.bowlLevel : this.bowlLevel;
          const activeRug = this.scene === 'COTTAGE' ? COTTAGE_SPOTS.rug : LANDMARKS.rug;
          if (catBowlLvl > 0 && Math.random() < dt * 0.08) {
            const myBowl = getCatBowlPos(i, this.cats.length, this.scene);
            cat.state = 'SEEK_FOOD';
            cat.targetX = myBowl.x;
            cat.targetY = myBowl.y + 3;
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
          const myBowl = getCatBowlPos(i, this.cats.length, this.scene);
          const activeRug = this.scene === 'COTTAGE' ? COTTAGE_SPOTS.rug : LANDMARKS.rug;
          const dx = cat.targetX - cat.x;
          const dy = cat.targetY - cat.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 4) {
            const catBowlLvl = typeof cat.bowlLevel === 'number' ? cat.bowlLevel : this.bowlLevel;
            if (cat.state === 'SEEK_FOOD' && catBowlLvl > 0) {
              cat.state = 'EATING';
              cat.stateTimer = 3.5;
              cat.facing = myBowl.x >= cat.x ? 1 : -1;
              sound.playMunchPop();
            } else if (cat.state === 'SEEK_SHELTER') {
              cat.state = 'SHELTERED';
              cat.pose = Math.random() < 0.65 ? 'sleep' : 'sit';
              cat.stateTimer = 6;
            } else {
              cat.state = 'IDLE';
              const onRug = Math.hypot(cat.x - activeRug.x, cat.y - activeRug.y) < 24;
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
            const catBowlLvl = typeof cat.bowlLevel === 'number' ? cat.bowlLevel : this.bowlLevel;
            if (catBowlLvl > 0) {
              cat.bowlLevel = Math.max(0, catBowlLvl - 1);
              this.bowlLevel = Math.max(...this.cats.map((c) => c.bowlLevel ?? 0));
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

    // Rare ambient meow across the entire garden (~once every 45-60s max)
    if (Math.random() < dt * 0.015 && typeof performance !== 'undefined' && performance.now() - sound.lastMeowTime > 45000) {
      const sittingCat = this.cats.find((c) => c.state === 'IDLE' && c.pose === 'sit');
      if (sittingCat) {
        sound.playMeow(sittingCat.id);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Update 8-Bit Caretaker
    if (this.caretaker) {
      const ct = this.caretaker;
      if (ct.labelAlpha > 0) ct.labelAlpha = Math.max(0, ct.labelAlpha - dt * 0.25);
      ct.stateTimer -= dt;

      // 1. Sleeping in Bed or Napping on Couch
      if (ct.state === 'SLEEPING_BED' || ct.state === 'NAPPING_COUCH') {
        if (Math.random() < dt * 0.65) {
          this.spawnSleepZ(ct.x, ct.y - 8);
        }
        if (ct.state === 'SLEEPING_BED') {
          const curHour = new Date().getHours();
          const nightEnded = ct.sleepStartedNight && this.weather !== 'NIGHT';
          const morningArrived = curHour >= 6 && curHour < 11 && ct.sleepStartedHour !== curHour && (ct.sleepStartedHour < 6 || ct.sleepStartedHour >= 18);
          if (nightEnded || morningArrived) {
            this.wakeCaretaker(true);
          }
        }
      } else if (ct.state === 'SEEK_TABLE_MEAL') {
        const dx = ct.targetX - ct.x;
        const dy = ct.targetY - ct.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 3) {
          ct.x = 364;
          ct.y = 277;
          ct.facing = 1;
          ct.state = 'EATING_TABLE';
          ct.stateTimer = 8.0;
          sound.playMunchPop();
        } else {
          ct.x += (dx / dist) * 28 * dt;
          ct.y += (dy / dist) * 28 * dt;
          if (Math.abs(dx) > 0.3) ct.facing = dx < 0 ? -1 : 1;
        }
      } else if (ct.state === 'EATING_TABLE') {
        // 3. Eating Meal at Dining Table
        if (Math.random() < dt * 2.2) {
          this.spawnHeart(ct.x, ct.y - 16, 'sparkle');
        }
        if (ct.stateTimer <= 0) {
          ct.state = 'IDLE';
          ct.stateTimer = 6;
          this.spawnHeart(ct.x, ct.y - 18, 'heart');
          showToast(`${ct.name} finished a delicious warm meal!`, 'heart-solid', '#fb7185');
        }
      } else if (this.scene === 'GARDEN' && this.weather === 'RAIN') {
        // 4. Outdoor Rain Reaction: Use Umbrella & Seek Covered Campfire Porch!
        const distToPorch = Math.hypot(ct.x - LANDMARKS.porch.x, ct.y - LANDMARKS.porch.y);
        if (distToPorch > 5) {
          ct.state = 'WANDER';
          ct.targetX = LANDMARKS.porch.x;
          ct.targetY = LANDMARKS.porch.y;
          const dx = ct.targetX - ct.x;
          const dy = ct.targetY - ct.y;
          ct.x += (dx / distToPorch) * 28 * dt;
          ct.y += (dy / distToPorch) * 28 * dt;
          if (Math.abs(dx) > 0.3) ct.facing = dx < 0 ? -1 : 1;
        } else {
          ct.x = LANDMARKS.porch.x;
          ct.y = LANDMARKS.porch.y;
          ct.state = 'PORCH_SHELTERED';
          ct.effectiveActivity = 'COFFEE';
        }
      } else {
        // 5. Normal Indoor / Outdoor Autonomous Routine
        if (ct.state === 'PORCH_SHELTERED' && (this.weather !== 'RAIN' || this.scene !== 'GARDEN')) {
          ct.state = 'IDLE';
          ct.stateTimer = 3;
        }
        if (ct.activity !== 'AUTO') {
          ct.effectiveActivity = ct.activity;
        }
        if (ct.state === 'WANDER') {
          const dx = ct.targetX - ct.x;
          const dy = ct.targetY - ct.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 4) {
            ct.x = ct.targetX;
            ct.y = ct.targetY;
            ct.state = 'IDLE';
            ct.stateTimer = 7 + Math.random() * 6;
            if (this.scene === 'COTTAGE' && Math.hypot(ct.x - COTTAGE_SPOTS.desk.x, ct.y - COTTAGE_SPOTS.desk.y) < 12) {
              ct.effectiveActivity = ct.activity === 'CODE' ? 'CODE' : 'READ';
            } else if (ct.activity === 'AUTO') {
              const acts = ['READ', 'COFFEE', 'CODE'];
              ct.effectiveActivity = acts[Math.floor(Math.random() * acts.length)];
            }
          } else {
            ct.x += (dx / dist) * 24 * dt;
            ct.y += (dy / dist) * 24 * dt;
            if (Math.abs(dx) > 0.3) ct.facing = dx < 0 ? -1 : 1;
          }
        } else if (ct.stateTimer <= 0 && ct.activity === 'AUTO') {
          ct.state = 'WANDER';
          if (this.scene === 'COTTAGE') {
            const spots = [
              { x: COTTAGE_SPOTS.desk.x, y: COTTAGE_SPOTS.desk.y },     // Sitting on Front-Facing Chair at Study Desk
              { x: COTTAGE_SPOTS.sofa.x, y: COTTAGE_SPOTS.sofa.y },     // Lounging on Cream Sofa (Overlays Sofa!)
              { x: COTTAGE_SPOTS.rug.x,  y: COTTAGE_SPOTS.rug.y + 10 }, // Standing on Crimson Rug
              { x: 480,                  y: 325 }                       // Open Center Floor
            ];
            const pick = spots[Math.floor(Math.random() * spots.length)];
            ct.targetX = pick.x;
            ct.targetY = pick.y;
          } else {
            const spots = [
              { x: 684,               y: 382 },               // Sitting on the Campfire Log
              { x: LANDMARKS.porch.x, y: LANDMARKS.porch.y }, // Covered Campfire Porch
              { x: 545,               y: 340 },               // Picnic Rug
              { x: 475,               y: 285 }                // Garden Path
            ];
            const pick = spots[Math.floor(Math.random() * spots.length)];
            ct.targetX = pick.x;
            ct.targetY = pick.y;
          }
          ct.stateTimer = 6 + Math.random() * 5;
        }
      }
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
    if (this._lastMoodText !== moodText) {
      this._lastMoodText = moodText;
      el.textContent = moodText;
    }
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
    const unit = getTempUnit();
    const formattedTemp = formatTemp(this.tempC, unit);
    const customLoc = getCustomLocation();
    const locTag = customLoc ? customLoc.city : (this.weatherMode === 'AUTO' ? (this.city || 'Live') : '');
    safeText(
      'weatherText',
      `${formattedTemp} • ${this.skyDesc}${locTag ? ` (${locTag})` : ''}`
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
  const stage = document.getElementById('garden-stage');
  const rect = stage ? stage.getBoundingClientRect() : null;
  const w = Math.round(rect && rect.width > 0 ? rect.width : window.innerWidth);
  const h = Math.round(rect && rect.height > 0 ? rect.height : window.innerHeight - 48);
  canvas.width = w;
  canvas.height = h;

  const isPortrait = h >= w;
  if (isPortrait) {
    camera.baseScale = Math.max(2.2, w / 270);
  } else {
    camera.baseScale = Math.max(1.8, Math.min(w / 540, h / 340));
  }
  clampCamera();
}
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', updateCanvasResolution);
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
  campfireSmoke: './assets/sprites/tileSprite/3 Animated Objects/2 Campfire/1.png',

  // New Top-Down Cozy Cottage Individual Furniture Sprites
  intWardrobe: './assets/interior/Individual/wardrobe.png',
  intMirror: './assets/interior/Individual/mirror.png',
  intBedsideTable: './assets/interior/Individual/Bedside Table.png',
  intLampOn: './assets/interior/Individual/Lamp.png',
  intLampOff: './assets/interior/Individual/Lampoff.png',
  intWindow: './assets/interior/Individual/window.png',
  intDoubleBed: './assets/interior/Individual/DoubleBed.png',
  intCarpet: './assets/interior/Individual/carpet.png',
  intBookcase: './assets/interior/Individual/bookcase.png',
  intBook: './assets/interior/Individual/Book.png',
  intStudyDesk: './assets/interior/Individual/Table.png',
  intMiniFlower: './assets/interior/Individual/minidecoflower.png',
  intDiningTable: './assets/interior/Individual/tablebig.png',
  intChairTop: './assets/interior/Individual/ChairF.png',
  intChairSide1: './assets/interior/Individual/Chair1side.png',
  intChairSide2: './assets/interior/Individual/Chair2side.png',
  intChairBottom: './assets/interior/Individual/ChairBside.png',
  intCoatStand: './assets/interior/Individual/coat stand.png',
  intVaseFlower: './assets/interior/Individual/vaseflower.png',
  intSofaSide1: './assets/interior/Individual/sofa 1side.png',
  intSofaSide2: './assets/interior/Individual/sofa 2side.png',
  intBoxChest: './assets/interior/Individual/Box.png',
  intBoxBarrel: './assets/interior/Individual/Box2.png'
};

const loadedSprites = {};
const trimmedSpriteCache = {};
let gardenStaticCache = null;
let cottageStaticCache = null;
let fireGlowSprite = null;
let lanternGlowSprite = null;

function invalidateSceneCaches() {
  gardenStaticCache = null;
  cottageStaticCache = null;
  Object.keys(trimmedSpriteCache).forEach((k) => delete trimmedSpriteCache[k]);
}

(function preloadGardenSprites() {
  Object.entries(SPRITE_BANK).forEach(([key, src]) => {
    const img = new Image();
    img.onload = () => {
      loadedSprites[key] = img;
      invalidateSceneCaches();
    };
    img.src = encodeURI(src);
  });
})();

function areAllSpritesLoaded() {
  return Object.keys(SPRITE_BANK).every((k) => {
    const img = loadedSprites[k];
    return img && img.complete && img.naturalWidth > 0;
  });
}

const PRECOMPUTED_FURNITURE_RECTS = {
  intWardrobe: { minX: 17, minY: 8, tw: 31, th: 42, backrestOnRight: false },
  intMirror: { minX: 20, minY: 17, tw: 24, th: 30, backrestOnRight: false },
  intBedsideTable: { minX: 24, minY: 33, tw: 17, th: 17, backrestOnRight: false },
  intLampOn: { minX: 25, minY: 29, tw: 14, th: 17, backrestOnRight: false },
  intLampOff: { minX: 25, minY: 30, tw: 14, th: 17, backrestOnRight: false },
  intWindow: { minX: 20, minY: 25, tw: 23, th: 20, backrestOnRight: false },
  intDoubleBed: { minX: 14, minY: 18, tw: 37, th: 33, backrestOnRight: false },
  intCarpet: { minX: 16, minY: 20, tw: 32, th: 25, backrestOnRight: false },
  intBookcase: { minX: 14, minY: 11, tw: 36, th: 42, backrestOnRight: false },
  intBook: { minX: 20, minY: 27, tw: 23, th: 23, backrestOnRight: false },
  intStudyDesk: { minX: 12, minY: 23, tw: 40, th: 30, backrestOnRight: false },
  intMiniFlower: { minX: 27, minY: 28, tw: 11, th: 11, backrestOnRight: false },
  intDiningTable: { minX: 16, minY: 15, tw: 33, th: 39, backrestOnRight: false },
  intChairTop: { minX: 25, minY: 22, tw: 14, th: 26, backrestOnRight: false },
  intChairSide1: { minX: 25, minY: 28, tw: 13, th: 25, backrestOnRight: true },
  intChairSide2: { minX: 26, minY: 28, tw: 13, th: 25, backrestOnRight: false },
  intChairBottom: { minX: 26, minY: 33, tw: 12, th: 20, backrestOnRight: false },
  intCoatStand: { minX: 22, minY: 14, tw: 20, th: 47, backrestOnRight: false },
  intVaseFlower: { minX: 21, minY: 16, tw: 23, th: 38, backrestOnRight: false },
  intSofaSide1: { minX: 20, minY: 3, tw: 27, th: 60, backrestOnRight: true },
  intSofaSide2: { minX: 20, minY: 3, tw: 27, th: 60, backrestOnRight: false },
  intBoxChest: { minX: 22, minY: 32, tw: 20, th: 17, backrestOnRight: false },
  intBoxBarrel: { minX: 23, minY: 28, tw: 18, th: 18, backrestOnRight: false }
};

// Automatically crops transparent padding around any Individual/*.png sprite
// so every piece renders at its exact 1:1 pixel ratio and position!
function getTrimmedSprite(key) {
  if (trimmedSpriteCache[key]) return trimmedSpriteCache[key];
  const img = loadedSprites[key];
  if (!img || !img.complete || !img.naturalWidth) return null;

  const pre = PRECOMPUTED_FURNITURE_RECTS[key];
  if (pre) {
    const cropped = document.createElement('canvas');
    cropped.width = pre.tw;
    cropped.height = pre.th;
    const cctx = cropped.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(img, pre.minX, pre.minY, pre.tw, pre.th, 0, 0, pre.tw, pre.th);

    const entry = {
      canvas: cropped,
      w: pre.tw,
      h: pre.th,
      backrestOnRight: pre.backrestOnRight
    };
    trimmedSpriteCache[key] = entry;
    return entry;
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(img, 0, 0);

  try {
    const d = octx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    let leftHalfOpaque = 0;
    let rightHalfOpaque = 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = d[(y * w + x) * 4 + 3];
        if (a > 16) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return null;

    const tw = maxX - minX + 1;
    const th = maxY - minY + 1;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (d[(y * w + x) * 4 + 3] > 80) {
          if (x - minX < tw / 2) leftHalfOpaque++;
          else rightHalfOpaque++;
        }
      }
    }

    const cropped = document.createElement('canvas');
    cropped.width = tw;
    cropped.height = th;
    const cctx = cropped.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(off, minX, minY, tw, th, 0, 0, tw, th);

    const entry = {
      canvas: cropped,
      w: tw,
      h: th,
      backrestOnRight: rightHalfOpaque >= leftHalfOpaque
    };
    trimmedSpriteCache[key] = entry;
    return entry;
  } catch (e) {
    const fallback = { canvas: img, w, h, backrestOnRight: true };
    trimmedSpriteCache[key] = fallback;
    return fallback;
  }
}

// Draws an individual furniture sprite at a uniform pixel scale (default 1.35x)
// anchored at (cx = horizontal center, by = bottom floor contact Y) or top-left (x, y)
function drawIndividualFurniture(c, key, x, y, scale = 1.35, anchorBottomCenter = false) {
  const item = getTrimmedSprite(key);
  if (!item) return false;
  const dw = Math.round(item.w * scale);
  const dh = Math.round(item.h * scale);
  const dx = anchorBottomCenter ? Math.round(x - dw / 2) : Math.round(x);
  const dy = anchorBottomCenter ? Math.round(y - dh) : Math.round(y);
  c.drawImage(item.canvas, dx, dy, dw, dh);
  return true;
}

function getLeftFacingSofaKey() {
  const s1 = getTrimmedSprite('intSofaSide1');
  const s2 = getTrimmedSprite('intSofaSide2');
  if (s1 && s2) return s1.backrestOnRight ? 'intSofaSide1' : 'intSofaSide2';
  return 'intSofaSide1';
}

function getLeftFacingChairKey() {
  const c1 = getTrimmedSprite('intChairSide1');
  const c2 = getTrimmedSprite('intChairSide2');
  if (c1 && c2) return c1.backrestOnRight ? 'intChairSide1' : 'intChairSide2';
  return 'intChairSide1';
}

function getFireGlowSprite() {
  if (!fireGlowSprite) {
    fireGlowSprite = document.createElement('canvas');
    fireGlowSprite.width = 96;
    fireGlowSprite.height = 96;
    const gctx = fireGlowSprite.getContext('2d');
    const grad = gctx.createRadialGradient(48, 48, 3, 48, 48, 46);
    grad.addColorStop(0, 'rgba(251, 146, 60, 1)');
    grad.addColorStop(1, 'rgba(251, 146, 60, 0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 96, 96);
  }
  return fireGlowSprite;
}

function getLanternGlowSprite() {
  if (!lanternGlowSprite) {
    lanternGlowSprite = document.createElement('canvas');
    lanternGlowSprite.width = 84;
    lanternGlowSprite.height = 84;
    const gctx = lanternGlowSprite.getContext('2d');
    const grad = gctx.createRadialGradient(42, 42, 2, 42, 42, 40);
    grad.addColorStop(0, 'rgba(253, 224, 71, 1)');
    grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 84, 84);
  }
  return lanternGlowSprite;
}

// 8-BIT CUSTOMIZABLE CARETAKER RENDERER (Scaled at 1.35x to match furniture & cats)
function drawPixelCaretaker(c, caretaker, time) {
  if (!caretaker) return;
  if (world.scene !== 'COTTAGE' && caretaker.state === 'SLEEPING_BED') return;

  const x = Math.round(caretaker.x);
  const y = Math.round(caretaker.y);
  const isSleepingBed = caretaker.state === 'SLEEPING_BED';
  const isNappingCouch = caretaker.state === 'NAPPING_COUCH';
  const isEatingTable = caretaker.state === 'EATING_TABLE';
  const isWalking = caretaker.state === 'WANDER' || caretaker.state === 'SEEK_TABLE_MEAL';
  const walkStep = isWalking ? Math.floor(time * 7) % 4 : 0;
  const bobY = isWalking ? (walkStep % 2 === 1 ? -1 : 0) : (Math.sin(time * 2.2) > 0.5 ? -1 : 0);

  const skin = caretaker.skinColor || '#eab676';
  const skinShade = caretaker.skinShade || '#c68b45';
  const hair = caretaker.hairColor || '#1e1b18';
  const outfit = caretaker.outfitColor || '#0284c7';
  const pants = caretaker.pantsColor || '#1e293b';

  const px = (rx, ry, rw, rh, col) => {
    c.fillStyle = col;
    c.fillRect(Math.round(rx), Math.round(ry), rw, rh);
  };

  if (isSleepingBed || isNappingCouch) {
    const breath = Math.sin(time * 2.2) > 0 ? 1 : 0;
    c.save();
    c.translate(x, y);
    c.scale(1.35, 1.35);

    if (isSleepingBed) {
      // Head centered directly on the left white pillow (world y = 208..218)
      px(-5, -5, 10, 7, skin);
      px(-5, -7, 10, 3, hair);
      px(-6, -6, 2, 4, hair);
      px(4, -6, 2, 4, hair);
      // Closed sleeping eyes & rosy cheeks
      px(-3, -1, 2, 1, '#1e293b');
      px(1, -1, 2, 1, '#1e293b');
      px(-4, 0, 1, 1, '#fda4af');
      px(3, 0, 1, 1, '#fda4af');
      // Pajama shoulders tucked under the top edge of the yellow quilt (world y = 218..224)
      px(-6, 2 + breath, 12, 4, outfit);
    } else {
      px(-5, -7 + breath, 10, 7, outfit);
      px(-6, -2, 8, 3, pants);
      px(-5, -15 + breath, 10, 8, skin);
      px(-5, -17 + breath, 10, 3, hair);
      px(-3, -11 + breath, 2, 1, '#1e293b');
      px(1, -11 + breath, 2, 1, '#1e293b');
      px(-4, -10 + breath, 1, 1, '#fda4af');
      px(3, -10 + breath, 1, 1, '#fda4af');
    }
    c.restore();
    return;
  }

  const act = caretaker.effectiveActivity || 'READ';
  const isSitting = !isWalking && (isEatingTable || act === 'READ' || act === 'COFFEE' || act === 'CODE');
  const usesUmbrella = world.scene === 'GARDEN' && world.weather === 'RAIN' && caretaker.state !== 'PORCH_SHELTERED';

  c.save();
  c.translate(x, y);
  c.scale(1.35, 1.35);

  c.fillStyle = 'rgba(15, 23, 42, 0.30)';
  c.fillRect(-7, -1, 14, 3);

  if (caretaker.facing < 0 && !isSitting) {
    c.scale(-1, 1);
  }

  // 1. Taller Legs & Boots (y = -6..0)
  if (isSitting) {
    px(-5, -5, 10, 4, pants);
    px(-6, -2, 4, 2, '#3b1d0a');
    px(2, -2, 4, 2, '#3b1d0a');
  } else if (isWalking) {
    const lA = walkStep === 1 ? -1 : 0;
    const lB = walkStep === 3 ? -1 : 0;
    px(-4, -6 + lA, 3, 5, pants);
    px(1, -6 + lB, 3, 5, pants);
    px(-4, -2 + lA, 3, 2, '#3b1d0a');
    px(1, -2 + lB, 3, 2, '#3b1d0a');
  } else {
    px(-4, -6, 3, 5, pants);
    px(1, -6, 3, 5, pants);
    px(-4, -2, 3, 2, '#3b1d0a');
    px(1, -2, 3, 2, '#3b1d0a');
  }

  // 2. Taller Torso / Hoodie & Arms (ty = -15..-6, 9px tall)
  const eatDip = isEatingTable && Math.floor(time * 6) % 2 === 0 ? 1 : 0;
  const ty = -15 + bobY + eatDip;
  px(-5, ty, 10, 9, outfit);
  px(-6, ty + 1, 2, 6, outfit);
  px(4, ty + 1, 2, 6, outfit);
  px(-6, ty + 6, 2, 2, skin);
  px(4, ty + 6, 2, 2, skin);

  // Activity Props
  if (isEatingTable) {
    // Animated hand + fork bringing food from plate to mouth
    const handY = eatDip ? ty + 1 : ty + 5;
    px(2, handY, 2, 2, skin);
    px(0, handY, 3, 1, '#cbd5e1');
  } else if (!isWalking && !usesUmbrella) {
    if (act === 'READ') {
      px(-4, ty + 4, 8, 4, '#991b1b');
      px(-3, ty + 4, 6, 3, '#fef3c7');
      px(0, ty + 4, 1, 3, '#d97706');
    } else if (act === 'COFFEE') {
      const sip = Math.sin(time * 1.8) > 0.65 ? -2 : 0;
      px(3, ty + 3 + sip, 4, 4, '#fffbeb');
      px(4, ty + 4 + sip, 2, 2, '#78350f');
      if (Math.floor(time * 3) % 2 === 0) {
        px(4, ty + sip, 1, 2, 'rgba(255,255,255,0.75)');
      }
    } else if (act === 'CODE') {
      px(-5, ty + 3, 10, 5, '#475569');
      px(-4, ty + 4, 8, 3, '#38bdf8');
      px(-1, ty + 5, 2, 1, '#ffffff');
    }
  }

  // 3. Head & Face (hy = -23..-15)
  const hy = -23 + bobY + eatDip;
  px(-5, hy, 10, 8, skin);
  px(-5, hy + 7, 10, 1, skinShade);

  const isBlinking = Math.sin(time * 1.9) > 0.95 || (isEatingTable && eatDip > 0);
  if (isBlinking) {
    px(-3, hy + 4, 2, 1, '#1e293b');
    px(1, hy + 4, 2, 1, '#1e293b');
  } else {
    px(-3, hy + 3, 2, 2, '#1e293b');
    px(1, hy + 3, 2, 2, '#1e293b');
    px(-3, hy + 3, 1, 1, '#ffffff');
    px(1, hy + 3, 1, 1, '#ffffff');
  }
  px(-4, hy + 5, 1, 1, '#fda4af');
  px(3, hy + 5, 1, 1, '#fda4af');

  // 4. Hairstyles
  const hs = caretaker.hairStyle || 'short';
  px(-5, hy - 2, 10, 3, hair);
  px(-6, hy - 1, 2, 4, hair);
  px(4, hy - 1, 2, 4, hair);
  if (hs === 'long') {
    px(-6, hy + 2, 2, 6, hair);
    px(4, hy + 2, 2, 6, hair);
  } else if (hs === 'spiky') {
    px(-4, hy - 4, 2, 2, hair);
    px(-1, hy - 4, 2, 2, hair);
    px(2, hy - 4, 2, 2, hair);
  } else if (hs === 'bun') {
    px(-2, hy - 5, 4, 3, hair);
  }

  // 5. Accessories
  const acc = caretaker.accessory || 'glasses';
  if (acc === 'glasses') {
    px(-4, hy + 3, 4, 2, '#fbbf24');
    px(0, hy + 3, 4, 2, '#fbbf24');
    px(-3, hy + 3, 2, 1, '#e0f2fe');
    px(1, hy + 3, 2, 1, '#e0f2fe');
  } else if (acc === 'catears') {
    px(-5, hy - 4, 3, 2, '#f43f5e');
    px(2, hy - 4, 3, 2, '#f43f5e');
    px(-4, hy - 3, 1, 1, '#ffe4e6');
    px(3, hy - 3, 1, 1, '#ffe4e6');
  } else if (acc === 'hat') {
    px(-7, hy - 2, 14, 2, '#d97706');
    px(-5, hy - 5, 10, 3, '#fbbf24');
    px(-5, hy - 3, 10, 1, '#b91c1c');
  }

  // 6. Rain Umbrella Overhead
  if (usesUmbrella) {
    px(4, hy - 7, 1, 16, '#cbd5e1');
    px(3, hy + 8, 2, 2, '#78350f');
    px(-5, hy - 9, 18, 3, '#e11d48');
    px(-3, hy - 11, 14, 2, '#f43f5e');
    px(1, hy - 12, 6, 1, '#fda4af');
  }

  c.restore();

  if (caretaker.labelAlpha > 0.02) {
    c.save();
    c.globalAlpha = Math.min(1, caretaker.labelAlpha);
    c.font = 'bold 7px Quicksand, sans-serif';
    c.textAlign = 'center';
    const labelStr = caretaker.name || 'Caretaker';
    const textW = c.measureText(labelStr).width + 8;
    c.fillStyle = 'rgba(24, 16, 10, 0.82)';
    c.fillRect(Math.round(x - textW / 2), Math.round(y - 39), Math.round(textW), 9);
    c.fillStyle = '#fde047';
    c.fillText(labelStr, Math.round(x), Math.round(y - 32));
    c.restore();
  }
}

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
    if (Math.hypot(gx - LANDMARKS.porch.x, gy - LANDMARKS.porch.y) < 34) continue;
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
    if (Math.hypot(fx - LANDMARKS.porch.x, fy - LANDMARKS.porch.y) < 36) continue;
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

function ensureGardenStaticCache() {
  if (gardenStaticCache) return gardenStaticCache;
  const off = document.createElement('canvas');
  off.width = 640;
  off.height = 420;
  const c = off.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.translate(-160, -100);

  // 1. Tiled Garden Lawn
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

  // 2. Top Hedge Background
  c.fillStyle = '#2d5c2b';
  c.fillRect(180, 120, 600, 36);
  c.fillStyle = '#386e35';
  for (let hx = 180; hx < 780; hx += 14) {
    c.fillRect(hx, 134 + (hx % 28 === 0 ? 3 : 0), 12, 18);
  }

  // 3. Wooden Fence Along Top Border
  c.fillStyle = 'rgba(15, 28, 17, 0.28)';
  c.fillRect(190, 162, 580, 5);
  c.fillStyle = '#8c5832';
  c.fillRect(190, 146, 580, 4);
  c.fillRect(190, 155, 580, 4);
  for (let fx = 195; fx < 770; fx += 26) {
    if (fx > 455 && fx < 505) continue;
    c.fillStyle = '#6e4223';
    c.fillRect(fx, 139, 7, 23);
    c.fillStyle = '#a86e42';
    c.fillRect(fx + 1, 140, 5, 20);
    c.fillStyle = '#c98d5c';
    c.fillRect(fx + 1, 139, 5, 3);
  }

  // 4. Fence Bushes, Garden Bushes & Stepping Stones
  FENCE_BUSHES.forEach((b) => drawLoadedSprite(c, b.key, b.x, b.y, b.w, b.h));
  GARDEN_BUSHES.forEach((b) => drawLoadedSprite(c, b.key, b.x, b.y, b.w, b.h));

  PATH_STONES.forEach((st) => {
    c.fillStyle = '#64748b';
    c.fillRect(st.x, st.y + 1, st.w, st.h);
    c.fillStyle = '#94a3b8';
    c.fillRect(st.x, st.y, st.w - 1, st.h - 1);
    c.fillStyle = '#cbd5e1';
    c.fillRect(st.x + 1, st.y + 1, st.w - 4, 2);
  });

  GRASS_TUFT_LIST.forEach((g) => {
    if (!drawLoadedSprite(c, g.spriteKey, g.x, g.y, 8, 8)) {
      c.fillStyle = g.shade;
      c.fillRect(g.x, g.y, 1, 3);
    }
  });
  GENERAL_FLOWERS.forEach((f) => {
    if (!drawLoadedSprite(c, f.spriteKey, f.x - 3, f.y - 3, 8, 8)) {
      c.fillStyle = f.color;
      c.fillRect(f.x - 1, f.y, 3, 2);
    }
  });

  // 5. Birdbath Pond Basin, Sunny Nap Rug, Lamp, Log & Gazebo Deck
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
  drawLoadedSprite(c, 'stone7', px - 22, py - 12, 14, 12);
  drawLoadedSprite(c, 'stone8', px + 10, py + 2, 12, 10);

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

  drawLoadedSprite(c, 'lamp1', 304, 210, 20, 35);
  drawLoadedSprite(c, 'log1', 668, 376, 34, 21);
  drawShelterDeck(c);
  drawPorchDeck(c);

  if (areAllSpritesLoaded()) {
    gardenStaticCache = off;
  }
  return off;
}

function drawGardenScenery(c, time) {
  const scale = camera.getEffectiveScale();
  const halfViewW = (canvas.width / 2) / scale;
  const halfViewH = (canvas.height / 2) / scale;
  const viewLeft = Math.min(0, camera.x - halfViewW - 80);
  const viewTop = Math.min(0, camera.y - halfViewH - 80);
  const viewRight = Math.max(960, camera.x + halfViewW + 80);
  const viewBottom = Math.max(600, camera.y + halfViewH + 80);

  c.fillStyle = '#224426';
  c.fillRect(viewLeft, viewTop, viewRight - viewLeft, viewBottom - viewTop);
  if (viewTop < 120) {
    c.fillStyle = '#172d1a';
    c.fillRect(viewLeft, viewTop, viewRight - viewLeft, 120 - viewTop);
  }
  if (viewBottom > 500) {
    c.fillStyle = '#1a3520';
    c.fillRect(viewLeft, 500, viewRight - viewLeft, viewBottom - 500);
  }

  // Blit entire pre-rendered static garden in 1 single drawImage call!
  const cache = ensureGardenStaticCache();
  c.drawImage(cache, 160, 100);

  // Animated water ripple on pond
  const px = LANDMARKS.pond.x;
  const py = LANDMARKS.pond.y;
  const rip = Math.floor(Math.sin(time * 2) * 2);
  c.fillStyle = '#bae6fd';
  c.fillRect(px - 6 + rip, py - 3, 6, 1);
  c.fillRect(px + 2 - rip, py + 2, 5, 1);

  // Animated Campfire & Pre-rendered Glow
  const isRaining = world.weather === 'RAIN';
  const fireKey = isRaining ? 'campfireSmoke' : 'campfireActive';
  if (!isRaining) {
    c.save();
    c.globalAlpha = Math.sin(time * 7) * 0.07 + 0.30;
    c.drawImage(getFireGlowSprite(), 644 - 40, 384 - 40, 80, 80);
    c.restore();
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

function drawPorchDeck(c) {
  const px = LANDMARKS.porch.x;
  const py = LANDMARKS.porch.y;
  // Spacious 64x28 cedar porch deck
  c.fillStyle = 'rgba(15, 28, 17, 0.38)';
  c.fillRect(px - 34, py - 10, 68, 28);
  c.fillStyle = '#532e16';
  c.fillRect(px - 32, py - 11, 64, 26);
  c.fillStyle = '#78431e';
  c.fillRect(px - 30, py - 12, 60, 25);
  c.fillStyle = '#452310';
  for (let y = py - 8; y < py + 12; y += 5) {
    c.fillRect(px - 30, y, 60, 1);
  }
  // Cozy back bench & woven rug
  c.fillStyle = '#3b1d0a';
  c.fillRect(px - 18, py - 10, 36, 8);
  c.fillStyle = '#a86e42';
  c.fillRect(px - 17, py - 11, 34, 7);
  c.fillStyle = '#b45309';
  c.fillRect(px - 12, py + 2, 24, 7);
  c.fillStyle = '#fde047';
  c.fillRect(px - 10, py + 3, 20, 5);

  // Lower base of the tall porch posts
  c.fillStyle = '#532e16';
  c.fillRect(px - 28, py - 38, 4, 30);
  c.fillRect(px + 24, py - 38, 4, 30);
}

function drawPorchRoofOverhead(c, time) {
  const px = LANDMARKS.porch.x;
  const py = LANDMARKS.porch.y;
  // Upper posts extending up to py - 38 (well above the Caretaker's head at py - 34!)
  c.fillStyle = '#532e16';
  c.fillRect(px - 28, py - 38, 4, 42);
  c.fillRect(px + 24, py - 38, 4, 42);
  c.fillStyle = '#8c5832';
  c.fillRect(px - 27, py - 38, 2, 42);
  c.fillRect(px + 25, py - 38, 2, 42);

  // High Cedar Shingle Roof (py - 56 to py - 38) -> Never clips the Caretaker's head!
  c.fillStyle = '#452310';
  c.fillRect(px - 34, py - 44, 68, 8);
  c.fillStyle = '#6e3818';
  c.fillRect(px - 31, py - 48, 62, 7);
  c.fillStyle = '#8c4820';
  c.fillRect(px - 26, py - 52, 52, 6);
  c.fillStyle = '#a85828';
  c.fillRect(px - 18, py - 55, 36, 5);
  c.fillStyle = '#c86f34';
  c.fillRect(px - 10, py - 57, 20, 4);
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

function drawCatPersonalBowl(c, bx, by, bowlLevel, cat, hovered) {
  const accentColor = cat.id === 'lilo' ? '#0284c7' : cat.id === 'cheeto' ? '#d97706' : (cat.coatColor || '#0284c7');
  c.fillStyle = 'rgba(15, 28, 17, 0.3)';
  c.fillRect(bx - 10, by - 3, 20, 8);
  c.fillStyle = '#cbd5e1';
  c.fillRect(bx - 9, by - 4, 18, 8);
  c.fillStyle = accentColor;
  c.fillRect(bx - 8, by - 3, 16, 6);
  c.fillStyle = '#e0f2fe';
  c.fillRect(bx - 6, by - 2, 12, 4);
  if (bowlLevel >= 1) {
    c.fillStyle = '#92400e';
    c.fillRect(bx - 5, by - 2, 10, 2);
  }
  if (bowlLevel >= 2) {
    c.fillStyle = '#b45309';
    c.fillRect(bx - 6, by - 3, 12, 2);
  }
  if (bowlLevel >= 3) {
    c.fillStyle = '#d97706';
    c.fillRect(bx - 4, by - 4, 8, 2);
  }
  if (hovered) {
    c.font = 'bold 6.5px Quicksand, sans-serif';
    c.textAlign = 'center';
    const label = `${cat.name}'s Bowl`;
    const tw = c.measureText(label).width + 8;
    c.fillStyle = 'rgba(24, 16, 10, 0.88)';
    c.fillRect(bx - tw / 2, by - 15, tw, 9);
    c.fillStyle = '#fde68a';
    c.fillText(label, bx, by - 8);
  }
}

function ensureCottageStaticCache() {
  if (cottageStaticCache) return cottageStaticCache;
  const off = document.createElement('canvas');
  off.width = 400;
  off.height = 340;
  const c = off.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.translate(-280, -140);

  const rx = 320;
  const ry = 160;
  const rw = 320;
  const rh = 256;
  const hallX = 436;
  const hallW = 88;
  const hallH = 44;

  // 1. OUTER DOUBLE-BORDERED TOP-DOWN ROGUELIKE WALL CASING (Matches preview_room.png!)
  c.fillStyle = '#0c0604';
  c.fillRect(rx - 6, ry - 6, rw + 12, rh + 12);
  c.fillRect(hallX - 6, ry + rh, hallW + 12, hallH + 6);

  c.fillStyle = '#6e3b17';
  c.fillRect(rx - 4, ry - 4, rw + 8, rh + 8);
  c.fillRect(hallX - 4, ry + rh - 2, hallW + 8, hallH + 6);

  c.fillStyle = '#8c5228';
  c.fillRect(rx - 3, ry - 3, rw + 6, 2);
  c.fillStyle = '#1a0c06';
  c.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
  c.fillRect(hallX - 1, ry + rh - 1, hallW + 2, hallH + 2);

  // 2. VERTICAL WOODEN PLANK FLOOR (Main Room + Bottom Entrance Alcove)
  c.fillStyle = '#9a5025';
  c.fillRect(rx, ry + 56, rw, rh - 56);
  c.fillRect(hallX, ry + rh - 2, hallW, hallH + 2);

  // Vertical 16px Floorboard Columns & Seams
  for (let px = rx; px <= rx + rw; px += 16) {
    const inHall = px >= hallX && px <= hallX + hallW;
    const colBottom = inHall ? ry + rh + hallH : ry + rh;
    c.fillStyle = '#361708';
    c.fillRect(px, ry + 56, 1, colBottom - (ry + 56));
    if (px + 1 < rx + rw) {
      c.fillStyle = '#ab5d30';
      c.fillRect(px + 1, ry + 56, 1, colBottom - (ry + 56));
    }
  }

  // Staggered Horizontal Plank Notches & Wood Grain Ticks (Authentic preview_room.png style)
  let jointSeed = 9102;
  const nextRand = () => {
    jointSeed = (jointSeed * 16807) % 2147483647;
    return (jointSeed - 1) / 2147483646;
  };
  for (let col = 0; col < rw / 16; col++) {
    const cx = rx + col * 16;
    const inHall = cx >= hallX && cx < hallX + hallW;
    const maxY = inHall ? ry + rh + hallH - 8 : ry + rh - 6;
    let py = ry + 68 + Math.floor(nextRand() * 22);
    while (py < maxY) {
      c.fillStyle = '#2a1106';
      c.fillRect(cx, py, 16, 2);
      c.fillStyle = '#6e3516';
      c.fillRect(cx + 3, py - 2, 2, 1);
      c.fillRect(cx + 10, py + 2, 3, 1);
      py += 26 + Math.floor(nextRand() * 24);
    }
  }

  // Dithered Threshold Shadow Fade at Bottom of Entrance Alcove (y = 432..460)
  for (let dy = ry + rh + 14; dy < ry + rh + hallH; dy++) {
    const progress = (dy - (ry + rh + 14)) / (hallH - 14);
    c.fillStyle = progress > 0.65 ? '#261107' : progress > 0.35 ? '#4d2410' : '#6e3516';
    for (let dx = hallX + 1; dx < hallX + hallW - 1; dx += 2) {
      if ((dx + dy) % 2 === 0 || progress > 0.72) {
        c.fillRect(dx, dy, 1, 1);
      }
    }
  }

  // 3. CREAM WALLPAPER WITH DITHERED DIAMOND TRIM & WOOD BASEBOARD (y = 160..216)
  c.fillStyle = '#e8cfa6';
  c.fillRect(rx, ry, rw, 48);

  // Top & Bottom Dithered Wallpaper Borders
  c.fillStyle = '#cda97b';
  for (let wx = rx; wx < rx + rw; wx += 2) {
    c.fillRect(wx, ry + 2, 1, 1);
    c.fillRect(wx + 1, ry + 4, 1, 1);
    c.fillRect(wx, ry + 6, 1, 1);

    c.fillRect(wx, ry + 40, 1, 1);
    c.fillRect(wx + 1, ry + 42, 1, 1);
    c.fillRect(wx, ry + 44, 1, 1);
  }

  // Baseboard Molding (y = 208..216)
  c.fillStyle = '#261107';
  c.fillRect(rx, ry + 48, rw, 1);
  c.fillStyle = '#7c431e';
  c.fillRect(rx, ry + 49, rw, 7);
  c.fillStyle = '#261107';
  c.fillRect(rx, ry + 56, rw, 1);
  for (let bx = rx + 16; bx < rx + rw; bx += 16) {
    c.fillStyle = '#45220d';
    c.fillRect(bx, ry + 49, 1, 7);
  }

  // 4. WALL-MOUNTED DECOR & FLOOR CARPET (Background Pass)
  // Oval Mirror on Left Back Wall
  drawIndividualFurniture(c, 'intMirror', 392, 206, 1.35, true);
  // Twin Windows Above the 1 Double Bed
  drawIndividualFurniture(c, 'intWindow', 456, 200, 1.35, true);
  drawIndividualFurniture(c, 'intWindow', 494, 200, 1.35, true);
  // Single Window Above Right Study Desk
  drawIndividualFurniture(c, 'intWindow', 604, 200, 1.35, true);
  // Single Ornate Red Carpet Under the 1 Double Bed
  drawIndividualFurniture(c, 'intCarpet', 476, 276, 1.38, true);

  if (areAllSpritesLoaded()) {
    cottageStaticCache = off;
  }
  return off;
}

function drawCottageInteriorScenery(c, time) {
  const scale = camera.getEffectiveScale();
  const halfViewW = (canvas.width / 2) / scale;
  const halfViewH = (canvas.height / 2) / scale;
  const viewLeft = Math.min(0, camera.x - halfViewW - 80);
  const viewTop = Math.min(0, camera.y - halfViewH - 80);
  const viewRight = Math.max(960, camera.x + halfViewW + 80);
  const viewBottom = Math.max(600, camera.y + halfViewH + 80);

  // 1. Top-Down Roguelike Dark Void Surround (#1d1a1f)
  c.fillStyle = '#1d1a1f';
  c.fillRect(viewLeft, viewTop, viewRight - viewLeft, viewBottom - viewTop);

  // 2. Blit Pre-Rendered Cottage Room Island
  const cache = ensureCottageStaticCache();
  c.drawImage(cache, 280, 140);
}

// Builds Depth-Sorted Furniture Renderables for the Cottage (Matches preview_room.png with 1 Bed!)
function getCottageFurnitureRenderables(ctx, time) {
  const isNightOrRain = world.weather === 'NIGHT' || world.weather === 'RAIN';
  const lampKey = isNightOrRain ? 'intLampOn' : 'intLampOff';
  const sofaKey = getLeftFacingSofaKey();
  const sideChairKey = getLeftFacingChairKey();

  return [
    {
      y: 224,
      draw: () => drawIndividualFurniture(ctx, 'intWardrobe', 350, 224, 1.35, true)
    },
    {
      y: 230,
      draw: () => {
        drawIndividualFurniture(ctx, 'intBedsideTable', 422, 230, 1.35, true);
        drawIndividualFurniture(ctx, lampKey, 422, 214, 1.35, true);
        if (isNightOrRain) {
          ctx.save();
          ctx.globalAlpha = Math.sin(time * 5) * 0.04 + 0.22;
          ctx.drawImage(getLanternGlowSprite(), 422 - 36, 206 - 36, 72, 72);
          ctx.restore();
        }
      }
    },
    {
      // Full DoubleBed base (headboard, pillows, mattress) at y=228
      y: 228,
      draw: () => drawIndividualFurniture(ctx, 'intDoubleBed', 476, 254, 1.35, true)
    },
    {
      // Bed blanket & footboard overlay when Caretaker is sleeping in bed (tucks Caretaker under the real bed quilt!)
      y: 256,
      draw: () => {
        if (world.caretaker && world.caretaker.state === 'SLEEPING_BED') {
          const item = getTrimmedSprite('intDoubleBed');
          if (item) {
            const scale = 1.35;
            const dw = Math.round(item.w * scale);
            const dh = Math.round(item.h * scale);
            const dx = Math.round(476 - dw / 2);
            const dy = Math.round(254 - dh);
            const srcY = Math.floor(item.h * 0.45);
            const srcH = item.h - srcY;
            const dstY = dy + Math.floor(dh * 0.45);
            const dstH = dh - Math.floor(dh * 0.45);
            ctx.drawImage(item.canvas, 0, srcY, item.w, srcH, dx, dstY, dw, dstH);
          }
        }
      }
    },
    {
      y: 232,
      draw: () => {
        drawIndividualFurniture(ctx, 'intBookcase', 544, 228, 1.35, true);
        drawIndividualFurniture(ctx, 'intBook', 566, 240, 1.35, true);
        if (world.pointer.hoveredEntity === 'shrine') {
          ctx.font = 'bold 7px Quicksand, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(24, 16, 10, 0.88)';
          ctx.fillRect(544 - 44, 164, 88, 11);
          ctx.fillStyle = '#fde68a';
          ctx.fillText('Lilo & Cheeto Album', 544, 172);
        }
      }
    },
    // Top-Right Study Desk + Front-Facing Chair for Reading/Coding!
    {
      y: 240,
      draw: () => {
        drawIndividualFurniture(ctx, 'intStudyDesk', 604, 240, 1.35, true);
        drawIndividualFurniture(ctx, 'intMiniFlower', 588, 219, 1.35, true);
      }
    },
    {
      // Front-facing chair at Study Desk (y=244) so Caretaker at y=248 sits ON TOP of the chair!
      y: 244,
      draw: () => drawIndividualFurniture(ctx, 'intChairTop', 598, 252, 1.25, true)
    },
    // Left Dining Table Set:
    // 1. Front-facing chair at top of dining table (depth-sort y=260) -> Caretaker (sort y=280) sits in front of backrest!
    {
      y: 260,
      draw: () => drawIndividualFurniture(ctx, 'intChairTop', 364, 275, 1.35, true)
    },
    // 2. Dining Table (depth-sort y=326) -> Top edge is at y=269, covering Caretaker's legs (269..277) while full torso (257..269) is visible!
    {
      y: 326,
      draw: () => {
        drawIndividualFurniture(ctx, sideChairKey, 392, 316, 1.35, true);
        drawIndividualFurniture(ctx, 'intDiningTable', 364, 326, 1.35, true);
        if (world.caretaker && world.caretaker.state === 'EATING_TABLE') {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(359, 273, 10, 6);
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(361, 274, 6, 4);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(362, 275, 3, 2);
        }
        drawIndividualFurniture(ctx, 'intChairBottom', 364, 340, 1.35, true);
      }
    },
    {
      y: 292,
      draw: () => drawIndividualFurniture(ctx, 'intVaseFlower', 612, 294, 1.35, true)
    },
    {
      // Sofa depth-sorted at y=296 so Caretaker/Cats (y>=300) ALWAYS overlay the sofa!
      y: 296,
      draw: () => drawIndividualFurniture(ctx, sofaKey, 612, 364, 1.35, true)
    },
    {
      y: 396,
      draw: () => drawIndividualFurniture(ctx, 'intCoatStand', 406, 396, 1.35, true)
    },
    {
      y: 398,
      draw: () => {
        drawIndividualFurniture(ctx, 'intBoxChest', 572, 398, 1.35, true);
        drawIndividualFurniture(ctx, 'intBoxBarrel', 614, 398, 1.35, true);
      }
    }
  ];
}

function drawGardenScene(time = 0) {
  if (!canvas || !ctx) return;
  ctx.imageSmoothingEnabled = false;
  const isCottage = world.scene === 'COTTAGE';
  ctx.fillStyle = isCottage ? '#1d1a1f' : '#224426';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const scale = camera.getEffectiveScale();
  ctx.save();
  ctx.translate(Math.round(canvas.width / 2), Math.round(canvas.height / 2));
  ctx.scale(scale, scale);
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

  if (isCottage) {
    drawCottageInteriorScenery(ctx, time);
  } else {
    drawGardenScenery(ctx, time);
  }

  const totalCats = world.cats.length;
  const renderables = [
    ...world.cats.map((cat, idx) => {
      const bPos = getCatBowlPos(idx, totalCats, world.scene);
      return {
        y: bPos.y - 2,
        draw: () =>
          drawCatPersonalBowl(
            ctx,
            bPos.x,
            bPos.y,
            typeof cat.bowlLevel === 'number' ? cat.bowlLevel : world.bowlLevel,
            cat,
            world.pointer.hoveredEntity === 'bowl'
          )
      };
    }),
    {
      y:
        world.caretaker.state === 'SLEEPING_BED'
          ? 255
          : world.caretaker.state === 'NAPPING_COUCH'
          ? 368
          : world.caretaker.state === 'EATING_TABLE'
          ? 280
          : world.caretaker.y,
      draw: () => drawPixelCaretaker(ctx, world.caretaker, time)
    },
    ...world.cats.map((cat) => ({
      y: cat.y,
      draw: () => drawPixelCat(ctx, cat, time)
    }))
  ];

  if (isCottage) {
    renderables.push(...getCottageFurnitureRenderables(ctx, time));
  } else {
    renderables.push(
      {
        y: LANDMARKS.shrine.y,
        draw: () => drawMemorialStone(ctx, time, world.pointer.hoveredEntity === 'shrine')
      },
      {
        y: 254,
        draw: () => drawShelterRoofOverhead(ctx, time)
      },
      {
        y: LANDMARKS.porch.y + 14,
        draw: () => drawPorchRoofOverhead(ctx, time)
      },
      {
        y: 258,
        draw: () => {
          ctx.fillStyle = 'rgba(15, 28, 17, 0.28)';
          ctx.fillRect(244, 256, 30, 6);
          drawLoadedSprite(ctx, 'tree1', 226, 185, 66, 77);
        }
      }
    );
  }

  renderables.sort((a, b) => a.y - b.y);
  for (let i = 0; i < renderables.length; i++) {
    renderables[i].draw();
  }

  // Outdoor critters & rain only render outdoors in GARDEN mode!
  if (!isCottage) {
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

    if (world.weather === 'RAIN') {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
      for (let i = 0; i < world.rainDrops.length; i++) {
        const d = world.rainDrops[i];
        ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, Math.round(d.len));
      }
    }
  }

  // Floating Hearts, Sparkles & Sleep Zs
  for (let i = 0; i < world.particles.length; i++) {
    const p = world.particles[i];
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
  }

  ctx.restore();

  // Atmospheric tint (softer indoors)
  if (!isCottage) {
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
  } else if (world.weather === 'NIGHT') {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
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

function worldToScreen(wx, wy) {
  if (!canvas) return { x: wx, y: wy };
  const rect = canvas.getBoundingClientRect();
  const scale = camera.getEffectiveScale();
  const cx = (wx - camera.x) * scale + canvas.width / 2;
  const cy = (wy - camera.y) * scale + canvas.height / 2;
  return {
    x: rect.left + (cx * rect.width) / canvas.width,
    y: rect.top + (cy * rect.height) / canvas.height
  };
}

safeOn('tableEatBtn', 'click', (e) => {
  e.stopPropagation();
  world.startCaretakerTableMeal();
});

function handleCanvasTap(clientX, clientY, isTouch = false) {
  const touchMult = isTouch ? 1.45 : 1.0;
  const pt = screenToWorld(clientX, clientY);

  const hitCat = findCatAt(pt.x, pt.y, isTouch);
  if (hitCat) {
    world.hideTableEatPopup();
    world.petCat(hitCat);
    return;
  }

  // Check if any cat's personal bowl was tapped
  for (let i = 0; i < world.cats.length; i++) {
    const bPos = getCatBowlPos(i, world.cats.length, world.scene);
    if (Math.hypot(pt.x - bPos.x, pt.y - bPos.y) <= 18 * touchMult) {
      world.hideTableEatPopup();
      world.feedBowl();
      return;
    }
  }

  if (world.scene === 'COTTAGE') {
    // 1. Tapping the Double Bed toggles Caretaker sleeping in bed!
    if (pt.x >= 442 && pt.x <= 510 && pt.y >= 198 && pt.y <= 258) {
      world.toggleCaretakerBedSleep();
      return;
    }
    // 2. Tapping the Right-Wall Sofa toggles Caretaker Couch Nap!
    if (pt.x >= 590 && pt.x <= 636 && pt.y >= 296 && pt.y <= 368) {
      world.toggleCaretakerCouchNap();
      return;
    }
    // 3. Tapping the Left Dining Table shows the floating "Eat" button!
    if (pt.x >= 332 && pt.x <= 398 && pt.y >= 274 && pt.y <= 344) {
      const scr = worldToScreen(364, 286);
      world.showTableEatPopup(scr.x, scr.y);
      return;
    }
    world.hideTableEatPopup();

    // 4. Tapping Bookcase / Photo Album opens Tribute Modal
    if (Math.hypot(pt.x - COTTAGE_SPOTS.hearth.x, pt.y - (COTTAGE_SPOTS.hearth.y - 18)) <= COTTAGE_SPOTS.hearth.radius * touchMult) {
      openModal('tribute-modal');
      return;
    }
    // 5. Tapping Caretaker calls the cats over
    if (world.caretaker && Math.hypot(pt.x - world.caretaker.x, pt.y - (world.caretaker.y - 12)) <= 20 * touchMult) {
      world.callCatsToCaretaker();
      return;
    }
    // 6. Tapping Bottom-Center Entrance Alcove steps back outside to the Garden
    if (pt.x >= 432 && pt.x <= 528 && pt.y >= 408 && pt.y <= 466) {
      world.toggleScene();
      return;
    }
    // 7. Tapping walkable open floor inside the Cottage guides a cat over
    if (isCottagePointWalkable(pt.x, pt.y)) {
      const cat = world.cats[Math.floor(Math.random() * Math.min(2, world.cats.length))];
      if (cat && cat.state !== 'EATING') {
        cat.state = 'WANDER';
        cat.pose = 'sit';
        cat.targetX = pt.x;
        cat.targetY = pt.y;
        cat.labelAlpha = 1.4;
        world.spawnHeart(pt.x, pt.y, 'sparkle');
      }
    }
    return;
  }

  world.hideTableEatPopup();

  if (world.caretaker && world.caretaker.state !== 'SLEEPING_BED' && Math.hypot(pt.x - world.caretaker.x, pt.y - (world.caretaker.y - 12)) <= 20 * touchMult) {
    world.callCatsToCaretaker();
    return;
  }

  if (Math.hypot(pt.x - LANDMARKS.shrine.x, pt.y - (LANDMARKS.shrine.y - 10)) <= LANDMARKS.shrine.radius * touchMult) {
    openModal('tribute-modal');
    return;
  }

  if (pt.x >= 450 && pt.x <= 510 && pt.y >= 110 && pt.y <= 195) {
    world.toggleScene();
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

let studioCatsSittingAnimId = null;

function drawStudioSittingCat(ictx, cx, cy, cat, t, facing) {
  const breath = Math.sin(t * 2.4 + cat.seed) > 0.35 ? -1 : 0;
  const blinkPhase = (t * 0.38 + cat.seed * 0.8) % 1;
  const isBlinking = blinkPhase < 0.08;
  const twitchPhase = (t * 0.22 + cat.seed * 1.4) % 1;
  const earTwitchL = (twitchPhase > 0.03 && twitchPhase < 0.08) ? -1 : 0;
  const earTwitchR = (twitchPhase > 0.45 && twitchPhase < 0.50) ? -1 : 0;
  const tailSway = Math.sin(t * 2.5 + cat.seed);
  const tailTipX = tailSway > 0.3 ? 1 : (tailSway < -0.3 ? -1 : 0);

  function px(rx, ry, w, h, col) {
    ictx.fillStyle = col;
    if (facing < 0) {
      ictx.fillRect(cx - rx - w, cy + ry, w, h);
    } else {
      ictx.fillRect(cx + rx, cy + ry, w, h);
    }
  }

  const coat = cat.coatColor;
  const shade = cat.shadeColor;

  // Ground shadow
  px(-8, 0, 16, 2, 'rgba(15, 28, 17, 0.40)');

  // Upward curving curled tail with gentle swaying tip
  px(-7, -4, 2, 4, coat);
  px(-8, -6, 2, 3, shade);
  px(-9, -9, 2, 4, coat);
  px(-8, -12, 2, 3, coat);
  px(-7 + tailTipX, -14, 2, 2, coat);
  px(-6 + tailTipX, -13, 2, 2, coat);

  // Rear haunch / hip (smooth sitting silhouette)
  px(-6, -8 + breath, 5, 8, coat);
  px(-7, -7 + breath, 3, 6, coat);
  px(-7, -5 + breath, 2, 4, shade);
  px(-7, -1, 4, 2, shade);

  // Body torso & chest
  px(-4, -10 + breath, 8, 9, coat);
  px(-1, -11 + breath, 5, 10, coat);
  px(-5, -4, 8, 3, shade);

  // Front legs & paws resting neatly on ground
  px(0, -6 + breath, 2, 6, coat);
  px(2, -6 + breath, 2, 6, shade);
  px(0, 0, 2, 1, coat);
  px(2, 0, 2, 1, coat);
  px(2, -1, 1, 2, shade);

  // Head & Neck
  const hy = -16 + breath;
  px(-3, hy, 8, 6, coat);
  px(-2, hy - 1, 6, 1, coat);
  px(-3, hy + 5, 8, 1, shade);

  // Lilo's Blue Collar & Gold Bell
  if (cat.collar) {
    px(-3, hy + 5, 8, 1, cat.collar);
    px(2, hy + 6, 2, 2, '#fde047');
    px(2, hy + 6, 1, 1, '#d97706');
  }

  // Ears with occasional twitch
  px(-3, hy - 3 + earTwitchL, 2, 2, coat);
  px(-2, hy - 2 + earTwitchL, 1, 2, '#ff9ebb');
  px(2, hy - 3 + earTwitchR, 2, 2, coat);
  px(2, hy - 2 + earTwitchR, 1, 2, '#ff9ebb');

  // Eyes (Heterochromia & Blinking)
  if (isBlinking) {
    px(-1, hy + 2, 2, 1, '#334155');
    px(2, hy + 2, 2, 1, '#334155');
  } else {
    px(-1, hy + 2, 2, 2, cat.eyeLeft);
    px(2, hy + 2, 2, 2, cat.eyeRight);
    px(-1, hy + 2, 1, 1, '#ffffff');
    px(2, hy + 2, 1, 1, '#ffffff');
  }

  // Nose & muzzle
  px(1, hy + 4, 1, 1, '#ff9ebb');
  px(0, hy + 4, 1, 1, shade);
  px(2, hy + 4, 1, 1, shade);

  // Soft rosy cheeks
  px(-2, hy + 4, 1, 1, 'rgba(251, 113, 133, 0.45)');
  px(3, hy + 4, 1, 1, 'rgba(251, 113, 133, 0.45)');
}

function startStudioCatsSittingAnimation() {
  const c = document.getElementById('studio-cats-sitting-canvas');
  if (!c) return;
  const ictx = c.getContext('2d');
  ictx.imageSmoothingEnabled = false;

  const lilo = {
    id: 'lilo',
    coatColor: '#ffffff',
    shadeColor: '#dbe7f5',
    eyeLeft: '#29b6f6',
    eyeRight: '#29b6f6',
    collar: '#1e88e5',
    seed: 0
  };
  const cheeto = {
    id: 'cheeto',
    coatColor: '#ffffff',
    shadeColor: '#eee8dc',
    eyeLeft: '#ffb300',
    eyeRight: '#29b6f6',
    collar: null,
    seed: 1.5
  };

  function render(now) {
    if (studioLoadingDismissed) {
      if (studioCatsSittingAnimId) {
        cancelAnimationFrame(studioCatsSittingAnimId);
        studioCatsSittingAnimId = null;
      }
      return;
    }
    const t = now / 1000;
    ictx.clearRect(0, 0, c.width, c.height);

    ictx.save();
    ictx.scale(2, 2);

    // 1. Soft Sanctuary Grass Patch & Firefly Glow
    ictx.fillStyle = 'rgba(15, 35, 18, 0.45)';
    ictx.fillRect(10, 31, 60, 6);
    ictx.fillStyle = '#2d5a27';
    ictx.fillRect(12, 32, 56, 4);
    ictx.fillStyle = '#3f7d3b';
    ictx.fillRect(14, 34, 52, 2);

    // Little flowers / grass tufts
    ictx.fillStyle = '#4ade80';
    ictx.fillRect(15, 30, 2, 2);
    ictx.fillRect(39, 31, 2, 2);
    ictx.fillRect(63, 30, 2, 2);

    // Twinkling warm firefly near cats
    const flyX = Math.round(39 + Math.sin(t * 1.5) * 8);
    const flyY = Math.round(15 + Math.cos(t * 2.1) * 4);
    const flyTwinkle = Math.sin(t * 8) > 0;
    ictx.fillStyle = flyTwinkle ? '#fde047' : '#fef08a';
    ictx.fillRect(flyX, flyY, 2, 2);

    // 2. Render Sitting Animated Cats
    drawStudioSittingCat(ictx, 27, 31, lilo, t, 1);
    drawStudioSittingCat(ictx, 53, 31, cheeto, t, -1);

    // 3. Floating Pink Pixel Heart Between Reunited Brothers
    const heartCycle = (t % 3.6) / 3.6;
    if (heartCycle < 0.65) {
      const hy = Math.round(18 - heartCycle * 14);
      const hAlpha = heartCycle < 0.1 ? heartCycle / 0.1 : heartCycle > 0.5 ? (0.65 - heartCycle) / 0.15 : 1;
      ictx.save();
      ictx.globalAlpha = Math.max(0, Math.min(1, hAlpha));
      ictx.fillStyle = '#fb7185';
      ictx.fillRect(39, hy, 2, 2);
      ictx.fillRect(42, hy, 2, 2);
      ictx.fillRect(38, hy + 1, 7, 2);
      ictx.fillRect(39, hy + 3, 5, 1);
      ictx.fillRect(40, hy + 4, 3, 1);
      ictx.fillRect(41, hy + 5, 1, 1);
      ictx.restore();
    }

    ictx.restore();
    studioCatsSittingAnimId = requestAnimationFrame(render);
  }

  if (studioCatsSittingAnimId) cancelAnimationFrame(studioCatsSittingAnimId);
  studioCatsSittingAnimId = requestAnimationFrame(render);
}

function renderStudioCatsCanvas() {
  startStudioCatsSittingAnimation();
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

function initCaretakerCustomizerUI() {
  const ct = world.caretaker;
  const nameInput = document.getElementById('inputCaretakerName');
  if (nameInput) {
    nameInput.value = ct.name || 'Dom';
    nameInput.addEventListener('input', () => {
      ct.name = nameInput.value.trim().slice(0, 16) || 'Dom';
    });
  }

  const hairStyles = [
    { id: 'short', label: 'Short' },
    { id: 'long', label: 'Long' },
    { id: 'spiky', label: 'Spiky' },
    { id: 'bun', label: 'Cozy Bun' }
  ];
  const hsBox = document.getElementById('caretakerHairStyleSelector');
  if (hsBox) {
    hsBox.innerHTML = '';
    hairStyles.forEach((h) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `rounded-lg border-2 py-1 px-1.5 font-bold cursor-pointer ${ct.hairStyle === h.id ? 'border-[#3d2516] bg-[#f3dfc1]' : 'border-[#c8ab89] bg-[#fff9ea]'}`;
      btn.textContent = h.label;
      btn.addEventListener('click', () => {
        ct.hairStyle = h.id;
        initCaretakerCustomizerUI();
      });
      hsBox.appendChild(btn);
    });
  }

  const accessories = [
    { id: 'none', label: 'None' },
    { id: 'glasses', label: 'Glasses' },
    { id: 'catears', label: 'Cat Ears' },
    { id: 'hat', label: 'Sun Hat' }
  ];
  const accBox = document.getElementById('caretakerAccessorySelector');
  if (accBox) {
    accBox.innerHTML = '';
    accessories.forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `rounded-lg border-2 py-1 px-1.5 font-bold cursor-pointer ${ct.accessory === a.id ? 'border-[#3d2516] bg-[#f3dfc1]' : 'border-[#c8ab89] bg-[#fff9ea]'}`;
      btn.textContent = a.label;
      btn.addEventListener('click', () => {
        ct.accessory = a.id;
        initCaretakerCustomizerUI();
      });
      accBox.appendChild(btn);
    });
  }

  const activities = [
    { id: 'AUTO', label: 'Auto' },
    { id: 'READ', label: 'Reading' },
    { id: 'COFFEE', label: 'Coffee' },
    { id: 'CODE', label: 'Coding' }
  ];
  const actBox = document.getElementById('caretakerActivitySelector');
  if (actBox) {
    actBox.innerHTML = '';
    activities.forEach((ac) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `rounded-lg border-2 py-1.5 px-2 font-bold cursor-pointer ${ct.activity === ac.id ? 'border-[#3d2516] bg-[#f3dfc1]' : 'border-[#c8ab89] bg-[#fff9ea]'}`;
      btn.textContent = ac.label;
      btn.addEventListener('click', () => {
        ct.activity = ac.id;
        if (ac.id !== 'AUTO') {
          ct.effectiveActivity = ac.id;
          ct.state = 'IDLE';
        }
        initCaretakerCustomizerUI();
      });
      actBox.appendChild(btn);
    });
  }

  const skinBox = document.getElementById('caretakerSkinSelector');
  if (skinBox) {
    skinBox.innerHTML = '';
    CARETAKER_SKIN_SWATCHES.forEach((sw) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `w-7 h-7 rounded-lg border-2 cursor-pointer ${ct.skinColor === sw.hex ? 'border-[#3d2516] ring-2 ring-amber-500' : 'border-[#b88b5a]'}`;
      btn.style.backgroundColor = sw.hex;
      btn.title = sw.name;
      btn.addEventListener('click', () => {
        ct.skinColor = sw.hex;
        ct.skinShade = sw.shade;
        initCaretakerCustomizerUI();
      });
      skinBox.appendChild(btn);
    });
  }

  const hairColBox = document.getElementById('caretakerHairColorSelector');
  if (hairColBox) {
    hairColBox.innerHTML = '';
    CARETAKER_HAIR_SWATCHES.forEach((sw) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `w-7 h-7 rounded-lg border-2 cursor-pointer ${ct.hairColor === sw.hex ? 'border-[#3d2516] ring-2 ring-amber-500' : 'border-[#b88b5a]'}`;
      btn.style.backgroundColor = sw.hex;
      btn.title = sw.name;
      btn.addEventListener('click', () => {
        ct.hairColor = sw.hex;
        initCaretakerCustomizerUI();
      });
      hairColBox.appendChild(btn);
    });
  }

  const outfitBox = document.getElementById('caretakerOutfitSelector');
  if (outfitBox) {
    outfitBox.innerHTML = '';
    CARETAKER_OUTFIT_SWATCHES.forEach((sw) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `w-7 h-7 rounded-lg border-2 cursor-pointer ${ct.outfitColor === sw.hex ? 'border-[#3d2516] ring-2 ring-amber-500' : 'border-[#b88b5a]'}`;
      btn.style.backgroundColor = sw.hex;
      btn.title = sw.name;
      btn.addEventListener('click', () => {
        ct.outfitColor = sw.hex;
        ct.pantsColor = sw.pants;
        initCaretakerCustomizerUI();
      });
      outfitBox.appendChild(btn);
    });
  }
}

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

  const ctModal = document.getElementById('modalCaretaker');
  const ctCanvas = document.getElementById('previewCaretakerCanvas');
  if (ctModal && ctModal.classList.contains('active') && ctCanvas) {
    const cctx = ctCanvas.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.clearRect(0, 0, 64, 56);
    cctx.fillStyle = world.scene === 'COTTAGE' ? '#9c6234' : '#3f7d3b';
    cctx.fillRect(0, 38, 64, 18);
    cctx.save();
    cctx.translate(32, 44);
    cctx.scale(1.5, 1.5);
    drawPixelCaretaker(cctx, { ...world.caretaker, x: 0, y: 0, state: 'IDLE', labelAlpha: 0 }, time);
    cctx.restore();
  }
}

// Dismiss Intro Overlay & Play Welcome Duet (Web Version)
function dismissIntroOverlay() {
  sound.init();
  sound.playMeow('lilo');
  setTimeout(() => sound.playPurr(), 400);
  setTimeout(() => sound.updateBgm(), 600);
  if (typeof world !== 'undefined' && world && world.weather === 'RAIN') {
    setTimeout(() => sound.startRain(), 600);
  }

  const overlay = document.getElementById('intro-overlay');
  if (overlay) {
    overlay.classList.add('hidden-intro');
  }
}

// ==================== STUDIO LOGO LOADING SCREEN (PWA & APK) ====================
let studioLoadingDismissed = false;

function initStudioLoadingScreen() {
  const env = getAppEnvironment();
  const isApp = env.isNativeApk || env.isStandalonePwa;

  startStudioCatsSittingAnimation();

  if (isApp) {
    document.documentElement.classList.add('app-mode');
    const introOverlay = document.getElementById('intro-overlay');
    if (introOverlay) {
      introOverlay.style.display = 'none';
      introOverlay.classList.add('hidden-intro');
    }

    const screen = document.getElementById('studio-loading-screen');
    const fill = document.getElementById('studio-progress-fill');
    const statusText = document.getElementById('studio-status-text');
    const progressContainer = document.getElementById('studio-progress-container');
    const actionContainer = document.getElementById('studio-action-container');

    if (!screen || studioLoadingDismissed) return;

    // Smoothly animate the loading progress bar over ~1.4s
    const startTime = performance.now();
    const duration = 1400; // 1.4 seconds minimum branding presentation

    function updateProgress(now) {
      if (studioLoadingDismissed) return;
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      if (fill) fill.style.width = pct + '%';

      if (pct < 100) {
        requestAnimationFrame(updateProgress);
      } else {
        // Loading complete! Transition from progress bar to "Step into the Garden"
        if (statusText) statusText.textContent = 'Sanctuary Ready';
        setTimeout(() => {
          if (studioLoadingDismissed) return;
          if (progressContainer) {
            progressContainer.classList.add('fade-out');
            setTimeout(() => {
              progressContainer.style.display = 'none';
            }, 300);
          }
          if (actionContainer) {
            actionContainer.classList.remove('hidden');
          }
        }, 150);
      }
    }

    requestAnimationFrame(updateProgress);
  }
}

function dismissStudioLoadingScreen() {
  if (studioLoadingDismissed) return;
  studioLoadingDismissed = true;

  sound.init();
  sound.playMeow('lilo');
  setTimeout(() => sound.playPurr(), 400);
  setTimeout(() => sound.updateBgm(), 600);
  if (typeof world !== 'undefined' && world && world.weather === 'RAIN') {
    setTimeout(() => sound.startRain(), 600);
  }

  const screen = document.getElementById('studio-loading-screen');
  if (screen) {
    screen.classList.add('dissolve-out');
    setTimeout(() => {
      screen.style.display = 'none';
      screen.classList.add('hidden');
    }, 620);
  }
}

safeOn('enter-garden-btn', 'click', dismissIntroOverlay);
safeOn('studio-enter-btn', 'click', dismissStudioLoadingScreen);
safeOn('btnFeed', 'click', () => world.feedBowl());
safeOn('btnOpenFriends', 'click', () => openModal('modalFriends'));
safeOn('btnOpenCaretaker', 'click', () => {
  initCaretakerCustomizerUI();
  openModal('modalCaretaker');
});
safeOn('btnCallCatsToCaretaker', 'click', () => {
  closeModal('modalCaretaker');
  world.callCatsToCaretaker();
});
safeOn('btnSaveCaretaker', 'click', () => {
  world.caretaker.labelAlpha = 1.8;
  world.save();
  closeModal('modalCaretaker');
  showToast(`${world.caretaker.name}'s look saved!`, 'sparkle');
});
safeOn('btnWeather', 'click', () => openWeatherForecastModal());
safeOn('btnOpenCredits', 'click', () => openModal('modalCredits'));
safeOn('btnToggleTempUnit', 'click', () => toggleTempUnit());

safeOn('btnAudio', 'click', () => {
  const isEnabled = sound.toggleMaster();
  const audioEl = document.getElementById('audioIcon');
  if (audioEl) {
    audioEl.innerHTML = getPixelIcon(isEnabled ? 'volume-3' : 'volume-x');
  }
  showToast(isEnabled ? 'Cozy audio enabled' : 'Cozy audio muted', isEnabled ? 'volume-3' : 'volume-x');
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
function getGitHubRepoInfo() {
  const defaultOwner = 'BoostedByCaffeine';
  const defaultRepo = 'Lilo-s-Garden';

  try {
    const host = window.location.hostname || '';
    const pathParts = (window.location.pathname || '').split('/').filter(Boolean);

    // If hosted on GitHub Pages: <owner>.github.io/<repo>
    if (host.endsWith('.github.io')) {
      const owner = host.split('.')[0] || defaultOwner;
      const repo = pathParts[0] || defaultRepo;
      return { owner, repo, slug: `${owner}/${repo}` };
    }
  } catch (e) {}

  return { owner: defaultOwner, repo: defaultRepo, slug: `${defaultOwner}/${defaultRepo}` };
}

function getGitHubUrls() {
  const { slug } = getGitHubRepoInfo();
  return {
    releaseDirectApk: `https://github.com/${slug}/releases/download/latest/lilos-garden.apk`,
    releasesPage: `https://github.com/${slug}/releases/latest`,
    allReleases: `https://github.com/${slug}/releases`,
    actionsPage: `https://github.com/${slug}/actions`
  };
}

function getAppEnvironment() {
  const isForceApp = typeof window !== 'undefined' && window.location &&
    (window.location.search.indexOf('app=1') !== -1 || window.location.search.indexOf('preview=studio') !== -1);
  const isNativeApk = Boolean(
    window.AndroidBridge && typeof window.AndroidBridge.isNativeApp === 'function'
  );
  const isStandalonePwa =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  return {
    isNativeApk,
    isStandalonePwa: isStandalonePwa || isForceApp,
    isLiveBrowserWeb: !isNativeApk && !isStandalonePwa && !isForceApp
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

// 3. Inside Tutorial Modal: Direct 1-Tap APK Download from GitHub Release (or local ./lilos-garden.apk)
safeOn('btnProceedApkDownload', 'click', async () => {
  const urls = getGitHubUrls();

  // A. Check if APK is hosted locally in the web root
  try {
    const localCheck = await fetch('./lilos-garden.apk', { method: 'HEAD' });
    if (localCheck.ok) {
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

  // B. Direct 1-tap download from GitHub Releases
  try {
    const a = document.createElement('a');
    a.href = urls.releaseDirectApk;
    a.download = 'lilos-garden.apk';
    a.target = '_blank';
    a.rel = 'noopener,noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Downloading Android APK (.apk)...', 'download');
  } catch (err) {
    window.open(urls.allReleases, '_blank', 'noopener,noreferrer');
    showToast('Opening GitHub Releases page...', 'download');
  }
});

// 3b. Open GitHub Releases & Actions page
safeOn('btnOpenGitHubReleases', 'click', () => {
  const urls = getGitHubUrls();
  window.open(urls.allReleases, '_blank', 'noopener,noreferrer');
  showToast('Opened GitHub Releases page!', 'link');
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
  openModal('widget-choice-modal');
});

safeOn('btnPinGardenWidget', 'click', () => {
  closeModal('widget-choice-modal');
  if (window.AndroidBridge && typeof window.AndroidBridge.pinWidget === 'function') {
    window.AndroidBridge.pinWidget();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'grid-2x2');
  }
});

safeOn('btnPinCompanionWidget', 'click', () => {
  closeModal('widget-choice-modal');
  if (window.AndroidBridge && typeof window.AndroidBridge.pinCompanionWidget === 'function') {
    window.AndroidBridge.pinCompanionWidget();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'grid-2x2');
  }
});

safeOn('btnPinWindowWidget', 'click', () => {
  closeModal('widget-choice-modal');
  if (window.AndroidBridge && typeof window.AndroidBridge.pinWindowWidget === 'function') {
    window.AndroidBridge.pinWindowWidget();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'grid-2x2');
  }
});

safeOn('btnToggleScene', 'click', () => world.toggleScene());

safeOn('btnPinBatteryWidget', 'click', () => {
  closeModal('widget-choice-modal');
  if (window.AndroidBridge && typeof window.AndroidBridge.pinBatteryWidget === 'function') {
    window.AndroidBridge.pinBatteryWidget();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'grid-2x2');
  }
});

safeOn('btnPinPomodoroWidget', 'click', () => {
  closeModal('widget-choice-modal');
  if (window.AndroidBridge && typeof window.AndroidBridge.pinPomodoroWidget === 'function') {
    window.AndroidBridge.pinPomodoroWidget();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'grid-2x2');
  }
});

safeOn('btnPinNotesWidget', 'click', () => {
  closeModal('widget-choice-modal');
  if (window.AndroidBridge && typeof window.AndroidBridge.pinNotesWidget === 'function') {
    window.AndroidBridge.pinNotesWidget();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'grid-2x2');
  }
});

safeOn('btnPinMusicWidget', 'click', () => {
  closeModal('widget-choice-modal');
  if (window.AndroidBridge && typeof window.AndroidBridge.pinMusicWidget === 'function') {
    window.AndroidBridge.pinMusicWidget();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'grid-2x2');
  }
});

safeOn('btnPinWeatherWidget', 'click', () => {
  closeModal('widget-choice-modal');
  if (window.AndroidBridge && typeof window.AndroidBridge.pinWeatherWidget === 'function') {
    window.AndroidBridge.pinWeatherWidget();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'grid-2x2');
  }
});

safeOn('btnPinWeatherWidgetFromModal', 'click', () => {
  closeModal('modalWeatherForecast');
  if (window.AndroidBridge && typeof window.AndroidBridge.pinWeatherWidget === 'function') {
    window.AndroidBridge.pinWeatherWidget();
  } else {
    showToast('Available in Lilo Garden Android APK!', 'grid-2x2');
  }
});

window.addEventListener('focus', () => {
  if (window.AndroidBridge && typeof window.AndroidBridge.getWidgetBlooms === 'function') {
    try {
      const widgetBlooms = Number(window.AndroidBridge.getWidgetBlooms());
      if (widgetBlooms > world.blooms) {
        world.blooms = Math.min(24, widgetBlooms);
        world.save();
        showToast(`Campfire Focus bloomed ${world.blooms}/24 flowers!`, 'sparkle', '#38bdf8');
      }
    } catch (e) {}
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

// ==================== COZY TASKS & STICKY NOTES MANAGER ====================
function renderTasksUI() {
  const listEl = document.getElementById('tasksList');
  const badgeEl = document.getElementById('taskProgressBadge');
  const noteEl = document.getElementById('textareaStickyNote');

  if (noteEl && typeof world.stickyNote === 'string') {
    noteEl.value = world.stickyNote;
  }

  if (!listEl) return;
  listEl.innerHTML = '';

  const tasks = world.tasks || [];
  const completedCount = tasks.filter((t) => t.done).length;
  if (badgeEl) {
    badgeEl.textContent = `${completedCount}/${tasks.length}`;
  }

  if (tasks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-xs text-[#7c624c] italic py-2 text-center';
    empty.textContent = 'No tasks yet. Add one above!';
    listEl.appendChild(empty);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement('div');
    item.className = `task-item ${task.done ? 'done' : ''}`;

    const left = document.createElement('div');
    left.className = 'flex items-center gap-2 flex-1 cursor-pointer';

    const check = document.createElement('span');
    check.className = `task-checkbox ${task.done ? 'checked' : ''}`;
    check.innerHTML = task.done ? '&#10003;' : '';

    const text = document.createElement('span');
    text.className = 'flex-1 font-semibold';
    text.textContent = task.text;

    left.appendChild(check);
    left.appendChild(text);

    left.addEventListener('click', () => {
      task.done = !task.done;
      world.save();
      renderTasksUI();
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'task-del-btn';
    del.title = 'Delete Task';
    del.innerHTML = '&times;';
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      world.tasks = world.tasks.filter((t) => t.id !== task.id);
      world.save();
      renderTasksUI();
    });

    item.appendChild(left);
    item.appendChild(del);
    listEl.appendChild(item);
  });
}

safeOn('btnOpenTasks', 'click', () => {
  renderTasksUI();
  openModal('modalTasks');
});

safeOn('formAddTask', 'submit', (e) => {
  e.preventDefault();
  const inp = document.getElementById('inputNewTask');
  if (!inp) return;
  const val = inp.value.trim();
  if (!val) return;
  if (!world.tasks) world.tasks = [];
  world.tasks.push({ id: 'task-' + Date.now(), text: val, done: false });
  inp.value = '';
  world.save();
  renderTasksUI();
  showToast('Task added!', 'check');
});

safeOn('btnSaveTasksAndNote', 'click', () => {
  const noteEl = document.getElementById('textareaStickyNote');
  if (noteEl) {
    world.stickyNote = noteEl.value.trim();
  }
  world.save();
  closeModal('modalTasks');
  showToast('Tasks & Note synced to Home Screen!', 'sparkle');
});

// Unlock WebAudio on first user interaction for iOS Safari & WebViews
const unlockAudio = () => {
  sound.init();
  window.removeEventListener('touchstart', unlockAudio);
  window.removeEventListener('click', unlockAudio);
};
window.addEventListener('touchstart', unlockAudio, { passive: true });
window.addEventListener('click', unlockAudio, { passive: true });

// Lifecycle listeners: restore environment and reload missing bitmaps on resume
function restoreEnvironmentOnResume() {
  invalidateSceneCaches();
  Object.entries(SPRITE_BANK).forEach(([key, src]) => {
    const img = loadedSprites[key];
    if (!img || !img.complete || img.naturalWidth === 0) {
      const retryImg = new Image();
      retryImg.onload = () => {
        loadedSprites[key] = retryImg;
        invalidateSceneCaches();
      };
      retryImg.src = encodeURI(src);
    }
  });
  updateCanvasResolution();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    restoreEnvironmentOnResume();
  }
});
window.addEventListener('pageshow', restoreEnvironmentOnResume);

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
  initCaretakerCustomizerUI();
  world.init();
  renderTasksUI();
  updateCanvasResolution();
  updateCameraBtnUI();
  renderIntroCanvas();
  syncInstallButtonsVisibility();
  initStudioLoadingScreen();
  setupCitySearchAutocomplete();

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