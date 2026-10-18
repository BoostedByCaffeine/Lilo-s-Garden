package com.valois.lilosgarden

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.Shader
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.view.MotionEvent
import android.view.SurfaceHolder
import org.json.JSONObject
import java.util.Calendar
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.random.Random

class LiloWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine {
        return LiloWallpaperEngine()
    }

    inner class LiloWallpaperEngine : Engine() {
        private val handler = Handler(Looper.getMainLooper())
        private var isWallpaperVisible = false
        private var screenWidth = 1080
        private var screenHeight = 2400

        // Matches app.js portrait magnification (~280px of garden width centered around x=480, y=310)
        private val virtWidth = 280
        private var virtHeight = 560
        private var camX = 480f
        private var camY = 310f

        private var offscreenBitmap: Bitmap? = null
        private var offscreenCanvas: Canvas? = null

        private val nearestPaint = Paint(0).apply {
            isAntiAlias = false
            isDither = false
            isFilterBitmap = false
        }

        private val spriteBank = mutableMapOf<String, Bitmap>()

        inner class Cat(
            val id: String,
            val name: String,
            val isDefault: Boolean,
            val coatColor: String,
            val shadeColor: String,
            val eyeColor: String,
            val eyeColorRight: String,
            val noseColor: String,
            val collarColor: String?,
            val pattern: String,
            var x: Float,
            var y: Float,
            var targetX: Float,
            var targetY: Float,
            var facing: Int = 1,
            var state: String = "IDLE", // IDLE, WANDER, SEEK_FOOD, EATING, SEEK_SHELTER, SHELTERED, INTERACT, PLAYFUL
            var pose: String = "sit",   // sit, sleep
            var stateTimer: Float = 4f,
            var playTimer: Float = 0f,
            val seed: Float = Random.nextFloat() * 100f
        )

        inner class Particle(
            var x: Float,
            var y: Float,
            var vx: Float,
            var vy: Float,
            var life: Float,
            val maxLife: Float,
            val type: String // heart, sparkle, z
        )

        inner class Critter(
            val type: String, // butterfly, firefly
            var x: Float,
            var y: Float,
            var vx: Float,
            var vy: Float,
            val phase: Float,
            val color: String
        )

        inner class GrassTuft(val x: Int, val y: Int, val key: String, val shade: String, val phase: Float)
        inner class Wildflower(val x: Int, val y: Int, val key: String, val color: String, val phase: Float)
        inner class Renderable(val y: Float, val draw: () -> Unit)

        private val cats = mutableListOf<Cat>()
        private val particles = mutableListOf<Particle>()
        private val critters = mutableListOf<Critter>()
        private val grassTufts = mutableListOf<GrassTuft>()
        private val wildflowers = mutableListOf<Wildflower>()

        private var blooms = 8
        private var bowlLevel = 3
        private var weather = "SUNNY"
        private var elapsedTime = 0f
        private var lastTime = System.currentTimeMillis()
        private var lastSyncTime = 0L
        private var socialCooldown = 0f

        private val memorialBloomCoords = arrayOf(
            Pair(-18, 4), Pair(-15, 11), Pair(15, 6), Pair(18, 11), Pair(-13, -7), Pair(14, -6), Pair(-7, 15), Pair(8, 15),
            Pair(-23, 7), Pair(-21, 17), Pair(21, 8), Pair(23, 17), Pair(-18, -14), Pair(17, -13), Pair(-14, 19), Pair(15, 19),
            Pair(-28, 12), Pair(-25, 22), Pair(26, 12), Pair(28, 22), Pair(-23, -18), Pair(22, -18), Pair(-5, 22), Pair(6, 22)
        )

        private val pathStones = arrayOf(
            intArrayOf(476, 180, 14, 8), intArrayOf(472, 194, 16, 9),
            intArrayOf(466, 208, 15, 8), intArrayOf(454, 222, 16, 9),
            intArrayOf(438, 232, 14, 8), intArrayOf(416, 236, 15, 8),
            intArrayOf(394, 238, 14, 8), intArrayOf(372, 239, 14, 8),
            intArrayOf(470, 246, 15, 8), intArrayOf(474, 262, 14, 8),
            intArrayOf(478, 278, 16, 9), intArrayOf(480, 294, 15, 8),
            intArrayOf(478, 310, 16, 9), intArrayOf(476, 326, 15, 8),
            intArrayOf(478, 342, 16, 9)
        )

        private val drawRunnable = object : Runnable {
            override fun run() {
                if (!isWallpaperVisible) return
                val now = System.currentTimeMillis()
                val dt = ((now - lastTime) / 1000f).coerceIn(0.01f, 0.1f)
                lastTime = now
                elapsedTime += dt

                if (now - lastSyncTime > 4000L) {
                    syncStateFromPrefs()
                    lastSyncTime = now
                }

                updateWorld(dt, elapsedTime)
                drawFrame(elapsedTime)
                handler.postDelayed(this, 33L)
            }
        }

        override fun onCreate(surfaceHolder: SurfaceHolder) {
            super.onCreate(surfaceHolder)
            setTouchEventsEnabled(true)
            loadSprites()
            initStaticGarden()
            initCritters()
            syncStateFromPrefs()
        }

        private fun loadSprites() {
            val map = mapOf(
                "grassTile" to "assets/sprites/tileSprite/1 Tiles/FieldsTile_38.png",
                "tree1" to "assets/sprites/tileSprite/2 Objects/7 Decor/Tree1.png",
                "bush1" to "assets/sprites/tileSprite/2 Objects/9 Bush/1.png",
                "bush2" to "assets/sprites/tileSprite/2 Objects/9 Bush/2.png",
                "bush3" to "assets/sprites/tileSprite/2 Objects/9 Bush/3.png",
                "bush4" to "assets/sprites/tileSprite/2 Objects/9 Bush/4.png",
                "stone7" to "assets/sprites/tileSprite/2 Objects/4 Stone/7.png",
                "stone8" to "assets/sprites/tileSprite/2 Objects/4 Stone/8.png",
                "lamp1" to "assets/sprites/tileSprite/2 Objects/7 Decor/Lamp1.png",
                "log1" to "assets/sprites/tileSprite/2 Objects/7 Decor/Log1.png",
                "campfireActive" to "assets/sprites/tileSprite/3 Animated Objects/2 Campfire/2.png",
                "campfireSmoke" to "assets/sprites/tileSprite/3 Animated Objects/2 Campfire/1.png"
            )
            for ((k, path) in map) {
                loadAsset(path)?.let { spriteBank[k] = it }
            }
            for (i in 1..6) {
                loadAsset("assets/sprites/tileSprite/2 Objects/5 Grass/$i.png")?.let {
                    spriteBank["grass$i"] = it
                }
            }
            for (i in 1..12) {
                loadAsset("assets/sprites/tileSprite/2 Objects/6 Flower/$i.png")?.let {
                    spriteBank["flower$i"] = it
                }
            }
        }

        private fun loadAsset(relPath: String): Bitmap? {
            return try {
                applicationContext.assets.open("www/$relPath").use { stream ->
                    BitmapFactory.decodeStream(stream)
                }
            } catch (e: Exception) {
                null
            }
        }

        private fun initStaticGarden() {
            grassTufts.clear()
            wildflowers.clear()
            var seed = 3050L
            fun rand(): Float {
                seed = (seed * 16807L) % 2147483647L
                return (seed - 1).toFloat() / 2147483646f
            }
            for (i in 0 until 130) {
                val gx = (220 + rand() * 520).toInt()
                val gy = (175 + rand() * 580).toInt()
                if (hypot((gx - 330).toFloat(), (gy - 380).toFloat()) < 32f) continue
                if (hypot((gx - 620).toFloat(), (gy - 240).toFloat()) < 40f) continue
                if (hypot((gx - 640).toFloat(), (gy - 380).toFloat()) < 35f) continue
                grassTufts.add(
                    GrassTuft(
                        gx, gy,
                        "grass${(i % 6) + 1}",
                        if (rand() > 0.5f) "#3f7d3b" else "#579c4c",
                        rand() * 6.28f
                    )
                )
            }
            val colors = arrayOf("#fde047", "#f472b6", "#ffffff", "#bae6fd")
            for (i in 0 until 55) {
                val fx = (225 + rand() * 500).toInt()
                val fy = (180 + rand() * 570).toInt()
                if (hypot((fx - 330).toFloat(), (fy - 380).toFloat()) < 34f) continue
                if (hypot((fx - 620).toFloat(), (fy - 240).toFloat()) < 42f) continue
                if (hypot((fx - 340).toFloat(), (fy - 240).toFloat()) < 36f) continue
                wildflowers.add(
                    Wildflower(
                        fx, fy,
                        "flower${(i % 12) + 1}",
                        colors[(rand() * colors.size).toInt().coerceIn(0, colors.size - 1)],
                        rand() * 6.28f
                    )
                )
            }
        }

        private fun initCritters() {
            critters.clear()
            val colors = arrayOf("#38bdf8", "#f472b6", "#fde047", "#a78bfa")
            for (i in 0 until 4) {
                critters.add(
                    Critter(
                        "butterfly",
                        360f + Random.nextFloat() * 240f,
                        220f + Random.nextFloat() * 180f,
                        (Random.nextFloat() - 0.5f) * 16f,
                        (Random.nextFloat() - 0.5f) * 12f,
                        Random.nextFloat() * 6.28f,
                        colors[i % 4]
                    )
                )
            }
            for (i in 0 until 12) {
                critters.add(
                    Critter(
                        "firefly",
                        340f + Random.nextFloat() * 280f,
                        190f + Random.nextFloat() * 250f,
                        (Random.nextFloat() - 0.5f) * 8f,
                        (Random.nextFloat() - 0.5f) * 6f,
                        Random.nextFloat() * 6.28f,
                        "#facc15"
                    )
                )
            }
        }

        private fun syncStateFromPrefs() {
            val prefs = applicationContext.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
            blooms = prefs.getInt("blooms", 8).coerceIn(1, 24)
            val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
            val fallbackWeather = if (hour < 6 || hour >= 19) "NIGHT" else "SUNNY"
            weather = prefs.getString("weather", fallbackWeather) ?: fallbackWeather

            if (cats.isEmpty()) {
                cats.add(
                    Cat(
                        "lilo", "Lilo", true, "#ffffff", "#dbe7f5",
                        "#29b6f6", "#29b6f6", "#ff9ebb", "#1e88e5", "solid",
                        460f, 315f, 460f, 315f, 1
                    )
                )
                cats.add(
                    Cat(
                        "cheeto", "Cheeto", true, "#ffffff", "#eee8dc",
                        "#ffb300", "#29b6f6", "#ff9ebb", null, "solid",
                        500f, 322f, 500f, 322f, -1
                    )
                )
            }

            val jsonStr = prefs.getString("garden_json", null)
            if (!jsonStr.isNullOrEmpty()) {
                try {
                    val obj = JSONObject(jsonStr)
                    blooms = obj.optInt("blooms", blooms).coerceIn(1, 24)
                    bowlLevel = obj.optInt("bowlLevel", bowlLevel).coerceIn(0, 3)
                    val arr = obj.optJSONArray("companions")
                    val wantedIds = mutableSetOf("lilo", "cheeto")
                    if (arr != null) {
                        for (i in 0 until arr.length()) {
                            val c = arr.getJSONObject(i)
                            val cid = c.optString("id", "cat_$i")
                            wantedIds.add(cid)
                            if (cats.none { it.id == cid }) {
                                val sx = 450f + ((i * 28) % 80)
                                val sy = 300f + ((i * 18) % 60)
                                cats.add(
                                    Cat(
                                        cid,
                                        c.optString("name", "Mochi"),
                                        false,
                                        c.optString("coatColor", "#f59e42"),
                                        c.optString("shadeColor", "#c96f18"),
                                        c.optString("eyeColor", "#4ade80"),
                                        c.optString("eyeColorRight", c.optString("eyeColor", "#4ade80")),
                                        c.optString("noseColor", "#ff9ebb"),
                                        null,
                                        c.optString("pattern", "solid"),
                                        sx, sy, sx, sy, if (i % 2 == 0) 1 else -1
                                    )
                                )
                            }
                        }
                    }
                    cats.removeAll { !it.isDefault && it.id !in wantedIds }
                } catch (e: Exception) {}
            }
        }

        override fun onVisibilityChanged(visible: Boolean) {
            this.isWallpaperVisible = visible
            if (visible) {
                lastTime = System.currentTimeMillis()
                syncStateFromPrefs()
                handler.removeCallbacks(drawRunnable)
                handler.post(drawRunnable)
            } else {
                handler.removeCallbacks(drawRunnable)
            }
        }

        override fun onSurfaceChanged(
            holder: SurfaceHolder,
            format: Int,
            width: Int,
            height: Int
        ) {
            super.onSurfaceChanged(holder, format, width, height)
            screenWidth = width
            screenHeight = height
            val ratio = height.toFloat() / width.toFloat().coerceAtLeast(1f)
            virtHeight = (virtWidth * ratio).toInt().coerceIn(380, 680)
            offscreenBitmap = Bitmap.createBitmap(virtWidth, virtHeight, Bitmap.Config.ARGB_8888)
            offscreenCanvas = Canvas(offscreenBitmap!!)
        }

        override fun onDestroy() {
            isWallpaperVisible = false
            handler.removeCallbacksAndMessages(null)
            spriteBank.values.forEach { it.recycle() }
            spriteBank.clear()
            super.onDestroy()
        }

        override fun onTouchEvent(event: MotionEvent) {
            if (event.action == MotionEvent.ACTION_DOWN) {
                val wx = (event.x / screenWidth) * virtWidth - (virtWidth / 2f) + camX
                val wy = (event.y / screenHeight) * virtHeight - (virtHeight / 2f) + camY

                for (cat in cats.sortedByDescending { it.y }) {
                    if (abs(wx - cat.x) <= 22f && wy >= cat.y - 26f && wy <= cat.y + 12f) {
                        cat.state = "INTERACT"
                        cat.pose = "sit"
                        cat.stateTimer = 2.4f
                        spawnParticle(cat.x, cat.y - 8f, "heart")
                        return
                    }
                }

                if (hypot(wx - 480f, wy - 370f) <= 28f) {
                    bowlLevel = 3
                    spawnParticle(480f, 366f, "sparkle")
                    cats.forEachIndexed { idx, cat ->
                        cat.state = "SEEK_FOOD"
                        cat.pose = "sit"
                        cat.targetX = 480f + (idx * 14f - 10f)
                        cat.targetY = 372f
                    }
                    return
                }

                val targetCat = cats.firstOrNull() ?: return
                val clampedX = wx.coerceIn(360f, 600f)
                val clampedY = wy.coerceIn(200f, 430f)
                targetCat.state = "WANDER"
                targetCat.pose = "sit"
                targetCat.targetX = clampedX
                targetCat.targetY = clampedY
                spawnParticle(clampedX, clampedY, "sparkle")
            }
        }

        private fun spawnParticle(x: Float, y: Float, type: String) {
            val count = if (type == "z") 1 else 3
            for (i in 0 until count) {
                particles.add(
                    Particle(
                        x + (Random.nextFloat() * 8f - 4f),
                        y - 8f,
                        if (type == "z") 4f else (Random.nextFloat() - 0.5f) * 14f,
                        if (type == "z") -8f else -14f - Random.nextFloat() * 10f,
                        1.3f,
                        1.3f,
                        type
                    )
                )
            }
        }

        private fun updateWorld(dt: Float, time: Float) {
            // Smooth camera follow on Lilo so the wallpaper feels alive like the app
            val lilo = cats.firstOrNull()
            if (lilo != null) {
                camX += ((lilo.x.coerceIn(420f, 540f)) - camX) * 0.04f
                camY += ((lilo.y.coerceIn(270f, 350f)) - camY) * 0.04f
            }

            for (cr in critters) {
                cr.x += cr.vx * dt + sin(time * 2f + cr.phase) * 10f * dt
                cr.y += cr.vy * dt + cos(time * 1.5f + cr.phase) * 8f * dt
                if (cr.x < 350f) { cr.x = 350f; cr.vx = abs(cr.vx) }
                if (cr.x > 610f) { cr.x = 610f; cr.vx = -abs(cr.vx) }
                if (cr.y < 195f) { cr.y = 195f; cr.vy = abs(cr.vy) }
                if (cr.y > 435f) { cr.y = 435f; cr.vy = -abs(cr.vy) }
            }

            cats.forEachIndexed { idx, cat ->
                cat.stateTimer -= dt
                if ((cat.state == "IDLE" || cat.state == "SHELTERED") && cat.pose == "sleep" && Random.nextFloat() < dt * 0.6f) {
                    spawnParticle(cat.x + 5f, cat.y - 4f, "z")
                }

                if (weather == "RAIN" && cat.state != "SHELTERED" && cat.state != "SEEK_SHELTER" && cat.state != "INTERACT") {
                    cat.state = "SEEK_SHELTER"
                    cat.targetX = 610f + ((idx % 2) * 16f)
                    cat.targetY = 238f + (if (idx % 2 == 0) 0f else 6f)
                }

                when (cat.state) {
                    "IDLE" -> {
                        if (cat.stateTimer <= 0f) {
                            cat.state = "WANDER"
                            cat.pose = "sit"
                            if (Random.nextFloat() < 0.28f) {
                                cat.targetX = 550f + (Random.nextFloat() * 20f - 10f)
                                cat.targetY = 340f + (Random.nextFloat() * 14f - 7f)
                            } else {
                                cat.targetX = 370f + Random.nextFloat() * 220f
                                cat.targetY = 210f + Random.nextFloat() * 200f
                            }
                            cat.stateTimer = 4f + Random.nextFloat() * 5f
                        }
                    }
                    "WANDER", "SEEK_FOOD", "SEEK_SHELTER" -> {
                        val dx = cat.targetX - cat.x
                        val dy = cat.targetY - cat.y
                        val dist = hypot(dx, dy)
                        if (dist < 4f) {
                            if (cat.state == "SEEK_FOOD") {
                                cat.state = "EATING"
                                cat.stateTimer = 3.5f
                            } else if (cat.state == "SEEK_SHELTER") {
                                cat.state = "SHELTERED"
                                cat.pose = if (Random.nextFloat() < 0.65f) "sleep" else "sit"
                                cat.stateTimer = 6f
                            } else {
                                cat.state = "IDLE"
                                val onRug = hypot(cat.x - 550f, cat.y - 340f) < 24f
                                cat.pose = if (onRug || Random.nextFloat() < 0.35f) "sleep" else "sit"
                                cat.stateTimer = 4f + Random.nextFloat() * 5f
                            }
                        } else {
                            val speed = if (cat.state == "WANDER") 26f else 36f
                            cat.x += (dx / dist) * speed * dt
                            cat.y += (dy / dist) * speed * dt
                            if (abs(dx) > 0.4f) cat.facing = if (dx < 0f) -1 else 1
                        }
                    }
                    "SHELTERED" -> {
                        if (weather != "RAIN") {
                            cat.state = "IDLE"
                            cat.stateTimer = 3f
                        }
                    }
                    "EATING", "INTERACT" -> {
                        if (cat.stateTimer <= 0f) {
                            cat.state = "IDLE"
                            cat.pose = "sit"
                            cat.stateTimer = 4f
                        }
                    }
                }
            }

            if (socialCooldown > 0f) socialCooldown -= dt
            if (cats.size >= 2 && socialCooldown <= 0f) {
                val a = cats[0]
                val b = cats[1]
                if (hypot(a.x - b.x, a.y - b.y) < 22f) {
                    socialCooldown = 14f
                    spawnParticle((a.x + b.x) / 2f, minOf(a.y, b.y) - 8f, "heart")
                }
            }

            val it = particles.iterator()
            while (it.hasNext()) {
                val p = it.next()
                p.x += p.vx * dt
                p.y += p.vy * dt
                p.life -= dt
                if (p.life <= 0f) it.remove()
            }
        }

        private fun drawFrame(time: Float) {
            val holder = surfaceHolder
            var canvas: Canvas? = null
            try {
                canvas = holder.lockCanvas()
                val offC = offscreenCanvas
                val offB = offscreenBitmap
                if (canvas != null && offC != null && offB != null) {
                    renderGardenWorld(offC, time)
                    canvas.drawBitmap(
                        offB,
                        Rect(0, 0, virtWidth, virtHeight),
                        Rect(0, 0, screenWidth, screenHeight),
                        nearestPaint
                    )
                }
            } finally {
                if (canvas != null) {
                    holder.unlockCanvasAndPost(canvas)
                }
            }
        }

        private fun drawSprite(c: Canvas, key: String, x: Int, y: Int, w: Int, h: Int, animTime: Float? = null): Boolean {
            val bmp = spriteBank[key] ?: return false
            if (bmp.width == 192 && w <= 48 && animTime != null) {
                val frameIdx = ((animTime * 7f).toInt()) % 6
                c.drawBitmap(
                    bmp,
                    Rect(frameIdx * 32, 0, (frameIdx + 1) * 32, bmp.height),
                    Rect(x, y, x + w, y + h),
                    nearestPaint
                )
            } else {
                c.drawBitmap(bmp, null, Rect(x, y, x + w, y + h), nearestPaint)
            }
            return true
        }

        private fun renderGardenWorld(c: Canvas, time: Float) {
            val p = nearestPaint
            fun px(x: Int, y: Int, w: Int, h: Int, hex: String, alpha: Int = 255) {
                p.color = Color.parseColor(hex)
                p.alpha = alpha
                c.drawRect(x.toFloat(), y.toFloat(), (x + w).toFloat(), (y + h).toFloat(), p)
                p.alpha = 255
            }

            c.save()
            c.translate((virtWidth / 2f) - camX.roundToInt(), (virtHeight / 2f) - camY.roundToInt())

            // 1. Dynamic Sky Overhaul (y = -200..120 across full garden width)
            val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
            val isRain = weather == "RAIN"
            val isSunrise = !isRain && hour in 5..6
            val isSunset = !isRain && hour in 17..18
            val isNight = !isRain && (weather == "NIGHT" || hour < 5 || hour >= 19)
            val isDay = !isRain && !isSunrise && !isSunset && !isNight

            val skyBands = when {
                isRain -> arrayOf("#0f172a", "#1e293b", "#334155", "#475569", "#64748b")
                isSunrise -> arrayOf("#4a1d4a", "#9d2e43", "#db603c", "#f97316", "#fde047")
                isSunset -> arrayOf("#2e1035", "#581c3f", "#9a3412", "#f97316", "#fde047")
                isNight -> arrayOf("#060913", "#0b1120", "#0f172a", "#1e1b4b", "#312e81")
                else -> arrayOf("#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd")
            }
            val bandHeight = 64
            for (i in 0 until 5) {
                px(0, -200 + i * bandHeight, 960, bandHeight, skyBands[i])
            }

            // Celestial Bodies
            if (isDay) {
                // Bright Day Sun with Pulsing Outer Glow Rays in Upper-Right Sky
                val sunX = 550
                val sunY = -120
                val rayPulse = (sin(time * 2f) * 2f).roundToInt()
                // Pulsing cross rays
                px(sunX - 16 - rayPulse, sunY + 6, 6 + rayPulse, 4, "#fef08a", 130)
                px(sunX + 26, sunY + 6, 6 + rayPulse, 4, "#fef08a", 130)
                px(sunX + 6, sunY - 16 - rayPulse, 4, 6 + rayPulse, "#fef08a", 130)
                px(sunX + 6, sunY + 26, 4, 6 + rayPulse, "#fef08a", 130)
                // Diagonal rays
                px(sunX - 10, sunY - 10, 5, 5, "#fde047", 100)
                px(sunX + 21, sunY - 10, 5, 5, "#fde047", 100)
                px(sunX - 10, sunY + 21, 5, 5, "#fde047", 100)
                px(sunX + 21, sunY + 21, 5, 5, "#fde047", 100)
                // Corona and core
                px(sunX - 4, sunY - 4, 24, 24, "#fde047", 180)
                px(sunX, sunY, 16, 16, "#ffffff")
                px(sunX + 2, sunY + 2, 12, 12, "#fffbeb")
            } else if (isSunrise) {
                // Rising Golden Sun near horizon
                val riseX = 510
                val riseY = 65
                px(riseX - 14, riseY - 14, 52, 44, "#ea580c", 75)
                px(riseX - 8, riseY - 8, 40, 36, "#f59e0b", 140)
                px(riseX, riseY, 24, 24, "#fef08a")
                px(riseX + 4, riseY + 4, 16, 16, "#fffbeb")
            } else if (isSunset) {
                // Large Glowing Crimson-Gold Setting Sun sinking behind fence
                val sunsetX = 470
                val sunsetY = 60
                px(sunsetX - 16, sunsetY - 16, 56, 46, "#ea580c", 80)
                px(sunsetX - 8, sunsetY - 8, 40, 38, "#f97316", 150)
                px(sunsetX, sunsetY, 24, 24, "#fbbf24")
                px(sunsetX + 4, sunsetY + 4, 16, 16, "#fef08a")
            } else if (isNight) {
                // Glowing Pixel Crescent Moon
                val moonX = 420
                val moonY = -110
                px(moonX - 6, moonY - 6, 28, 28, "#bae6fd", 45)
                // Moon silver body
                px(moonX + 3, moonY, 10, 2, "#e0f2fe")
                px(moonX + 1, moonY + 2, 14, 2, "#f0f9ff")
                px(moonX, moonY + 4, 16, 8, "#ffffff")
                px(moonX + 1, moonY + 12, 14, 2, "#f0f9ff")
                px(moonX + 3, moonY + 14, 10, 2, "#e0f2fe")
                // Crescent inner dark cutout
                val cutoutCol = "#0b1120"
                px(moonX + 6, moonY + 2, 10, 2, cutoutCol)
                px(moonX + 5, moonY + 4, 12, 8, cutoutCol)
                px(moonX + 6, moonY + 12, 10, 2, cutoutCol)

                // 28 Twinkling Pixel Stars
                val nightStars = arrayOf(
                    Triple(352, -160, 0), Triple(388, -145, 1), Triple(412, -170, 2), Triple(445, -150, 3),
                    Triple(480, -175, 4), Triple(515, -140, 5), Triple(550, -165, 0), Triple(585, -152, 1),
                    Triple(610, -172, 2), Triple(360, -110, 3), Triple(395, -95, 4),  Triple(470, -90, 5),
                    Triple(530, -105, 0), Triple(575, -90, 1),  Triple(605, -115, 2), Triple(350, -60, 3),
                    Triple(385, -45, 4),  Triple(430, -55, 5),  Triple(490, -40, 0),  Triple(535, -50, 1),
                    Triple(565, -35, 2),  Triple(615, -60, 3),  Triple(370, -10, 4),  Triple(420, 15, 5),
                    Triple(465, 5, 0),    Triple(510, 20, 1),   Triple(555, -5, 2),   Triple(595, 25, 3)
                )
                for ((sx, sy, phase) in nightStars) {
                    val twinkle = (sin(time * 3f + phase.toFloat() * 1.3f) > 0.1f)
                    val starCol = if (twinkle) "#fef08a" else "#94a3b8"
                    val size = if (phase % 2 == 0 && twinkle) 2 else 1
                    px(sx, sy, size, size, starCol, if (twinkle) 255 else 160)
                }
            }

            // 4 Fluffy Pixel-Art Clouds Drifting Smoothly
            fun drawPixelCloud(cx: Int, cy: Int, cw: Int, mainCol: String, shadeCol: String, hiCol: String, alpha: Int = 255) {
                px(cx + 8, cy - 5, cw - 16, 5, hiCol, alpha)
                px(cx, cy, cw, 10, mainCol, alpha)
                px(cx + 2, cy + 8, cw - 4, 3, shadeCol, alpha)
                px(cx + 4, cy - 2, cw - 10, 3, hiCol, alpha)
            }

            val cMain: String
            val cShade: String
            val cHi: String
            val cAlpha: Int
            when {
                isRain -> {
                    cMain = "#334155"; cShade = "#1e293b"; cHi = "#475569"; cAlpha = 230
                }
                isSunset -> {
                    cMain = "#fed7aa"; cShade = "#fb923c"; cHi = "#fef08a"; cAlpha = 240
                }
                isSunrise -> {
                    cMain = "#fed7aa"; cShade = "#f472b6"; cHi = "#fffbeb"; cAlpha = 240
                }
                isNight -> {
                    cMain = "#1e293b"; cShade = "#0f172a"; cHi = "#334155"; cAlpha = 140
                }
                else -> {
                    cMain = "#f8fafc"; cShade = "#e2e8f0"; cHi = "#ffffff"; cAlpha = 250
                }
            }

            val baseCloudX = arrayOf(340f, 490f, 310f, 560f)
            val cloudY = arrayOf(-140, -85, -30, 20)
            val cloudSpeed = arrayOf(3.5f, 5.0f, 2.5f, 4.2f)
            val cloudW = arrayOf(46, 58, 38, 50)
            val span = 420f
            for (ci in 0 until 4) {
                val cxVal = ((baseCloudX[ci] + time * cloudSpeed[ci] - 260f) % span + span) % span + 260f - 40f
                drawPixelCloud(cxVal.roundToInt(), cloudY[ci], cloudW[ci], cMain, cShade, cHi, cAlpha)
            }

            // 2. Full-Viewport Seamless Tiled Garden Lawn using FieldsTile_38.png (Covers All Phone Aspect Ratios)
            val grassTile = spriteBank["grassTile"]
            if (grassTile != null) {
                for (ty in 120 until 920 step 32) {
                    for (tx in 64 until 896 step 32) {
                        c.drawBitmap(grassTile, null, Rect(tx, ty, tx + 32, ty + 32), p)
                    }
                }
            } else {
                px(0, 120, 960, 800, "#a6b04f")
            }

            // 3. Full-Width Top Hedge & Wooden Fence
            px(64, 120, 832, 36, "#2d5c2b")
            for (hx in 64 until 896 step 14) {
                px(hx, 134 + (if (hx % 28 == 0) 3 else 0), 12, 18, "#386e35")
            }
            px(64, 162, 832, 5, "#0f1c11", 72)
            px(64, 146, 832, 4, "#8c5832")
            px(64, 155, 832, 4, "#8c5832")
            for (fx in 75 until 885 step 26) {
                if (fx in 456..504) continue
                px(fx, 139, 7, 23, "#6e4223")
                px(fx + 1, 140, 5, 20, "#a86e42")
                px(fx + 1, 139, 5, 3, "#c98d5c")
            }

            // 4. Fence Bushes & Garden Bushes
            drawSprite(c, "bush1", 215, 146, 26, 22)
            drawSprite(c, "bush2", 310, 144, 36, 24)
            drawSprite(c, "bush3", 405, 145, 32, 23)
            drawSprite(c, "bush4", 525, 145, 30, 23)
            drawSprite(c, "bush2", 675, 144, 36, 24)
            drawSprite(c, "bush4", 295, 395, 28, 21)
            drawSprite(c, "bush1", 668, 255, 26, 20)

            // 5. Stepping Stone Path
            for (st in pathStones) {
                px(st[0], st[1] + 1, st[2], st[3], "#64748b")
                px(st[0], st[1], st[2] - 1, st[3] - 1, "#94a3b8")
                px(st[0] + 1, st[1] + 1, st[2] - 4, 2, "#cbd5e1")
            }

            // 6. Swaying Grass & Wildflowers
            for (g in grassTufts) {
                val sway = (sin(time * 2f + g.phase) * 0.7f).roundToInt()
                if (!drawSprite(c, g.key, g.x + sway, g.y, 8, 8)) {
                    px(g.x + sway, g.y, 1, 3, g.shade)
                }
            }
            for (f in wildflowers) {
                val bob = if (sin(time * 2.5f + f.phase) > 0.6f) -1 else 0
                if (!drawSprite(c, f.key, f.x - 3, f.y - 3 + bob, 8, 8)) {
                    px(f.x - 1, f.y + bob, 3, 2, f.color)
                }
            }

            // 7. Birdbath Pond with Corner Stones
            val pxPond = 330
            val pyPond = 380
            px(pxPond - 18, pyPond - 10, 36, 20, "#57534e")
            px(pxPond - 16, pyPond - 12, 32, 22, "#78716c")
            px(pxPond - 14, pyPond - 9, 28, 16, "#0284c7")
            px(pxPond - 12, pyPond - 7, 24, 12, "#38bdf8")
            val rip = (sin(time * 2f) * 2f).toInt()
            px(pxPond - 6 + rip, pyPond - 3, 6, 1, "#bae6fd")
            px(pxPond + 2 - rip, pyPond + 2, 5, 1, "#bae6fd")
            drawSprite(c, "stone7", pxPond - 22, pyPond - 12, 14, 12)
            drawSprite(c, "stone8", pxPond + 10, pyPond + 2, 12, 10)

            // 8. Sunny Nap Checkered Picnic Rug
            val rx = 550
            val ry = 340
            px(rx - 20, ry - 12, 40, 24, "#0f1c11", 64)
            px(rx - 19, ry - 13, 38, 24, "#fef3c7")
            for (bx in (rx - 17) until (rx + 17) step 8) {
                for (by in (ry - 11) until (ry + 9) step 8) {
                    if (((bx + by) / 8) % 2 == 0) px(bx, by, 4, 4, "#f59e0b")
                }
            }

            // 9. Shrine Lantern, Animated Campfire & Log
            drawSprite(c, "lamp1", 304, 210, 20, 35)
            drawSprite(c, "log1", 668, 376, 34, 21)
            val isRaining = weather == "RAIN"
            if (!isRaining) {
                val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
                glowPaint.shader = RadialGradient(
                    644f, 384f, 36f,
                    Color.argb(85, 251, 146, 60), Color.argb(0, 251, 146, 60),
                    Shader.TileMode.CLAMP
                )
                c.drawCircle(644f, 384f, 36f, glowPaint)
            }
            drawSprite(c, if (isRaining) "campfireSmoke" else "campfireActive", 628, 366, 32, 32, time)

            // 10. Gazebo Deck
            val sx = 620
            val sy = 240
            px(sx - 28, sy - 10, 56, 30, "#0f1c11", 100)
            px(sx - 26, sy - 8, 52, 26, "#532e16")
            px(sx - 25, sy - 9, 50, 26, "#78431e")
            for (plankY in (sy - 6) until (sy + 16) step 5) {
                px(sx - 25, plankY, 50, 1, "#452310")
            }
            px(sx - 16, sy - 4, 32, 15, "#831843")
            px(sx - 15, sy - 5, 30, 14, "#9f1239")
            px(sx - 13, sy - 4, 26, 2, "#be123c")
            px(sx - 8, sy + 2, 2, 2, "#fbbf24")
            px(sx + 7, sy + 2, 2, 2, "#fbbf24")

            // 11. Depth-Sorted Renderables (Shrine, Bowl, Shelter Roof, Tree1, Cats)
            val renderables = mutableListOf<Renderable>()

            renderables.add(Renderable(240f) {
                val shX = 340
                val shY = 240
                px(shX - 16, shY + 2, 32, 6, "#0f1c11", 90)
                px(shX - 14, shY - 4, 28, 9, "#64748b")
                px(shX - 13, shY - 5, 26, 7, "#94a3b8")
                px(shX - 11, shY - 23, 22, 19, "#64748b")
                px(shX - 10, shY - 25, 20, 20, "#94a3b8")
                px(shX - 8, shY - 26, 16, 2, "#cbd5e1")
                val glowL = if (sin(time * 3f) > 0f) "#38bdf8" else "#7dd3fc"
                val glowC = if (sin(time * 3f + 1.5f) > 0f) "#ffb300" else "#fde047"
                px(shX - 5, shY - 17, 3, 3, glowL)
                px(shX + 2, shY - 17, 3, 3, glowC)
                for (i in 0 until blooms.coerceAtMost(memorialBloomCoords.size)) {
                    val (ox, oy) = memorialBloomCoords[i]
                    val bob = if (sin(time * 2.8f + i) > 0.65f) -1 else 0
                    px(shX + ox, shY + oy + 1, 1, 2, "#256d27")
                    px(shX + ox - 1, shY + oy + bob, 3, 2, if (i % 2 == 0) "#38bdf8" else "#60a5fa")
                    px(shX + ox, shY + oy + bob, 1, 1, "#fef08a")
                }
            })

            renderables.add(Renderable(368f) {
                val bx = 480
                val by = 370
                px(bx - 12, by - 4, 24, 10, "#0f1c11", 76)
                px(bx - 11, by - 5, 22, 10, "#cbd5e1")
                px(bx - 10, by - 4, 20, 8, "#94a3b8")
                px(bx - 8, by - 3, 16, 7, "#0284c7")
                px(bx - 7, by - 4, 14, 6, "#38bdf8")
                px(bx - 6, by - 3, 12, 4, "#e0f2fe")
                if (bowlLevel >= 1) px(bx - 5, by - 3, 10, 2, "#92400e")
                if (bowlLevel >= 2) px(bx - 6, by - 4, 12, 2, "#b45309")
                if (bowlLevel >= 3) px(bx - 4, by - 5, 8, 2, "#d97706")
            })

            renderables.add(Renderable(254f) {
                px(sx - 24, sy - 30, 4, 46, "#532e16")
                px(sx + 20, sy - 30, 4, 46, "#532e16")
                px(sx - 23, sy - 10, 2, 26, "#8c5832")
                px(sx + 21, sy - 10, 2, 26, "#8c5832")
                px(sx - 1, sy - 26, 2, 8, "#1e1e24")
                px(sx - 4, sy - 18, 8, 10, "#1e1e24")
                px(sx - 2, sy - 16, 4, 6, "#fef08a")
                px(sx - 30, sy - 36, 60, 15, "#452310")
                px(sx - 28, sy - 38, 56, 14, "#6e3818")
                px(sx - 26, sy - 40, 52, 13, "#8c4820")
                px(sx - 20, sy - 44, 40, 10, "#a85828")
                px(sx - 12, sy - 47, 24, 7, "#c86f34")
            })

            renderables.add(Renderable(258f) {
                px(244, 256, 30, 6, "#0f1c11", 72)
                drawSprite(c, "tree1", 226, 185, 66, 77)
            })

            for (cat in cats) {
                renderables.add(Renderable(cat.y) {
                    drawAppPixelCat(c, cat, time)
                })
            }

            renderables.sortBy { it.y }
            renderables.forEach { it.draw() }

            // 12. Critters & Particles
            for (cr in critters) {
                val cx = cr.x.roundToInt()
                val cy = cr.y.roundToInt()
                if (cr.type == "butterfly" && weather != "NIGHT" && weather != "RAIN") {
                    val wing = ((time * 10f).toInt() % 2) == 0
                    if (wing) px(cx - 1, cy, 3, 2, cr.color)
                    else px(cx, cy - 1, 1, 3, cr.color)
                } else if (cr.type == "firefly" && weather == "NIGHT") {
                    val pulse = ((sin(time * 4f + cr.phase) + 1f) * 0.5f)
                    px(cx, cy, 2, 2, "#facc15", (80 + pulse * 175).toInt())
                }
            }

            for (pt in particles) {
                val alpha = ((pt.life / pt.maxLife).coerceIn(0f, 1f) * 255).toInt()
                val pxX = pt.x.roundToInt()
                val pxY = pt.y.roundToInt()
                if (pt.type == "heart") {
                    px(pxX - 2, pxY - 2, 2, 2, "#fb7185", alpha)
                    px(pxX + 1, pxY - 2, 2, 2, "#fb7185", alpha)
                    px(pxX - 3, pxY - 1, 7, 2, "#fb7185", alpha)
                    px(pxX - 2, pxY + 1, 5, 1, "#fb7185", alpha)
                    px(pxX - 1, pxY + 2, 3, 1, "#fb7185", alpha)
                    px(pxX, pxY + 3, 1, 1, "#fb7185", alpha)
                } else if (pt.type == "sparkle") {
                    px(pxX - 1, pxY, 3, 1, "#fde047", alpha)
                    px(pxX, pxY - 1, 1, 3, "#fde047", alpha)
                } else if (pt.type == "z") {
                    px(pxX - 1, pxY - 2, 3, 1, "#e0f2fe", alpha)
                    px(pxX, pxY - 1, 1, 1, "#e0f2fe", alpha)
                    px(pxX - 1, pxY, 3, 1, "#e0f2fe", alpha)
                }
            }

            c.restore()

            // Screen-space atmospheric tint (Matches app.js)
            if (weather == "CLOUDY") {
                px(0, 0, virtWidth, virtHeight, "#94a3b8", 30)
            } else if (weather == "RAIN") {
                px(0, 0, virtWidth, virtHeight, "#1e293b", 75)
            } else if (weather == "NIGHT") {
                px(0, 0, virtWidth, virtHeight, "#0f172a", 110)
            }
        }

        // Exact 1:1 port of drawPixelCat() from app.js
        private fun drawAppPixelCat(c: Canvas, cat: Cat, time: Float) {
            val x = cat.x.roundToInt()
            val y = cat.y.roundToInt()
            val isWalking = cat.state == "WANDER" || cat.state == "SEEK_FOOD" || cat.state == "SEEK_SHELTER"
            val isEating = cat.state == "EATING"
            val isPetted = cat.state == "INTERACT"
            val isSleeping = (cat.state == "IDLE" || cat.state == "SHELTERED") && cat.pose == "sleep"
            val isPlayful = cat.state == "PLAYFUL"

            c.save()
            c.translate(x.toFloat(), y.toFloat())

            fun px(rx: Int, ry: Int, w: Int, h: Int, hex: String, alpha: Int = 255) {
                nearestPaint.color = Color.parseColor(hex)
                nearestPaint.alpha = alpha
                c.drawRect(rx.toFloat(), ry.toFloat(), (rx + w).toFloat(), (ry + h).toFloat(), nearestPaint)
                nearestPaint.alpha = 255
            }

            if (isSleeping) {
                px(-8, -1, 16, 4, "#0f1c11", 82)
            } else {
                px(-7, -1, 14, 3, "#0f1c11", 82)
            }

            if (cat.facing < 0 && !isSleeping) {
                c.scale(-1f, 1f)
            }

            if (isSleeping) {
                val breath = if (sin(time * 2.4f + cat.seed) > 0f) 1 else 0
                px(-7, -7 + breath, 14, 6, cat.coatColor)
                px(-6, -8 + breath, 12, 2, cat.coatColor)
                px(-7, -3, 14, 2, cat.shadeColor)
                if (cat.pattern == "tabby") {
                    px(-3, -8 + breath, 2, 3, cat.shadeColor)
                    px(1, -8 + breath, 2, 3, cat.shadeColor)
                } else if (cat.pattern == "patches") {
                    px(-4, -7 + breath, 4, 3, "#d97706")
                    px(1, -6 + breath, 3, 3, "#374151")
                } else if (cat.pattern == "tuxedo") {
                    px(-2, -4, 6, 2, "#ffffff")
                }
                px(1, -9 + breath, 6, 5, cat.coatColor)
                px(2, -11 + breath, 2, 2, cat.coatColor)
                px(5, -11 + breath, 2, 2, cat.coatColor)
                px(2, -10 + breath, 1, 1, cat.noseColor)
                px(5, -10 + breath, 1, 1, cat.noseColor)
                px(3, -7 + breath, 2, 1, "#475569")
                px(6, -7 + breath, 1, 1, cat.noseColor)
                px(-8, -5, 2, 3, cat.shadeColor)
                px(-7, -3, 3, 1, cat.shadeColor)
                c.restore()
                return
            }

            val walkCycle = if (isWalking) ((time * 9f + cat.seed).toInt() % 4) else 0
            val hopY = if (isPlayful) (abs(sin(time * 10f)) * -3f).roundToInt() else 0
            val bounceY = hopY + (if (isWalking) (if (walkCycle % 2 == 1) -1 else 0) else if (isPetted) -1 else 0)
            val headDipY = if (isEating) (if ((time * 8f).toInt() % 2 == 0) 3 else 2) else 0
            val tailWag = sin(time * (if (isPetted || isPlayful) 12f else 4.5f) + cat.seed)
            val tailOffsetY = if (tailWag > 0.35f) -1 else if (tailWag < -0.35f) 1 else 0

            px(-8, -8 + bounceY, 2, 3, cat.coatColor)
            px(-9, -11 + bounceY + tailOffsetY, 2, 4, cat.coatColor)
            px(-9, -8 + bounceY, 1, 2, cat.shadeColor)
            px(-6, -8 + bounceY, 11, 6, cat.coatColor)
            px(-6, -4 + bounceY, 11, 2, cat.shadeColor)

            if (cat.pattern == "tuxedo") {
                px(2, -6 + bounceY, 3, 4, "#ffffff")
            } else if (cat.pattern == "tabby") {
                px(-4, -8 + bounceY, 1, 4, cat.shadeColor)
                px(-1, -8 + bounceY, 1, 4, cat.shadeColor)
                px(2, -8 + bounceY, 1, 3, cat.shadeColor)
            } else if (cat.pattern == "patches") {
                px(-5, -8 + bounceY, 4, 3, "#e07a2b")
                px(0, -7 + bounceY, 3, 3, "#2d3748")
            }

            if (cat.collarColor != null || cat.id == "lilo") {
                px(2, -5 + bounceY, 3, 1, cat.collarColor ?: "#1e88e5")
                px(4, -4 + bounceY, 1, 1, "#fde047")
            }

            val pawColor = if (cat.pattern == "tuxedo") "#ffffff" else cat.coatColor
            if (isWalking) {
                val legA = if (walkCycle == 0 || walkCycle == 3) 0 else -1
                val legB = if (walkCycle == 1 || walkCycle == 2) 0 else -1
                px(-5, -2 + legA, 2, 2, cat.shadeColor)
                px(-3, -2 + legB, 2, 2, pawColor)
                px(1, -2 + legB, 2, 2, cat.shadeColor)
                px(3, -2 + legA, 2, 2, pawColor)
            } else {
                px(-5, -2, 2, 2, cat.shadeColor)
                px(-2, -2, 2, 2, pawColor)
                px(1, -2, 2, 2, cat.shadeColor)
                px(3, -2, 2, 2, pawColor)
            }

            val hy = -13 + bounceY + headDipY
            px(0, hy, 8, 6, cat.coatColor)
            px(1, hy - 1, 6, 1, cat.coatColor)
            px(0, hy + 5, 8, 1, cat.shadeColor)
            px(1, hy - 3, 2, 2, cat.coatColor)
            px(5, hy - 3, 2, 2, cat.coatColor)
            px(1, hy - 2, 1, 1, cat.noseColor)
            px(6, hy - 2, 1, 1, cat.noseColor)

            if (cat.pattern == "tabby") {
                px(3, hy - 1, 2, 2, cat.shadeColor)
            } else if (cat.pattern == "patches") {
                px(1, hy - 1, 3, 2, "#e07a2b")
            } else if (cat.pattern == "tuxedo") {
                px(2, hy + 4, 4, 2, "#ffffff")
            }

            val isBlinking = sin(time * 1.7f + cat.seed * 3f) > 0.94f || isEating
            if (isPetted || isBlinking) {
                px(2, hy + 2, 2, 1, "#334155")
                px(5, hy + 2, 2, 1, "#334155")
            } else {
                px(2, hy + 1, 2, 2, cat.eyeColor)
                px(5, hy + 1, 2, 2, cat.eyeColorRight)
                px(2, hy + 1, 1, 1, "#ffffff")
                px(5, hy + 1, 1, 1, "#ffffff")
            }

            px(4, hy + 3, 1, 1, cat.noseColor)
            if (isPetted) {
                px(1, hy + 3, 1, 1, "#fda4af")
                px(6, hy + 3, 1, 1, "#fda4af")
            }

            c.restore()
        }
    }
}
