package com.valois.lilosgarden

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Bundle
import android.widget.RemoteViews
import android.widget.Toast
import androidx.core.content.res.ResourcesCompat
import kotlin.math.ceil

class LiloPomodoroWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updatePomodoroWidget(context, appWidgetManager, appWidgetId, fullUpdate = true)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updatePomodoroWidget(context, appWidgetManager, appWidgetId, fullUpdate = true)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()

        when (intent.action) {
            ACTION_POMO_TOGGLE -> {
                val running = prefs.getBoolean("pomo_running", false)
                if (running) {
                    val endAt = prefs.getLong("pomo_end_at", now)
                    val remMs = (endAt - now).coerceAtLeast(0L)
                    prefs.edit()
                        .putBoolean("pomo_running", false)
                        .putLong("pomo_remaining_ms", if (remMs > 0L) remMs else DEFAULT_DURATION_MS)
                        .apply()
                    cancelPomodoroTick(context)
                } else {
                    var remMs = prefs.getLong("pomo_remaining_ms", DEFAULT_DURATION_MS)
                    if (remMs <= 1000L) remMs = DEFAULT_DURATION_MS
                    prefs.edit()
                        .putBoolean("pomo_running", true)
                        .putLong("pomo_end_at", now + remMs)
                        .apply()
                    scheduleNextPomodoroTick(context, 15000L)
                }
                refreshAllPomodoroWidgets(context, fullUpdate = true)
            }
            ACTION_POMO_RESET -> {
                prefs.edit()
                    .putBoolean("pomo_running", false)
                    .putLong("pomo_remaining_ms", DEFAULT_DURATION_MS)
                    .apply()
                cancelPomodoroTick(context)
                refreshAllPomodoroWidgets(context, fullUpdate = true)
            }
            ACTION_POMO_TICK,
            Intent.ACTION_TIME_CHANGED -> {
                val running = prefs.getBoolean("pomo_running", false)
                if (running) {
                    val endAt = prefs.getLong("pomo_end_at", 0L)
                    val remMs = endAt - now
                    if (remMs <= 0L) {
                        // Completed 25-Minute Focus Session! Award +1 Bloom
                        val newBlooms = (prefs.getInt("blooms", 8) + 1).coerceAtMost(24)
                        val sessions = prefs.getInt("pomo_sessions", 0) + 1
                        prefs.edit()
                            .putBoolean("pomo_running", false)
                            .putLong("pomo_remaining_ms", DEFAULT_DURATION_MS)
                            .putInt("blooms", newBlooms)
                            .putInt("pomo_sessions", sessions)
                            .apply()
                        cancelPomodoroTick(context)
                        try {
                            Toast.makeText(
                                context,
                                "Campfire Focus Complete! +1 Forget-Me-Not Bloom ($newBlooms/24)",
                                Toast.LENGTH_LONG
                            ).show()
                        } catch (_: Exception) {}
                        LiloWidgetProvider.refreshAllWidgets(context)
                        refreshAllPomodoroWidgets(context, fullUpdate = true)
                    } else {
                        scheduleNextPomodoroTick(context, 15000L.coerceAtMost(remMs))
                        refreshAllPomodoroWidgets(context, fullUpdate = false)
                    }
                }
            }
        }
    }

    companion object {
        const val ACTION_POMO_TOGGLE = "com.valois.lilosgarden.ACTION_POMO_TOGGLE"
        const val ACTION_POMO_RESET = "com.valois.lilosgarden.ACTION_POMO_RESET"
        const val ACTION_POMO_TICK = "com.valois.lilosgarden.ACTION_POMO_TICK"
        private const val DEFAULT_DURATION_MS = 25 * 60 * 1000L
        private const val TOTAL_FRAMES = 24

        fun scheduleNextPomodoroTick(context: Context, delayMs: Long) {
            try {
                val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, LiloPomodoroWidgetProvider::class.java).apply {
                    action = ACTION_POMO_TICK
                }
                val pi = PendingIntent.getBroadcast(
                    context,
                    9901,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                am.set(AlarmManager.RTC, System.currentTimeMillis() + delayMs, pi)
            } catch (_: Exception) {}
        }

        fun cancelPomodoroTick(context: Context) {
            try {
                val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, LiloPomodoroWidgetProvider::class.java).apply {
                    action = ACTION_POMO_TICK
                }
                val pi = PendingIntent.getBroadcast(
                    context,
                    9901,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                am.cancel(pi)
            } catch (_: Exception) {}
        }

        fun refreshAllPomodoroWidgets(context: Context, fullUpdate: Boolean = true) {
            try {
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(
                    ComponentName(context, LiloPomodoroWidgetProvider::class.java)
                )
                for (id in ids) {
                    updatePomodoroWidget(context, manager, id, fullUpdate)
                }
            } catch (_: Exception) {}
        }

        private fun loadAssetBitmap(context: Context, relPath: String): Bitmap? {
            return try {
                context.assets.open("www/$relPath").use { stream ->
                    BitmapFactory.decodeStream(stream)
                }
            } catch (_: Exception) {
                null
            }
        }

        private fun loadPixelTypeface(context: Context): Typeface {
            try {
                return Typeface.createFromAsset(context.assets, "www/assets/fonts/Stardew_Valley.ttf")
            } catch (_: Exception) {}
            try {
                return Typeface.createFromAsset(context.assets, "www/assets/fonts/Stardew_Valley.otf")
            } catch (_: Exception) {}
            try {
                ResourcesCompat.getFont(context, R.font.press_start_2p)?.let { return it }
            } catch (_: Exception) {}
            return Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
        }

        fun updatePomodoroWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            fullUpdate: Boolean = true
        ) {
            try {
                val views = RemoteViews(context.packageName, R.layout.lilo_pomodoro_widget)
                val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
                val running = prefs.getBoolean("pomo_running", false)
                val now = System.currentTimeMillis()
                val remMs = if (running) {
                    (prefs.getLong("pomo_end_at", now) - now).coerceAtLeast(0L)
                } else {
                    prefs.getLong("pomo_remaining_ms", DEFAULT_DURATION_MS)
                }

                val totalSeconds = ceil(remMs / 1000.0).toInt()
                val mins = totalSeconds / 60
                val secs = totalSeconds % 60
                val timerText = String.format("%02d:%02d", mins, secs)
                val blooms = prefs.getInt("blooms", 8).coerceIn(1, 24)

                val pixelFont = loadPixelTypeface(context)

                // LAYER 2: High-Res Typography Overlay (440x224)
                val hudBmp = Bitmap.createBitmap(440, 224, Bitmap.Config.ARGB_8888)
                val hudCanvas = Canvas(hudBmp)
                val tp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = pixelFont
                    isFakeBoldText = true
                }

                // 1. Top Banner Title
                tp.textSize = 17.5f
                tp.color = Color.parseColor("#3b1d0a")
                tp.textAlign = Paint.Align.LEFT
                val titleStr = if (running) "Campfire • Focusing" else "Campfire • Resting"
                hudCanvas.drawText(titleStr, 224f, 40f, tp)

                // 2. Large Countdown Timer
                tp.textSize = 35f
                tp.color = Color.parseColor("#ffefc7")
                hudCanvas.drawText(timerText, 226f, 102f, tp)
                tp.color = if (running) Color.parseColor("#c2410c") else Color.parseColor("#3b1d0a")
                hudCanvas.drawText(timerText, 224f, 100f, tp)

                // 3. Subtitle
                tp.textSize = 15.5f
                tp.color = Color.parseColor("#6e3f1d")
                val subStr = if (running) "Lilo & Cheeto by fire" else "Tap flame to focus"
                hudCanvas.drawText(subStr, 224f, 130f, tp)

                // 4. Bottom-Left Bloom Reward Counter
                tp.textSize = 16f
                tp.color = Color.parseColor("#0369a1")
                hudCanvas.drawText("✿ $blooms/24 Blooms", 224f, 180f, tp)

                views.setImageViewBitmap(R.id.pomo_hud_overlay, hudBmp)

                if (!fullUpdate) {
                    appWidgetManager.partiallyUpdateAppWidget(appWidgetId, views)
                    return
                }

                // LAYER 1: 24-Frame Campfire Nook Loop
                val grassTileBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/1 Tiles/FieldsTile_38.png")
                val logBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/7 Decor/Log1.png")
                val fireActiveBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/3 Animated Objects/2 Campfire/2.png")
                val fireSmokeBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/3 Animated Objects/2 Campfire/1.png")

                views.removeAllViews(R.id.pomo_flipper)
                for (f in 0 until TOTAL_FRAMES) {
                    val raw = drawPomodoroCampfirePixelPass(
                        f, running, grassTileBmp, logBmp, fireActiveBmp, fireSmokeBmp
                    )
                    val scaled = Bitmap.createScaledBitmap(raw, 286, 146, false)
                    raw.recycle()
                    val frameBmp = scaled.copy(Bitmap.Config.RGB_565, false) ?: scaled
                    if (frameBmp != scaled) scaled.recycle()

                    val frameViews = RemoteViews(context.packageName, R.layout.widget_flipper_frame)
                    frameViews.setImageViewBitmap(R.id.frame_img, frameBmp)
                    views.addView(R.id.pomo_flipper, frameViews)
                }

                grassTileBmp?.recycle()
                logBmp?.recycle()
                fireActiveBmp?.recycle()
                fireSmokeBmp?.recycle()

                val openIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val openPending = PendingIntent.getActivity(
                    context,
                    appWidgetId + 1200,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.pomo_open_app, openPending)
                views.setOnClickPendingIntent(R.id.pomo_timer_area, openPending)
                views.setOnClickPendingIntent(R.id.pomo_bloom_badge, openPending)

                val toggleIntent = Intent(context, LiloPomodoroWidgetProvider::class.java).apply {
                    action = ACTION_POMO_TOGGLE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.pomo_btn_toggle,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId + 1210,
                        toggleIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                val resetIntent = Intent(context, LiloPomodoroWidgetProvider::class.java).apply {
                    action = ACTION_POMO_RESET
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.pomo_btn_reset,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId + 1220,
                        resetIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (_: Exception) {}
        }

        private fun drawPomodoroCampfirePixelPass(
            frame: Int,
            running: Boolean,
            grassTileBmp: Bitmap?,
            logBmp: Bitmap?,
            fireActiveBmp: Bitmap?,
            fireSmokeBmp: Bitmap?
        ): Bitmap {
            val w = 220
            val h = 112
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

            // 1. OUTER STARDEW WOODEN FRAME
            px(0, 0, w, h, "#3b1d0a")
            px(2, 2, w - 4, h - 4, "#8f4d22")
            px(4, 4, w - 8, h - 8, "#c87d3b")
            px(6, 6, w - 12, h - 12, "#3b1d0a")
            px(3, 3, 2, 2, "#fde047")
            px(w - 5, 3, 2, 2, "#fde047")
            px(3, h - 5, 2, 2, "#fde047")
            px(w - 5, h - 5, 2, 2, "#fde047")

            // 2. LEFT CAMPFIRE SANCTUARY NOOK (x = 8..96, y = 8..104)
            val nookX = 8
            val nookY = 8
            val nookW = 88
            val nookH = 96

            px(nookX, nookY, nookW, 24, "#0f172a")
            if (frame % 4 < 2) px(nookX + 16, nookY + 6, 2, 2, "#fde047")
            px(nookX + 68, nookY + 8, 2, 2, "#bae6fd")
            px(nookX, nookY + 20, nookW, 8, "#1e3a2f")

            c.save()
            c.clipRect(nookX, nookY + 28, nookX + nookW, nookY + 96)
            if (grassTileBmp != null) {
                for (ty in (nookY + 28) until (nookY + 96) step 32) {
                    for (tx in nookX until (nookX + nookW) step 32) {
                        c.drawBitmap(grassTileBmp, null, Rect(tx, ty, tx + 32, ty + 32), p)
                    }
                }
            } else {
                px(nookX, nookY + 28, nookW, 68, "#254c29")
            }
            p.color = Color.argb(95, 15, 23, 42)
            c.drawRect(nookX.toFloat(), (nookY + 28).toFloat(), (nookX + nookW).toFloat(), (nookY + nookH).toFloat(), p)
            c.restore()

            // Camp Log & Animated Campfire in Center of Nook
            if (logBmp != null) {
                c.drawBitmap(logBmp, null, Rect(nookX + 46, nookY + 42, nookX + 82, nookY + 62), p)
            }
            if (running) {
                val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
                glowPaint.shader = RadialGradient(
                    (nookX + 44).toFloat(), (nookY + 66).toFloat(), 34f,
                    Color.argb(120, 251, 146, 60), Color.argb(0, 251, 146, 60),
                    Shader.TileMode.CLAMP
                )
                c.drawCircle((nookX + 44).toFloat(), (nookY + 66).toFloat(), 34f, glowPaint)
            }

            val fireSheet = if (running) fireActiveBmp else fireSmokeBmp
            if (fireSheet != null && fireSheet.width >= 192) {
                val fIdx = frame % 6
                c.drawBitmap(
                    fireSheet,
                    Rect(fIdx * 32, 0, (fIdx + 1) * 32, fireSheet.height),
                    Rect(nookX + 30, nookY + 48, nookX + 60, nookY + 78),
                    p
                )
            }

            // Lilo (Left of fire) & Cheeto (Right of fire) Cozily Napping/Lounging
            drawCampfireCatLoaf(c, p, nookX + 20, nookY + 78, frame, isLilo = true, running = running)
            drawCampfireCatLoaf(c, p, nookX + 70, nookY + 78, frame + 2, isLilo = false, running = running)

            // 3. CENTER DIVIDER & RIGHT PARCHMENT HUD
            px(96, 6, 5, h - 12, "#3b1d0a")
            px(98, 6, 1, h - 12, "#8f4d22")

            px(101, 8, 111, 96, "#f7dba7")
            px(105, 11, 103, 15, "#5e2c11")
            px(106, 12, 101, 13, "#ffefc7")

            px(105, 29, 103, 71, "#5e2c11")
            px(106, 30, 101, 69, "#3b1d0a")
            px(107, 31, 99, 67, "#f5deb3")
            px(112, 74, 89, 1, "#dfb573")

            // Button 1: Start / Pause Flame Icon Button
            px(162, 77, 19, 17, "#1e4206")
            px(163, 78, 17, 15, if (running) "#ea580c" else "#448514")
            px(163, 78, 17, 2, if (running) "#fb923c" else "#76c932")
            if (running) {
                // Pause bars icon
                px(168, 82, 2, 7, "#ffffff")
                px(173, 82, 2, 7, "#ffffff")
            } else {
                // Play triangle icon
                px(169, 82, 2, 7, "#ffffff")
                px(171, 83, 2, 5, "#ffffff")
                px(173, 84, 2, 3, "#ffffff")
            }

            // Button 2: Reset Icon Button
            px(184, 77, 19, 17, "#3b1d0a")
            px(185, 78, 17, 15, "#dca03a")
            px(185, 78, 17, 2, "#ffe08a")
            px(190, 82, 7, 2, "#3b1d0a")
            px(190, 82, 2, 7, "#3b1d0a")
            px(190, 87, 7, 2, "#3b1d0a")

            return bmp
        }

        private fun drawCampfireCatLoaf(
            c: Canvas,
            p: Paint,
            x: Int,
            y: Int,
            frame: Int,
            isLilo: Boolean,
            running: Boolean
        ) {
            c.save()
            c.translate(x.toFloat(), y.toFloat())
            c.scale(1.4f, 1.4f)
            if (!isLilo) c.scale(-1f, 1f)

            fun r(rx: Int, ry: Int, rw: Int, rh: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(rx.toFloat(), ry.toFloat(), (rx + rw).toFloat(), (ry + rh).toFloat(), p)
            }

            val breath = if ((frame / 4) % 2 == 0) 0 else 1
            r(-7, -6 + breath, 14, 6, "#ffffff")
            r(-7, -2, 14, 2, if (isLilo) "#dbe7f5" else "#eee8dc")
            r(1, -8 + breath, 6, 5, "#ffffff")
            r(2, -10 + breath, 2, 2, "#ffffff")
            r(5, -10 + breath, 2, 2, "#ffffff")
            if (isLilo) {
                r(0, -4 + breath, 3, 1, "#1e88e5")
                r(2, -3 + breath, 1, 1, "#fde047")
            }
            if (running) {
                r(2, -7 + breath, 2, 2, if (isLilo) "#29b6f6" else "#ffb300")
                r(5, -7 + breath, 2, 2, "#29b6f6")
            } else {
                r(3, -6 + breath, 2, 1, "#475569")
            }
            c.restore()
        }
    }
}
