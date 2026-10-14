# 🐾 Lilo's Garden — Cozy Pixel Virtual Pet Sandbox

A single-file HTML5 Canvas, CSS, and Vanilla JavaScript cozy virtual pet garden sandbox inspired by a minimalist Stardew Valley aesthetic, dedicated in loving memory of **Lilo the pure white cat**.

Hosted 100% for free on **GitHub Pages** with zero external runtime dependencies, full offline capability, and client-side `localStorage` persistence.

---

## ✨ Features

- **Crisp Pixel Art Canvas (360 x 220)**: Low-resolution internal rendering scaled crisply with CSS `image-rendering: pixelated`.
- **Procedural Pixel Sprite Matrix**: Directional flipping, 4-frame walk cycle, animated tail wag, blinking idle, curled sleeping posture with floating "z" bubbles, head-down eating animation, and rosy blush cheeks when petted.
- **Default Immutable Pet ("Lilo")**:
  - Pure white coat (`#ffffff`), soft shading (`#dbe7f5`), bright blue eyes (`#29b6f6`), pink ears/nose (`#ff9ebb`), and sky-blue collar with tiny gold bell.
  - Permanently present at index 0 of the garden roster and cannot be deleted.
- **Interactive Garden Landmarks**:
  - **Lilo's Memorial Tribute Stone** at `(74, 66)` with glowing cat paw emblem, moss garland, forget-me-not blue flowers, and a fluttering blue butterfly.
  - **Sunny Nap Blanket** at `(274, 120)`: Warm checkered picnic quilt with tassels where cats love curling up to sleep.
  - **Interactive Food Bowl** at `(185, 146)`: Visual kibble levels (Empty, Low, Half, Full) with sound effects and trot-to-eat AI.
  - **Stone Birdbath / Pond** at `(72, 158)`: Clear blue water with animated ripples and a pink lotus on a lily pad.
- **Atmosphere Lighting**: Cycle through **☀️ Sunny Day** (floating pollen/dandelion seeds), **🌅 Golden Sunset** (warm amber wash), and **✨ Firefly Night** (glowing animated fireflies).
- **Cat Friends Customizer**:
  - Live animated pixel preview.
  - Custom name (up to 16 characters).
  - Patterns: Solid, Tuxedo (white bib & paws), Tabby (stripes), Patches (calico).
  - Fur color and eye color palettes.
  - Resident manager to manage companions while keeping Lilo safe.
- **Synthesized Web Audio Engine**: Zero external audio files required! Clean Web Audio oscillators synthesize purr chimes, feed chimes, munch pops, and gentle harmonic tones.
- **Persistence & Portability**: Automatically auto-saves to `localStorage` under `lilos_garden_save_v1`. Export, copy, download `.json`, or import backup saves seamlessly across devices.

---

## 🎮 Controls & Shortcuts

| Action | Control |
| :--- | :--- |
| **Pet Cat / Lilo** | Tap/Click any cat or click their name pill in the bottom bar, or press <kbd>P</kbd> |
| **Feed Bowl** | Tap/Click the food bowl or click **"Feed Bowl"**, or press <kbd>F</kbd> |
| **Lilo's Tribute** | Tap/Click the Memorial Stone with blue flowers or click **"Lilo's Tribute"** |
| **Call Lilo Over** | Click/Tap any open patch of grass to gently guide Lilo to that spot |
| **Cycle Lighting** | Click the atmosphere button (☀️ / 🌅 / 🌙) or the atmosphere badge |
| **Toggle Audio** | Click the 🔊 / 🔇 sound button |
| **Close Modals** | Click ✕, click outside on the backdrop, or press <kbd>Esc</kbd> |

---

## 🚀 Free Hosting on GitHub Pages (Step-by-Step)

1. Create a new repository on GitHub (e.g., `lilos-garden`).
2. Push or upload `index.html` (and optionally `README.md`) to the `main` branch.
3. In your GitHub repository, navigate to **Settings** → **Pages** (under "Code and automation").
4. Under **Build and deployment** → **Source**, select **"Deploy from a branch"**.
5. Under **Branch**, select `main` and folder `/ (root)`, then click **Save**.
6. Within 1–2 minutes, your cozy garden will be live at:
   ```
   https://<your-username>.github.io/lilos-garden/
   ```

---

## 📂 File Architecture

- [`index.html`](file:///c:/xampp/htdocs/lilosgarden/index.html): Standalone, zero-dependency entry point for GitHub Pages.
- [`lilo_s_garden_cozy_pixel_sandbox.html`](file:///c:/xampp/htdocs/lilosgarden/lilo_s_garden_cozy_pixel_sandbox.html): Direct mirror file incorporating identical Vanilla CSS design system and engine.
