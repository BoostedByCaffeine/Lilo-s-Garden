package com.valois.lilosgarden

import android.app.AlarmManager
import android.app.PendingIntent
import androidwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.Typeface
import android.os.Bundle
import android.text.format.DateFormat
import android.widget.RemoteViews
import androidx.core.content.res.ResourcesCompat
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

class LiloWindowWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWindowWidget(context, appWidgetManager, appWidgetId)
        }
        scheduleNextMinuteTick(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateWindowWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        cancelMinuteTick(context)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        )
        val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)

        when (intent.action) {
            ACTION_WIN_PET -> {
                val key = "win_pet_active_$appWidgetId"
                val cur = prefs.getBoolean(key, false)
                prefs.edit().putBoolean(key, !cur).apply()
                refreshAllWindowWidgets(context)
            }
            ACTION_WIN_SWITCH_CAT -> {
                val roster = getWindowCatRoster(prefs)
                val key = "win_cat_idx_$appWidgetId"
                val nextIdx = (prefs.getInt(key, 0) + 1) % roster.size
                prefs.edit().putInt(key, nextIdx).apply()
                refreshAllWindowWidgets(context)
            }
            ACTION_WIN_WEATHER -> {
                val modes = arrayOf("AUTO", "SUNNY", "CLOUDY", "RAIN", "SUNSET", "NIGHT")
                val key = "win_sky_override_$appWidgetId"
                val cur = prefs.getString(key, "AUTO") ?: "AUTO"
                val next = modes[(modes.indexOf(cur) + 1) % modes.size]
                prefs.edit().putString(key, next).apply()
                refreshAllWindowWidgets(context)
            }
            ACTION_WIN_TICK,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED -> {
                refreshAllWindowWidgets(context)
                scheduleNextMinuteTick(context)
            }
        }
    }

    companion object {
        const val ACTION_WIN_PET = "com.valois.lilosgarden.ACTION_WIN_PET"
        const val ACTION_WIN_SWITCH_CAT = "com.valois.lilosgarden.ACTION_WIN_SWITCH_CAT"
        const val ACTION_WIN_WEATHER = "com.valois.lilosgarden.ACTION_WIN_WEATHER"
        const val ACTION_WIN_TICK = "com.valois.lilosgarden.ACTION_WIN_TICK"

        data class PeekCatSpec(
            val id: String,
            val name: String,
            val coat: String,
            val shade: String,
            val eyeLeft: String,
            val eyeRight: String,
            val collar: String?,
            val pattern: String
        )

        fun scheduleNextMinuteTick(context: Context) {
            try {
                val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, LiloWindowWidgetProvider::class.java).apply {
                    action = ACTION_WIN_TICK
                }
                val pi = PendingIntent.getBroadcast(
                    context,
                    9801,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val now = System.currentTimeMillis()
                val nextMinute = ((now / 60000L) + 1L) * 60000L + 500L
                am.set(AlarmManager.RTC, nextMinute, pi)
            } catch (e: Exception) {}
        }

        fun cancelMinuteTick(context: Context) {
            try {
                val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, LiloWindowWidgetProvider::class.java).apply {
                    action = ACTION_WIN_TICK
                }
                val pi = PendingIntent.getBroadcast(
                    context,
                    9801,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                am.cancel(pi)
            } catch (e: Exception) {}
        }

        fun refreshAllWindowWidgets(context: Context) {
            try {
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(
                    ComponentName(context, LiloWindowWidgetProvider::class.java)
                )
                for (id in ids) {
                    updateWindowWidget(context, manager, id)
                }
            } catch (e: Exception) {}
        }

        // Default roster is strictly Lilo & Cheeto; appends user-created cats from garden_json
        private fun getWindowCatRoster(prefs: android.content.SharedPreferences): List<PeekCatSpec> {
            val list = mutableListOf(
                PeekCatSpec("lilo", "Lilo", "#ffffff", "#dbe7f5", "#29b6f6", "#29b6f6", "#1e88e5", "solid"),
                PeekCatSpec("cheeto", "Cheeto", "#ffffff", "#eee8dc", "#ffb300", "#29b6f6", null, "solid")
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
                                PeekCatSpec(
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
                } catch (e: Exception) {}
            }
            return list
        }

        private fun loadAssetBitmap(context: Context, relPath: String): Bitmap? {
            return try {
                context.assets.open("www/$relPath").use { stream ->
                    BitmapFactory.decodeStream(stream)
                }
            } catch (e: Exception) {
                null
            }
        }

        private fun loadPixelTypeface(context: Context): Typeface {
            try {
                return Typeface.createFromAsset(context.assets, "www/assets/fonts/Stardew_Valley.ttf")
            } catch (e: Exception) {}
            try {
                return Typeface.createFromAsset(context.assets, "www/assets/fonts/Stardew_Valley.otf")
            } catch (e: Exception) {}
            try {
                ResourcesCompat.getFont(context, R.font.press_start_2p)?.let { return it }
            } catch (e: Exception) {}
            return Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
        }

        fun updateWindowWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            try {
                val views = RemoteViews(context.packageName, R.layout.lilo_window_widget)
                val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)

                val roster = getWindowCatRoster(prefs)
                val catIdx = prefs.getInt("win_cat_idx_$appWidgetId", 0) % roster.size
                val activeCat = roster[catIdx]
                val isPetted = prefs.getBoolean("win_pet_active_$appWidgetId", false)

                val cal = Calendar.getInstance()
                val hour = cal.get(Calendar.HOUR_OF_DAY)
                val timePhase = when {
                    hour in 17..18 -> "SUNSET"
                    hour < 6 || hour >= 19 -> "NIGHT"
                    else -> "DAY"
                }

                val syncedWeather = prefs.getString("weather", "SUNNY") ?: "SUNNY"
                val skyOverride = prefs.getString("win_sky_override_$appWidgetId", "AUTO") ?: "AUTO"

                val effectiveWeather = when (skyOverride) {
                    "SUNNY", "CLOUDY", "RAIN", "NIGHT" -> skyOverride
                    "SUNSET" -> "SUNNY"
                    else -> syncedWeather
                }
                val effectiveTimePhase = when (skyOverride) {
                    "SUNSET" -> "SUNSET"
                    "NIGHT" -> "NIGHT"
                    "SUNNY" -> if (timePhase == "NIGHT") "DAY" else timePhase
                    else -> if (effectiveWeather == "NIGHT") "NIGHT" else timePhase
                }

                val defaultTemp = when {
                    effectiveWeather == "RAIN" -> 18
                    effectiveTimePhase == "NIGHT" -> 19
                    effectiveTimePhase == "SUNSET" -> 22
                    else -> 25
                }
                val tempC = prefs.getInt("tempC", defaultTemp)

                val is24Hour = DateFormat.is24HourFormat(context)
                val timePattern = if (is24Hour) "HH:mm" else "hh:mm a"
                val timeStr = SimpleDateFormat(timePattern, Locale.getDefault()).format(Date()).uppercase(Locale.getDefault())

                val bush1 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/9 Bush/1.png")
                val bush2 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/9 Bush/2.png")

                val pixelFont = loadPixelTypeface(context)

                val frameIds = intArrayOf(
                    R.id.win_frame_0,
                    R.id.win_frame_1,
                    R.id.win_frame_2,
                    R.id.win_frame_3
                )

                for (f in 0..3) {
                    val raw = drawWindowScenePixelPass(
                        f,
                        effectiveWeather,
                        effectiveTimePhase,
                        activeCat,
                        isPetted,
                        bush1,
                        bush2
                    )
                    val scaledRaw = Bitmap.createScaledBitmap(raw, 400, 240, false)
                    val scaled = (if (scaledRaw.isMutable) scaledRaw else scaledRaw.copy(Bitmap.Config.ARGB_8888, true)) ?: scaledRaw
                    raw.recycle()
                    if (scaledRaw != scaled) scaledRaw.recycle()

                    val hiCanvas = Canvas(scaled)
                    val tp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        typeface = pixelFont
                        isFakeBoldText = true
                    }

                    // 1. Solid Bold Pixel Time on Top-Left
                    tp.textSize = 26f
                    tp.textAlign = Paint.Align.LEFT
                    tp.color = Color.parseColor("#0f172a")
                    hiCanvas.drawText(timeStr, 36f, 55f, tp)
                    tp.color = Color.parseColor("#fffbeb")
                    hiCanvas.drawText(timeStr, 34f, 53f, tp)

                    // 2. Solid Bold Pixel Temperature next to Weather Icon on Top-Right
                    tp.textSize = 23f
                    tp.textAlign = Paint.Align.RIGHT
                    tp.color = Color.parseColor("#0f172a")
                    hiCanvas.drawText("${tempC}°C", 328f, 54f, tp)
                    tp.color = Color.parseColor("#fffbeb")
                    hiCanvas.drawText("${tempC}°C", 326f, 52f, tp)

                    // 3. Active Cat Name Tag Aligned Under the Left-Corner Peeking Cat
                    tp.textSize = 15.5f
                    tp.textAlign = Paint.Align.LEFT
                    tp.color = Color.parseColor("#2a1208")
                    hiCanvas.drawText("${activeCat.name} (${catIdx + 1}/${roster.size})", 26f, 224f, tp)
                    tp.color = Color.parseColor("#ffefc7")
                    hiCanvas.drawText("${activeCat.name} (${catIdx + 1}/${roster.size})", 24f, 222f, tp)

                    val safeBmp = scaled.copy(Bitmap.Config.RGB_565, false) ?: scaled
                    if (safeBmp != scaled) scaled.recycle()
                    views.setImageViewBitmap(frameIds[f], safeBmp)
                }

                bush1?.recycle()
                bush2?.recycle()

                val openIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val openPending = PendingIntent.getActivity(
                    context,
                    appWidgetId + 800,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.win_open_app_area, openPending)
                views.setOnClickPendingIntent(R.id.win_clock_box, openPending)

                val petIntent = Intent(context, LiloWindowWidgetProvider::class.java).apply {
                    action = ACTION_WIN_PET
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.win_btn_pet_cats,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId + 810,
                        petIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                val switchIntent = Intent(context, LiloWindowWidgetProvider::class.java).apply {
                    action = ACTION_WIN_SWITCH_CAT
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.win_btn_switch_cat,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId + 820,
                        switchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                val weatherIntent = Intent(context, LiloWindowWidgetProvider::class.java).apply {
                    action = ACTION_WIN_WEATHER
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.win_btn_weather,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId + 830,
                        weatherIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {}
        }

        private fun drawWindowScenePixelPass(
            frame: Int,
            weather: String,
            timePhase: String,
            activeCat: PeekCatSpec,
            isPetted: Boolean,
            bush1: Bitmap?,
            bush2: Bitmap?
        ): Bitmap {
            val w = 200
            val h = 120
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

            val isRain = weather == "RAIN"
            val isCloudy = weather == "CLOUDY"
            val isNight = timePhase == "NIGHT" || weather == "NIGHT"
            val isSunset = timePhase == "SUNSET" && !isNight

            // 1. DYNAMIC SKY BACKDROP INSIDE WINDOW
            val skyBands = when {
                isRain -> arrayOf("#1e293b", "#283548", "#334155", "#475569")
                isCloudy && isNight -> arrayOf("#0f172a", "#1e293b", "#263346", "#334155")
                isCloudy && isSunset -> arrayOf("#431407", "#7c2d12", "#9a3412", "#c2410c")
                isCloudy -> arrayOf("#475569", "#64748b", "#94a3b8", "#cbd5e1")
                isNight -> arrayOf("#090d16", "#0f172a", "#1e1b4b", "#312e81")
                isSunset -> arrayOf("#4c1d95", "#9d174d", "#ea580c", "#fbbf24")
                else -> arrayOf("#0284c7", "#0ea5e9", "#38bdf8", "#bae6fd")
            }
            val bandH = 22
            for (i in 0..3) {
                px(10, 10 + i * bandH, 180, bandH, skyBands[i])
            }

            // 2. CELESTIAL BODIES & SKY EFFECTS
            if (isNight && !isRain) {
                val starCol1 = if (frame % 2 == 0) "#fde047" else "#ffffff"
                val starCol2 = if (frame % 2 == 1) "#fde047" else "#bae6fd"
                px(26, 18, 2, 2, starCol1)
                px(58, 14, 1, 1, "#ffffff")
                px(88, 22, 2, 2, starCol2)
                px(118, 16, 1, 1, starCol1)
                px(144, 28, 2, 2, starCol2)
                px(66, 38, 1, 1, "#bae6fd")
                px(134, 42, 2, 2, starCol1)
            } else if (isSunset && !isRain) {
                px(124, 56, 24, 16, "#f97316")
                px(126, 54, 20, 18, "#fbbf24")
                px(129, 57, 14, 12, "#fef08a")
            }

            val cloudShift = frame * 2
            if (isRain || isCloudy) {
                val cCol = if (isRain) "#64748b" else "#e2e8f0"
                val cShade = if (isRain) "#475569" else "#cbd5e1"
                px(20 + cloudShift, 34, 34, 7, cCol)
                px(24 + cloudShift, 31, 24, 4, cCol)
                px(20 + cloudShift, 39, 34, 2, cShade)

                px(114 - cloudShift, 40, 40, 8, cCol)
                px(120 - cloudShift, 36, 28, 5, cCol)
                px(114 - cloudShift, 46, 40, 2, cShade)
            } else if (!isNight) {
                val cCol = if (isSunset) "#fed7aa" else "#f0f9ff"
                px(24 + cloudShift, 40, 24, 5, cCol)
                px(28 + cloudShift, 38, 16, 3, cCol)
                px(128 - cloudShift, 44, 26, 5, cCol)
                px(132 - cloudShift, 42, 18, 3, cCol)
            }

            if (isRain) {
                for (rx in 18 until 182 step 16) {
                    val ry1 = 18 + ((rx * 3 + frame * 11) % 66)
                    val ry2 = 18 + ((rx * 5 + frame * 11 + 33) % 66)
                    px(rx, ry1, 1, 6, "#bae6fd")
                    px(rx + 7, ry2, 1, 5, "#7dd3fc")
                }
            }

            // 3. GARDEN BUSHES OUTSIDE THE WINDOW SILL
            px(10, 82, 180, 14, if (isNight) "#172d1a" else "#2d5c2b")
            if (bush1 != null) {
                c.drawBitmap(bush1, null, Rect(12, 74, 40, 94), p)
                c.drawBitmap(bush1, null, Rect(154, 74, 184, 94), p)
            }
            if (bush2 != null) {
                c.drawBitmap(bush2, null, Rect(66, 74, 98, 94), p)
                c.drawBitmap(bush2, null, Rect(112, 74, 146, 94), p)
            }

            // Window Mullion Crossbar
            px(99, 10, 2, 84, "#3b1d0a")
            px(10, 48, 180, 2, "#3b1d0a")

            // 4. TOP TIME & WEATHER ICON PILLS
            p.color = Color.argb(120, 15, 23, 42)
            c.drawRect(14f, 14f, 114f, 32f, p)
            c.drawRect(128f, 14f, 186f, 32f, p)

            val wx = 168
            val wy = 17
            when {
                isRain -> drawWeatherIconRain(c, p, wx, wy)
                isCloudy -> drawWeatherIconCloudy(c, p, wx, wy)
                isNight -> drawWeatherIconMoon(c, p, wx, wy)
                isSunset -> drawWeatherIconSunset(c, p, wx, wy)
                else -> drawWeatherIconSunny(c, p, wx, wy)
            }

            // 5. OUTER CARVED WOODEN WINDOW CASING & SILL
            px(0, 0, w, 10, "#3b1d0a")
            px(2, 2, w - 4, 6, "#8f4d22")
            px(4, 3, w - 8, 2, "#c87d3b")
            px(0, 0, 10, h, "#3b1d0a")
            px(2, 2, 6, h - 4, "#8f4d22")
            px(3, 4, 2, h - 8, "#c87d3b")
            px(w - 10, 0, 10, h, "#3b1d0a")
            px(w - 8, 2, 6, h - 4, "#8f4d22")
            px(w - 5, 4, 2, h - 8, "#c87d3b")

            px(0, 92, w, 28, "#3b1d0a")
            px(2, 94, w - 4, 8, "#c87d3b")
            px(2, 94, w - 4, 2, "#e6a968")
            px(2, 102, w - 4, 16, "#8f4d22")
            px(2, 102, w - 4, 2, "#5e2c11")

            px(4, 4, 2, 2, "#fde047")
            px(w - 6, 4, 2, 2, "#fde047")
            px(4, h - 6, 2, 2, "#fde047")
            px(w - 6, h - 6, 2, 2, "#fde047")

            // 6. PEEKING CAT TUCKED IN THE BOTTOM-LEFT WINDOW CORNER (cx = 42, scale = 2.0f)
            drawPeekingCatHeadAndPaws(
                c, p,
                cx = 42,
                sillY = 94,
                frame = frame,
                cat = activeCat,
                isPetted = isPetted
            )

            // 7. COMPACT PIXEL SWITCH-CAT ICON BUTTON ON RIGHT SIDE OF SILL
            val swX = 175
            val swY = 97
            px(swX, swY, 19, 17, "#3b1d0a")
            px(swX + 1, swY + 1, 17, 15, "#dca03a")
            px(swX + 1, swY + 1, 17, 2, "#ffe08a")
            px(swX + 1, swY + 14, 17, 2, "#9c5a2d")
            drawPixelSwitchIcon(c, p, swX + 5, swY + 5, "#3b1d0a")

            return bmp
        }

        private fun drawPeekingCatHeadAndPaws(
            c: Canvas,
            p: Paint,
            cx: Int,
            sillY: Int,
            frame: Int,
            cat: PeekCatSpec,
            isPetted: Boolean
        ) {
            val bobY = if (frame % 2 == 1) -1 else 0
            c.save()
            c.translate(cx.toFloat(), sillY.toFloat())
            // Smaller 2.0f scale so the cat sits cozily in the bottom-left corner
            c.scale(2.0f, 2.0f)

            fun r(rx: Int, ry: Int, rw: Int, rh: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(rx.toFloat(), ry.toFloat(), (rx + rw).toFloat(), (ry + rh).toFloat(), p)
            }

            r(-6, -3 + bobY, 12, 4, cat.shade)
            r(-5, -4 + bobY, 10, 4, cat.coat)
            if (cat.pattern == "tuxedo") {
                r(-2, -3 + bobY, 4, 3, "#ffffff")
            }

            if (cat.collar != null) {
                r(-4, -3 + bobY, 8, 1, cat.collar)
                r(-1, -2 + bobY, 2, 2, "#fde047")
            }

            val hy = -11 + bobY
            r(-5, hy, 10, 8, cat.coat)
            r(-4, hy - 1, 8, 1, cat.coat)
            r(-5, hy + 7, 10, 1, cat.shade)

            val earTwitch = if (frame == 2) 1 else 0
            r(-5, hy - 3 + earTwitch, 3, 3, cat.coat)
            r(2, hy - 3, 3, 3, cat.coat)
            r(-4, hy - 2 + earTwitch, 1, 2, "#ff9ebb")
            r(3, hy - 2, 1, 2, "#ff9ebb")

            if (cat.pattern == "tabby") {
                r(-1, hy - 1, 2, 3, cat.shade)
                r(-4, hy + 1, 2, 1, cat.shade)
                r(2, hy + 1, 2, 1, cat.shade)
            } else if (cat.pattern == "patches") {
                r(-5, hy - 1, 4, 4, "#e07a2b")
                r(2, hy, 3, 3, "#374151")
            } else if (cat.pattern == "tuxedo") {
                r(-2, hy + 4, 4, 4, "#ffffff")
            }

            if (isPetted || frame == 3) {
                r(-3, hy + 3, 2, 1, "#334155")
                r(1, hy + 3, 2, 1, "#334155")
            } else {
                r(-3, hy + 2, 2, 2, cat.eyeLeft)
                r(1, hy + 2, 2, 2, cat.eyeRight)
                r(-3, hy + 2, 1, 1, "#ffffff")
                r(1, hy + 2, 1, 1, "#ffffff")
            }

            r(-1, hy + 5, 2, 1, "#ff9ebb")
            if (isPetted) {
                r(-4, hy + 5, 1, 1, "#fda4af")
                r(3, hy + 5, 1, 1, "#fda4af")
            }

            val pawCol = if (cat.pattern == "tuxedo") "#ffffff" else cat.coat
            r(-6, -1, 3, 3, pawCol)
            r(-6, 1, 3, 1, cat.shade)
            r(3, -1, 3, 3, pawCol)
            r(3, 1, 3, 1, cat.shade)

            c.restore()

            if (isPetted || frame % 2 == 0) {
                val heartCol = if (cat.id == "cheeto") "#ffb300" else "#fb7185"
                drawPixelHeart(c, p, cx, sillY - 30 - (frame * 2), heartCol)
            }
        }

        private fun drawWeatherIconSunny(c: Canvas, p: Paint, x: Int, y: Int) {
            fun r(dx: Int, dy: Int, w: Int, h: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect((x + dx).toFloat(), (y + dy).toFloat(), (x + dx + w).toFloat(), (y + dy + h).toFloat(), p)
            }
            r(3, 3, 6, 6, "#fde047")
            r(4, 4, 4, 4, "#fef08a")
            r(5, 0, 2, 2, "#fbbf24")
            r(5, 10, 2, 2, "#fbbf24")
            r(0, 5, 2, 2, "#fbbf24")
            r(10, 5, 2, 2, "#fbbf24")
            r(1, 1, 2, 2, "#fbbf24")
            r(9, 1, 2, 2, "#fbbf24")
            r(1, 9, 2, 2, "#fbbf24")
            r(9, 9, 2, 2, "#fbbf24")
        }

        private fun drawWeatherIconSunset(c: Canvas, p: Paint, x: Int, y: Int) {
            fun r(dx: Int, dy: Int, w: Int, h: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect((x + dx).toFloat(), (y + dy).toFloat(), (x + dx + w).toFloat(), (y + dy + h).toFloat(), p)
            }
            r(2, 3, 8, 6, "#f97316")
            r(3, 2, 6, 6, "#fbbf24")
            r(0, 9, 12, 2, "#fde047")
            r(2, 11, 8, 1, "#fb923c")
        }

        private fun drawWeatherIconCloudy(c: Canvas, p: Paint, x: Int, y: Int) {
            fun r(dx: Int, dy: Int, w: Int, h: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect((x + dx).toFloat(), (y + dy).toFloat(), (x + dx + w).toFloat(), (y + dy + h).toFloat(), p)
            }
            r(3, 2, 6, 4, "#f8fafc")
            r(1, 4, 10, 5, "#e2e8f0")
            r(1, 8, 10, 2, "#94a3b8")
        }

        private fun drawWeatherIconRain(c: Canvas, p: Paint, x: Int, y: Int) {
            fun r(dx: Int, dy: Int, w: Int, h: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect((x + dx).toFloat(), (y + dy).toFloat(), (x + dx + w).toFloat(), (y + dy + h).toFloat(), p)
            }
            r(3, 1, 6, 3, "#cbd5e1")
            r(1, 3, 10, 5, "#94a3b8")
            r(2, 9, 2, 3, "#38bdf8")
            r(6, 9, 2, 3, "#38bdf8")
            r(9, 8, 2, 3, "#7dd3fc")
        }

        private fun drawWeatherIconMoon(c: Canvas, p: Paint, x: Int, y: Int) {
            fun r(dx: Int, dy: Int, w: Int, h: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect((x + dx).toFloat(), (y + dy).toFloat(), (x + dx + w).toFloat(), (y + dy + h).toFloat(), p)
            }
            r(3, 1, 5, 2, "#fde047")
            r(1, 3, 4, 6, "#fde047")
            r(3, 9, 5, 2, "#fde047")
            r(9, 2, 2, 2, "#fef08a")
        }

        private fun drawPixelSwitchIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 1).toFloat(), (y + 1).toFloat(), (x + 8).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x + 6).toFloat(), y.toFloat(), (x + 7).toFloat(), (y + 3).toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y + 5).toFloat(), (x + 8).toFloat(), (y + 6).toFloat(), p)
            c.drawRect((x + 2).toFloat(), (y + 4).toFloat(), (x + 3).toFloat(), (y + 7).toFloat(), p)
        }

        private fun drawPixelHeart(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x - 2).toFloat(), (y - 2).toFloat(), x.toFloat(), y.toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y - 2).toFloat(), (x + 3).toFloat(), y.toFloat(), p)
            c.drawRect((x - 3).toFloat(), (y - 1).toFloat(), (x + 4).toFloat(), (y + 1).toFloat(), p)
            c.drawRect((x - 2).toFloat(), (y + 1).toFloat(), (x + 3).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x - 1).toFloat(), (y + 2).toFloat(), (x + 2).toFloat(), (y + 3).toFloat(), p)
        }
    }
}