# 🐾 Lilo's Garden — Reunited with Cheeto

A single-file HTML5 Canvas, CSS3, and Vanilla JavaScript cozy virtual pet garden sandbox tribute inspired by a minimalist Stardew Valley aesthetic, honoring **Lilo the pure white cat** and **Cheeto the orange tabby**.

Hosted for free on **GitHub Pages** with zero external runtime dependencies, keyless live local weather, and client-side `localStorage` persistence.

---

## ✨ Features & Polish

### 1. Twin Polaroid Tribute Frame System (Lilo & Cheeto)
- **Side-by-Side Cozy Polaroid Frames**:
  - **Lilo's Polaroid**: Tilted `-2.5°`, titled `"Lilo 💙"`, captioned `"Blue Eyes & Blue Collar"`.
  - **Cheeto's Polaroid**: Tilted `+2.5°`, titled `"Cheeto 💙💛"`, captioned `"Blue & Amber Eyes"`.
- **3-Tier Image Fallback & Uploader System**:
  - **Priority 1**: Checks `localStorage` for a user-uploaded photo (`liloPhotoData` / `cheetoPhotoData`).
  - **Priority 2**: Attempts to load local project assets (`./assets/lilo.jpg` and `./assets/cheeto.jpg`).
  - **Priority 3 (`onerror` fallback)**: Procedural crisp `64x64` `<canvas>` pixel-art portrait of Lilo (starry blue night) or Cheeto (warm golden sunset) so there is **never a broken image icon**.
  - **Custom Photo Upload**: Tapping either Polaroid opens the image picker, performs a center-square crop downscaled to `260x260` (`image/jpeg`, `0.82` quality), and saves directly to `localStorage`.

---

### 2. Full Mobile Responsiveness (Portrait & Landscape Smartphones)
- **Adaptive World Camera & Dynamic Aspect Ratio**:
  - Automatically adapts to viewports via `resizeGardenViewport()`.
  - On phones (`< 820px`), the garden canvas dynamically expands to `100vw x 100dvh` with **zero black bars or letterboxing**.
  - Internal camera stays anchored around World Center `(480, 320)`, keeping all landmarks (`Memorial Stone`, `Food Bowl`, `Picnic Blanket`, `Covered Gazebo Shelter`, and cat wander boundaries) within comfortable view in both portrait and landscape orientations.
- **Touch Ergonomics**:
  - `touch-action: none` prevents accidental page scroll or double-tap zoom while petting cats.
  - Interactive touch hit radii (cats, bowl, memorial stone) expand by `1.45x` on mobile touch events (`e.pointerType === 'touch'`).
- **Safe-Area HUD & Mobile Bottom Sheets**:
  - Top `#whisper-pill` and bottom `#cozy-dock` honor notch and home-indicator safe zones (`env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`).
  - On screens narrower than `640px`, modals morph into fluid bottom sheets with smooth momentum touch scrolling and slide-up animations.

---

### 3. Decluttered "Warm Frosted Parchment" UI
- **Zero Technical/Debug Clutter**: All debug HUD buttons have been removed in favor of organic, immersive UI.
- **Top-Left Floating Whisper Pill** (`backdrop-filter: blur(14px)`, `rounded-full`):
  - **Live Weather Badge**: Shows icon + temperature + sky state (e.g., `☀️ 24°C • Sunny Sky`). Tapping cycles between:
    - `AUTO (Live Open-Meteo GPS)`
    - `SUNNY`
    - `CLOUDY`
    - `RAIN`
    - `NIGHT`
  - **Live Mood Indicator**: Displays real-time activities of garden residents.
  - **Forget-Me-Not Bloom Counter**: `💠 8/24` (a new blue flower blooms around the Memorial Stone every 3 pets).
  - **Compact Audio Toggle**: `🔊` / `🔇` button.
- **Bottom Floating 2-Button Cozy Dock**:
  - `🥣 Fill Bowl`: Refills the ceramic garden bowl with kibble and displays the live food level badge (`Full`, `Half`, `Low`, `Empty`).
  - `🐾 Cat Friends`: Opens the warm frosted parchment modal to pet/manage existing cats or customize a new companion cat.
- **Diegetic World Interactions**:
  - **Tapping the Memorial Stone** opens the Twin Polaroid Tribute Modal.
  - **Tapping the Ceramic Food Bowl** refills it directly.
  - **Tapping Open Grass** calls Lilo or Cheeto over.

---

### 4. Keyless Live Local Weather (Open-Meteo + Browser Geolocation)
- Queries the free, keyless Open-Meteo API:
  ```
  https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day
  ```
- Intelligently maps WMO weather codes and day/night flags to `SUNNY`, `CLOUDY`, `RAIN`, and `NIGHT`.
- Automatic clock fallback (`new Date().getHours()`) if geolocation is unavailable or denied.

---

### 5. Weather-Reactive Garden & Covered Gazebo Shelter
- **Covered Wooden Cat Shelter (Gazebo)**:
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

### 6. Forget-Me-Not Memorial Garden
- Surrounding the Memorial Stone are 24 deterministic concentric floral positions.
- Every 3 pets given to any cat, a radiant blue forget-me-not flower blooms around the memorial (up to 24 flowers), persistent in `localStorage`.

---

## 🎮 Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| **Pet Cat / Lilo / Cheeto** | Tap/Click any cat or use the Cat Friends modal, or press <kbd>P</kbd> |
| **Fill Bowl** | Tap the bowl or click **"Fill Bowl"**, or press <kbd>F</kbd> |
| **Twin Polaroid Tribute** | Tap the Memorial Stone |
| **Call Cat Over** | Click/Tap any open patch of grass to guide cats |
| **Cycle Weather Mode** | Click the Weather Badge or press <kbd>W</kbd> |
| **Toggle Sound** | Click the 🔊 / 🔇 button |
| **Dismiss Modals** | Press <kbd>Esc</kbd> or click the backdrop |

---

## 🚀 Free Hosting on GitHub Pages

1. Push or upload [`index.html`](file:///c:/xampp/htdocs/lilosgarden/index.html), [`favicon.png`](file:///c:/xampp/htdocs/lilosgarden/favicon.png), and [`README.md`](file:///c:/xampp/htdocs/lilosgarden/README.md) to your GitHub repository `main` (or `master`) branch.
2. In your repository on GitHub, open **Settings** → **Pages** (under "Code and automation").
3. Under **Build and deployment** → **Source**, select **"Deploy from a branch"**.
4. Set the branch to `main` (or `master`) and directory to `/ (root)`, then click **Save**.
5. Your live cozy sandbox will be available at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```
