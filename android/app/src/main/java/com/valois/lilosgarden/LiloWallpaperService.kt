package com.valois.lilosgarden

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.service.wallpaper.WallpaperService
import android.view.MotionEvent
import android.view.SurfaceHolder
import java.util.Calendar
import kotlin.math.hypot
import kotlin.math.sin
import kotlin.random.Random

class LiloWallpaperService : WallpaperService() {

    override fun onCreateEngine(): Engine {
        return LiloWallpaperEngine()
    }

    inner class LiloWallpaperEngine : Engine() {

        private val handler = Handler(Looper.getMainLooper())
        private var isVisible = false
        private var screenWidth = 1080
        private var screenHeight = 2400

        // Virtual pixel-art canvas (320px wide; height proportional to screen)
        private val virtWidth = 320
        private var virtHeight = 640
        private var offscreenBitmap: Bitmap? = null
        private var offscreenCanvas: Canvas? = null

        private val nearestPaint = Paint(0).apply {
            isAntiAlias = false
            isDither = false
            isFilterBitmap = false
        }

        // Cat data structure
        inner class Cat(
            val id: String,
            val name: String,
            var x: Float,
            var y: Float,
            var targetX: Float,
            var targetY: Float,
            var facing: Int = 1,
            var state: String = "SIT", // SIT, WANDER, SLEEP, JUMP
            var timer: Float = 3f,
            var walkCycle: Float = 0f,
            var jumpOffset: Float = 0f,
            var eyeLeftColor: Int,
            var eyeRightColor: Int,
            var hasCollar: Boolean = false
        )

        private val lilo = Cat(
            id = "lilo",
            name = "Lilo",
            x = 130f,
            y = 360f,
            targetX = 130f,
            targetY = 360f,
            eyeLeftColor = Color.parseColor("#29b6f6"),
            eyeRightColor = Color.parseColor("#29b6f6"),
            hasCollar = true
        )

        private val cheeto = Cat(
            id = "cheeto",
            name = "Cheeto",
            x = 190f,
            y = 360f,
            targetX = 190f,
            targetY = 360f,
            facing = -1,
            eyeLeftColor = Color.parseColor("#ffb300"), // Amber
            eyeRightColor = Color.parseColor("#29b6f6"), // Blue
            hasCollar = false
        )

        // Floating Hearts Particle
        inner class Heart(
            var x: Float,
            var y: Float,
            var vy: Float = -24f,
            var life: Float = 1.6f,
            val maxLife: Float = 1.6f
        )

        private val hearts = mutableListOf<Heart>()

        // Butterflies & Fireflies
        inner class Critter(
            var x: Float,
            var y: Float,
            var vx: Float,
            var vy: Float,
            var phase: Float,
            val color: Int
        )

        private val critters = mutableListOf<Critter>()

        private var lastTime = System.currentTimeMillis()
        private var noseBoopCooldown = 5f

        private val drawRunnable = object : Runnable {
            override fun run() {
                if (!isVisible) return
                val now = System.currentTimeMillis()
                val dt = ((now - lastTime) / 1000f).coerceIn(0.01f, 0.1f)
                lastTime = now

                updateGame(dt)
                drawFrame()

                handler.postDelayed(this, 33L) // ~30 FPS battery-saver loop
            }
        }

        override fun onCreate(surfaceHolder: SurfaceHolder) {
            super.onCreate(surfaceHolder)
            setTouchEventsEnabled(true)
            initCritters()
        }

        override fun onVisibilityChanged(visible: Boolean) {
            this.isVisible = visible
            if (visible) {
                lastTime = System.currentTimeMillis()
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
            virtHeight = (virtWidth * ratio).toInt().coerceIn(480, 800)

            offscreenBitmap = Bitmap.createBitmap(virtWidth, virtHeight, Bitmap.Config.ARGB_8888)
            offscreenCanvas = Canvas(offscreenBitmap!!)

            // Clamp cats to bounds
            lilo.y = virtHeight * 0.58f
            cheeto.y = virtHeight * 0.58f
            lilo.targetY = lilo.y
            cheeto.targetY = cheeto.y
        }

        override fun onDestroy() {
            isVisible = false
            handler.removeCallbacksAndMessages(null)
            super.onDestroy()
        }

        override fun onTouchEvent(event: MotionEvent) {
            if (event.action == MotionEvent.ACTION_DOWN) {
                val touchX = (event.x / screenWidth) * virtWidth
                val touchY = (event.y / screenHeight) * virtHeight

                // Check tap on Lilo
                if (hypot(touchX - lilo.x, touchY - lilo.y) < 24f) {
                    petCat(lilo)
                    return
                }

                // Check tap on Cheeto
                if (hypot(touchX - cheeto.x, touchY - cheeto.y) < 24f) {
                    petCat(cheeto)
                    return
                }

                // Tap open lawn: guide closest cat to tap location
                val distLilo = hypot(touchX - lilo.x, touchY - lilo.y)
                val distCheeto = hypot(touchX - cheeto.x, touchY - cheeto.y)
                val targetCat = if (distLilo <= distCheeto) lilo else cheeto

                val gardenMinY = virtHeight * 0.38f
                val gardenMaxY = virtHeight * 0.88f
                val clampedY = touchY.coerceIn(gardenMinY, gardenMaxY)
                val clampedX = touchX.coerceIn(24f, (virtWidth - 24).toFloat())

                targetCat.targetX = clampedX
                targetCat.targetY = clampedY
                targetCat.state = "WANDER"
                targetCat.facing = if (clampedX >= targetCat.x) 1 else -1

                spawnHeart(clampedX, clampedY - 8f)
            }
        }

        private fun petCat(cat: Cat) {
            cat.state = "JUMP"
            cat.jumpOffset = -14f
            cat.timer = 0.8f
            spawnHeart(cat.x, cat.y - 18f)
            spawnHeart(cat.x - 6f, cat.y - 12f)
            spawnHeart(cat.x + 6f, cat.y - 12f)
        }

        private fun spawnHeart(x: Float, y: Float) {
            hearts.add(Heart(x = x, y = y))
        }

        private fun initCritters() {
            critters.clear()
            val colors = arrayOf(
                Color.parseColor("#38bdf8"),
                Color.parseColor("#f472b6"),
                Color.parseColor("#fde047"),
                Color.parseColor("#a78bfa")
            )
            for (i in 0..5) {
                critters.add(
                    Critter(
                        x = 40f + Random.nextFloat() * 240f,
                        y = 180f + Random.nextFloat() * 260f,
                        vx = (Random.nextFloat() - 0.5f) * 18f,
                        vy = (Random.nextFloat() - 0.5f) * 14f,
                        phase = Random.nextFloat() * 6.28f,
                        color = colors[i % colors.size]
                    )
                )
            }
        }

        private fun updateGame(dt: Float) {
            val gardenMinY = virtHeight * 0.40f
            val gardenMaxY = virtHeight * 0.86f
            val minX = 26f
            val maxX = (virtWidth - 26).toFloat()

            // Update Cats
            val cats = arrayOf(lilo, cheeto)
            for (cat in cats) {
                cat.timer -= dt

                if (cat.state == "JUMP") {
                    cat.jumpOffset += 40f * dt
                    if (cat.jumpOffset > 0f) {
                        cat.jumpOffset = 0f
                        cat.state = "SIT"
                    }
                } else if (cat.state == "WANDER") {
                    cat.walkCycle += dt * 8f
                    val dx = cat.targetX - cat.x
                    val dy = cat.targetY - cat.y
                    val dist = hypot(dx, dy)

                    if (dist > 3f) {
                        val speed = 28f
                        cat.x += (dx / dist) * speed * dt
                        cat.y += (dy / dist) * speed * dt
                        cat.facing = if (dx >= 0) 1 else -1
                    } else {
                        cat.x = cat.targetX
                        cat.y = cat.targetY
                        cat.state = if (Random.nextFloat() < 0.6f) "SIT" else "SLEEP"
                        cat.timer = 4f + Random.nextFloat() * 6f
                    }
                } else {
                    // IDLE / SIT / SLEEP
                    if (cat.timer <= 0f) {
                        cat.state = "WANDER"
                        cat.targetX = minX + Random.nextFloat() * (maxX - minX)
                        cat.targetY = gardenMinY + Random.nextFloat() * (gardenMaxY - gardenMinY)
                        cat.facing = if (cat.targetX >= cat.x) 1 else -1
                        cat.timer = 6f
                    }
                }
            }

            // Brother Nose-Boop Interaction
            noseBoopCooldown -= dt
            if (noseBoopCooldown <= 0f) {
                val d = hypot(lilo.x - cheeto.x, lilo.y - cheeto.y)
                if (d < 30f) {
                    lilo.facing = if (cheeto.x >= lilo.x) 1 else -1
                    cheeto.facing = if (lilo.x >= cheeto.x) 1 else -1
                    spawnHeart((lilo.x + cheeto.x) / 2f, (lilo.y + cheeto.y) / 2f - 16f)
                    noseBoopCooldown = 14f
                }
            }

            // Update Hearts
            val iter = hearts.iterator()
            while (iter.hasNext()) {
                val h = iter.next()
                h.y += h.vy * dt
                h.life -= dt
                if (h.life <= 0f) iter.remove()
            }

            // Update Critters
            for (cr in critters) {
                cr.phase += dt * 3f
                cr.x += cr.vx * dt
                cr.y += cr.vy * dt
                if (cr.x < 16f || cr.x > virtWidth - 16f) cr.vx = -cr.vx
                if (cr.y < virtHeight * 0.32f || cr.y > virtHeight * 0.90f) cr.vy = -cr.vy
            }
        }

        private fun drawFrame() {
            val holder = surfaceHolder
            var canvas: Canvas? = null
            try {
                canvas = holder.lockCanvas()
                if (canvas != null && offscreenCanvas != null && offscreenBitmap != null) {
                    renderGarden(offscreenCanvas!!)

                    // Scale virtual bitmap onto physical screen using nearest-neighbor
                    val src = Rect(0, 0, virtWidth, virtHeight)
                    val dst = Rect(0, 0, screenWidth, screenHeight)
                    canvas.drawBitmap(offscreenBitmap!!, src, dst, nearestPaint)
                }
            } finally {
                if (canvas != null) {
                    holder.unlockCanvasAndPost(canvas)
                }
            }
        }

        private fun renderGarden(c: Canvas) {
            val p = nearestPaint
            val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
            val isNight = hour < 6 || hour >= 19
            val isSunset = hour in 17..18

            // 1. Sky Horizon
            val horizonY = virtHeight * 0.34f
            p.color = when {
                isNight -> Color.parseColor("#0f172a")
                isSunset -> Color.parseColor("#c2410c")
                else -> Color.parseColor("#60a5fa")
            }
            c.drawRect(0f, 0f, virtWidth.toFloat(), horizonY, p)

            // Night Stars or Day Sun
            if (isNight) {
                p.color = Color.WHITE
                val stars = arrayOf(
                    Pair(24, 30), Pair(68, 50), Pair(110, 24), Pair(175, 45),
                    Pair(220, 28), Pair(260, 60), Pair(290, 36), Pair(140, 75)
                )
                for ((sx, sy) in stars) {
                    c.drawRect(sx.toFloat(), sy.toFloat(), (sx + 2).toFloat(), (sy + 2).toFloat(), p)
                }
            } else if (!isSunset) {
                p.color = Color.parseColor("#fde047")
                c.drawRect(260f, 24f, 288f, 52f, p)
                p.color = Color.parseColor("#fef08a")
                c.drawRect(266f, 30f, 282f, 46f, p)
            }

            // 2. Wooden Fence at Horizon
            p.color = Color.parseColor("#5c3820")
            c.drawRect(0f, horizonY - 4f, virtWidth.toFloat(), horizonY + 2f, p)
            for (fx in 12 until virtWidth step 22) {
                c.drawRect(fx.toFloat(), horizonY - 14f, (fx + 5).toFloat(), horizonY + 4f, p)
                p.color = Color.parseColor("#8f4d22")
                c.drawRect((fx + 1).toFloat(), horizonY - 13f, (fx + 4).toFloat(), horizonY + 3f, p)
                p.color = Color.parseColor("#5c3820")
            }

            // 3. Lush Lawn (Checkerboard Pixel Grass)
            val darkGrass = Color.parseColor("#224426")
            val lightGrass = Color.parseColor("#32612a")
            val tileSize = 10

            for (y in horizonY.toInt() until virtHeight step tileSize) {
                for (x in 0 until virtWidth step tileSize) {
                    p.color = if (((x / tileSize) + (y / tileSize)) % 2 == 0) lightGrass else darkGrass
                    c.drawRect(x.toFloat(), y.toFloat(), (x + tileSize).toFloat(), (y + tileSize).toFloat(), p)
                }
            }

            // 4. Gazebo Deck (Shelter in top-right corner)
            val gx = 210f
            val gy = horizonY + 12f
            p.color = Color.parseColor("#6e3b17")
            c.drawRect(gx, gy, gx + 94f, gy + 54f, p) // Wooden deck
            p.color = Color.parseColor("#9c5a2d")
            c.drawRect(gx + 2f, gy + 2f, gx + 92f, gy + 52f, p)
            p.color = Color.parseColor("#3d2516") // Roof beams
            c.drawRect(gx + 4f, gy - 16f, gx + 90f, gy, p)
            c.drawRect(gx + 6f, gy, gx + 10f, gy + 50f, p)
            c.drawRect(gx + 84f, gy, gx + 88f, gy + 50f, p)

            // 5. Memorial Shrine Stone (Left side)
            val mx = 34f
            val my = horizonY + 22f
            p.color = Color.parseColor("#475569")
            c.drawRect(mx, my, mx + 38f, my + 30f, p)
            p.color = Color.parseColor("#64748b")
            c.drawRect(mx + 2f, my - 2f, mx + 36f, my + 28f, p)
            p.color = Color.parseColor("#94a3b8")
            c.drawRect(mx + 4f, my, mx + 34f, my + 4f, p)
            // Memorial Forget-Me-Nots
            p.color = Color.parseColor("#38bdf8")
            c.drawRect(mx + 8f, my + 10f, mx + 14f, my + 16f, p)
            c.drawRect(mx + 22f, my + 10f, mx + 28f, my + 16f, p)
            p.color = Color.parseColor("#fef08a")
            c.drawRect(mx + 15f, my + 12f, mx + 18f, my + 15f, p)

            // 6. Ceramic Food Bowl
            val bx = 160f
            val by = horizonY + 44f
            p.color = Color.parseColor("#0284c7")
            c.drawRect(bx - 12f, by, bx + 12f, by + 10f, p)
            p.color = Color.parseColor("#38bdf8")
            c.drawRect(bx - 10f, by - 2f, bx + 10f, by + 2f, p)
            p.color = Color.parseColor("#d97706") // Tasty Kibble
            c.drawRect(bx - 7f, by, bx + 7f, by + 4f, p)

            // 7. Scattered Forget-Me-Not Flowers on Lawn
            val flowers = arrayOf(
                Pair(45, virtHeight * 0.52f), Pair(92, virtHeight * 0.44f),
                Pair(135, virtHeight * 0.62f), Pair(180, virtHeight * 0.50f),
                Pair(230, virtHeight * 0.66f), Pair(280, virtHeight * 0.48f),
                Pair(70, virtHeight * 0.72f), Pair(150, virtHeight * 0.78f),
                Pair(240, virtHeight * 0.82f), Pair(285, virtHeight * 0.74f)
            )
            for ((fx, fy) in flowers) {
                p.color = Color.parseColor("#38bdf8")
                c.drawRect((fx - 2).toFloat(), fy - 2f, (fx + 4).toFloat(), fy + 4f, p)
                p.color = Color.parseColor("#fef08a")
                c.drawRect(fx.toFloat(), fy, (fx + 2).toFloat(), fy + 2f, p)
            }

            // 8. Draw Cats (Y-Sorted for depth)
            val sortedCats = arrayOf(lilo, cheeto).apply { sortBy { it.y } }
            for (cat in sortedCats) {
                drawPixelCat(c, cat)
            }

            // 9. Floating Hearts
            p.color = Color.parseColor("#fb7185")
            for (h in hearts) {
                val hx = h.x
                val hy = h.y
                c.drawRect(hx - 3f, hy - 3f, hx - 1f, hy - 1f, p)
                c.drawRect(hx + 1f, hy - 3f, hx + 3f, hy - 1f, p)
                c.drawRect(hx - 4f, hy - 1f, hx + 4f, hy + 2f, p)
                c.drawRect(hx - 2f, hy + 2f, hx + 2f, hy + 4f, p)
                c.drawRect(hx - 1f, hy + 4f, hx + 1f, hy + 5f, p)
            }

            // 10. Critters (Butterflies / Fireflies)
            for (cr in critters) {
                if (isNight) {
                    p.color = Color.parseColor("#facc15")
                    val pulse = ((sin(cr.phase.toDouble()) + 1.0) * 0.5).toFloat()
                    p.alpha = (100 + (pulse * 155)).toInt()
                    c.drawRect(cr.x - 1f, cr.y - 1f, cr.x + 2f, cr.y + 2f, p)
                    p.alpha = 255
                } else {
                    p.color = cr.color
                    val wing = (cr.phase % 1.0f) > 0.5f
                    if (wing) {
                        c.drawRect(cr.x - 2f, cr.y - 1f, cr.x + 3f, cr.y + 2f, p)
                    } else {
                        c.drawRect(cr.x - 1f, cr.y - 2f, cr.x + 2f, cr.y + 3f, p)
                    }
                }
            }
        }

        private fun drawPixelCat(c: Canvas, cat: Cat) {
            val p = nearestPaint
            val cx = cat.x
            val cy = cat.y + cat.jumpOffset
            val facing = cat.facing // 1 (right) or -1 (left)

            // Cat Shadow
            p.color = Color.parseColor("#152e18")
            c.drawRect(cx - 10f, cat.y + 4f, cx + 10f, cat.y + 8f, p)

            val catWhite = Color.parseColor("#ffffff")
            val catShade = Color.parseColor("#cbd5e1")
            val catPink = Color.parseColor("#ffb6c1")

            // Body
            p.color = catWhite
            c.drawRect(cx - 9f, cy - 8f, cx + 9f, cy + 5f, p)
            p.color = catShade
            c.drawRect(cx - 8f, cy + 3f, cx + 8f, cy + 6f, p)

            // Walking Paw cycle
            if (cat.state == "WANDER") {
                val step = (sin(cat.walkCycle.toDouble()) * 3.0).toFloat()
                p.color = catWhite
                c.drawRect(cx - 6f + step, cy + 4f, cx - 2f + step, cy + 8f, p)
                c.drawRect(cx + 2f - step, cy + 4f, cx + 6f - step, cy + 8f, p)
            } else {
                p.color = catWhite
                c.drawRect(cx - 6f, cy + 4f, cx - 2f, cy + 7f, p)
                c.drawRect(cx + 2f, cy + 4f, cx + 6f, cy + 7f, p)
            }

            // Head
            val hx = cx + (facing * 3f)
            val hy = cy - 12f
            p.color = catWhite
            c.drawRect(hx - 7f, hy - 7f, hx + 7f, hy + 4f, p)

            // Ears
            c.drawRect(hx - 6f, hy - 11f, hx - 2f, hy - 7f, p)
            c.drawRect(hx + 2f, hy - 11f, hx + 6f, hy - 7f, p)
            p.color = catPink
            c.drawRect(hx - 5f, hy - 10f, hx - 3f, hy - 8f, p)
            c.drawRect(hx + 3f, hy - 10f, hx + 5f, hy - 8f, p)

            // Blue Collar with Gold Bell (Lilo only)
            if (cat.hasCollar) {
                p.color = Color.parseColor("#1e88e5")
                c.drawRect(hx - 6f, hy + 2f, hx + 6f, hy + 4f, p)
                p.color = Color.parseColor("#fde047")
                c.drawRect(hx - 1.5f, hy + 3.5f, hx + 1.5f, hy + 6f, p)
            }

            // Eyes (Twin Blue for Lilo; Amber + Blue for Cheeto)
            if (cat.state == "SLEEP") {
                p.color = Color.parseColor("#94a3b8")
                c.drawRect(hx - 4f, hy - 2f, hx - 1f, hy - 1f, p)
                c.drawRect(hx + 1f, hy - 2f, hx + 4f, hy - 1f, p)
            } else {
                p.color = cat.eyeLeftColor
                c.drawRect(hx - 4f, hy - 3f, hx - 1f, hy, p)
                p.color = cat.eyeRightColor
                c.drawRect(hx + 1f, hy - 3f, hx + 4f, hy, p)
            }

            // Cute Nose
            p.color = catPink
            c.drawRect(hx - 1f, hy + 0.5f, hx + 1f, hy + 2f, p)

            // Tail
            p.color = catWhite
            val tailX = cx - (facing * 8f)
            c.drawRect(tailX - 2f, cy - 4f, tailX + 1f, cy + 2f, p)
            c.drawRect(tailX - 4f, cy - 8f, tailX - 1f, cy - 3f, p)
        }
    }
}
