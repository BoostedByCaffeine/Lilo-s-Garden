package com.valois.lilosgarden

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import android.os.BatteryManager
import android.os.Bundle
import android.widget.RemoteViews
import androidx.core.content.res.ResourcesCompat
import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.sin

class LiloBatteryWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateBatteryWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateBatteryWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        )
        val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)

        when (intent.action) {
            ACTION_BAT_PET -> {
                val key = "bat_pet_boost_$appWidgetId"
                prefs.edit().putBoolean(key, !prefs.getBoolean(key, false)).apply()
                refreshAllBatteryWidgets(context)
            }
            ACTION_BAT_SWITCH_CAT -> {
                val roster = getAvailableCats(prefs)
                val key = "bat_cat_idx_$appWidgetId"
                val nextIdx = (prefs.getInt(key, 0) + 1) % roster.size
                prefs.edit().putInt(key, nextIdx).apply()
                refreshAllBatteryWidgets(context)
            }
            Intent.ACTION_POWER_CONNECTED,
            Intent.ACTION_POWER_DISCONNECTED,
            Intent.ACTION_BATTERY_LOW,
            Intent.ACTION_BATTERY_OKAY,
            Intent.ACTION_TIME_CHANGED -> {
                refreshAllBatteryWidgets(context)
            }
        }
    }

    companion object {
        const val ACTION_BAT_PET = "com.valois.lilosgarden.ACTION_BAT_PET"
        const val ACTION_BAT_SWITCH_CAT = "com.valois.lilosgarden.ACTION_BAT_SWITCH_CAT"
        private const val TOTAL_FRAMES = 12

        data class CatSpec(
            val id: String,
            val name: String,
            val coat: String,
            val shade: String,
            val eyeLeft: String,
            val eyeRight: String,
            val collar: String?,
            val pattern: String
        )

        data class BatteryState(val pct: Int, val isCharging: Boolean)

        fun refreshAllBatteryWidgets(context: Context) {
            try {
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(
                    ComponentName(context, LiloBatteryWidgetProvider::class.java)
                )
                for (id in ids) {
                    updateBatteryWidget(context, manager, id)
                }
            } catch (_: Exception) {}
        }

        private fun readBatteryState(context: Context): BatteryState {
            return try {
                val status: Intent? = IntentFilter(Intent.ACTION_BATTERY_CHANGED).let { filter ->
                    context.applicationContext.registerReceiver(null, filter)
                }
                val level = status?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
                val scale = status?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
                val pct = if (level >= 0 && scale > 0) ((level * 100f) / scale).roundToInt().coerceIn(0, 100) else 85
                val st = status?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
                val charging = st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL
                BatteryState(pct, charging)
            } catch (_: Exception) {
                BatteryState(85, false)
            }
        }

        private fun getAvailableCats(prefs: android.content.SharedPreferences): List<CatSpec> {
            val list = mutableListOf(
                CatSpec("lilo", "Lilo", "#ffffff", "#dbe7f5", "#29b6f6", "#29b6f6", "#1e88e5", "solid"),
                CatSpec("cheeto", "Cheeto", "#ffffff", "#eee8dc", "#ffb300", "#29b6f6", null, "solid")
            )
            val jsonStr = prefs.getString("garden_json", null)
            if (!jsonStr.isNullOrEmpty()) {
                try {
                    val obj = JSONObject(jsonStr)
                    val arr = obj.optJSONArray("companions")
                    if (arr != null) {
                        for (i in 0 until arr.length()) {
                            val c = arr.getJSONObject(i)
                            list.add(
                                CatSpec(
                                    c.optString("id", "cat_$i"),
                                    c.optString("name", "Mochi"),
                                    c.optString("coatColor", "#f59e42"),
                                    c.optString("shadeColor", "#c96f18"),
                                    c.optString("eyeColor", "#4ade80"),
                                    c.optString("eyeColorRight", c.optString("eyeColor", "#4ade80")),
                                    null,
                                    c.optString("pattern", "solid")
                                )
                            )
                        }
                    }
                } catch (_: Exception) {}
            }
            return list
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

        fun loadPixelTypeface(context: Context): Typeface {
            return try {
                Typeface.createFromAsset(context.assets, "www/assets/fonts/Stardew_Valley.ttf")
            } catch (e1: Exception) {
                try {
                    ResourcesCompat.getFont(context, R.font.press_start_2p) ?: Typeface.MONOSPACE
                } catch (e2: Exception) {
                    Typeface.MONOSPACE
                }
            }
        }

        fun updateBatteryWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            try {
                val views = RemoteViews(context.packageName, R.layout.lilo_battery_widget)
                val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
                val roster = getAvailableCats(prefs)
                val catIdx = prefs.getInt("bat_cat_idx_$appWidgetId", 0) % roster.size
                val cat = roster[catIdx]
                val isPetBoost = prefs.getBoolean("bat_pet_boost_$appWidgetId", false)

                val bat = readBatteryState(context)
                val pixelFont = loadPixelTypeface(context)

                val moodLabel = when {
                    bat.isCharging -> "Charging"
                    bat.pct >= 80 -> "Zoomies!"
                    bat.pct >= 30 -> "Cozy"
                    else -> "Sleepy"
                }
                val subMoodText = when {
                    bat.isCharging -> "Warming by campfire"
                    bat.pct >= 80 -> "Full of purr-nergy!"
                    bat.pct >= 30 -> "Content & grooming"
                    else -> "Needs a nap soon..."
                }

                // LAYER 2: High-Res Typography Overlay (440x224)
                val hudBmp = Bitmap.createBitmap(440, 224, Bitmap.Config.ARGB_8888)
                val hudCanvas = Canvas(hudBmp)
                val tp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = pixelFont
                    isFakeBoldText = true
                }

                // 1. Top Scroll Title
                tp.textSize = 17.5f
                tp.color = Color.parseColor("#3b1d0a")
                tp.textAlign = Paint.Align.LEFT
                hudCanvas.drawText("${cat.name} • $moodLabel", 224f, 40f, tp)

                // 2. Large Battery Purr-cent Readout
                tp.textSize = 32f
                tp.color = Color.parseColor("#ffefc7")
                hudCanvas.drawText("${bat.pct}%", 224f, 94f, tp)
                tp.color = when {
                    bat.isCharging -> Color.parseColor("#15803d")
                    bat.pct < 25 -> Color.parseColor("#b91c1c")
                    else -> Color.parseColor("#3b1d0a")
                }
                hudCanvas.drawText("${bat.pct}%", 222f, 92f, tp)

                // 3. Subtitle under Battery Bar
                tp.textSize = 15.5f
                tp.color = Color.parseColor("#6e3f1d")
                hudCanvas.drawText(subMoodText, 224f, 146f, tp)

                // 4. Bottom-Left Status Label
                val statusShort = if (bat.isCharging) "⚡ Plugged" else "Purr-cent"
                tp.textSize = 16f
                tp.color = Color.parseColor("#0369a1")
                hudCanvas.drawText(statusShort, 224f, 182f, tp)

                views.setImageViewBitmap(R.id.bat_hud_overlay, hudBmp)

                // LAYER 1: 32-Frame Pixel Animation Loop
                val grassTileBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/1 Tiles/FieldsTile_38.png")
                val campfireBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/3 Animated Objects/2 Campfire/2.png")
                val bushBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/9 Bush/1.png")

                views.removeAllViews(R.id.bat_flipper)
                for (f in 0 until TOTAL_FRAMES) {
                    val frameBmp = drawBatteryHudPixelPass(
                        f, cat, bat, isPetBoost, grassTileBmp, campfireBmp, bushBmp
                    )
                    val frameViews = RemoteViews(context.packageName, R.layout.widget_flipper_frame)
                    frameViews.setImageViewBitmap(R.id.frame_img, frameBmp)
                    views.addView(R.id.bat_flipper, frameViews)
                }

                grassTileBmp?.recycle()
                campfireBmp?.recycle()
                bushBmp?.recycle()

                val openIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val openPending = PendingIntent.getActivity(
                    context,
                    appWidgetId + 1100,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.bat_open_app, openPending)
                views.setOnClickPendingIntent(R.id.bat_status_spacer, openPending)

                val petIntent = Intent(context, LiloBatteryWidgetProvider::class.java).apply {
                    action = ACTION_BAT_PET
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                val petPending = PendingIntent.getBroadcast(
                    context,
                    appWidgetId + 1110,
                    petIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.bat_btn_pet, petPending)
                views.setOnClickPendingIntent(R.id.bat_btn_boost, petPending)

                val switchIntent = Intent(context, LiloBatteryWidgetProvider::class.java).apply {
                    action = ACTION_BAT_SWITCH_CAT
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.bat_btn_switch_cat,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId + 1120,
                        switchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (_: Exception) {}
        }

        private fun drawBatteryHudPixelPass(
            frame: Int,
            cat: CatSpec,
            bat: BatteryState,
            isPetBoost: Boolean,
            grassTileBmp: Bitmap?,
            campfireBmp: Bitmap?,
            bushBmp: Bitmap?
        ): Bitmap {
            val w = 220
            val h = 112
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565)
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

            // 2. LEFT SANCTUARY BATTERY NOOK (x = 8..96, y = 8..104)
            val nookX = 8
            val nookY = 8
            val nookW = 88
            val nookH = 96

            val skyHex = when {
                bat.isCharging -> "#1e1b4b"
                bat.pct < 30 -> "#0f172a"
                else -> "#38bdf8"
            }
            px(nookX, nookY, nookW, 24, skyHex)
            px(nookX, nookY + 20, nookW, 8, "#2d5c2b")

            c.save()
            c.clipRect(nookX, nookY + 28, nookX + nookW, nookY + 68)
            if (grassTileBmp != null) {
                for (ty in (nookY + 28) until (nookY + 68) step 32) {
                    for (tx in nookX until (nookX + nookW) step 32) {
                        c.drawBitmap(grassTileBmp, null, Rect(tx, ty, tx + 32, ty + 32), p)
                    }
                }
            } else {
                px(nookX, nookY + 28, nookW, 40, "#a6b04f")
            }
            c.restore()

            if (bushBmp != null) {
                c.drawBitmap(bushBmp, null, Rect(nookX + 4, nookY + 20, nookX + 24, nookY + 36), p)
                c.drawBitmap(bushBmp, null, Rect(nookX + 66, nookY + 20, nookX + 86, nookY + 36), p)
            }

            // Wooden Deck Foreground
            px(nookX, nookY + 64, nookW, 3, "#3b1d0a")
            px(nookX, nookY + 67, nookW, 29, "#78431e")
            for (fy in (nookY + 72) until (nookY + nookH) step 6) {
                px(nookX, fy, nookW, 1, "#532e16")
            }

            // If Charging -> Draw Animated Campfire Beside Cat!
            if (bat.isCharging && campfireBmp != null && campfireBmp.width >= 192) {
                val fIdx = frame % 6
                c.drawBitmap(
                    campfireBmp,
                    Rect(fIdx * 32, 0, (fIdx + 1) * 32, campfireBmp.height),
                    Rect(nookX + 60, nookY + 58, nookX + 86, nookY + 84),
                    p
                )
            }

            // Draw Cat with Battery-Reactive Behavior
            val catX = if (bat.pct >= 80 && !bat.isCharging) {
                44 + (sin(frame * 0.4).toFloat() * 10f).roundToInt()
            } else {
                44
            }
            drawBatteryCat(c, p, catX, 86, frame, cat, bat, isPetBoost)

            // 3. CENTER DIVIDER & RIGHT PARCHMENT PANEL
            px(96, 6, 5, h - 12, "#3b1d0a")
            px(98, 6, 1, h - 12, "#8f4d22")

            val hudX = 101
            val hudY = 8
            val hudW = 111
            val hudH = 96
            px(hudX, hudY, hudW, hudH, "#f7dba7")

            // Top Banner
            px(105, 11, 103, 15, "#5e2c11")
            px(106, 12, 101, 13, "#ffefc7")

            // Main Recessed Battery Plaque
            px(105, 29, 103, 71, "#5e2c11")
            px(106, 30, 101, 69, "#3b1d0a")
            px(107, 31, 99, 67, "#f5deb3")

            // Pixel Battery Bar Gauge (x = 160..200, y = 36..52)
            val bx = 158
            val by = 36
            val bw = 40
            val bh = 14
            px(bx, by, bw, bh, "#3b1d0a")
            px(bx + bw, by + 4, 3, 6, "#3b1d0a") // Battery terminal nub
            px(bx + 2, by + 2, bw - 4, bh - 4, "#1e293b")

            val fillW = (((bw - 6) * bat.pct) / 100).coerceIn(2, bw - 6)
            val barColor = when {
                bat.isCharging -> "#22c55e"
                bat.pct >= 60 -> "#4ade80"
                bat.pct >= 25 -> "#fbbf24"
                else -> "#ef4444"
            }
            px(bx + 3, by + 3, fillW, bh - 6, barColor)

            // Divider Line & Bottom 2 Compact Icon Buttons
            px(112, 74, 89, 1, "#dfb573")

            // Button 1: Pet / Boost (Green)
            px(162, 77, 19, 17, "#1e4206")
            px(163, 78, 17, 15, "#448514")
            px(163, 78, 17, 2, "#76c932")
            drawPixelHeart(c, p, 171, 86, "#ffffff")

            // Button 2: Switch Cat (Gold)
            px(184, 77, 19, 17, "#3b1d0a")
            px(185, 78, 17, 15, "#dca03a")
            px(185, 78, 17, 2, "#ffe08a")
            drawPixelSwitchIcon(c, p, 189, 81, "#3b1d0a")

            return bmp
        }

        private fun drawBatteryCat(
            c: Canvas,
            p: Paint,
            cx: Int,
            cy: Int,
            frame: Int,
            cat: CatSpec,
            bat: BatteryState,
            isPetBoost: Boolean
        ) {
            val isSleepy = bat.pct < 30 && !bat.isCharging && !isPetBoost
            val isZoomies = bat.pct >= 80 || isPetBoost
            val hopY = if (isZoomies) (abs(sin(frame * 0.6)) * -4f).roundToInt() else 0

            c.save()
            c.translate(cx.toFloat(), (cy + hopY).toFloat())
            c.scale(2.0f, 2.0f)

            fun r(rx: Int, ry: Int, rw: Int, rh: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(rx.toFloat(), ry.toFloat(), (rx + rw).toFloat(), (ry + rh).toFloat(), p)
            }

            if (isSleepy) {
                val breath = if ((frame / 4) % 2 == 0) 0 else 1
                r(-7, -6 + breath, 14, 6, cat.coat)
                r(-7, -2, 14, 2, cat.shade)
                r(1, -8 + breath, 6, 5, cat.coat)
                r(2, -10 + breath, 2, 2, cat.coat)
                r(5, -10 + breath, 2, 2, cat.coat)
                r(3, -6 + breath, 2, 1, "#475569")
                val zy = -13 - ((frame % 16) / 2)
                r(7, zy, 3, 1, "#bae6fd")
                r(8, zy + 1, 1, 1, "#bae6fd")
                r(7, zy + 2, 3, 1, "#bae6fd")
                c.restore()
                return
            }

            val tailWagY = if (frame % 4 < 2) -1 else 1
            r(-8, -7, 2, 3, cat.coat)
            r(-9, -10 + tailWagY, 2, 4, cat.coat)
            r(-6, -8, 11, 6, cat.coat)
            r(-6, -4, 11, 2, cat.shade)

            if (cat.pattern == "tuxedo") r(2, -6, 3, 4, "#ffffff")
            else if (cat.pattern == "tabby") {
                r(-4, -8, 1, 4, cat.shade)
                r(-1, -8, 1, 4, cat.shade)
            } else if (cat.pattern == "patches") {
                r(-5, -8, 4, 3, "#e07a2b")
            }

            if (cat.collar != null) {
                r(2, -5, 3, 1, cat.collar)
                r(4, -4, 1, 1, "#fde047")
            }

            r(-5, -2, 2, 2, cat.shade)
            r(-2, -2, 2, 2, cat.coat)
            r(1, -2, 2, 2, cat.shade)
            r(3, -2, 2, 2, cat.coat)

            val hy = -13
            r(0, hy, 8, 6, cat.coat)
            r(1, hy - 3, 2, 2, cat.coat)
            r(5, hy - 3, 2, 2, cat.coat)
            r(1, hy - 2, 1, 1, "#ff9ebb")
            r(6, hy - 2, 1, 1, "#ff9ebb")

            if (frame % 12 == 0 || isPetBoost) {
                r(2, hy + 2, 2, 1, "#334155")
                r(5, hy + 2, 2, 1, "#334155")
            } else {
                r(2, hy + 1, 2, 2, cat.eyeLeft)
                r(5, hy + 1, 2, 2, cat.eyeRight)
            }
            r(4, hy + 3, 1, 1, "#ff9ebb")
            c.restore()

            if (bat.isCharging || isZoomies) {
                drawPixelHeart(c, p, cx, cy - 30 - (frame % 8), if (bat.isCharging) "#fde047" else "#fb7185")
            }
        }

        private fun drawPixelHeart(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x - 2).toFloat(), (y - 2).toFloat(), x.toFloat(), y.toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y - 2).toFloat(), (x + 3).toFloat(), y.toFloat(), p)
            c.drawRect((x - 3).toFloat(), (y - 1).toFloat(), (x + 4).toFloat(), (y + 1).toFloat(), p)
            c.drawRect((x - 2).toFloat(), (y + 1).toFloat(), (x + 3).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x - 1).toFloat(), (y + 2).toFloat(), (x + 2).toFloat(), (y + 3).toFloat(), p)
        }

        private fun drawPixelSwitchIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 1).toFloat(), (y + 1).toFloat(), (x + 8).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x + 6).toFloat(), y.toFloat(), (x + 7).toFloat(), (y + 3).toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y + 5).toFloat(), (x + 8).toFloat(), (y + 6).toFloat(), p)
            c.drawRect((x + 2).toFloat(), (y + 4).toFloat(), (x + 3).toFloat(), (y + 7).toFloat(), p)
        }
    }
}
