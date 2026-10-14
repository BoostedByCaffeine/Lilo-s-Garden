# 🐾 Lilo's Garden — Cozy Pixel Virtual Pet Sandbox

A single-file HTML5 Canvas, CSS3, and Vanilla JavaScript cozy virtual pet garden sandbox inspired by a minimalist Stardew Valley aesthetic, dedicated in loving memory of **Lilo the pure white cat**.

Hosted for free on **GitHub Pages** with zero external runtime dependencies, keyless live local weather, and client-side `localStorage` persistence.

---

## ✨ Modernized Features & Polish

### 1. Decluttered "Warm Frosted Parchment" UI
- **Zero Technical/Debug Clutter**: All debug HUD buttons (Agent Prompt, JSON Save/Export, and top Tribute button) have been removed in favor of organic, immersive UI.
- **Top-Left Floating Whisper Pill** (`backdrop-filter: blur(14px)`, `rounded-full`):
  - **Live Weather Badge**: Shows icon + temperature + sky state (e.g., `☀️ 24°C • Sunny Sky (Live)`). Tapping cycles between:
    - `AUTO (Live Open-Meteo GPS)`
    - `SUNNY`
    - `CLOUDY`
    - `RAIN`
    - `NIGHT`
  - **Lilo Live Mood Indicator**: Displays Lilo's real-time activities:
    - *Lilo: Cozy under gazebo porch 🏡*
    - *Lilo: Trotting to dry shelter 🌧️*
    - *Lilo: Munching tasty kibble 🐟*
    - *Lilo: Napping peacefully 💤*
    - *Lilo: Pouncing at butterflies ♪*
    - *Lilo: Purring happily with love ♥*
  - **Forget-Me-Not Bloom Counter**: `💠 8/24` (a new blue flower blooms around Lilo's Memorial Stone every 3 pets).
  - **Compact Audio Toggle**: `🔊` / `🔇` button.
- **Bottom Floating 2-Button Cozy Dock**:
  - `🥣 Fill Bowl`: Refills the ceramic garden bowl with kibble and displays the live food level badge (`Full`, `Half`, `Low`, `Empty`).
  - `🐾 Cat Friends`: Opens the warm frosted parchment modal to pet/manage existing cats or customize a new companion cat.
- **Diegetic World Interactions**:
  - **Tapping Lilo's Memorial Stone** at `(74, 72)` opens Lilo's Tribute Card modal.
  - **Tapping the Ceramic Food Bowl** at `(180, 150)` refills it directly.

---

### 2. Keyless Live Local Weather (Open-Meteo + Browser Geolocation)
- Queries the free, keyless Open-Meteo API:
  ```
  https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day
  ```
- Intelligently maps WMO weather codes and day/night flags to `SUNNY`, `CLOUDY`, `RAIN`, and `NIGHT`.
- Automatic clock fallback (`new Date().getHours()`) if geolocation is unavailable or denied.

---

### 3. Weather-Reactive Garden & Covered Gazebo Shelter
- **Covered Wooden Cat Shelter (Gazebo)** at `(282, 78)`:
  - Cedar plank decking with rich berry velvet cushion (`#9f1239`).
  - Warm hanging lantern with soft ambient radial glow.
  - Cedar shingle roof depth-sorted overhead so cats comfortably sit and nap underneath it.
- **Weather-Reactive FSM States**:
  - `SEEK_SHELTER`: Triggered when weather is `RAIN`; cats trot to the gazebo to stay dry.
  - `SHELTERED`: Cats curl up on the berry cushion or sit peacefully out of the rain.
  - `PLAYFUL`: Cats react to nearby daytime butterflies or nighttime fireflies with a cute hop/pounce and a floating musical note `♪` emote.
- **Authentic Synthesized Audio (`CozyAudio`)**:
  - Deep carrier + LFO modulated cat purr rumble.
  - Soothing ambient rain sound generated via filtered pink noise with smooth fade-in/fade-out transitions.
  - Ascending chime melodies when refilling the food bowl.

---

### 4. Forget-Me-Not Memorial Garden
- Surrounding Lilo's Memorial Stone at `(74, 72)` are 24 deterministic concentric floral positions.
- Every 3 pets given to any cat, a radiant blue forget-me-not flower blooms around Lilo's memorial (up to 24 flowers), persistent in `localStorage`.

---

## 🎮 Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| **Pet Cat / Lilo** | Tap/Click any cat or use the Cat Friends modal, or press <kbd>P</kbd> |
| **Fill Bowl** | Tap the bowl at `(180, 150)` or click **"Fill Bowl"**, or press <kbd>F</kbd> |
| **Lilo's Tribute Card** | Tap Lilo's Memorial Stone at `(74, 72)` |
| **Call Lilo Over** | Click/Tap any open patch of grass to guide Lilo |
| **Cycle Weather Mode** | Click the Weather Badge or press <kbd>W</kbd> |
| **Toggle Sound** | Click the 🔊 / 🔇 button |
| **Dismiss Modals** | Press <kbd>Esc</kbd> or click the backdrop |

---

## 🚀 Free Hosting on GitHub Pages

1. Push or upload [`index.html`](file:///c:/xampp/htdocs/lilosgarden/index.html), [`favicon.png`](file:///c:/xampp/htdocs/lilosgarden/favicon.png), and [`README.md`](file:///c:/xampp/htdocs/lilosgarden/README.md) to your GitHub repository `main` branch.
2. In your repository on GitHub, open **Settings** → **Pages** (under "Code and automation").
3. Under **Build and deployment** → **Source**, select **"Deploy from a branch"**.
4. Set the branch to `main` (or `master`) and directory to `/ (root)`, then click **Save**.
5. Your live cozy sandbox will be available at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```
