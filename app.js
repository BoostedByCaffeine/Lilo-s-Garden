// PWA Service Worker Registration & Install Prompt
    let deferredInstallPrompt = null;
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const installBtn = document.getElementById('btnInstallPwa');
      if (installBtn) installBtn.style.display = 'inline-flex';
    });

    /********************************************************************
     * LILO'S GARDEN — ADAPTIVE CAMERA & TWIN POLAROID ENGINE
     * World Coordinates Anchored at Center (480, 320)
     ********************************************************************/
    const STORAGE_KEY = 'lilos_garden_save_v1';

    // World Anchor Center & Landmarks
    const WORLD_CENTER = { x: 480, y: 320 };

    const LANDMARKS = {
      shrine:  { x: 340, y: 240, radius: 26, label: "Memorial Stone for Lilo & Cheeto" },
      bowl:    { x: 480, y: 370, radius: 20, label: "Ceramic Cat Bowl" },
      shelter: { x: 620, y: 240, radius: 28, label: "Covered Gazebo Shelter" },
      pond:    { x: 330, y: 380, radius: 24, label: "Birdbath Pond" },
      rug:     { x: 550, y: 340, radius: 22, label: "Sunny Nap Rug" }
    };

    // Walkable Garden Bounds in World Space (around 480, 320)
    const GARDEN_BOUNDS = {
      minX: 250,
      maxX: 710,
      minY: 195,
      maxY: 445
    };

    // Swatches for Companion Customizer
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

    // Default Permanent Reunited Cats: Lilo & Cheeto
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
      coatColor: '#ffffff',     // Pure White coat
      shadeColor: '#eee8dc',    // Soft subtle parchment shading
      eyeColor: '#ffb300',      // Heterochromia: Left eye Amber
      eyeColorRight: '#29b6f6', // Heterochromia: Right eye Sky Blue
      noseColor: '#ff9ebb',
      collarColor: null,        // Lilo has the blue collar; Cheeto is natural white odd-eyed brother
      pattern: 'solid'
    });

    /********************************************************************
     * COZY AUDIO SYNTHESIZER (Purr, Rain, Chimes)
     ********************************************************************/
    class CozyAudio {
      constructor() {
        this.ctx = null;
        this.enabled = true;
        this.rainGain = null;
        this.rainSource = null;
<<<<<<< HEAD
=======
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

      playPurr() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
          const now = this.ctx.currentTime;
          const carrier = this.ctx.createOscillator();
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          const masterGain = this.ctx.createGain();

          carrier.type = 'triangle';
          carrier.frequency.setValueAtTime(28, now);
          carrier.frequency.linearRampToValueAtTime(24, now + 1.2);

          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(23, now);
          lfoGain.gain.setValueAtTime(0.06, now);

          masterGain.gain.setValueAtTime(0.001, now);
          masterGain.gain.linearRampToValueAtTime(0.09, now + 0.15);
          masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

          lfo.connect(lfoGain);
          lfoGain.connect(masterGain.gain);
          carrier.connect(masterGain);
          masterGain.connect(this.ctx.destination);

          carrier.start(now);
          lfo.start(now);
          carrier.stop(now + 1.3);
          lfo.stop(now + 1.3);

          const chime = this.ctx.createOscillator();
          const chimeGain = this.ctx.createGain();
          chime.type = 'sine';
          chime.frequency.setValueAtTime(587.33, now);
          chimeGain.gain.setValueAtTime(0.03, now);
          chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
          chime.connect(chimeGain);
          chimeGain.connect(this.ctx.destination);
          chime.start(now);
          chime.stop(now + 0.36);
        } catch (e) {}
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
            data[i] = (lastOut + (0.04 * white)) / 1.04;
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
          this.rainGain.gain.linearRampToValueAtTime(0.045, this.ctx.currentTime + 1.5);

          this.rainSource.connect(filter);
          filter.connect(this.rainGain);
          this.rainGain.connect(this.ctx.destination);
          this.rainSource.start();
        } catch (e) {}
      }

      stopRain() {
        if (!this.rainGain || !this.ctx) return;
        try {
          this.rainGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.0);
          setTimeout(() => {
            if (this.rainSource) {
              try { this.rainSource.stop(); this.rainSource.disconnect(); } catch (e) {}
              this.rainSource = null;
            }
          }, 1100);
        } catch (e) {}
      }

      playFeedSound() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
          const now = this.ctx.currentTime;
          const notes = [392.00, 440.00, 523.25, 659.25];
          notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0.001, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.05 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.22);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.24);
          });
        } catch (e) {}
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
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.11);
        } catch (e) {}
>>>>>>> fbd8c8e (fix: restore authentic Stardew UI, canvas environment, and twin polaroids across multi-file PWA)
      }

<<<<<<< HEAD
      init() {
        if (!this.ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
      }

      playPurr() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
          const now = this.ctx.currentTime;
          const carrier = this.ctx.createOscillator();
          const lfo = this.ctx.createOscillator();
          const lfoGain = this.ctx.createGain();
          const masterGain = this.ctx.createGain();

          carrier.type = 'triangle';
          carrier.frequency.setValueAtTime(28, now);
          carrier.frequency.linearRampToValueAtTime(24, now + 1.2);

          lfo.type = 'sine';
          lfo.frequency.setValueAtTime(23, now);
          lfoGain.gain.setValueAtTime(0.06, now);

          masterGain.gain.setValueAtTime(0.001, now);
          masterGain.gain.linearRampToValueAtTime(0.09, now + 0.15);
          masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);

          lfo.connect(lfoGain);
          lfoGain.connect(masterGain.gain);
          carrier.connect(masterGain);
          masterGain.connect(this.ctx.destination);

          carrier.start(now);
          lfo.start(now);
          carrier.stop(now + 1.3);
          lfo.stop(now + 1.3);

          const chime = this.ctx.createOscillator();
          const chimeGain = this.ctx.createGain();
          chime.type = 'sine';
          chime.frequency.setValueAtTime(587.33, now);
          chimeGain.gain.setValueAtTime(0.03, now);
          chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
          chime.connect(chimeGain);
          chimeGain.connect(this.ctx.destination);
          chime.start(now);
          chime.stop(now + 0.36);
        } catch (e) {}
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
            data[i] = (lastOut + (0.04 * white)) / 1.04;
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
          this.rainGain.gain.linearRampToValueAtTime(0.045, this.ctx.currentTime + 1.5);

          this.rainSource.connect(filter);
          filter.connect(this.rainGain);
          this.rainGain.connect(this.ctx.destination);
          this.rainSource.start();
        } catch (e) {}
      }

      stopRain() {
        if (!this.rainGain || !this.ctx) return;
        try {
          this.rainGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.0);
          setTimeout(() => {
            if (this.rainSource) {
              try { this.rainSource.stop(); this.rainSource.disconnect(); } catch (e) {}
              this.rainSource = null;
            }
          }, 1100);
        } catch (e) {}
      }

      playFeedSound() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;
        try {
          const now = this.ctx.currentTime;
          const notes = [392.00, 440.00, 523.25, 659.25];
          notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);
            gain.gain.setValueAtTime(0.001, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.05 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.22);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.24);
          });
        } catch (e) {}
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
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.11);
        } catch (e) {}
      }
    }

    const sound = new CozyAudio();

    /********************************************************************
     * OPEN-METEO WEATHER INTEGRATION
     ********************************************************************/
    async function syncLiveWeather(world) {
      if (world.weatherMode !== 'AUTO') return;
      if (!navigator.geolocation) {
        world.applyClockFallback();
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
            world.tempC = Math.round(cur.temperature_2m);
            const code = cur.weather_code;
            if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(code)) {
              world.weather = 'RAIN';
              world.skyDesc = 'Rain Shower';
            } else if (cur.is_day === 0) {
              world.weather = 'NIGHT';
              world.skyDesc = 'Starry Night';
            } else if ([2, 3, 45, 48].includes(code)) {
              world.weather = 'CLOUDY';
              world.skyDesc = 'Cloudy Sky';
            } else {
              world.weather = 'SUNNY';
              world.skyDesc = 'Sunny Sky';
            }
            world.onWeatherUpdated();
          } catch (e) {
            world.applyClockFallback();
          }
        },
        () => world.applyClockFallback(),
        { timeout: 6000 }
      );
    }

    /********************************************************************
     * 24 FORGET-ME-NOT BLOOMS AROUND MEMORIAL STONE
     ********************************************************************/
    const MEMORIAL_BLOOM_COORDS = [
      [-18, 4], [-15, 11], [15, 6], [18, 11], [-13, -7], [14, -6], [-7, 15], [8, 15],
      [-23, 7], [-21, 17], [21, 8], [23, 17], [-18, -14], [17, -13], [-14, 19], [15, 19],
      [-28, 12], [-25, 22], [26, 12], [28, 22], [-23, -18], [22, -18], [-5, 22], [6, 22]
    ];

    /********************************************************************
     * WORLD ENGINE & FINITE STATE MACHINE
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
          this.tempC = 16;
        } else if (hour >= 11 && hour <= 14) {
          this.weather = 'SUNNY';
          this.skyDesc = 'Bright Sun';
          this.tempC = 26;
        } else {
          this.weather = 'SUNNY';
          this.skyDesc = 'Sunny Sky';
          this.tempC = 22;
        }
        this.onWeatherUpdated();
      },

      onWeatherUpdated() {
        if (this.weather === 'RAIN') {
          sound.startRain();
          this.cats.forEach((c, idx) => {
            if (c.state !== 'SHELTERED') {
              c.state = 'SEEK_SHELTER';
              c.targetX = 612 + (idx * 16);
              c.targetY = 238 + (idx % 2 === 0 ? 0 : 6);
            }
          });
        } else {
          sound.stopRain();
          this.cats.forEach(c => {
            if (c.state === 'SHELTERED') {
              c.state = 'IDLE';
              c.stateTimer = 2.5;
            }
          });
        }
        this.syncUI();
      },

      cycleWeather() {
        const modes = ['AUTO', 'SUNNY', 'CLOUDY', 'RAIN', 'NIGHT'];
        const nextIdx = (modes.indexOf(this.weatherMode) + 1) % modes.length;
        this.weatherMode = modes[nextIdx];
        if (this.weatherMode === 'AUTO') {
          syncLiveWeather(this);
          showToast('Live Weather: Open-Meteo GPS', '📡');
        } else {
          this.weather = this.weatherMode;
          const map = {
            SUNNY:  { desc: 'Sunny Sky', temp: 25 },
            CLOUDY: { desc: 'Cloudy Sky', temp: 21 },
            RAIN:   { desc: 'Rain Shower', temp: 18 },
            NIGHT:  { desc: 'Firefly Night', temp: 16 }
          };
          this.skyDesc = map[this.weather].desc;
          this.tempC = map[this.weather].temp;
          this.onWeatherUpdated();
          showToast(`Weather Override: ${this.skyDesc}`, '🌤️');
        }
        this.save();
      },

      createCatRuntime(spec, index = 0) {
        let startX = 460 + ((index * 42) % 120);
        let startY = 320 + ((index * 28) % 60);
        if (spec.id === 'lilo') { startX = 430; startY = 315; }
        if (spec.id === 'cheeto') { startX = 520; startY = 325; }

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
          labelAlpha: 0,
          socialCooldown: 0
        };
      },

      load() {
        let saved = null;
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) saved = JSON.parse(raw);
        } catch (e) {
          saved = null;
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
            ? saved.companions.filter(c => c && c.id !== 'lilo' && c.id !== 'cheeto')
            : [];

          this.cats = [
            this.createCatRuntime(DEFAULT_LILO, 0),
            this.createCatRuntime(DEFAULT_CHEETO, 1),
            ...companions.map((c, idx) => this.createCatRuntime(c, idx + 2))
          ];
        } else {
          // Initial garden: Lilo & Cheeto reunited
          this.cats = [
            this.createCatRuntime(DEFAULT_LILO, 0),
            this.createCatRuntime(DEFAULT_CHEETO, 1)
          ];
          this.save();
        }
      },

      serialize() {
        const companions = this.cats
          .filter(c => !c.isDefault && c.id !== 'lilo' && c.id !== 'cheeto')
          .map(c => ({
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
          version: 3,
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
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize()));
        } catch (e) {}
        this.syncUI();
      },

=======
    const sound = new CozyAudio();

    /********************************************************************
     * OPEN-METEO WEATHER INTEGRATION
     ********************************************************************/
    async function syncLiveWeather(world) {
      if (world.weatherMode !== 'AUTO') return;
      if (!navigator.geolocation) {
        world.applyClockFallback();
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
            world.tempC = Math.round(cur.temperature_2m);
            const code = cur.weather_code;
            if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(code)) {
              world.weather = 'RAIN';
              world.skyDesc = 'Rain Shower';
            } else if (cur.is_day === 0) {
              world.weather = 'NIGHT';
              world.skyDesc = 'Starry Night';
            } else if ([2, 3, 45, 48].includes(code)) {
              world.weather = 'CLOUDY';
              world.skyDesc = 'Cloudy Sky';
            } else {
              world.weather = 'SUNNY';
              world.skyDesc = 'Sunny Sky';
            }
            world.onWeatherUpdated();
          } catch (e) {
            world.applyClockFallback();
          }
        },
        () => world.applyClockFallback(),
        { timeout: 6000 }
      );
    }

    /********************************************************************
     * 24 FORGET-ME-NOT BLOOMS AROUND MEMORIAL STONE
     ********************************************************************/
    const MEMORIAL_BLOOM_COORDS = [
      [-18, 4], [-15, 11], [15, 6], [18, 11], [-13, -7], [14, -6], [-7, 15], [8, 15],
      [-23, 7], [-21, 17], [21, 8], [23, 17], [-18, -14], [17, -13], [-14, 19], [15, 19],
      [-28, 12], [-25, 22], [26, 12], [28, 22], [-23, -18], [22, -18], [-5, 22], [6, 22]
    ];

    /********************************************************************
     * WORLD ENGINE & FINITE STATE MACHINE
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
          this.tempC = 16;
        } else if (hour >= 11 && hour <= 14) {
          this.weather = 'SUNNY';
          this.skyDesc = 'Bright Sun';
          this.tempC = 26;
        } else {
          this.weather = 'SUNNY';
          this.skyDesc = 'Sunny Sky';
          this.tempC = 22;
        }
        this.onWeatherUpdated();
      },

      onWeatherUpdated() {
        if (this.weather === 'RAIN') {
          sound.startRain();
          this.cats.forEach((c, idx) => {
            if (c.state !== 'SHELTERED') {
              c.state = 'SEEK_SHELTER';
              c.targetX = 612 + (idx * 16);
              c.targetY = 238 + (idx % 2 === 0 ? 0 : 6);
            }
          });
        } else {
          sound.stopRain();
          this.cats.forEach(c => {
            if (c.state === 'SHELTERED') {
              c.state = 'IDLE';
              c.stateTimer = 2.5;
            }
          });
        }
        this.syncUI();
      },

      cycleWeather() {
        const modes = ['AUTO', 'SUNNY', 'CLOUDY', 'RAIN', 'NIGHT'];
        const nextIdx = (modes.indexOf(this.weatherMode) + 1) % modes.length;
        this.weatherMode = modes[nextIdx];
        if (this.weatherMode === 'AUTO') {
          syncLiveWeather(this);
          showToast('Live Weather: Open-Meteo GPS', '📡');
        } else {
          this.weather = this.weatherMode;
          const map = {
            SUNNY:  { desc: 'Sunny Sky', temp: 25 },
            CLOUDY: { desc: 'Cloudy Sky', temp: 21 },
            RAIN:   { desc: 'Rain Shower', temp: 18 },
            NIGHT:  { desc: 'Firefly Night', temp: 16 }
          };
          this.skyDesc = map[this.weather].desc;
          this.tempC = map[this.weather].temp;
          this.onWeatherUpdated();
          showToast(`Weather Override: ${this.skyDesc}`, '🌤️');
        }
        this.save();
      },

      createCatRuntime(spec, index = 0) {
        let startX = 460 + ((index * 42) % 120);
        let startY = 320 + ((index * 28) % 60);
        if (spec.id === 'lilo') { startX = 430; startY = 315; }
        if (spec.id === 'cheeto') { startX = 520; startY = 325; }

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
          labelAlpha: 0,
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
                try {
                  saved = JSON.parse(decodedStr);
                } catch (e2) {}
              }
              if (saved) {
                setTimeout(() => showToast('Garden loaded from shared link! 🐾', '🔗'), 600);
              }
            }
          }
        } catch (e) {}

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
            ? saved.companions.filter(c => c && c.id !== 'lilo' && c.id !== 'cheeto')
            : [];

          this.cats = [
            this.createCatRuntime(DEFAULT_LILO, 0),
            this.createCatRuntime(DEFAULT_CHEETO, 1),
            ...companions.map((c, idx) => this.createCatRuntime(c, idx + 2))
          ];
        } else {
          // Initial garden: Lilo & Cheeto reunited
          this.cats = [
            this.createCatRuntime(DEFAULT_LILO, 0),
            this.createCatRuntime(DEFAULT_CHEETO, 1)
          ];
          this.save();
        }
      },

      serialize() {
        const companions = this.cats
          .filter(c => !c.isDefault && c.id !== 'lilo' && c.id !== 'cheeto')
          .map(c => ({
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
          version: 3,
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
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.serialize()));
        } catch (e) {}
        this.syncUI();
      },

>>>>>>> fbd8c8e (fix: restore authentic Stardew UI, canvas environment, and twin polaroids across multi-file PWA)
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
            x: 200 + Math.random() * 600,
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
        cat.labelAlpha = 1.6;
        this.stats.pets++;
        this.petProgress = (this.petProgress || 0) + 1;

        if (this.petProgress >= 3) {
          this.petProgress = 0;
          if (this.blooms < 24) {
            this.blooms++;
            this.spawnHeart(LANDMARKS.shrine.x, LANDMARKS.shrine.y - 10, 'sparkle');
            showToast('A new blue forget-me-not bloomed! 💠', '💠');
          }
        }

        this.spawnHeart(cat.x, cat.y - 6, 'heart');
        sound.playPurr();
        this.save();
      },

      feedBowl() {
        this.bowlLevel = 3;
        sound.playFeedSound();
        this.spawnHeart(LANDMARKS.bowl.x, LANDMARKS.bowl.y - 4, 'sparkle');
        this.cats.forEach((cat, idx) => {
          if (this.weather === 'RAIN' && cat.state === 'SHELTERED') {
            if (Math.random() < 0.4) {
              cat.state = 'SEEK_FOOD';
              cat.targetX = LANDMARKS.bowl.x + (idx * 16 - 12);
              cat.targetY = LANDMARKS.bowl.y + 2;
            }
          } else {
            cat.state = 'SEEK_FOOD';
            cat.pose = 'sit';
            cat.targetX = LANDMARKS.bowl.x + (idx * 16 - 12);
            cat.targetY = LANDMARKS.bowl.y + 2;
          }
        });
        showToast("Ceramic bowl filled with crunchy kibble!", "🥣");
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
          if (Math.hypot(tx - LANDMARKS.pond.x, ty - LANDMARKS.pond.y) > 28 &&
              Math.hypot(tx - LANDMARKS.shrine.x, ty - LANDMARKS.shrine.y) > 26) {
            return { x: tx, y: ty };
          }
        }
        return { x: 480, y: 320 };
      },

      update(dt, time) {
        // Rain
        if (this.weather === 'RAIN') {
          for (let i = 0; i < this.rainDrops.length; i++) {
            const drop = this.rainDrops[i];
            drop.y += drop.speed * dt;
            drop.x -= 30 * dt;
            if (drop.y > 520) {
              drop.y = 120;
              drop.x = 200 + Math.random() * 600;
            }
          }
        }

        // Critters
        this.critters.forEach(cr => {
          cr.x += cr.vx * dt + Math.sin(time * 2 + cr.phase) * 12 * dt;
          cr.y += cr.vy * dt + Math.cos(time * 1.5 + cr.phase) * 10 * dt;
          if (cr.x < GARDEN_BOUNDS.minX) { cr.x = GARDEN_BOUNDS.minX; cr.vx = Math.abs(cr.vx); }
          if (cr.x > GARDEN_BOUNDS.maxX) { cr.x = GARDEN_BOUNDS.maxX; cr.vx = -Math.abs(cr.vx); }
          if (cr.y < GARDEN_BOUNDS.minY - 20) { cr.y = GARDEN_BOUNDS.minY - 20; cr.vy = Math.abs(cr.vy); }
          if (cr.y > GARDEN_BOUNDS.maxY + 10) { cr.y = GARDEN_BOUNDS.maxY + 10; cr.vy = -Math.abs(cr.vy); }
        });

        // Cats FSM
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
            cat.targetX = 610 + (i * 16);
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
                  cat.pose = (onRug || Math.random() < 0.32) ? 'sleep' : 'sit';
                  cat.stateTimer = 4 + Math.random() * 5;
                }
              } else {
                const speed = cat.state === 'SEEK_FOOD' ? 36 : (cat.state === 'SEEK_SHELTER' ? 38 : 26);
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

        // Nose-boop social interaction between cats
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

        // Particle updates
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
        if (lilo.state === 'SHELTERED') moodText = "Lilo: Cozy under gazebo porch 🏡";
        else if (lilo.state === 'SEEK_SHELTER') moodText = "Lilo: Running to gazebo 🌧️";
        else if (lilo.state === 'EATING') moodText = "Lilo: Munching tasty kibble 🐟";
        else if (lilo.state === 'SEEK_FOOD') moodText = "Lilo: Trotting to food bowl 🥣";
        else if (lilo.state === 'INTERACT') moodText = "Lilo: Purring happily with love ♥";
        else if (lilo.state === 'PLAYFUL') moodText = "Lilo: Pouncing at butterflies ♪";
        else if (lilo.state === 'IDLE' && lilo.pose === 'sleep') moodText = "Lilo: Napping in the sun 💤";
        else if (lilo.state === 'WANDER') moodText = "Lilo: Exploring garden with Cheeto 🐾";

        el.textContent = moodText;
      },

      syncUI() {
        document.getElementById('statBlooms').textContent = this.blooms;
        document.getElementById('modalBloomCount').textContent = `${this.blooms} / 24`;
        document.getElementById('catCountBadge').textContent = this.cats.length;

        const bowlLabels = ['Empty', 'Low', 'Half', 'Full'];
        const bowlBadge = document.getElementById('bowlBadge');
        if (bowlBadge) {
          bowlBadge.textContent = bowlLabels[this.bowlLevel] || 'Full';
        }

        const iconMap = { SUNNY: '☀️', CLOUDY: '☁️', RAIN: '🌧️', NIGHT: '✨' };
        document.getElementById('weatherIcon').textContent = iconMap[this.weather] || '☀️';
        document.getElementById('weatherText').textContent = `${this.tempC}°C • ${this.skyDesc}${this.weatherMode === 'AUTO' ? ' (Live)' : ''}`;

        renderFriendsList();
      }
    };

    /********************************************************************
     * PROCEDURAL PIXEL CAT SPRITE (With Heterochromia Support)
     ********************************************************************/
    function drawPixelCat(ctx, cat, time) {
      const x = Math.round(cat.x);
      const y = Math.round(cat.y);
      const isWalking = cat.state === 'WANDER' || cat.state === 'SEEK_FOOD' || cat.state === 'SEEK_SHELTER';
      const isEating = cat.state === 'EATING';
      const isPetted = cat.state === 'INTERACT';
      const isSleeping = (cat.state === 'IDLE' || cat.state === 'SHELTERED') && cat.pose === 'sleep';
      const isPlayful = cat.state === 'PLAYFUL';

      ctx.save();
      ctx.translate(x, y);

      ctx.fillStyle = 'rgba(15, 28, 17, 0.32)';
      if (isSleeping) {
        ctx.fillRect(-8, -1, 16, 4);
      } else {
        ctx.fillRect(-7, -1, 14, 3);
      }

      if (cat.facing < 0 && !isSleeping) {
        ctx.scale(-1, 1);
      }

      const coat = cat.coatColor || '#ffffff';
      const shade = cat.shadeColor || '#dbe7f5';
      const eyeLeft = cat.eyeColor || '#29b6f6';
      const eyeRight = cat.eyeColorRight || cat.eyeColor || '#29b6f6'; // Heterochromia support
      const nose = cat.noseColor || '#ff9ebb';
      const pattern = cat.pattern || 'solid';

      const px = (rx, ry, w, h, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(rx), Math.round(ry), w, h);
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

        ctx.restore();
        return;
      }

      const walkCycle = isWalking ? Math.floor(time * 9 + cat.seed) % 4 : 0;
      const hopY = isPlayful ? Math.round(Math.abs(Math.sin(time * 10)) * -3) : 0;
      const bounceY = hopY + (isWalking ? (walkCycle % 2 === 1 ? -1 : 0) : (isPetted ? -1 : 0));
      const headDipY = isEating ? (Math.floor(time * 8) % 2 === 0 ? 3 : 2) : 0;

      const tailWag = Math.sin(time * (isPetted || isPlayful ? 12 : 4.5) + cat.seed);
      const tailOffsetY = tailWag > 0.35 ? -1 : (tailWag < -0.35 ? 1 : 0);
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

      // Collar
      if (cat.collarColor || cat.isDefault) {
        const col = cat.collarColor || (cat.id === 'cheeto' ? '#ff9800' : '#1e88e5');
        px(2, -5 + bounceY, 3, 1, col);
        px(4, -4 + bounceY, 1, 1, '#fde047');
      }

      const pawColor = pattern === 'tuxedo' ? '#ffffff' : coat;
      if (isWalking) {
        const legA = (walkCycle === 0 || walkCycle === 3) ? 0 : -1;
        const legB = (walkCycle === 1 || walkCycle === 2) ? 0 : -1;
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

      const isBlinking = (Math.sin(time * 1.7 + cat.seed * 3) > 0.94) || isEating;
      if (isPetted || isBlinking) {
        px(hx + 2, hy + 2, 2, 1, '#334155');
        px(hx + 5, hy + 2, 2, 1, '#334155');
      } else {
        // Left Eye
        px(hx + 2, hy + 1, 2, 2, eyeLeft);
        // Right Eye (Amber for Cheeto!)
        px(hx + 5, hy + 1, 2, 2, eyeRight);
        // Glistening shine pixel
        px(hx + 2, hy + 1, 1, 1, '#ffffff');
        px(hx + 5, hy + 1, 1, 1, '#ffffff');
      }

      px(hx + 4, hy + 3, 1, 1, nose);

      if (isPetted) {
        px(hx + 1, hy + 3, 1, 1, '#fda4af');
        px(hx + 6, hy + 3, 1, 1, '#fda4af');
      }

      if (isPlayful) {
        px(hx + 2, hy - 8, 3, 1, '#fef08a');
        px(hx + 4, hy - 7, 1, 2, '#fef08a');
        px(hx + 3, hy - 5, 2, 1, '#fde047');
      }

      ctx.restore();

      if (cat.labelAlpha > 0.02) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, cat.labelAlpha);
        ctx.font = 'bold 7px Quicksand, sans-serif';
        ctx.textAlign = 'center';
        const textW = ctx.measureText(cat.name).width + 8;
        ctx.fillStyle = 'rgba(24, 16, 10, 0.78)';
        ctx.fillRect(Math.round(x - textW / 2), Math.round(y - 25), Math.round(textW), 9);
        ctx.fillStyle = cat.isDefault ? '#7dd3fc' : '#fde68a';
        ctx.fillText(cat.name, Math.round(x), Math.round(y - 18));
        ctx.restore();
      }
    }

    /********************************************************************
     * SCENERY & COVERED GAZEBO RENDERER
     ********************************************************************/
    const GRASS_TUFT_LIST = [];
    const GENERAL_FLOWERS = [];
    (function initStaticGarden() {
      let seed = 3050;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };

      for (let i = 0; i < 110; i++) {
        const gx = Math.floor(220 + rand() * 520);
        const gy = Math.floor(180 + rand() * 280);
        if (Math.hypot(gx - LANDMARKS.pond.x, gy - LANDMARKS.pond.y) < 28) continue;
        if (Math.hypot(gx - LANDMARKS.shelter.x, gy - LANDMARKS.shelter.y) < 36) continue;
        GRASS_TUFT_LIST.push({
          x: gx, y: gy,
          shade: rand() > 0.5 ? '#3f7d3b' : '#579c4c',
          phase: rand() * Math.PI * 2
        });
      }

      const colors = ['#fde047', '#f472b6', '#ffffff', '#bae6fd'];
      for (let i = 0; i < 40; i++) {
        const fx = Math.floor(230 + rand() * 500);
        const fy = Math.floor(190 + rand() * 260);
        if (Math.hypot(fx - LANDMARKS.pond.x, fy - LANDMARKS.pond.y) < 30) continue;
        if (Math.hypot(fx - LANDMARKS.shelter.x, fy - LANDMARKS.shelter.y) < 38) continue;
        if (Math.hypot(fx - LANDMARKS.shrine.x, fy - LANDMARKS.shrine.y) < 34) continue;
        GENERAL_FLOWERS.push({
          x: fx, y: fy,
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

    function drawGardenScenery(ctx, time) {
      // Seamless Background Expanse for Any Mobile Aspect Ratio / Device Viewport
<<<<<<< HEAD
      const viewLeft = -camera.x - 30;
      const viewTop = -camera.y - 30;
      const viewW = canvas.width + 60;
      const viewH = canvas.height + 60;
=======
      const halfViewW = (canvas.width / 2) / camera.zoom;
      const halfViewH = (canvas.height / 2) / camera.zoom;
      const viewLeft = Math.min(-120, camera.x - halfViewW - 120);
      const viewTop = Math.min(-120, camera.y - halfViewH - 120);
      const viewRight = Math.max(WORLD_W + 120, camera.x + halfViewW + 120);
      const viewBottom = Math.max(WORLD_H + 120, camera.y + halfViewH + 120);
      const viewW = viewRight - viewLeft;
      const viewH = viewBottom - viewTop;
>>>>>>> fbd8c8e (fix: restore authentic Stardew UI, canvas environment, and twin polaroids across multi-file PWA)

      // Base lush deep-forest surround
      ctx.fillStyle = '#224426';
      ctx.fillRect(viewLeft, viewTop, viewW, viewH);

      // North Forest Canopy (above garden fence)
      if (viewTop < 140) {
        ctx.fillStyle = '#172d1a';
        ctx.fillRect(viewLeft, viewTop, viewW, 140 - viewTop);
        ctx.fillStyle = '#1e3a22';
<<<<<<< HEAD
        for (let fx = Math.floor(viewLeft / 28) * 28; fx < viewLeft + viewW; fx += 28) {
=======
        for (let fx = Math.floor(viewLeft / 28) * 28; fx < viewRight; fx += 28) {
>>>>>>> fbd8c8e (fix: restore authentic Stardew UI, canvas environment, and twin polaroids across multi-file PWA)
          ctx.fillRect(fx, 114 + (Math.abs(fx % 56) === 0 ? 5 : 0), 22, 26);
        }
      }

      // South Meadow (below garden)
<<<<<<< HEAD
      if (viewTop + viewH > 500) {
        ctx.fillStyle = '#3c7536';
        ctx.fillRect(viewLeft, 500, viewW, viewTop + viewH - 500);
=======
      if (viewBottom > 500) {
        ctx.fillStyle = '#3c7536';
        ctx.fillRect(viewLeft, 500, viewW, viewBottom - 500);
>>>>>>> fbd8c8e (fix: restore authentic Stardew UI, canvas environment, and twin polaroids across multi-file PWA)
      }

      // Grass Field
      ctx.fillStyle = '#478942';
      ctx.fillRect(180, 120, 600, 380);
      for (let ty = 120; ty < 500; ty += 16) {
        for (let tx = 180; tx < 780; tx += 16) {
          if (((tx / 16) + (ty / 16)) % 2 === 0) {
            ctx.fillStyle = '#4c9146';
            ctx.fillRect(tx, ty, 16, 16);
          }
        }
      }

      // Top Hedge
      ctx.fillStyle = '#2d5c2b';
      ctx.fillRect(180, 120, 600, 36);
      ctx.fillStyle = '#386e35';
      for (let hx = 180; hx < 780; hx += 14) {
        ctx.fillRect(hx, 138 + (hx % 28 === 0 ? 3 : 0), 12, 18);
      }

      // Wooden Fence along Top
      ctx.fillStyle = 'rgba(15, 28, 17, 0.28)';
      ctx.fillRect(190, 162, 580, 5);
      ctx.fillStyle = '#8c5832';
      ctx.fillRect(190, 146, 580, 4);
      ctx.fillRect(190, 155, 580, 4);
      for (let fx = 195; fx < 770; fx += 26) {
        if (fx > 455 && fx < 505) continue; // Gate gap
        ctx.fillStyle = '#6e4223';
        ctx.fillRect(fx, 139, 7, 23);
        ctx.fillStyle = '#a86e42';
        ctx.fillRect(fx + 1, 140, 5, 20);
        ctx.fillStyle = '#c98d5c';
        ctx.fillRect(fx + 1, 139, 5, 3);
      }

      // Path
      PATH_STONES.forEach(st => {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(st.x, st.y + 1, st.w, st.h);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(st.x, st.y, st.w - 1, st.h - 1);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(st.x + 1, st.y + 1, st.w - 4, 2);
      });

      // Grass tufts
      GRASS_TUFT_LIST.forEach(g => {
        const sway = Math.round(Math.sin(time * 2 + g.phase) * 0.7);
        ctx.fillStyle = g.shade;
        ctx.fillRect(g.x + sway, g.y, 1, 3);
        ctx.fillRect(g.x + 2 + sway, g.y + 1, 1, 2);
      });

      // Birdbath Pond
      const px = LANDMARKS.pond.x;
      const py = LANDMARKS.pond.y;
      ctx.fillStyle = '#57534e';
      ctx.fillRect(px - 18, py - 10, 36, 20);
      ctx.fillStyle = '#78716c';
      ctx.fillRect(px - 16, py - 12, 32, 22);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(px - 14, py - 9, 28, 16);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(px - 12, py - 7, 24, 12);
      const rip = Math.floor(Math.sin(time * 2) * 2);
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(px - 6 + rip, py - 3, 6, 1);
      ctx.fillRect(px + 2 - rip, py + 2, 5, 1);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(px - 9, py + 1, 5, 4);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(px - 7, py + 1, 2, 2);

      // Picnic Rug
      const rx = LANDMARKS.rug.x;
      const ry = LANDMARKS.rug.y;
      ctx.fillStyle = 'rgba(15, 28, 17, 0.25)';
      ctx.fillRect(rx - 20, ry - 12, 40, 24);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(rx - 19, ry - 13, 38, 24);
      ctx.fillStyle = '#f59e0b';
      for (let bx = rx - 17; bx < rx + 17; bx += 8) {
        for (let by = ry - 11; by < ry + 9; by += 8) {
          if (((bx + by) / 8) % 2 === 0) ctx.fillRect(bx, by, 4, 4);
        }
      }

      // Wildflowers
      GENERAL_FLOWERS.forEach(f => {
        const bob = Math.sin(time * 2.5 + f.phase) > 0.6 ? -1 : 0;
        ctx.fillStyle = '#2e6b30';
        ctx.fillRect(f.x, f.y + 1, 1, 2);
        ctx.fillStyle = f.color;
        ctx.fillRect(f.x - 1, f.y + bob, 3, 2);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(f.x, f.y + bob, 1, 1);
      });
    }

    function drawShelterDeck(ctx, time) {
      const sx = LANDMARKS.shelter.x;
      const sy = LANDMARKS.shelter.y;

      ctx.fillStyle = 'rgba(15, 28, 17, 0.4)';
      ctx.fillRect(sx - 28, sy - 10, 56, 30);

      ctx.fillStyle = '#532e16';
      ctx.fillRect(sx - 26, sy - 8, 52, 26);
      ctx.fillStyle = '#78431e';
      ctx.fillRect(sx - 25, sy - 9, 50, 26);
      ctx.fillStyle = '#452310';
      for (let py = sy - 6; py < sy + 16; py += 5) {
        ctx.fillRect(sx - 25, py, 50, 1);
      }

      // Berry Velvet Cushion
      ctx.fillStyle = '#831843';
      ctx.fillRect(sx - 16, sy - 4, 32, 15);
      ctx.fillStyle = '#9f1239';
      ctx.fillRect(sx - 15, sy - 5, 30, 14);
      ctx.fillStyle = '#be123c';
      ctx.fillRect(sx - 13, sy - 4, 26, 2);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(sx - 8, sy + 2, 2, 2);
      ctx.fillRect(sx + 7, sy + 2, 2, 2);

      // Back Posts
      ctx.fillStyle = '#532e16';
      ctx.fillRect(sx - 24, sy - 30, 4, 22);
      ctx.fillRect(sx + 20, sy - 30, 4, 22);
    }

    function drawShelterRoofOverhead(ctx, time) {
      const sx = LANDMARKS.shelter.x;
      const sy = LANDMARKS.shelter.y;

      // Front Posts
      ctx.fillStyle = '#532e16';
      ctx.fillRect(sx - 24, sy - 10, 4, 26);
      ctx.fillRect(sx + 20, sy - 10, 4, 26);
      ctx.fillStyle = '#8c5832';
      ctx.fillRect(sx - 23, sy - 10, 2, 26);
      ctx.fillRect(sx + 21, sy - 10, 2, 26);

      // Lantern
      const lanternGlow = Math.sin(time * 3) * 0.15 + 0.85;
      ctx.fillStyle = '#1e1e24';
      ctx.fillRect(sx - 1, sy - 26, 2, 8);
      ctx.fillRect(sx - 4, sy - 18, 8, 10);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(sx - 2, sy - 16, 4, 6);

      const grad = ctx.createRadialGradient(sx, sy - 13, 2, sx, sy - 13, 38);
      grad.addColorStop(0, `rgba(253, 224, 71, ${0.35 * lanternGlow})`);
      grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy - 13, 38, 0, Math.PI * 2);
      ctx.fill();

      // Roof
      ctx.fillStyle = '#452310';
      ctx.fillRect(sx - 30, sy - 36, 60, 15);
      ctx.fillStyle = '#6e3818';
      ctx.fillRect(sx - 28, sy - 38, 56, 14);
      ctx.fillStyle = '#8c4820';
      ctx.fillRect(sx - 26, sy - 40, 52, 13);
      ctx.fillStyle = '#a85828';
      ctx.fillRect(sx - 20, sy - 44, 40, 10);
      ctx.fillStyle = '#c86f34';
      ctx.fillRect(sx - 12, sy - 47, 24, 7);
      ctx.fillStyle = '#5c2a10';
      ctx.fillRect(sx - 2, sy - 49, 4, 4);
    }

    function drawMemorialStone(ctx, time, hovered) {
      const sx = LANDMARKS.shrine.x;
      const sy = LANDMARKS.shrine.y;

      ctx.fillStyle = 'rgba(15, 28, 17, 0.35)';
      ctx.fillRect(sx - 16, sy + 2, 32, 6);

      ctx.fillStyle = '#64748b';
      ctx.fillRect(sx - 14, sy - 4, 28, 9);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(sx - 13, sy - 5, 26, 7);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(sx - 11, sy - 23, 22, 19);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(sx - 10, sy - 25, 20, 20);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(sx - 8, sy - 26, 16, 2);

      // Double Paw Emblem (Lilo & Cheeto)
      const glowLilo = Math.sin(time * 3) > 0 ? '#38bdf8' : '#7dd3fc';
      const glowCheeto = Math.sin(time * 3 + 1.5) > 0 ? '#ffb300' : '#fde047';
      // Left Paw (Lilo Blue)
      ctx.fillStyle = glowLilo;
      ctx.fillRect(sx - 5, sy - 17, 3, 3);
      ctx.fillRect(sx - 7, sy - 19, 2, 2);
      ctx.fillRect(sx - 4, sy - 20, 2, 2);
      // Right Paw (Cheeto Amber)
      ctx.fillStyle = glowCheeto;
      ctx.fillRect(sx + 2, sy - 17, 3, 3);
      ctx.fillRect(sx + 1, sy - 20, 2, 2);
      ctx.fillRect(sx + 4, sy - 19, 2, 2);

      // Garland
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(sx - 10, sy - 24, 5, 3);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(sx - 9, sy - 25, 2, 2);

      // Bloomed Forget-Me-Nots
      const bloomCount = Math.min(world.blooms, MEMORIAL_BLOOM_COORDS.length);
      for (let i = 0; i < bloomCount; i++) {
        const [ox, oy] = MEMORIAL_BLOOM_COORDS[i];
        const fx = sx + ox;
        const fy = sy + oy;
        const bob = Math.sin(time * 2.8 + i) > 0.65 ? -1 : 0;

        ctx.fillStyle = '#256d27';
        ctx.fillRect(fx, fy + 1, 1, 2);
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#60a5fa';
        ctx.fillRect(fx - 1, fy + bob, 3, 2);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(fx, fy + bob, 1, 1);
      }

      if (hovered) {
        ctx.font = 'bold 7px Quicksand, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(sx - 45, sy - 40, 90, 11);
        ctx.fillStyle = '#bae6fd';
        ctx.fillText("Lilo & Cheeto 💠", sx, sy - 32);
      }
    }

    function drawFoodBowl(ctx, bowlLevel, hovered) {
      const bx = LANDMARKS.bowl.x;
      const by = LANDMARKS.bowl.y;

      ctx.fillStyle = 'rgba(15, 28, 17, 0.3)';
      ctx.fillRect(bx - 12, by - 4, 24, 10);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(bx - 11, by - 5, 22, 10);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(bx - 10, by - 4, 20, 8);

      ctx.fillStyle = '#0284c7';
      ctx.fillRect(bx - 8, by - 3, 16, 7);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx - 7, by - 4, 14, 6);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(bx - 6, by - 3, 12, 4);

      if (bowlLevel >= 1) {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(bx - 5, by - 3, 10, 2);
      }
      if (bowlLevel >= 2) {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(bx - 6, by - 4, 12, 2);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(bx - 3, by - 4, 2, 1);
        ctx.fillRect(bx + 2, by - 3, 2, 1);
      }
      if (bowlLevel >= 3) {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(bx - 4, by - 5, 8, 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(bx - 1, by - 5, 2, 1);
      }

      if (hovered) {
        ctx.font = 'bold 7px Quicksand, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(24, 16, 10, 0.88)';
        ctx.fillRect(bx - 30, by - 17, 60, 9);
        ctx.fillStyle = '#fde68a';
        ctx.fillText(bowlLevel > 0 ? 'Food Bowl' : 'Tap to Refill 🥣', bx, by - 10);
      }
    }

    /********************************************************************
     * ADAPTIVE VIEWPORT CAMERA & RENDER PIPELINE
     ********************************************************************/
    const canvas = document.getElementById('garden-canvas');
    const ctx = canvas.getContext('2d');
    let camera = { x: 0, y: 0, scale: 1 };

    function resizeGardenViewport() {
      const isMobile = window.innerWidth < 820;
      const viewW = window.innerWidth || document.documentElement.clientWidth;
      const viewH = window.innerHeight || document.documentElement.clientHeight;

      if (isMobile) {
        canvas.style.width = '100vw';
        canvas.style.height = '100dvh';
        canvas.style.maxWidth = '100vw';
        canvas.style.maxHeight = '100dvh';

        const aspect = viewW / viewH;
        if (aspect < 1) {
          // Portrait phone: Guarantee min horizontal width 500px visible around 480
          canvas.width = 500;
          canvas.height = Math.round(500 / aspect);
        } else {
          // Landscape phone: Guarantee min vertical height 340px visible around 320
          canvas.height = 340;
          canvas.width = Math.round(340 * aspect);
        }
      } else {
        // Desktop centered letterbox-free presentation
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.maxWidth = '1060px';
        canvas.style.maxHeight = '660px';

        canvas.width = 540;
        canvas.height = 340;
      }

      // Camera offset to keep World Center (480, 320) centered on screen
      camera.x = Math.round((canvas.width / 2) - WORLD_CENTER.x);
      camera.y = Math.round((canvas.height / 2) - WORLD_CENTER.y);
      camera.scale = 1;
    }

    function getCanvasWorldCoords(evt) {
      const rect = canvas.getBoundingClientRect();
      const clientX = (evt.touches && evt.touches.length > 0) ? evt.touches[0].clientX : evt.clientX;
      const clientY = (evt.touches && evt.touches.length > 0) ? evt.touches[0].clientY : evt.clientY;

      const canvasX = ((clientX - rect.left) / rect.width) * canvas.width;
      const canvasY = ((clientY - rect.top) / rect.height) * canvas.height;

      return {
        x: canvasX - camera.x,
        y: canvasY - camera.y
      };
    }

    function findCatAt(px, py, isTouch = false) {
      const mult = isTouch ? 1.45 : 1.0;
      const sorted = [...world.cats].sort((a, b) => b.y - a.y);
      for (const cat of sorted) {
        if (Math.abs(px - cat.x) <= 15 * mult && py >= cat.y - 20 * mult && py <= cat.y + 8 * mult) {
          return cat;
        }
      }
      return null;
    }

    function renderGarden(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(camera.x, camera.y);

      // Scenery & Deck
      drawGardenScenery(ctx, time);
      drawShelterDeck(ctx, time);

      // Depth-Sorted entities
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
          y: 254, // Shelter roof overhead
          draw: () => drawShelterRoofOverhead(ctx, time)
        },
        ...world.cats.map(cat => ({
          y: cat.y,
          draw: () => drawPixelCat(ctx, cat, time)
        }))
      ];

      renderables.sort((a, b) => a.y - b.y);
      renderables.forEach(item => item.draw());

      // Critters
      world.critters.forEach(cr => {
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

      // Particles
      world.particles.forEach(p => {
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
          ctx.fillStyle = '#ffe4e6';
          ctx.fillRect(px - 2, py - 1, 1, 1);
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

      // Weather lighting filters
      if (world.weather === 'CLOUDY') {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
        ctx.fillRect(-camera.x, -camera.y, canvas.width, canvas.height);
      } else if (world.weather === 'RAIN') {
        ctx.fillStyle = 'rgba(30, 41, 59, 0.32)';
        ctx.fillRect(-camera.x, -camera.y, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(186, 230, 253, 0.7)';
        world.rainDrops.forEach(d => {
          ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, Math.round(d.len));
        });
      } else if (world.weather === 'NIGHT') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.48)';
        ctx.fillRect(-camera.x, -camera.y, canvas.width, canvas.height);
      }

      ctx.restore();
    }

    /********************************************************************
     * TOUCH & POINTER INTERACTIONS
     ********************************************************************/
    canvas.addEventListener('pointermove', (evt) => {
      const pt = getCanvasWorldCoords(evt);
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

    canvas.addEventListener('pointerdown', (evt) => {
      evt.preventDefault();
      const isTouch = evt.pointerType === 'touch';
      const touchMult = isTouch ? 1.45 : 1.0;
      const pt = getCanvasWorldCoords(evt);

      // 1. Diegetic Petting
      const hitCat = findCatAt(pt.x, pt.y, isTouch);
      if (hitCat) {
        world.petCat(hitCat);
        return;
      }

      // 2. Memorial Stone -> Opens Tribute Modal
      if (Math.hypot(pt.x - LANDMARKS.shrine.x, pt.y - (LANDMARKS.shrine.y - 10)) <= LANDMARKS.shrine.radius * touchMult) {
        openModal('tribute-modal');
        return;
      }

      // 3. Food Bowl -> Refills Directly
      if (Math.hypot(pt.x - LANDMARKS.bowl.x, pt.y - LANDMARKS.bowl.y) <= LANDMARKS.bowl.radius * touchMult) {
        world.feedBowl();
        return;
      }

      // 4. Tap Open Grass -> Calls Lilo or Cheeto
      if (pt.x >= GARDEN_BOUNDS.minX && pt.x <= GARDEN_BOUNDS.maxX &&
          pt.y >= GARDEN_BOUNDS.minY && pt.y <= GARDEN_BOUNDS.maxY) {
        const cat = world.cats[Math.floor(Math.random() * Math.min(2, world.cats.length))];
        if (cat && cat.state !== 'EATING' && cat.state !== 'SHELTERED') {
          cat.state = 'WANDER';
          cat.pose = 'sit';
          cat.targetX = pt.x;
          cat.targetY = pt.y;
          cat.labelAlpha = 1.2;
          world.spawnHeart(pt.x, pt.y, 'sparkle');
        }
      }
    });

    /********************************************************************
     * TWIN POLAROID 3-TIER FALLBACK & UPLOADER SYSTEM
     ********************************************************************/
    function drawPixelArtPortrait(canvasEl, catType) {
      canvasEl.width = 64;
      canvasEl.height = 64;
      const c = canvasEl.getContext('2d');
      const w = 64;
      const h = 64;
      c.clearRect(0, 0, w, h);

      if (catType === 'lilo') {
        // Deep blue starry night backdrop
        c.fillStyle = '#0f172a';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#38bdf8';
        c.fillRect(10, 8, 2, 2);
        c.fillRect(52, 12, 2, 2);
        c.fillRect(30, 6, 2, 2);
        c.fillRect(16, 22, 1, 1);
        c.fillRect(48, 24, 1, 1);

        // Soft glowing crescent moon
        c.fillStyle = '#bae6fd';
        c.fillRect(46, 6, 4, 4);
        c.fillStyle = '#0f172a';
        c.fillRect(45, 5, 3, 4);

        // Lush green lawn
        c.fillStyle = '#225528';
        c.fillRect(0, 42, w, 22);
        c.fillStyle = '#2f7038';
        c.fillRect(0, 42, w, 3);

        // Forget-me-not flower beside Lilo
        c.fillStyle = '#22c55e';
        c.fillRect(14, 44, 1, 4);
        c.fillStyle = '#38bdf8';
        c.fillRect(13, 42, 3, 3);
        c.fillStyle = '#fde047';
        c.fillRect(14, 43, 1, 1);

        drawPixelCat(c, {
          ...DEFAULT_LILO,
          x: 34,
          y: 54,
          facing: 1,
          state: 'IDLE',
          pose: 'sit',
          seed: 0,
          labelAlpha: 0
        }, 0);
      } else {
        // Warm sunset amber golden backdrop for Cheeto
        c.fillStyle = '#451a03';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#78350f';
        c.fillRect(0, 18, w, 24);
        c.fillStyle = '#fbbf24';
        c.fillRect(12, 10, 2, 2);
        c.fillRect(50, 8, 2, 2);
        c.fillRect(28, 14, 2, 2);

        // Sunbeam patch
        c.fillStyle = 'rgba(251, 191, 36, 0.25)';
        c.fillRect(18, 0, 16, 44);

        // Lawn
        c.fillStyle = '#225528';
        c.fillRect(0, 42, w, 22);
        c.fillStyle = '#2f7038';
        c.fillRect(0, 42, w, 3);

        // Golden dandelion flower
        c.fillStyle = '#22c55e';
        c.fillRect(50, 44, 1, 4);
        c.fillStyle = '#fbbf24';
        c.fillRect(49, 42, 3, 3);
        c.fillStyle = '#fef08a';
        c.fillRect(50, 43, 1, 1);

        drawPixelCat(c, {
          ...DEFAULT_CHEETO,
          x: 32,
          y: 54,
          facing: -1,
          state: 'IDLE',
          pose: 'sit',
          seed: 1,
          labelAlpha: 0
        }, 0);
      }
    }

    function initPolaroidFrame(catType, imgEl, canvasEl, inputEl, storageKey, defaultSrc, cardEl) {
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

      // Priority 1: Check localStorage for user-uploaded photo
      const userPhoto = localStorage.getItem(storageKey);
      if (userPhoto) {
        imgEl.src = userPhoto;
      } else {
        // Priority 2: Attempt to load default path
        imgEl.src = defaultSrc;
      }

      // Handle immediate cache or failure
      if (imgEl.complete) {
        if (imgEl.naturalWidth === 0) {
          renderFallback();
        } else {
          showImage();
        }
      }

      // Stop click bubbling on input to avoid recursive activation
      inputEl.addEventListener('click', (e) => e.stopPropagation());

      // Click card to trigger image file picker
      cardEl.addEventListener('click', (e) => {
        if (e.target === inputEl) return;
        inputEl.click();
      });

      // Photo upload & 260x260 downscaling
      inputEl.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (re) => {
          const tempImg = new Image();
          tempImg.onload = () => {
            const offCanvas = document.createElement('canvas');
            offCanvas.width = 260;
            offCanvas.height = 260;
            const offCtx = offCanvas.getContext('2d');

            // Center square crop
            const minDim = Math.min(tempImg.width, tempImg.height);
            const sx = (tempImg.width - minDim) / 2;
            const sy = (tempImg.height - minDim) / 2;

            offCtx.drawImage(tempImg, sx, sy, minDim, minDim, 0, 0, 260, 260);

            const compressedDataUrl = offCanvas.toDataURL('image/jpeg', 0.82);
            try {
              localStorage.setItem(storageKey, compressedDataUrl);
            } catch (err) {
              console.warn('localStorage quota exceeded', err);
            }

            imgEl.src = compressedDataUrl;
            imgEl.style.display = 'block';
            canvasEl.style.display = 'none';

            showToast(`Updated ${catType === 'lilo' ? 'Lilo' : 'Cheeto'}'s photo! 📸`, '📸');
          };
          tempImg.src = re.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    /********************************************************************
     * INTRO OVERLAY PREVIEW CANVAS
     ********************************************************************/
    function renderIntroCanvas() {
      const c = document.getElementById('intro-canvas');
      if (!c) return;
      const ictx = c.getContext('2d');
      ictx.clearRect(0, 0, c.width, c.height);

      // Starry sky & hill
      ictx.fillStyle = '#1e3a24';
      ictx.fillRect(0, 0, c.width, c.height);
      ictx.fillStyle = '#4ade80';
      ictx.fillRect(20, 10, 2, 2);
      ictx.fillRect(85, 12, 2, 2);

      // Grass hill
      ictx.fillStyle = '#3f7d3b';
      ictx.fillRect(0, 36, c.width, 26);

      // Lilo and Cheeto touching noses with a heart
      drawPixelCat(ictx, {
        ...DEFAULT_LILO,
        x: 44,
        y: 44,
        facing: 1,
        state: 'IDLE',
        pose: 'sit',
        seed: 0,
        labelAlpha: 0
      }, 0);

      drawPixelCat(ictx, {
        ...DEFAULT_CHEETO,
        x: 66,
        y: 44,
        facing: -1,
        state: 'IDLE',
        pose: 'sit',
        seed: 1,
        labelAlpha: 0
      }, 0);

      // Floating heart between them
      ictx.fillStyle = '#fb7185';
      ictx.fillRect(53, 24, 2, 2);
      ictx.fillRect(56, 24, 2, 2);
      ictx.fillRect(52, 25, 7, 2);
      ictx.fillRect(53, 27, 5, 1);
      ictx.fillRect(54, 28, 3, 1);
      ictx.fillRect(55, 29, 1, 1);
    }

    /********************************************************************
     * MODALS, ROSTER & TOASTS
     ********************************************************************/
    let customizerState = {
      name: 'Mochi',
      pattern: 'solid',
      coatColor: COAT_SWATCHES[0].hex,
      shadeColor: COAT_SWATCHES[0].shade,
      eyeColor: EYE_SWATCHES[0].hex
    };

    function showToast(message, icon = '✨') {
      const box = document.getElementById('toastBox');
      document.getElementById('toastText').textContent = message;
      document.getElementById('toastIcon').textContent = icon;
      box.classList.remove('opacity-0', '-translate-y-2');
      box.classList.add('opacity-100', 'translate-y-0');
      clearTimeout(box._timer);
      box._timer = setTimeout(() => {
        box.classList.add('opacity-0', '-translate-y-2');
        box.classList.remove('opacity-100', 'translate-y-0');
      }, 2400);
    }

    function openModal(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('active');

      if (id === 'tribute-modal') {
        document.getElementById('inputTributeNote').value = world.tributeNote;
      }
    }

    function closeModal(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.remove('active');
    }

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(btn.getAttribute('data-close-modal')));
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
      } else if (e.key === 'f' || e.key === 'F') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          world.feedBowl();
        }
      } else if (e.key === 'p' || e.key === 'P') {
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          const cat = world.cats[0];
          if (cat) world.petCat(cat);
        }
      } else if (e.key === 'w' || e.key === 'W') {
        world.cycleWeather();
      }
    });

    function renderFriendsList() {
      const list = document.getElementById('residentList');
      if (!list) return;
      list.innerHTML = '';

      world.cats.forEach(cat => {
        const badge = document.createElement('div');
        badge.className = 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#f3dfc1] border border-[#b88b5a] text-[#3d2516] shadow-sm';

        const dot = document.createElement('span');
        dot.className = 'w-3 h-3 rounded-full border border-black/30';
        dot.style.backgroundColor = cat.coatColor;
        badge.appendChild(dot);

        const nameLabel = document.createElement('span');
        nameLabel.textContent = cat.isDefault ? `★ ${cat.name}` : cat.name;
        badge.appendChild(nameLabel);

        const petBtn = document.createElement('button');
        petBtn.className = 'ml-1 px-2.5 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] font-bold hover:bg-rose-300 cursor-pointer';
        petBtn.textContent = '♥ Pet';
        petBtn.addEventListener('click', () => {
          world.petCat(cat);
          showToast(`Gave warm chin scratches to ${cat.name}! ♥`, '♥');
        });
        badge.appendChild(petBtn);

        if (!cat.isDefault) {
          const delBtn = document.createElement('button');
          delBtn.className = 'ml-1 text-stone-500 hover:text-rose-700 font-bold cursor-pointer text-xs';
          delBtn.textContent = '✕';
          delBtn.title = `Remove ${cat.name}`;
          delBtn.addEventListener('click', () => {
            world.cats = world.cats.filter(c => c.id !== cat.id);
            world.save();
            showToast(`${cat.name} headed home for a peaceful nap.`, '🐾');
          });
          badge.appendChild(delBtn);
        }

        list.appendChild(badge);
      });
    }

    function initCustomizerUI() {
      const coatContainer = document.getElementById('coatColorSelector');
      COAT_SWATCHES.forEach((sw, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `w-7 h-7 rounded-lg border-2 transition transform hover:scale-105 cursor-pointer ${
          i === 0 ? 'border-[#3d2516] ring-2 ring-amber-500' : 'border-[#b88b5a]'
        }`;
        btn.style.backgroundColor = sw.hex;
        btn.title = sw.name;
        btn.addEventListener('click', () => {
          customizerState.coatColor = sw.hex;
          customizerState.shadeColor = sw.shade;
          Array.from(coatContainer.children).forEach(c => c.className = 'w-7 h-7 rounded-lg border-2 border-[#b88b5a] transition transform hover:scale-105 cursor-pointer');
          btn.className = 'w-7 h-7 rounded-lg border-2 border-[#3d2516] ring-2 ring-amber-500 transition transform scale-105 cursor-pointer';
        });
        coatContainer.appendChild(btn);
      });

      const eyeContainer = document.getElementById('eyeColorSelector');
      EYE_SWATCHES.forEach((sw, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `px-2 py-1 rounded-lg border-2 text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer ${
          i === 0 ? 'border-[#3d2516] bg-[#f3dfc1]' : 'border-[#c8ab89] bg-[#fff9ea]'
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
          Array.from(eyeContainer.children).forEach(c => {
            c.className = 'px-2 py-1 rounded-lg border-2 border-[#c8ab89] bg-[#fff9ea] text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer';
          });
          btn.className = 'px-2 py-1 rounded-lg border-2 border-[#3d2516] bg-[#f3dfc1] text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer';
        });
        eyeContainer.appendChild(btn);
      });

      document.querySelectorAll('.pattern-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          customizerState.pattern = btn.getAttribute('data-pattern');
          document.querySelectorAll('.pattern-opt').forEach(b => {
            b.className = 'pattern-opt rounded-lg border-2 border-[#c8ab89] bg-[#fff9ea] py-1.5 px-2 font-semibold text-[#5c3820] text-center cursor-pointer';
          });
          btn.className = 'pattern-opt rounded-lg border-2 border-[#5c3820] bg-[#f3dfc1] py-1.5 px-2 font-bold text-[#3d2516] text-center cursor-pointer';
        });
      });

      const nameInput = document.getElementById('inputCatName');
      nameInput.addEventListener('input', () => {
        customizerState.name = nameInput.value.trim() || 'Mochi';
        document.getElementById('previewCatTitle').textContent = customizerState.name;
      });
    }

    const previewCanvas = document.getElementById('previewCatCanvas');
    const previewCtx = previewCanvas.getContext('2d');

    function renderMiniCanvases(time) {
      if (document.getElementById('modalFriends').classList.contains('active')) {
        previewCtx.clearRect(0, 0, 64, 48);
        previewCtx.fillStyle = '#3f7d3b';
        previewCtx.fillRect(0, 32, 64, 16);
        drawPixelCat(previewCtx, {
          ...customizerState,
          x: 32, y: 36,
          facing: 1, state: 'WANDER', pose: 'sit', seed: 1, labelAlpha: 0
        }, time);
      }
    }

    /********************************************************************
     * BUTTON BINDINGS & ENTRY
     ********************************************************************/
    document.getElementById('btnEnterGarden').addEventListener('click', () => {
      sound.init();
      sound.playPurr();
      const intro = document.getElementById('intro-overlay');
      intro.classList.add('hidden-intro');
    });

    document.getElementById('btnFeed').addEventListener('click', () => world.feedBowl());
    document.getElementById('btnOpenFriends').addEventListener('click', () => openModal('modalFriends'));
    document.getElementById('btnWeather').addEventListener('click', () => world.cycleWeather());

    document.getElementById('btnAudio').addEventListener('click', () => {
      sound.enabled = !sound.enabled;
      document.getElementById('audioIcon').textContent = sound.enabled ? '🔊' : '🔇';
      showToast(sound.enabled ? 'Cozy audio enabled' : 'Cozy audio muted', sound.enabled ? '🔊' : '🔇');
    });

    document.getElementById('btnConfirmAddCat').addEventListener('click', () => {
      const name = (document.getElementById('inputCatName').value || 'Mochi').trim().slice(0, 16);
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
      sound.playPurr();
      world.save();
      closeModal('modalFriends');
      showToast(`${name} joined Lilo and Cheeto! 🐾`, '🐾');
    });

    
      // PWA Install Button
      const installBtn = document.getElementById('btnInstallPwa');
      if (installBtn) {
        installBtn.addEventListener('click', async () => {
          if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            const { outcome } = await deferredInstallPrompt.userChoice;
            if (outcome === 'accepted') {
              showToast("Lilo's Garden added to Home Screen! 📲", '📲');
            }
            deferredInstallPrompt = null;
          } else {
            showToast('On Safari/Chrome tap "Add to Home Screen" 📲', '📲');
          }
        });
      }

    document.getElementById('btnSaveTributeNote').addEventListener('click', () => {
      const note = document.getElementById('inputTributeNote').value.trim();
      if (note) {
        world.tributeNote = note;
        world.save();
        showToast("Lilo & Cheeto's tribute note saved ♥", '💠');
      }
    });

    document.getElementById('btnPetLiloNow').addEventListener('click', () => {
      world.cats.slice(0, 2).forEach(c => world.petCat(c));
      closeModal('tribute-modal');
      showToast('Sent warm chin scratches to Lilo and Cheeto ♥', '💠');
    });

    /********************************************************************
     * MAIN GAME LOOP & INITIALIZATION
     ********************************************************************/
    let lastTimestamp = 0;

    function gameLoop(timestamp) {
      if (!lastTimestamp) lastTimestamp = timestamp;
      const dt = Math.min(0.1, (timestamp - lastTimestamp) / 1000);
      lastTimestamp = timestamp;
      const elapsedSeconds = timestamp / 1000;

      world.update(dt, elapsedSeconds);
      renderGarden(elapsedSeconds);
      renderMiniCanvases(elapsedSeconds);

      requestAnimationFrame(gameLoop);
    }

    window.addEventListener('resize', resizeGardenViewport);
    window.addEventListener('orientationchange', resizeGardenViewport);

    window.onload = function () {
      initCustomizerUI();
      world.init();
      resizeGardenViewport();
      renderIntroCanvas();

      // Initialize Twin Polaroid Photo Frames with 3-Tier Fallback
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
    };
