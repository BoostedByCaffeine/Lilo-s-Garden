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
import android.graphics.Rect
import android.os.Bundle
import android.text.format.DateFormat
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.sin

class LiloWeatherWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        WeatherSyncHelper.syncIfStale(context)
        for (appWidgetId in appWidgetIds) {
            updateWeatherWidget(context, appWidgetManager, appWidgetId, fullUpdate = true)
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
        updateWeatherWidget(context, appWidgetManager, appWidgetId, fullUpdate = true)
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
            ACTION_WEATHER_PET -> {
                val key = "weather_pet_active_$appWidgetId"
                val cur = prefs.getBoolean(key, false)
                prefs.edit().putBoolean(key, !cur).apply()
                refreshAllWeatherWidgets(context, fullUpdate = true)
            }
            ACTION_WEATHER_SWITCH_CAT -> {
                val roster = getWeatherCatRoster(prefs)
                val key = "weather_cat_idx_$appWidgetId"
                val nextIdx = (prefs.getInt(key, 0) + 1) % roster.size
                prefs.edit().putInt(key, nextIdx).apply()
                refreshAllWeatherWidgets(context, fullUpdate = true)
            }
            ACTION_WEATHER_REFRESH -> {
                WeatherSyncHelper.syncIfStale(context)
                refreshAllWeatherWidgets(context, fullUpdate = true)
            }
            ACTION_WEATHER_TICK,
            Intent.ACTION_TIME_CHANGED,
            Intent.ACTION_TIMEZONE_CHANGED -> {
                WeatherSyncHelper.syncIfStale(context)
                refreshAllWeatherWidgets(context, fullUpdate = false)
                scheduleNextMinuteTick(context)
            }
        }
    }

    companion object {
        const val ACTION_WEATHER_REFRESH = "com.valois.lilosgarden.ACTION_WEATHER_REFRESH"
        const val ACTION_WEATHER_SWITCH_CAT = "com.valois.lilosgarden.ACTION_WEATHER_SWITCH_CAT"
        const val ACTION_WEATHER_PET = "com.valois.lilosgarden.ACTION_WEATHER_PET"
        const val ACTION_WEATHER_TICK = "com.valois.lilosgarden.ACTION_WEATHER_TICK"

        private const val TOTAL_FRAMES = 12

        data class WeatherCatSpec(
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
                val intent = Intent(context, LiloWeatherWidgetProvider::class.java).apply {
                    action = ACTION_WEATHER_TICK
                }
                val pi = PendingIntent.getBroadcast(
                    context,
                    9850,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                val now = System.currentTimeMillis()
                val nextMinute = ((now / 60000L) + 1L) * 60000L + 250L
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
                    am.setWindow(AlarmManager.RTC, nextMinute, 5000L, pi)
                } else {
                    am.set(AlarmManager.RTC, nextMinute, pi)
                }
            } catch (_: Exception) {}
        }

        fun cancelMinuteTick(context: Context) {
            try {
                val am = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                val intent = Intent(context, LiloWeatherWidgetProvider::class.java).apply {
                    action = ACTION_WEATHER_TICK
                }
                val pi = PendingIntent.getBroadcast(
                    context,
                    9850,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                am.cancel(pi)
            } catch (_: Exception) {}
        }

        fun refreshAllWeatherWidgets(context: Context, fullUpdate: Boolean = true) {
            try {
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(
                    ComponentName(context, LiloWeatherWidgetProvider::class.java)
                )
                for (id in ids) {
                    updateWeatherWidget(context, manager, id, fullUpdate)
                }
            } catch (_: Exception) {}
        }

        private fun getWeatherCatRoster(prefs: android.content.SharedPreferences): List<WeatherCatSpec> {
            val list = mutableListOf(
                WeatherCatSpec("lilo", "Lilo", "#ffffff", "#dbe7f5", "#29b6f6", "#29b6f6", "#1e88e5", "solid"),
                WeatherCatSpec("cheeto", "Cheeto", "#ffffff", "#eee8dc", "#ffb300", "#29b6f6", null, "solid")
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
                                WeatherCatSpec(
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

        fun updateWeatherWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
            fullUpdate: Boolean = true
        ) {
            try {
                val views = RemoteViews(context.packageName, R.layout.lilo_weather_widget)
                val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)

                val roster = getWeatherCatRoster(prefs)
                val catIdx = prefs.getInt("weather_cat_idx_$appWidgetId", 0) % roster.size
                val activeCat = roster[catIdx]
                val isPetted = prefs.getBoolean("weather_pet_active_$appWidgetId", false)

                val cal = Calendar.getInstance()
                val hour = cal.get(Calendar.HOUR_OF_DAY)
                val timePhase = when {
                    hour in 17..18 -> "SUNSET"
                    hour < 6 || hour >= 19 -> "NIGHT"
                    else -> "DAY"
                }

                val syncedWeather = prefs.getString("weather", "SUNNY") ?: "SUNNY"
                val effectiveWeather = syncedWeather
                val effectiveTimePhase = if (effectiveWeather == "NIGHT") "NIGHT" else timePhase

                val tempC = prefs.getInt("tempC", 24)
                val tempUnit = prefs.getString("temp_unit", "C") ?: "C"
                val displayTemp = if (tempUnit == "F") {
                    "${Math.round(tempC * 9f / 5f + 32f).toInt()}°F"
                } else {
                    "${tempC}°C"
                }

                val city = prefs.getString("weather_city", "Sanctuary") ?: "Sanctuary"
                val skyDesc = prefs.getString("weather_sky_desc", when (effectiveWeather) {
                    "RAIN" -> "Rain Shower"
                    "CLOUDY" -> "Cloudy Sky"
                    "NIGHT" -> "Starry Night"
                    else -> "Sunny Sky"
                }) ?: "Sunny Sky"

                val is24Hour = DateFormat.is24HourFormat(context)
                val timePattern = if (is24Hour) "HH:mm" else "hh:mm a"
                val timeStr = SimpleDateFormat(timePattern, Locale.getDefault()).format(Date()).uppercase(Locale.getDefault())

                val pixelFont = WidgetFontHelper.loadPixelTypeface(context)

                // LAYER 2: High-Resolution Typography HUD Overlay (400x240 ARGB_8888 -> Scaled to 300x180)
                val rawHudBmp = Bitmap.createBitmap(400, 240, Bitmap.Config.ARGB_8888)
                val hudCanvas = Canvas(rawHudBmp)
                val tp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                    typeface = pixelFont
                    isFakeBoldText = true
                }

                // 1. Top-Left: Live Clock & Location tag
                tp.textSize = 24f
                tp.textAlign = Paint.Align.LEFT
                tp.color = Color.parseColor("#1e293b")
                hudCanvas.drawText(timeStr, 28f, 48f, tp)
                tp.color = Color.parseColor("#ffffff")
                hudCanvas.drawText(timeStr, 26f, 46f, tp)

                tp.textSize = 15f
                tp.color = Color.parseColor("#0f172a")
                hudCanvas.drawText("• $city", 136f, 48f, tp)
                tp.color = Color.parseColor("#fef08a")
                hudCanvas.drawText("• $city", 134f, 46f, tp)

                // 2. Top-Right: Bold Pixel Temperature
                tp.textSize = 28f
                tp.textAlign = Paint.Align.RIGHT
                tp.color = Color.parseColor("#0f172a")
                hudCanvas.drawText(displayTemp, 376f, 52f, tp)
                tp.color = Color.parseColor("#fffbeb")
                hudCanvas.drawText(displayTemp, 374f, 50f, tp)

                // 3. Sky Condition description right below temperature
                tp.textSize = 15f
                tp.color = Color.parseColor("#1e293b")
                hudCanvas.drawText(skyDesc, 376f, 76f, tp)
                tp.color = Color.parseColor("#bae6fd")
                hudCanvas.drawText(skyDesc, 374f, 74f, tp)

                // 4. Bottom-Left: Cat Name Tag
                tp.textSize = 15f
                tp.textAlign = Paint.Align.LEFT
                tp.color = Color.parseColor("#2a1208")
                hudCanvas.drawText("${activeCat.name} (${catIdx + 1}/${roster.size})", 26f, 224f, tp)
                tp.color = Color.parseColor("#ffefc7")
                hudCanvas.drawText("${activeCat.name} (${catIdx + 1}/${roster.size})", 24f, 222f, tp)

                val hudBmp = Bitmap.createScaledBitmap(rawHudBmp, 300, 180, true)
                rawHudBmp.recycle()
                views.setImageViewBitmap(R.id.weather_hud_overlay, hudBmp)

                // Check phase cache for partial vs full updates
                val lastPhaseKey = "weather_last_phase_$appWidgetId"
                val currentPhaseSig = "${effectiveWeather}_${effectiveTimePhase}_${activeCat.id}_${isPetted}_$displayTemp"
                val prevPhaseSig = prefs.getString(lastPhaseKey, "")

                if (!fullUpdate && prevPhaseSig == currentPhaseSig) {
                    appWidgetManager.partiallyUpdateAppWidget(appWidgetId, views)
                    return
                }
                prefs.edit().putString(lastPhaseKey, currentPhaseSig).apply()

                // LAYER 1: 12-Frame Animation Loop
                val bush1 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/9 Bush/1.png")
                val bush2 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/9 Bush/2.png")

                views.removeAllViews(R.id.weather_flipper)
                for (f in 0 until TOTAL_FRAMES) {
                    val frameBmp = drawWeatherScenePixelPass(
                        f,
                        effectiveWeather,
                        effectiveTimePhase,
                        activeCat,
                        isPetted,
                        bush1,
                        bush2
                    )
                    val frameViews = RemoteViews(context.packageName, R.layout.widget_flipper_frame)
                    frameViews.setImageViewBitmap(R.id.frame_img, frameBmp)
                    views.addView(R.id.weather_flipper, frameViews)
                }

                bush1?.recycle()
                bush2?.recycle()

                // Hotspot Actions
                val openIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val openPending = PendingIntent.getActivity(
                    context,
                    appWidgetId + 900,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.weather_open_app_area, openPending)

                val petIntent = Intent(context, LiloWeatherWidgetProvider::class.java).apply {
                    action = ACTION_WEATHER_PET
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.weather_btn_pet,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId + 910,
                        petIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                val refreshIntent = Intent(context, LiloWeatherWidgetProvider::class.java).apply {
                    action = ACTION_WEATHER_REFRESH
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.weather_btn_refresh,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId + 920,
                        refreshIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                val switchIntent = Intent(context, LiloWeatherWidgetProvider::class.java).apply {
                    action = ACTION_WEATHER_SWITCH_CAT
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.weather_btn_switch_cat,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId + 930,
                        switchIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (_: Exception) {}
        }

        private fun drawWeatherScenePixelPass(
            frame: Int,
            weather: String,
            timePhase: String,
            activeCat: WeatherCatSpec,
            isPetted: Boolean,
            bush1: Bitmap?,
            bush2: Bitmap?
        ): Bitmap {
            val w = 200
            val h = 120
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

            val isRain = weather == "RAIN"
            val isCloudy = weather == "CLOUDY"
            val isNight = timePhase == "NIGHT" || weather == "NIGHT"
            val isSunset = timePhase == "SUNSET" && !isNight

            // 1. DYNAMIC SKY GRADIENT BANDS
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

            // 2. CELESTIAL BODIES / WEATHER GLYPHS IN SKY
            if (isNight && !isRain) {
                val stars = arrayOf(
                    Triple(30, 20, 0), Triple(65, 16, 2), Triple(100, 24, 4),
                    Triple(130, 18, 1), Triple(150, 30, 3)
                )
                for ((sx, sy, phase) in stars) {
                    val twinkle = ((frame + phase * 3) % 8) < 4
                    px(sx, sy, if (twinkle) 2 else 1, if (twinkle) 2 else 1, if (twinkle) "#fde047" else "#bae6fd")
                }
                drawWeatherIconMoon(c, p, 158, 22)
            } else if (isSunset && !isRain) {
                px(144, 42, 20, 14, "#f97316")
                px(146, 40, 16, 16, "#fbbf24")
                px(148, 43, 12, 10, "#fef08a")
            } else if (!isCloudy && !isRain) {
                drawWeatherIconSunny(c, p, 156, 20)
            }

            // Seamless Cloud Drift
            if (!isNight || isRain || isCloudy) {
                val cCol = when {
                    isRain -> "#64748b"
                    isCloudy -> "#e2e8f0"
                    isSunset -> "#fed7aa"
                    else -> "#f0f9ff"
                }
                val shift = (frame * 5) % 120
                for (pair in 0..1) {
                    val cx = (pair * 100 + shift) - 30
                    px(cx, 38, 28, 5, cCol)
                    px(cx + 4, 35, 18, 3, cCol)
                }
            }

            // Falling Raindrops
            if (isRain) {
                for (rx in 18 until 182 step 16) {
                    val ry = 14 + ((rx * 7 + frame * 8) % 68)
                    px(rx, ry, 1, 6, "#bae6fd")
                    px(rx + 8, (ry + 34) % 68 + 14, 1, 5, "#7dd3fc")
                }
            }

            // 3. SANCTUARY GRASS GROUND & BUSHES
            px(10, 80, 180, 16, if (isNight) "#172d1a" else "#2d5c2b")
            if (bush1 != null) {
                c.drawBitmap(bush1, null, Rect(12, 72, 40, 94), p)
                c.drawBitmap(bush1, null, Rect(154, 72, 184, 94), p)
            }
            if (bush2 != null) {
                c.drawBitmap(bush2, null, Rect(108, 72, 142, 94), p)
            }

            // 4. CARVED WOODEN WINDOW CASING
            px(0, 0, w, 8, "#3b1d0a")
            px(2, 2, w - 4, 4, "#8f4d22")
            px(0, 0, 8, h, "#3b1d0a")
            px(2, 2, 4, h - 4, "#8f4d22")
            px(w - 8, 0, 8, h, "#3b1d0a")
            px(w - 6, 2, 4, h - 4, "#8f4d22")

            px(0, 92, w, 28, "#3b1d0a")
            px(2, 94, w - 4, 6, "#c87d3b")
            px(2, 94, w - 4, 2, "#e6a968")
            px(2, 100, w - 4, 18, "#8f4d22")

            // 5. PEEKING CAT IN LEFT SILL CORNER
            drawPeekingCat(
                c, p,
                cx = 44,
                sillY = 94,
                frame = frame,
                cat = activeCat,
                isPetted = isPetted
            )

            // 6. ACTION BUTTONS ON RIGHT SIDE OF SILL (Refresh & Switch)
            val btnRefreshX = 148
            val btnRefreshY = 98
            px(btnRefreshX, btnRefreshY, 18, 16, "#3b1d0a")
            px(btnRefreshX + 1, btnRefreshY + 1, 16, 14, "#0284c7")
            px(btnRefreshX + 1, btnRefreshY + 1, 16, 2, "#7dd3fc")
            drawPixelRefreshIcon(c, p, btnRefreshX + 4, btnRefreshY + 4, "#ffffff")

            val btnSwitchX = 172
            val btnSwitchY = 98
            px(btnSwitchX, btnSwitchY, 18, 16, "#3b1d0a")
            px(btnSwitchX + 1, btnSwitchY + 1, 16, 14, "#dca03a")
            px(btnSwitchX + 1, btnSwitchY + 1, 16, 2, "#ffe08a")
            drawPixelSwitchIcon(c, p, btnSwitchX + 4, btnSwitchY + 4, "#3b1d0a")

            // Scale to 180x98 RGB_565 for optimal Binder memory safety
            val scaledBmp = Bitmap.createBitmap(180, 98, Bitmap.Config.RGB_565)
            val scCanvas = Canvas(scaledBmp)
            scCanvas.drawBitmap(bmp, Rect(0, 0, w, h), Rect(0, 0, 180, 98), Paint(Paint.FILTER_BITMAP_FLAG))
            bmp.recycle()
            return scaledBmp
        }

        private fun drawPeekingCat(
            c: Canvas,
            p: Paint,
            cx: Int,
            sillY: Int,
            frame: Int,
            cat: WeatherCatSpec,
            isPetted: Boolean
        ) {
            val bobY = if (frame % 4 == 0) -1 else 0
            val isBlinking = isPetted || frame == 2

            c.save()
            c.translate(cx.toFloat(), sillY.toFloat())
            c.scale(2.0f, 2.0f)

            fun r(rx: Int, ry: Int, rw: Int, rh: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(rx.toFloat(), ry.toFloat(), (rx + rw).toFloat(), (ry + rh).toFloat(), p)
            }

            // Body behind sill
            r(-6, -3 + bobY, 12, 4, cat.shade)
            r(-5, -4 + bobY, 10, 4, cat.coat)

            if (cat.collar != null) {
                r(-4, -3 + bobY, 8, 1, cat.collar)
                r(-1, -2 + bobY, 2, 2, "#fde047")
            }

            // Head
            val hy = -11 + bobY
            r(-5, hy, 10, 8, cat.coat)
            r(-4, hy - 1, 8, 1, cat.coat)
            r(-5, hy + 7, 10, 1, cat.shade)

            // Ears
            val earTwitch = if (frame == 1) 1 else 0
            r(-5, hy - 3 + earTwitch, 3, 3, cat.coat)
            r(2, hy - 3 + earTwitch, 3, 3, cat.coat)
            r(-4, hy - 2 + earTwitch, 1, 2, "#ff9ebb")
            r(3, hy - 2 + earTwitch, 1, 2, "#ff9ebb")

            // Eyes
            if (isBlinking) {
                r(-3, hy + 3, 2, 1, "#334155")
                r(1, hy + 3, 2, 1, "#334155")
            } else {
                r(-3, hy + 2, 2, 2, cat.eyeLeft)
                r(1, hy + 2, 2, 2, cat.eyeRight)
                r(-3, hy + 2, 1, 1, "#ffffff")
                r(1, hy + 2, 1, 1, "#ffffff")
            }

            // Nose & Paws
            r(-1, hy + 5, 2, 1, "#ff9ebb")
            r(-6, -1, 3, 3, cat.coat)
            r(3, -1, 3, 3, cat.coat)

            c.restore()

            if (isPetted) {
                val heartCol = if (cat.id == "cheeto") "#ffb300" else "#fb7185"
                drawPixelHeart(c, p, cx + 14, sillY - 22, heartCol)
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
        }

        private fun drawWeatherIconMoon(c: Canvas, p: Paint, x: Int, y: Int) {
            fun r(dx: Int, dy: Int, w: Int, h: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect((x + dx).toFloat(), (y + dy).toFloat(), (x + dx + w).toFloat(), (y + dy + h).toFloat(), p)
            }
            r(3, 1, 5, 2, "#fde047")
            r(1, 3, 4, 6, "#fde047")
            r(3, 9, 5, 2, "#fde047")
            r(8, 2, 2, 2, "#fef08a")
        }

        private fun drawPixelRefreshIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 2).toFloat(), y.toFloat(), (x + 7).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x + 6).toFloat(), y.toFloat(), (x + 8).toFloat(), (y + 4).toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y + 6).toFloat(), (x + 6).toFloat(), (y + 8).toFloat(), p)
            c.drawRect(x.toFloat(), (y + 4).toFloat(), (x + 2).toFloat(), (y + 8).toFloat(), p)
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
