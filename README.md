# 🐾 Lilo's Garden — Reunited with Cheeto

A single-file HTML5 Canvas, CSS3, and Vanilla JavaScript cozy virtual pet garden sandbox tribute inspired by a minimalist Stardew Valley aesthetic, honoring **Lilo the pure white cat** and **Cheeto the orange tabby**.

Hosted for free on **GitHub Pages** with zero external runtime dependencies, 3-tier live local weather, client-side `localStorage` persistence, PWA offline installability, **Cozy Cottage Interior**, **8-Bit Customizable Caretaker**, and **5 Authentic Android Home Screen Widgets**.

---

## ✨ Features & Polish

### 1. Solid Pixel Typography & Authentic Stardew Styling
- **Global Solid Pixel Font**:
  - Imported solid pixel font (`Stardew_Valley.ttf` & `.otf`) applied uniformly across the web application and all 5 Android home screen widgets.
  - Specially tuned typography sizes across the HUD, dialogue badges, and polaroid tribute frames for razor-sharp readability on all screen densities.
- **PWA v11 Offline Cache**:
  - Service worker precaching updated to `'lilos-garden-pwa-v11'` bundling all core assets, solid typography, floating dining table Eat button, and individual interior furniture sprites (`assets/interior/Individual/*.png`) for instant offline playability.
- **60 FPS Offscreen Canvas Caching**:
  - Pre-renders static scenes (`ensureGardenStaticCache`, `ensureCottageStaticCache`) and dynamic lighting glow sprites (`getFireGlowSprite`, `getLanternGlowSprite`) into offscreen canvases, minimizing draw calls and guaranteeing locked 60 FPS performance on mobile devices.
  - Dirty-checks DOM ticker text updates to completely prevent layout thrashing and reflows.

---

### 2. 8-Bit Customizable Caretaker Character
- **Living Pixel Caretaker**:
  - A customizable 8-bit character (rendered at proportional `1.35x` scale) living alongside Lilo and Cheeto in both the Garden and Cottage.
  - Interactive cuddles: Tapping the Caretaker in the scene calls the cats over for cuddles and purrs.
  - **Bed Sleep & Morning Wake**: Tapping the double bed tucks the Caretaker into bed (`SLEEPING_BED`) with warm yellow quilt and floating sleep Z's. Hidden when viewing the outdoor Garden, and automatically wakes up in the morning (at daybreak or when the clock reaches 6 AM).
  - **Couch Nap**: Tapping the right-wall sofa curls the Caretaker up for a cozy couch nap (`NAPPING_COUCH`).
  - **Dining Table Meal**: Tapping the dining table reveals a floating **"Eat"** button; clicking it seats the Caretaker at the table's front chair with a warm plate of food and eating animation.
  - **Rain Reaction & Umbrella**: In rainy weather outdoors, the Caretaker holds a pixel umbrella while walking and seeks refuge under the covered campfire mini-porch roof.
  - **Study Desk Sitting**: Caretaker sits directly on the front-facing chair (`intChairTop`) when reading or coding at the study desk.
  - Cozy animated activities:
    - **Reading**: Holding a cozy red storybook while seated at the desk or rug.
    - **Coffee**: Sipping a warm steaming ceramic mug under the porch or indoors.
    - **Coding**: Typing on a miniature pixel laptop at the study desk.
    - **Auto**: Autonomously wanders between room zones, seeking shelter when it rains and sleeping when bedtime arrives.
- **In-Depth Caretaker Customizer (`#modalCaretaker`)**:
  - Accessible via the **"Me"** button on the bottom dock.
  - Real-time animated 8-bit preview canvas with background matching the current scene.
  - Customizable Name, Skin Tones (6 shades), Hairstyles (Short, Long, Spiky, Cozy Bun), Hair Colors (6 swatches), Outfit/Hoodie Colors (8 palette styles), and Accessories (Glasses, Cat Ears, Sun Hat, or None).
  - Saved directly to `localStorage` and serialized with garden data.

---

### 3. Authentic Procedural Pixel Art Cats
- **Signature Resident Brothers**:
  - **Lilo**: Pure white coat, twin sky-blue eyes (`#29b6f6`), pink nose, signature royal blue collar (`#1e88e5`), and golden bell (`#fde047`).
  - **Cheeto**: Warm white coat, signature heterochromia eyes (left sky-blue `#29b6f6`, right amber `#ffb300`), pink nose.
- **Living Pixel Animation Engine**:
  - **Curled Loaf Sleep**: Subtle breathing belly expansion (`sin` cycle), relaxed ears, and closed eyes.
  - **4-Step Walk Cycle**: Animated alternating leg strides, bouncing head, and swaying tail.
  - **Happy Petting (`INTERACT`)**: Closed bliss eyes, happy wagging tail, and rosy blushing cheeks (`#fda4af`).
  - **Playful Pounce (`PLAYFUL`)**: Excited hops with fast tail wagging in response to butterflies or fireflies.
  - **Eating & Drinking**: Head-dipping animation while dining at the ceramic bowl or pond.
- **Companion Cat Customizer**:
  - Create and name new cat friends with custom coat colors, shade tones, eye colors, and fur patterns (**Solid**, **Tabby**, **Tuxedo**, and **Patches**).
  - Floating status name tags with signature blue highlights for the original brothers.

---

### 4. Vibrant Tileset & Living Garden Environment
- **Vibrant Meadow Lawn**:
  - Seamlessly tiled garden ground rendered with crisp `32x32` tiles (`FieldsTile_38.png`) in a rich, warm meadow green (`#a6b04f`).
- **Cozy Shade Tree**:
  - Exactly one cozy pixel tree (`Tree1.png`) rooted inside the western lawn with a gentle ground shadow.
  - Integrated into the depth-sorted renderables pipeline so cats naturally walk behind the canopy or in front of the trunk.
- **Tucked Fence Bushes & Garden Accents**:
  - Shrubbery nestled neatly along the top wooden fence line (`FENCE_BUSHES`).
  - Tastefully scattered accent bushes (`GARDEN_BUSHES`) enhancing the gazebo, birdbath pond, and campfire nooks without cluttering the perimeter.
- **Interactive Scenery Elements**:
  - **Smooth Stepping Stone Path**: Dual-tone slate pavers leading from the top gate to the memorial shrine and central lawn.
  - **Birdbath Pond**: Tiered stone basin with animated water ripples and corner accent rocks (`stone7`, `stone8`).
  - **Sunny Nap Rug**: Cheerful yellow checkered picnic blanket (`LANDMARKS.rug`) where the cats love to curl up together.
  - **Shrine Lantern**: Cozy iron post lantern casting soft light over the memorial stone.
  - **Swaying Grass & Flowers**: Deterministically generated grass tufts and multicolored wildflowers that gently sway and bob in the breeze.

---

### 5. Cozy Cottage Top-Down Roguelike Room Island
- **Roguelike Room Island Architecture**:
  - Rendered as an authentic top-down pixel-art room island enveloped by a dark void (`#1d1a1f`), featuring a bottom-center entrance alcove (`hallX = 436..524, y = 414..458`) with dithered shadow threshold fade.
  - Vertical wooden plank floor (`#9a5025`) with staggered authentic joint notches and dithered diamond wallpaper trim.
- **Individual Furniture Sprites (`assets/interior/Individual/`)**:
  - Auto-trimmed pixel-perfect furniture loader (`getTrimmedSprite`, `drawIndividualFurniture`) rendering standalone furniture assets at 1.35x scale.
  - Layout matches `preview_room.png` customized with **only 1 bed (`DoubleBed.png` + 1 `carpet.png`)**:
    - **Top-Left**: Carved Wardrobe (`wardrobe.png`).
    - **Bedroom Nook**: Single Double Bed (`DoubleBed.png`) centered over ornate crimson carpet (`carpet.png`), flanked by Nightstand (`Bedside Table.png`) with animated glowing night lamp (`Lamp.png` / `Lampoff.png`).
    - **Memorial Tribute Nook**: Bookcase (`bookcase.png`) and Stack of Books (`Book.png`) serving as the indoor memorial tribute album for Lilo & Cheeto.
    - **Study Nook**: Wooden Study Desk (`Table.png`) with potted mini succulent (`minidecoflower.png`) and back-wall window.
    - **Dining Set**: Large Wooden Dining Table (`tablebig.png`) with 4-way chairs (`ChairF.png`, `Chair1side.png`, `Chair2side.png`, `ChairBside.png`).
    - **Living Lounge**: Cream Sofa (`sofa 1side.png` / `sofa 2side.png`) and tall flower vase (`vaseflower.png`).
    - **Entrance & Storage**: Coat stand (`coat stand.png`) by the entrance hallway, and rustic wooden chest (`Box.png`) & barrel (`Box2.png`).
- **Depth-Sorted Living Scene, Obstacle Collisions & Exclusive Cat Bowls**:
  - All room furniture depth-sorts dynamically alongside the Caretaker, Lilo, and Cheeto so characters seamlessly walk in front of and behind objects.
  - **Furniture Obstacle Collision Avoidance (`COTTAGE_OBSTACLES`)**: Prevents characters from clipping or stepping on furniture.
  - **Dynamic Exclusive Cat Bowls**: Each cat has its own dedicated, color-coded ceramic bowl in both the Garden and Cottage; cats walk exclusively to their assigned bowl to dine.
  - **Dining Table Set & Floating "Eat" Button**: Front-facing dining chair renders behind Caretaker while the table renders in front with a warm dinner plate. Tapping the table pops up the floating **"Eat"** button.
  - **Sofa Depth-Sorting**: Depth-sorted at `y = 296` so cats and Caretaker lounging or napping on the cream sofa always overlay the cushion naturally.
  - Indoor wandering constrained strictly to walkable floor areas (`isCottagePointWalkable`), with indoor bowl feeding and bedside carpet napping.
- **Seamless Navigation**: Tap the bottom entrance hallway (or the bottom dock's **Cottage** button) to step smoothly between indoor and outdoor sanctuaries.

---

### 6. Cozy Animated Bonfire, Covered Campfire Porch & Camp Nook
- **Covered Campfire Porch**:
  - A cozy hand-carved wooden mini-porch deck and overhead cedar roof sheltering the campfire log (`LANDMARKS.porch`).
  - In rainy weather, the Caretaker shelters under the porch roof while sipping coffee.
- **Weather-Reactive Campfire**:
  - **Sunny & Fair Weather**: Smooth 6-frame active burning flames strip (`campfireActive`) with an animated radial flickering warmth glow (`rgba(251, 146, 60, ...)`).
  - **Rainy Weather**: Automatically switches to the 6-frame extinguished smoldering smoke strip (`campfireSmoke`).
- **Fallen Camp Log**: Hand-carved wooden seating log (`log1`) nestled right beside the fire pit under the porch roof.

---

### 7. Twin Polaroid Tribute Frame System
- **Side-by-Side Cozy Polaroid Frames**:
  - **Lilo's Polaroid**: Tilted `-2.5°`, titled `"Lilo 💙"`, captioned `"Blue Eyes & Blue Collar"`.
  - **Cheeto's Polaroid**: Tilted `+2.5°`, titled `"Cheeto 💙💛"`, captioned `"Blue & Amber Eyes"`.
- **3-Tier Image Fallback & Uploader System**:
  - **Priority 1**: Checks `localStorage` for user-uploaded custom photos (`liloPhotoData` / `cheetoPhotoData`).
  - **Priority 2**: Attempts to load local project assets (`./assets/lilo.jpg` and `./assets/cheeto.jpg`).
  - **Priority 3 (`onerror` fallback)**: Procedural crisp `64x64` `<canvas>` pixel-art portrait of Lilo (starry blue night) or Cheeto (warm golden sunset) ensuring **never a broken image icon**.
- **Custom Photo Upload**: Tapping either Polaroid opens the image picker, performs a center-square crop downscaled to `260x260` (`image/jpeg`, `0.82` quality), and saves directly to `localStorage`.

---

### 8. 3-Tier Live Weather & Covered Gazebo Shelter
- **3-Tier Live Weather Integration (Fast GPS -> Cached Coords -> Keyless IP Geolocation)**:
  - **Tier 1 (High-Accuracy GPS)**: Fast network geolocation with cached hardware positions.
  - **Tier 2 (Cached Local Coordinates)**: Instant startup restore from persistent cache avoiding network delays.
  - **Tier 3 (Keyless IP Geolocation Fallback)**: Multi-provider IP lookups (`geojs.io` and `ipwho.is`) with automatic fallback to Open-Meteo.
  - Real-time Open-Meteo conditions:
    ```
    https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day,precipitation,rain,showers,cloud_cover&timezone=auto
    ```
  - Maps WMO codes to `SUNNY`, `CLOUDY`, `RAIN`, and `NIGHT` while preserving real local temperatures.
- **Covered Wooden Gazebo Shelter**:
  - Cedar plank decking with rich berry velvet cushion (`#9f1239`) and hanging overhead lantern.
  - Overhead cedar shingle roof depth-sorted so cats shelter comfortably out of the rain.
- **Weather-Reactive FSM States**:
  - `SEEK_SHELTER` & `SHELTERED`: During rain, cats seek refuge beneath the gazebo roof.
  - `PLAYFUL`: React to daytime fluttering butterflies or nighttime glowing fireflies with pounces and music note emotes.

---

### 9. 5 Android Home Screen Widgets & 2-Layer Compositor Engine
All widgets are powered by an animation engine with a **2-Layer Compositor Architecture**:
- **Layer 1 (Underneath)**: A pixel-art `ViewFlipper` loop running `RGB_565` bitmaps for high performance and minimal memory footprint.
- **Layer 2 (On Top)**: A single high-res `ARGB_8888` `ImageView` HUD overlay with solid `Stardew_Valley.ttf` typography. Clock and minute ticks update **only** the HUD overlay via `partiallyUpdateAppWidget`, resulting in zero flicker and never interrupting the animation loop.
- **Background Weather Sync (`WeatherSyncHelper.kt`)**: Automatically synchronizes local weather every 15+ minutes in the background and refreshes all active widgets.

#### The 5 Home Screen Widgets:
1. **Window Widget (`LiloWindowWidgetProvider.kt`)**:
   - Carved wooden window frame looking out onto the garden with dynamic sky backdrops (Day, Sunset, Starry Night, Rain, Clouds).
   - **Peeking Cat in Bottom-Left Corner** (`cx = 42` at `2.0f` scale) with a 4-stage 16-second routine:
     - *Stage 1 (Frames 0–19)*: Curious looks left and right with ear twitches.
     - *Stage 2 (Frames 20–35)*: Paw-lick grooming animation and blushing cheeks.
     - *Stage 3 (Frames 36–51)*: Excited bobbing watching butterflies or fireflies with a floating heart.
     - *Stage 4 (Frames 52–63)*: Cozy windowsill rest and slow peaceful blinking.
   - **Seamless 224px Wrap-Around Clouds**: Perfect circular wrap domain (`(20 + frame * 7 / 2) % 224`) eliminating sawtooth animation jumps.
   - Interactive hotspots: Pet cat, switch active cat, toggle weather override, and open app.
2. **Stardew Companion Widget (`LiloCompanionWidgetProvider.kt`)**:
   - Split-panel Stardew HUD: Left patio sanctuary with velvet cat bed, post-free glowing lantern, and garden bushes; right parchment HUD with live bold clock, date, and weather badge.
   - Cat pose switcher (<kbd>Grooming</kbd> / <kbd>Sleeping</kbd> / <kbd>Lounging</kbd>) and cat roster carousel.
3. **Garden Sandbox Widget (`LiloWidgetProvider.kt`)**:
   - Miniature living garden sandbox on your home screen with animated walking cats, active campfire/smoke, birdbath ripples, swaying wildflowers, and fluttering butterflies/fireflies.
   - Bottom 4-Button Stardew RPG Hotbar: **Pet**, **Feed**, **Sky / Weather Override**, and **+Cat** to spawn companion friends directly from the launcher.
4. **Purr-cent Battery & Mood Widget (`LiloBatteryWidgetProvider.kt`)**:
   - Carved wooden Stardew battery gauge showing real-time device battery percentage and charging state.
   - Battery-reactive cat mood states:
     - *Zoomies! (80–100%)*: Energetic hopping animations with floating hearts.
     - *Cozy (30–79%)*: Content loafing and grooming.
     - *Sleepy (< 30%)*: Curled loaf napping with floating zzz's.
     - *Charging (⚡ Plugged)*: Warming cozily beside a crackling animated campfire with golden sparkles.
   - Interactive hotspots: Tap cat nook or boost button to pet cat; switch active cat between Lilo, Cheeto, and custom companions; tap gauge to launch app.
5. **Campfire Focus & Pomodoro Buddy Widget (`LiloPomodoroWidgetProvider.kt`)**:
   - 25-minute study & coding focus timer by the crackling campfire with Lilo and Cheeto cozily resting.
   - Play/pause toggle and reset buttons with exact countdown ticks managed via `AlarmManager`.
   - **Forget-Me-Not Bloom Rewards**: Completing a 25-minute focus session awards **+1 Forget-Me-Not Bloom** (up to 24) synchronized directly to the main garden sanctuary app upon opening/focusing.

---

### 10. Dynamic Camera, Zoom & Follow System
- **Adaptive Viewport**:
  - Seamlessly scales between desktop monitors and smartphone screens (`100vw x 100dvh`) with zero letterboxing.
- **Zoom Controls**:
  - Smooth camera zoom toggle (<kbd>Zoom In</kbd> / <kbd>Zoom Out</kbd>) and pinch-to-zoom support on touchscreens.
- **Follow Lilo Mode**:
  - Tap the bottom dock's **Follow Lilo** button to smoothly lock and track the camera on Lilo wherever he wanders.
  - Dragging or panning the canvas automatically unlocks free-camera mode.

---

### 11. Synthesized Audio Engine (`CozyAudio`)
- Web Audio API synthesizer with zero external sound files:
  - Deep modulated cat purr rumbling using carrier + LFO oscillators.
  - Calming ambient rain noise using filtered pink noise with smooth fade-in/fade-out.
  - Ascending chime melodies when refilling the ceramic food bowl.

---

## 🎮 Controls & Shortcuts

| Action | Control | Shortcut |
| :--- | :--- | :---: |
| **Pet Cat** | Tap or click any cat | <kbd>P</kbd> |
| **Call Cats to Caretaker** | Tap the Caretaker in the scene | — |
| **Caretaker Customizer** | Tap **"Me"** on the bottom dock | — |
| **Bed Sleep / Wake** | Tap the Double Bed in the Cottage | — |
| **Couch Nap** | Tap the Cream Sofa in the Cottage | — |
| **Dining Table Meal** | Tap Dining Table → Tap floating **"Eat"** | — |
| **Refill Food Bowls** | Tap any personal cat bowl or **"Fill Bowl"** | <kbd>F</kbd> |
| **Toggle Cottage / Garden** | Tap **"Cottage"** or entrance hallway / gate | — |
| **Twin Polaroid Tribute** | Tap Memorial Stone (Garden) or Bookcase (Cottage) | — |
| **Guide Cat / Call Over** | Tap or click any open walkable floor or lawn | — |
| **Cycle Weather Mode** | Tap the Weather Badge | <kbd>W</kbd> |
| **Camera Zoom** | Tap **"Zoom In / Out"** or pinch touchscreen | <kbd>Z</kbd> |
| **Follow Lilo** | Tap **"Follow Lilo"** on the bottom dock | — |
| **Cat Friends & Customizer** | Tap **"Cat Friends"** on the bottom dock | <kbd>C</kbd> |
| **Toggle Sound** | Tap the speaker icon (🔊 / 🔇) | <kbd>M</kbd> |
| **Dismiss Modals** | Click backdrop or close button | <kbd>Esc</kbd> |

---

## 🚀 Free Hosting on GitHub Pages

1. Push the repository to GitHub:
   ```bash
   git add .
   git commit -m "Deploy Lilo's Garden"
   git push origin remastered
   ```
2. In your repository settings on GitHub, navigate to **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, select **"Deploy from a branch"**.
4. Set branch to `remastered` (or `main`) and directory to `/ (root)`, then click **Save**.
5. Your sanctuary will be live at:
   ```
   https://<your-username>.github.io/<repo-name>/
   ```
