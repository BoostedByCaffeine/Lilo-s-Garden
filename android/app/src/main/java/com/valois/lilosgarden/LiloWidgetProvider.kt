package com.valois.lilosgarden

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.widget.RemoteViews
import java.util.Calendar

class LiloWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
        when (intent.action) {
            ACTION_PET -> {
                val pets = prefs.getInt("pets", 8) + 1
                prefs.edit()
                    .putString("mode", "PET")
                    .putInt("pets", pets)
                    .apply()
                refreshAllWidgets(context)
            }
            ACTION_FEED -> {
                prefs.edit()
                    .putString("mode", "EAT")
                    .putInt("bowl", 3)
                    .apply()
                refreshAllWidgets(context)
            }
        }
    }

    private fun refreshAllWidgets(context: Context) {
        val manager = AppWidgetManager.getInstance(context)
        val ids = manager.getAppWidgetIds(ComponentName(context, LiloWidgetProvider::class.java))
        for (id in ids) {
            updateAppWidget(context, manager, id)
        }
    }

    companion object {
        const val ACTION_PET = "com.valois.lilosgarden.ACTION_WIDGET_PET"
        const val ACTION_FEED = "com.valois.lilosgarden.ACTION_WIDGET_FEED"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.lilo_widget)
            val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
            val mode = prefs.getString("mode", "IDLE") ?: "IDLE"
            val pets = prefs.getInt("pets", 8)

            // Generate 4 animated frames and scale 3x with nearest-neighbor (filter = false)
            val frameIds = intArrayOf(
                R.id.widget_frame_0,
                R.id.widget_frame_1,
                R.id.widget_frame_2,
                R.id.widget_frame_3
            )
            for (frameIdx in 0..3) {
                val raw = drawStardewGardenFrame(frameIdx, mode, pets)
                val crispScaled = Bitmap.createScaledBitmap(raw, raw.width * 3, raw.height * 3, false)
                views.setImageViewBitmap(frameIds[frameIdx], crispScaled)
            }

            // Tap main garden -> Launch Full App
            val openAppIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val openPending = PendingIntent.getActivity(
                context,
                appWidgetId,
                openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_flipper, openPending)

            // Tap Bottom-Left -> Pet Lilo & Cheeto directly in Widget
            val petIntent = Intent(context, LiloWidgetProvider::class.java).apply {
                action = ACTION_PET
            }
            val petPending = PendingIntent.getBroadcast(
                context,
                appWidgetId + 100,
                petIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_pet, petPending)

            // Tap Bottom-Right -> Fill Bowl & Feed Brothers in Widget
            val feedIntent = Intent(context, LiloWidgetProvider::class.java).apply {
                action = ACTION_FEED
            }
            val feedPending = PendingIntent.getBroadcast(
                context,
                appWidgetId + 200,
                feedIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_btn_feed, feedPending)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun drawStardewGardenFrame(frame: Int, mode: String, petsCount: Int): Bitmap {
            val w = 200
            val h = 108
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            val p = Paint(0).apply {
                isAntiAlias = false
                isDither = false
                isFilterBitmap = false
            }

            fun px(x: Int, y: Int, pw: Int, ph: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(x.toFloat(), y.toFloat(), (x + pw).toFloat(), (y + ph).toFloat(), p)
            }

            val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
            val isNight = hour < 6 || hour >= 19

            // 1. Forest Canopy & Hedge Background
            px(0, 0, w, 34, if (isNight) "#0f172a" else "#172d1a")
            px(0, 20, w, 14, "#2d5c2b")
            for (hx in 6 until w step 12) {
                px(hx, 22 + (if (hx % 24 == 0) 2 else 0), 9, 12, "#386e35")
            }

            // 2. Checkerboard Pixel Lawn (Stardew Palette)
            for (gy in 34 until h step 10) {
                for (gx in 0 until w step 10) {
                    val grassCol = if (((gx / 10) + (gy / 10)) % 2 == 0) {
                        if (isNight) "#28522c" else "#4c9146"
                    } else {
                        if (isNight) "#224426" else "#478942"
                    }
                    px(gx, gy, 10, 10, grassCol)
                }
            }

            // 3. Wooden Fence Along Horizon
            px(6, 29, w - 12, 2, "#8c5832")
            px(6, 33, w - 12, 2, "#8c5832")
            for (fx in 10 until w - 10 step 16) {
                if (fx in 90..110) continue
                px(fx, 25, 4, 11, "#6e4223")
                px(fx + 1, 26, 2, 9, "#a86e42")
                px(fx + 1, 25, 2, 2, "#c98d5c")
            }

            // 4. Stepping Stones Path
            val stones = arrayOf(
                Pair(96, 35), Pair(94, 43), Pair(97, 51), Pair(95, 59), Pair(82, 47), Pair(68, 49)
            )
            for ((sx, sy) in stones) {
                px(sx, sy + 1, 8, 4, "#64748b")
                px(sx, sy, 7, 3, "#94a3b8")
            }

            // 5. Memorial Stone (Left) + Blooming Blue Forget-Me-Nots
            val msX = 28
            val msY = 48
            px(msX - 9, msY + 2, 18, 4, "#223824")
            px(msX - 8, msY - 2, 16, 6, "#64748b")
            px(msX - 6, msY - 14, 12, 13, "#94a3b8")
            px(msX - 5, msY - 15, 10, 2, "#cbd5e1")
            px(msX - 4, msY - 10, 2, 2, if (frame % 2 == 0) "#38bdf8" else "#7dd3fc")
            px(msX + 2, msY - 10, 2, 2, if (frame % 2 == 1) "#ffb300" else "#fde047")

            val flowerOffsets = arrayOf(
                Pair(-12, 2), Pair(-10, 7), Pair(10, 3), Pair(12, 7),
                Pair(-8, -5), Pair(9, -4), Pair(-4, 9), Pair(5, 9)
            )
            for (i in flowerOffsets.indices) {
                val (ox, oy) = flowerOffsets[i]
                val bob = if ((frame + i) % 2 == 0) 0 else -1
                px(msX + ox, msY + oy + 1, 1, 2, "#256d27")
                px(msX + ox - 1, msY + oy + bob, 3, 2, "#38bdf8")
                px(msX + ox, msY + oy + bob, 1, 1, "#fef08a")
            }

            // 6. Covered Wooden Gazebo Shelter (Right)
            val gzX = 162
            val gzY = 50
            px(gzX - 18, gzY - 4, 36, 18, "#532e16")
            px(gzX - 17, gzY - 5, 34, 17, "#78431e")
            px(gzX - 11, gzY - 2, 22, 10, "#9f1239")
            px(gzX - 9, gzY - 1, 18, 2, "#be123c")
            px(gzX - 16, gzY - 20, 3, 28, "#532e16")
            px(gzX + 13, gzY - 20, 3, 28, "#532e16")
            val lanternShift = if (frame % 2 == 0) 0 else 1
            px(gzX - 2 + lanternShift, gzY - 15, 4, 5, "#fef08a")
            px(gzX - 20, gzY - 24, 40, 8, "#6e3818")
            px(gzX - 16, gzY - 28, 32, 6, "#8c4820")
            px(gzX - 10, gzY - 31, 20, 4, "#c86f34")

            // 7. Ceramic Food Bowl (Center-Bottom)
            val bwX = 100
            val bwY = 74
            px(bwX - 7, bwY, 14, 5, "#0284c7")
            px(bwX - 6, bwY - 1, 12, 4, "#38bdf8")
            px(bwX - 4, bwY - 2, 8, 3, "#d97706")

            // 8. Side-Profile Lilo & Cheeto (Animated by frame 0..3 & mode)
            val liloX = if (mode == "EAT") 84 else 76 + (if (frame == 1 || frame == 2) 2 else 0)
            val liloY = if (mode == "EAT") 74 else 68
            val cheetoX = if (mode == "EAT") 116 else 118 - (if (frame == 1 || frame == 2) 2 else 0)
            val cheetoY = if (mode == "EAT") 74 else 68

            drawSideProfileCat(
                c, p,
                x = liloX, y = liloY,
                facingRight = true,
                frame = frame,
                mode = mode,
                eyeLeft = "#29b6f6",
                eyeRight = "#29b6f6",
                collar = "#1e88e5"
            )

            drawSideProfileCat(
                c, p,
                x = cheetoX, y = cheetoY,
                facingRight = false,
                frame = (frame + 2) % 4,
                mode = mode,
                eyeLeft = "#ffb300",
                eyeRight = "#29b6f6",
                collar = null
            )

            // 9. Animated Floating Pixel Hearts & Critters
            val heartY = 50 - (frame * 2)
            drawPixelHeart(c, p, 97, heartY, "#fb7185")
            if (mode == "PET") {
                drawPixelHeart(c, p, liloX + 2, liloY - 18 - (frame * 2), "#38bdf8")
                drawPixelHeart(c, p, cheetoX - 2, cheetoY - 18 - (frame * 2), "#fbbf24")
            }

            val bfX = 52 + (frame * 3)
            val bfY = 40 + (if (frame % 2 == 0) -2 else 1)
            if (isNight) {
                px(bfX, bfY, 2, 2, "#fde047")
                px(138, 42 - (frame % 2) * 2, 2, 2, "#fde047")
            } else {
                px(bfX, bfY, if (frame % 2 == 0) 3 else 1, if (frame % 2 == 0) 2 else 3, "#f472b6")
            }

            // 10. Top Stardew Banner Plaque + Pixel Sun/Moon & Sparkle Icons
            px(14, 5, w - 28, 16, "#3b1d0a")
            px(16, 7, w - 32, 12, "#f7dba7")

            // Left Banner Icon: Pixel Sun or Moon
            if (isNight) {
                drawPixelMoonIcon(c, p, 22, 10, "#7c3aed")
            } else {
                drawPixelSunIcon(c, p, 22, 10, "#d97706")
            }
            // Right Banner Icon: Pixel Sparkle (#pi-sparkle)
            drawPixelSparkleIcon(c, p, w - 27, 10, "#0284c7")

            p.color = Color.parseColor("#3b1d0a")
            p.isAntiAlias = true
            p.textSize = 7.2f
            p.typeface = Typeface.DEFAULT_BOLD
            p.textAlign = Paint.Align.CENTER
            val statusLabel = when (mode) {
                "PET" -> "Lilo & Cheeto: Purring ($petsCount Pets)"
                "EAT" -> "Lilo & Cheeto: Munching Kibble"
                else -> "Lilo & Cheeto's Sanctuary"
            }
            c.drawText(statusLabel, (w / 2).toFloat(), 15.5f, p)
            p.isAntiAlias = false

            // 11. Bottom Interactive Stardew Button Bar (With Pixel Heart & Pixel Fish Icons)
            // Left Button: Pet Brothers
            px(12, h - 20, 84, 14, "#3b1d0a")
            px(13, h - 19, 82, 12, "#f6d397")
            drawPixelHeart(c, p, 22, h - 13, "#29b6f6")
            drawPixelHeart(c, p, 30, h - 13, "#ffb300")

            // Right Button: Fill Bowl
            px(w - 96, h - 20, 84, 14, "#3b1d0a")
            px(w - 95, h - 19, 82, 12, "#68b82e")
            drawPixelFishIcon(c, p, w - 86, h - 16, "#fde047")

            p.isAntiAlias = true
            p.textSize = 7.2f
            p.color = Color.parseColor("#3b1d0a")
            c.drawText("Pet Brothers", 61f, (h - 10.5f), p)
            p.color = Color.parseColor("#ffffff")
            c.drawText("Fill Bowl", (w - 47).toFloat(), (h - 10.5f), p)
            p.isAntiAlias = false

            // 12. Outer Carved Stardew Wooden Border
            px(0, 0, w, 3, "#3b1d0a")
            px(0, h - 3, w, 3, "#3b1d0a")
            px(0, 0, 3, h, "#3b1d0a")
            px(w - 3, 0, 3, h, "#3b1d0a")

            px(3, 3, w - 6, 2, "#8f4d22")
            px(3, h - 5, w - 6, 2, "#8f4d22")
            px(3, 3, 2, h - 6, "#8f4d22")
            px(w - 5, 3, 2, h - 6, "#8f4d22")

            return bmp
        }

        private fun drawSideProfileCat(
            c: Canvas,
            p: Paint,
            x: Int,
            y: Int,
            facingRight: Boolean,
            frame: Int,
            mode: String,
            eyeLeft: String,
            eyeRight: String,
            collar: String?
        ) {
            c.save()
            c.translate(x.toFloat(), y.toFloat())

            p.color = Color.parseColor("#223824")
            c.drawRect(-7f, -1f, 7f, 2f, p)

            if (!facingRight) {
                c.scale(-1f, 1f)
            }

            fun r(rx: Int, ry: Int, rw: Int, rh: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(rx.toFloat(), ry.toFloat(), (rx + rw).toFloat(), (ry + rh).toFloat(), p)
            }

            val bounceY = if (frame % 2 == 1) -1 else 0
            val tailWagY = if (frame == 0) -1 else if (frame == 2) 1 else 0
            val headDip = if (mode == "EAT" && frame % 2 == 1) 2 else 0

            r(-8, -8 + bounceY, 2, 3, "#ffffff")
            r(-9, -11 + bounceY + tailWagY, 2, 4, "#ffffff")

            r(-6, -8 + bounceY, 11, 6, "#ffffff")
            r(-6, -4 + bounceY, 11, 2, "#dbe7f5")

            if (collar != null) {
                r(2, -5 + bounceY, 3, 1, collar)
                r(4, -4 + bounceY, 1, 1, "#fde047")
            }

            val legA = if (frame % 2 == 0) 0 else -1
            val legB = if (frame % 2 == 1) 0 else -1
            r(-5, -2 + legA, 2, 2, "#dbe7f5")
            r(-2, -2 + legB, 2, 2, "#ffffff")
            r(1, -2 + legB, 2, 2, "#dbe7f5")
            r(3, -2 + legA, 2, 2, "#ffffff")

            val hy = -13 + bounceY + headDip
            r(0, hy, 8, 6, "#ffffff")
            r(1, hy - 1, 6, 1, "#ffffff")
            r(0, hy + 5, 8, 1, "#dbe7f5")
            r(1, hy - 3, 2, 2, "#ffffff")
            r(5, hy - 3, 2, 2, "#ffffff")
            r(1, hy - 2, 1, 1, "#ff9ebb")
            r(6, hy - 2, 1, 1, "#ff9ebb")

            if (frame == 3 || mode == "PET") {
                r(2, hy + 2, 2, 1, "#334155")
                r(5, hy + 2, 2, 1, "#334155")
            } else {
                r(2, hy + 1, 2, 2, eyeLeft)
                r(5, hy + 1, 2, 2, eyeRight)
                r(2, hy + 1, 1, 1, "#ffffff")
                r(5, hy + 1, 1, 1, "#ffffff")
            }

            r(4, hy + 3, 1, 1, "#ff9ebb")
            c.restore()
        }

        // Pixel Icon 1: Solid Heart (#pi-heart-solid)
        private fun drawPixelHeart(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x - 2).toFloat(), (y - 2).toFloat(), x.toFloat(), y.toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y - 2).toFloat(), (x + 3).toFloat(), y.toFloat(), p)
            c.drawRect((x - 3).toFloat(), (y - 1).toFloat(), (x + 4).toFloat(), (y + 1).toFloat(), p)
            c.drawRect((x - 2).toFloat(), (y + 1).toFloat(), (x + 3).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x - 1).toFloat(), (y + 2).toFloat(), (x + 2).toFloat(), (y + 3).toFloat(), p)
        }

        // Pixel Icon 2: Fish (#pi-fish) for Fill Bowl Button
        private fun drawPixelFishIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            // Tail fin
            c.drawRect(x.toFloat(), (y + 1).toFloat(), (x + 2).toFloat(), (y + 5).toFloat(), p)
            // Fish body
            c.drawRect((x + 2).toFloat(), (y + 2).toFloat(), (x + 4).toFloat(), (y + 4).toFloat(), p)
            c.drawRect((x + 4).toFloat(), (y + 1).toFloat(), (x + 9).toFloat(), (y + 5).toFloat(), p)
            c.drawRect((x + 9).toFloat(), (y + 2).toFloat(), (x + 11).toFloat(), (y + 4).toFloat(), p)
            // Eye pixel
            p.color = Color.parseColor("#3b1d0a")
            c.drawRect((x + 8).toFloat(), (y + 2).toFloat(), (x + 9).toFloat(), (y + 3).toFloat(), p)
        }

        // Pixel Icon 3: Sparkle (#pi-sparkle)
        private fun drawPixelSparkleIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 2).toFloat(), y.toFloat(), (x + 3).toFloat(), (y + 5).toFloat(), p)
            c.drawRect(x.toFloat(), (y + 2).toFloat(), (x + 5).toFloat(), (y + 3).toFloat(), p)
        }

        // Pixel Icon 4: Sun (#pi-sun)
        private fun drawPixelSunIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 1).toFloat(), (y + 1).toFloat(), (x + 4).toFloat(), (y + 4).toFloat(), p)
            c.drawRect((x + 2).toFloat(), y.toFloat(), (x + 3).toFloat(), (y + 5).toFloat(), p)
            c.drawRect(x.toFloat(), (y + 2).toFloat(), (x + 5).toFloat(), (y + 3).toFloat(), p)
        }

        // Pixel Icon 5: Crescent Moon (#pi-moon)
        private fun drawPixelMoonIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 1).toFloat(), y.toFloat(), (x + 4).toFloat(), (y + 1).toFloat(), p)
            c.drawRect(x.toFloat(), (y + 1).toFloat(), (x + 2).toFloat(), (y + 4).toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y + 4).toFloat(), (x + 4).toFloat(), (y + 5).toFloat(), p)
        }
    }
}
