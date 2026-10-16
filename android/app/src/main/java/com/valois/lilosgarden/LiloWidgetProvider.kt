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
import android.os.Build
import android.widget.RemoteViews
import org.json.JSONObject
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
        val step = prefs.getInt("step_tick", 0) + 1

        when (intent.action) {
            ACTION_PET -> {
                val pets = prefs.getInt("pets", 8) + 1
                val blooms = (8 + (pets / 3)).coerceAtMost(24)
                prefs.edit()
                    .putString("mode", "PET")
                    .putInt("pets", pets)
                    .putInt("blooms", blooms)
                    .putInt("step_tick", step)
                    .apply()
                refreshAllWidgets(context)
            }
            ACTION_FEED -> {
                prefs.edit()
                    .putString("mode", "EAT")
                    .putInt("step_tick", step)
                    .apply()
                refreshAllWidgets(context)
            }
            ACTION_WEATHER -> {
                val weathers = arrayOf("AUTO", "SUNNY", "CLOUDY", "RAIN", "NIGHT")
                val curW = prefs.getString("weather_override", "AUTO") ?: "AUTO"
                val nextW = weathers[(weathers.indexOf(curW) + 1) % weathers.size]

                // Also cycle VSCode-Pets activity mode (WALK -> SLEEP -> YARN -> WALK)
                val modes = arrayOf("WALK", "SLEEP", "YARN")
                val curM = prefs.getString("mode", "WALK") ?: "WALK"
                val nextM = modes[(modes.indexOf(curM) + 1) % modes.size]

                prefs.edit()
                    .putString("weather_override", nextW)
                    .putString("mode", nextM)
                    .putInt("step_tick", step)
                    .apply()
                refreshAllWidgets(context)
            }
            ACTION_ADD_CAT -> {
                val extraCats = (prefs.getInt("extra_cats", 0) + 1) % 5
                prefs.edit()
                    .putInt("extra_cats", extraCats)
                    .putString("mode", "WALK")
                    .putInt("step_tick", step)
                    .apply()
                refreshAllWidgets(context)
            }
        }
    }

    companion object {
        const val ACTION_PET = "com.valois.lilosgarden.ACTION_WIDGET_PET"
        const val ACTION_FEED = "com.valois.lilosgarden.ACTION_WIDGET_FEED"
        const val ACTION_WEATHER = "com.valois.lilosgarden.ACTION_WIDGET_WEATHER"
        const val ACTION_ADD_CAT = "com.valois.lilosgarden.ACTION_WIDGET_ADD_CAT"

        data class WidgetCat(
            val name: String,
            val coat: String,
            val shade: String,
            val eyeLeft: String,
            val eyeRight: String,
            val collar: String?,
            val pattern: String,
            val baseX: Int,
            val baseY: Int,
            val activity: String // WALK, SLEEP, EAT, PET, YARN, SHELTER
        )

        private val PRESET_COMPANIONS = arrayOf(
            WidgetCat("Mochi", "#f59e42", "#c96f18", "#4ade80", "#4ade80", null, "tabby", 48, 72, "WALK"),
            WidgetCat("Luna", "#374151", "#1f2937", "#fde047", "#fde047", null, "tuxedo", 142, 70, "SLEEP"),
            WidgetCat("Cleo", "#f5deb3", "#d4b47c", "#29b6f6", "#29b6f6", null, "patches", 64, 58, "WALK"),
            WidgetCat("Bambi", "#7c98b3", "#536b82", "#c084fc", "#c084fc", null, "solid", 130, 56, "SLEEP")
        )

        fun refreshAllWidgets(context: Context) {
            try {
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(ComponentName(context, LiloWidgetProvider::class.java))
                for (id in ids) {
                    updateAppWidget(context, manager, id)
                }
            } catch (_: Exception) {}
        }

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            try {
                val views = RemoteViews(context.packageName, R.layout.lilo_widget)
                val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
                val mode = prefs.getString("mode", "WALK") ?: "WALK"
                val weatherOverride = prefs.getString("weather_override", "AUTO") ?: "AUTO"
                val syncedWeather = prefs.getString("weather", null)
                val blooms = prefs.getInt("blooms", 8)
                val stepTick = prefs.getInt("step_tick", 0)
                val extraCatsCount = prefs.getInt("extra_cats", 0)

                val activeWeather = resolveWeather(weatherOverride, syncedWeather)
                val cats = buildCatRoster(prefs, mode, activeWeather, stepTick, extraCatsCount)

                val frameIds = intArrayOf(
                    R.id.widget_frame_0,
                    R.id.widget_frame_1,
                    R.id.widget_frame_2,
                    R.id.widget_frame_3
                )

                for (frameIdx in 0..3) {
                    val raw = drawStardewGardenFrame(frameIdx, mode, activeWeather, blooms, stepTick, cats)
                    val scaledRaw = Bitmap.createScaledBitmap(raw, 440, 246, false)
                    val scaled = if (scaledRaw.isMutable) scaledRaw else scaledRaw.copy(Bitmap.Config.ARGB_8888, true)
                    raw.recycle()
                    if (scaledRaw != scaled) scaledRaw.recycle()

                    // PASS 2: Draw Native High-Resolution Text directly onto the 440x246 bitmap
                    val hiCanvas = Canvas(scaled)
                    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        textAlign = Paint.Align.CENTER
                        textSize = 15.5f
                    }

                    val bannerText = when {
                        activeWeather == "RAIN" -> "Cozy Rain • ${cats.size} Cats in Gazebo"
                        mode == "PET" -> "Purring Happily • $blooms/24 Blooms"
                        mode == "EAT" -> "Munching Kibble • ${cats.size} Cats"
                        mode == "SLEEP" -> "Napping in Garden (zZz) • ${cats.size} Cats"
                        mode == "YARN" -> "Playing with Blue Yarn • ${cats.size} Cats"
                        else -> "${cats.size} Cats Wandering • $activeWeather Sky"
                    }
                    textPaint.color = Color.parseColor("#3b1d0a")
                    hiCanvas.drawText(bannerText, 220f, 31f, textPaint)

                    // Bottom 4 Button Labels at crisp 15f resolution
                    textPaint.textSize = 15f
                    val btnTextY = 226f
                    textPaint.color = Color.parseColor("#3b1d0a")
                    hiCanvas.drawText("Pet", 69f, btnTextY, textPaint)
                    textPaint.color = Color.parseColor("#ffffff")
                    hiCanvas.drawText("Feed", 178f, btnTextY, textPaint)
                    textPaint.color = Color.parseColor("#0c4a6e")
                    hiCanvas.drawText("Sky", 280f, btnTextY, textPaint)
                    textPaint.color = Color.parseColor("#3b1d0a")
                    hiCanvas.drawText("Cat(${cats.size})", 384f, btnTextY, textPaint)

                    val safeBmp = scaled.copy(Bitmap.Config.RGB_565, false)
                    scaled.recycle()
                    views.setImageViewBitmap(frameIds[frameIdx], safeBmp)
                }

                // Tap main garden -> Open Full Sanctuary App
                val openIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val openPending = PendingIntent.getActivity(
                    context,
                    appWidgetId,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_flipper, openPending)

                // Bind 4 Bottom Toolbar Buttons
                views.setOnClickPendingIntent(
                    R.id.widget_btn_pet,
                    makeBroadcastPending(context, appWidgetId + 100, ACTION_PET)
                )
                views.setOnClickPendingIntent(
                    R.id.widget_btn_feed,
                    makeBroadcastPending(context, appWidgetId + 200, ACTION_FEED)
                )
                views.setOnClickPendingIntent(
                    R.id.widget_btn_weather,
                    makeBroadcastPending(context, appWidgetId + 300, ACTION_WEATHER)
                )
                views.setOnClickPendingIntent(
                    R.id.widget_btn_add_cat,
                    makeBroadcastPending(context, appWidgetId + 400, ACTION_ADD_CAT)
                )

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (_: Exception) {}
        }

        private fun makeBroadcastPending(context: Context, reqCode: Int, action: String): PendingIntent {
            val intent = Intent(context, LiloWidgetProvider::class.java).apply {
                this.action = action
            }
            return PendingIntent.getBroadcast(
                context,
                reqCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        private fun resolveWeather(overrideMode: String, synced: String?): String {
            if (overrideMode != "AUTO") return overrideMode
            if (!synced.isNullOrEmpty()) return synced
            val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
            return if (hour < 6 || hour >= 19) "NIGHT" else "SUNNY"
        }

        private fun buildCatRoster(
            prefs: android.content.SharedPreferences,
            mode: String,
            weather: String,
            stepTick: Int,
            extraCatsCount: Int
        ): List<WidgetCat> {
            val list = mutableListOf<WidgetCat>()

            val liloAct = when {
                weather == "RAIN" -> "SHELTER"
                mode == "EAT" -> "EAT"
                mode == "PET" -> "PET"
                mode == "SLEEP" -> "SLEEP"
                mode == "YARN" -> "YARN"
                else -> if (stepTick % 4 == 3) "SLEEP" else "WALK"
            }

            val cheetoAct = when {
                weather == "RAIN" -> "SHELTER"
                mode == "EAT" -> "EAT"
                mode == "PET" -> "PET"
                mode == "SLEEP" -> "SLEEP"
                mode == "YARN" -> "YARN"
                else -> if (stepTick % 3 == 1) "SLEEP" else "WALK"
            }

            val liloStartX = when (liloAct) {
                "SHELTER" -> 154
                "EAT" -> 86
                "SLEEP" -> 118
                else -> 64 + ((stepTick * 17) % 50)
            }
            val liloStartY = when (liloAct) {
                "SHELTER" -> 50
                "EAT" -> 74
                "SLEEP" -> 64
                else -> 66
            }

            val cheetoStartX = when (cheetoAct) {
                "SHELTER" -> 170
                "EAT" -> 114
                "SLEEP" -> 134
                else -> 136 - ((stepTick * 15) % 46)
            }
            val cheetoStartY = when (cheetoAct) {
                "SHELTER" -> 52
                "EAT" -> 74
                "SLEEP" -> 65
                else -> 68
            }

            // 1. Lilo (White coat, twin blue eyes, blue collar + gold bell)
            list.add(
                WidgetCat(
                    "Lilo", "#ffffff", "#dbe7f5",
                    "#29b6f6", "#29b6f6", "#1e88e5",
                    "solid", liloStartX, liloStartY, liloAct
                )
            )

            // 2. Cheeto (White coat, left amber eye, right blue eye)
            list.add(
                WidgetCat(
                    "Cheeto", "#ffffff", "#eee8dc",
                    "#ffb300", "#29b6f6", null,
                    "solid", cheetoStartX, cheetoStartY, cheetoAct
                )
            )

            // 3. Companion cats synced from WebView app OR added via Widget "+ Cat" button
            var addedFromJson = 0
            val jsonStr = prefs.getString("garden_json", null)
            if (!jsonStr.isNullOrEmpty()) {
                try {
                    val obj = JSONObject(jsonStr)
                    val arr = obj.optJSONArray("companions")
                    if (arr != null) {
                        for (i in 0 until arr.length().coerceAtMost(4)) {
                            val c = arr.getJSONObject(i)
                            val act = if (weather == "RAIN") "SHELTER" else if ((i + stepTick) % 2 == 0) "WALK" else "SLEEP"
                            val cx = if (act == "SHELTER") 148 + (i * 8) else 46 + ((i * 28 + stepTick * 11) % 100)
                            val cy = if (act == "SHELTER") 54 else 56 + ((i * 7) % 20)
                            list.add(
                                WidgetCat(
                                    c.optString("name", "Friend"),
                                    c.optString("coatColor", "#f59e42"),
                                    c.optString("shadeColor", "#c96f18"),
                                    c.optString("eyeColor", "#4ade80"),
                                    c.optString("eyeColorRight", "#4ade80"),
                                    null,
                                    c.optString("pattern", "solid"),
                                    cx, cy, act
                                )
                            )
                            addedFromJson++
                        }
                    }
                } catch (_: Exception) {}
            }

            for (i in 0 until extraCatsCount) {
                if (list.size >= 6) break
                val preset = PRESET_COMPANIONS[(i + addedFromJson) % PRESET_COMPANIONS.size]
                val act = if (weather == "RAIN") "SHELTER" else if (mode == "EAT") "EAT" else if ((i + stepTick) % 2 == 0) "WALK" else "SLEEP"
                val cx = when (act) {
                    "SHELTER" -> 150 + (i * 7)
                    "EAT" -> 76 + (i * 14)
                    else -> 44 + ((i * 31 + stepTick * 13) % 108)
                }
                val cy = if (act == "SHELTER") 53 else if (act == "EAT") 76 else preset.baseY
                list.add(preset.copy(baseX = cx, baseY = cy, activity = act))
            }

            return list
        }

        private fun drawStardewGardenFrame(
            frame: Int,
            mode: String,
            weather: String,
            blooms: Int,
            stepTick: Int,
            cats: List<WidgetCat>
        ): Bitmap {
            val w = 200
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

            val isNight = weather == "NIGHT"
            val isRain = weather == "RAIN"
            val isCloudy = weather == "CLOUDY"

            // 1. Dynamic Sky & Forest Horizon
            val skyHex = when (weather) {
                "NIGHT" -> "#0f172a"
                "RAIN" -> "#1e293b"
                "CLOUDY" -> "#334155"
                else -> "#172d1a"
            }
            px(0, 0, w, 34, skyHex)
            px(0, 22, w, 12, if (isNight) "#1e3a2f" else "#2d5c2b")
            for (hx in 6 until w step 12) {
                px(hx, 23 + (if (hx % 24 == 0) 2 else 0), 9, 11, if (isNight) "#224434" else "#386e35")
            }

            // Drifting Clouds in CLOUDY / RAIN
            if (isCloudy || isRain) {
                val cloudShift = frame * 3
                px(24 + cloudShift, 19, 18, 4, "#94a3b8")
                px(120 - cloudShift, 18, 22, 4, "#94a3b8")
            }

            // Twinkling Stars in NIGHT
            if (isNight) {
                val starCol = if (frame % 2 == 0) "#fef08a" else "#bae6fd"
                px(12, 19, 2, 2, starCol)
                px(184, 18, 2, 2, starCol)
            }

            // 2. Checkerboard Pixel Lawn
            for (gy in 34 until h step 10) {
                for (gx in 0 until w step 10) {
                    val even = ((gx / 10) + (gy / 10)) % 2 == 0
                    val grassCol = when (weather) {
                        "NIGHT" -> if (even) "#254c29" else "#1f3f23"
                        "RAIN" -> if (even) "#3b6e38" else "#336131"
                        "CLOUDY" -> if (even) "#437d3e" else "#3c7037"
                        else -> if (even) "#4c9146" else "#478942"
                    }
                    px(gx, gy, 10, 10, grassCol)
                }
            }

            // 3. Wooden Fence
            px(6, 29, w - 12, 2, "#8c5832")
            px(6, 33, w - 12, 2, "#8c5832")
            for (fx in 10 until w - 10 step 16) {
                if (fx in 90..110) continue
                px(fx, 25, 4, 11, "#6e4223")
                px(fx + 1, 26, 2, 9, "#a86e42")
            }

            // 4. Sunny Nap Picnic Rug
            px(114, 58, 28, 14, "#fef3c7")
            for (rx in 116 until 140 step 6) {
                px(rx, 60, 3, 3, "#f59e0b")
                px(rx + 3, 66, 3, 3, "#f59e0b")
            }

            // 5. Memorial Stone (Left) + Blooming Blue Forget-Me-Nots
            val msX = 26
            val msY = 49
            px(msX - 8, msY - 2, 16, 6, "#64748b")
            px(msX - 6, msY - 14, 12, 13, "#94a3b8")
            px(msX - 5, msY - 15, 10, 2, "#cbd5e1")
            px(msX - 4, msY - 10, 2, 2, if (frame % 2 == 0) "#38bdf8" else "#7dd3fc")
            px(msX + 2, msY - 10, 2, 2, if (frame % 2 == 1) "#ffb300" else "#fde047")

            val flowerOffsets = arrayOf(
                Pair(-11, 2), Pair(-9, 7), Pair(9, 3), Pair(11, 7),
                Pair(-8, -5), Pair(8, -4), Pair(-3, 9), Pair(4, 9),
                Pair(-14, 5), Pair(13, 5), Pair(-6, 11), Pair(6, 11)
            )
            val visibleFlowers = (blooms / 2).coerceIn(4, flowerOffsets.size)
            for (i in 0 until visibleFlowers) {
                val (ox, oy) = flowerOffsets[i]
                val bob = if ((frame + i) % 2 == 0) 0 else -1
                px(msX + ox - 1, msY + oy + bob, 3, 2, "#38bdf8")
                px(msX + ox, msY + oy + bob, 1, 1, "#fef08a")
            }

            // 6. Covered Wooden Gazebo Shelter (Right)
            val gzX = 164
            val gzY = 50
            px(gzX - 18, gzY - 4, 36, 18, "#532e16")
            px(gzX - 17, gzY - 5, 34, 17, "#78431e")
            px(gzX - 12, gzY - 2, 24, 10, "#9f1239")
            px(gzX - 16, gzY - 20, 3, 28, "#532e16")
            px(gzX + 13, gzY - 20, 3, 28, "#532e16")
            // Glowing Gazebo Lantern (Brighter in Rain/Night)
            px(gzX - 2, gzY - 15, 4, 5, if (isRain || isNight) "#fde047" else "#fef08a")
            px(gzX - 20, gzY - 24, 40, 8, "#6e3818")
            px(gzX - 15, gzY - 28, 30, 5, "#8c4820")

            // 7. Ceramic Food Bowl
            val bwX = 98
            val bwY = 74
            px(bwX - 7, bwY, 14, 5, "#0284c7")
            px(bwX - 6, bwY - 1, 12, 4, "#38bdf8")
            px(bwX - 4, bwY - 2, 8, 3, "#d97706")

            // 8. Interactive Rolling Blue Yarn Ball (Moves across frames!)
            val yarnX = if (mode == "YARN") 86 + (frame * 6) else 72
            val yarnY = 72 + (if (frame % 2 == 0) 0 else -1)
            px(yarnX - 3, yarnY - 3, 6, 6, "#1e88e5")
            px(yarnX - 2, yarnY - 2, 4, 2, "#60a5fa")

            // 9. Draw All Cats (Lilo, Cheeto & Added Companions) with VSCode Pets Actions
            val sortedCats = cats.sortedBy { it.baseY }
            for ((idx, cat) in sortedCats.withIndex()) {
                val walkDir = if ((idx + stepTick) % 2 == 0) 1 else -1
                val animX = when (cat.activity) {
                    "WALK" -> (cat.baseX + walkDir * (frame * 5)).coerceIn(22, w - 24)
                    "YARN" -> if (idx == 0) yarnX - 10 else yarnX + 12
                    else -> cat.baseX
                }
                val facingRight = when (cat.activity) {
                    "EAT" -> animX <= bwX
                    "YARN" -> animX <= yarnX
                    "WALK" -> walkDir > 0
                    else -> idx % 2 == 0
                }

                drawCatSprite(
                    c, p,
                    x = animX,
                    y = cat.baseY,
                    facingRight = facingRight,
                    frame = (frame + idx) % 4,
                    cat = cat
                )
            }

            // 10. Weather Particles (Raindrops, Fireflies, or Flapping Butterflies)
            if (isRain) {
                for (rx in 18 until w - 18 step 22) {
                    val ry = 34 + ((rx * 3 + frame * 11) % 48)
                    px(rx, ry, 1, 5, "#bae6fd")
                }
            } else if (isNight) {
                val fy = 44 + (frame % 2) * 3
                px(56, fy, 2, 2, "#fde047")
                px(140, 48 - (frame % 2) * 3, 2, 2, "#fde047")
            } else {
                val bfX = 50 + (frame * 4)
                val bfY = 41 + (if (frame % 2 == 0) -2 else 1)
                px(bfX, bfY, if (frame % 2 == 0) 3 else 1, 2, "#f472b6")
            }

            // 11. Top Stardew Banner Plaque
            px(10, 4, w - 20, 15, "#3b1d0a")
            px(12, 6, w - 24, 11, "#f7dba7")

            when (weather) {
                "NIGHT" -> drawPixelMoonIcon(c, p, 16, 9, "#7c3aed")
                "RAIN" -> drawPixelRainIcon(c, p, 16, 9, "#0284c7")
                "CLOUDY" -> drawPixelCloudIcon(c, p, 16, 9, "#475569")
                else -> drawPixelSunIcon(c, p, 16, 9, "#d97706")
            }
            drawPixelSparkleIcon(c, p, w - 22, 9, "#0284c7")

            // 12. Bottom 4-Button Stardew Toolbar (Pet | Feed | Sky | +Cat)
            val btnY = h - 19
            // Button 1: Pet (Gold)
            px(6, btnY, 45, 14, "#3b1d0a")
            px(7, btnY + 1, 43, 12, "#f6d397")
            drawPixelHeart(c, p, 14, btnY + 7, "#e11d48")

            // Button 2: Feed (Green)
            px(53, btnY, 45, 14, "#3b1d0a")
            px(54, btnY + 1, 43, 12, "#68b82e")
            drawPixelFishIcon(c, p, 58, btnY + 4, "#fde047")

            // Button 3: Sky / Action (Sky Blue)
            px(100, btnY, 45, 14, "#3b1d0a")
            px(101, btnY + 1, 43, 12, "#7dd3fc")
            drawPixelSunIcon(c, p, 106, btnY + 4, "#0369a1")

            // Button 4: + Cat (Warm Terracotta)
            px(147, btnY, 47, 14, "#3b1d0a")
            px(148, btnY + 1, 45, 12, "#fbbf24")
            drawPixelPlusIcon(c, p, 153, btnY + 4, "#3b1d0a")

            // 13. Outer Stardew Wooden Frame
            px(0, 0, w, 3, "#3b1d0a")
            px(0, h - 3, w, 3, "#3b1d0a")
            px(0, 0, 3, h, "#3b1d0a")
            px(w - 3, 0, 3, h, "#3b1d0a")
            px(3, 3, w - 6, 2, "#8f4d22")
            px(3, h - 5, w - 6, 2, "#8f4d22")

            return bmp
        }

        private fun drawCatSprite(
            c: Canvas,
            p: Paint,
            x: Int,
            y: Int,
            facingRight: Boolean,
            frame: Int,
            cat: WidgetCat
        ) {
            c.save()
            c.translate(x.toFloat(), y.toFloat())

            fun r(rx: Int, ry: Int, rw: Int, rh: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(rx.toFloat(), ry.toFloat(), (rx + rw).toFloat(), (ry + rh).toFloat(), p)
            }

            // Sleeping Loaf Pose with Rising zZz Bubbles
            if (cat.activity == "SLEEP") {
                val breath = if (frame % 2 == 0) 0 else 1
                r(-7, -1, 14, 3, "#223824") // Shadow
                r(-6, -6 + breath, 12, 5, cat.coat)
                r(-6, -2, 12, 2, cat.shade)
                if (cat.pattern == "tabby") {
                    r(-3, -6 + breath, 2, 3, cat.shade)
                    r(1, -6 + breath, 2, 3, cat.shade)
                } else if (cat.pattern == "patches") {
                    r(-4, -6 + breath, 4, 3, "#d97706")
                }
                r(1, -8 + breath, 6, 5, cat.coat)
                r(2, -10 + breath, 2, 2, cat.coat)
                r(5, -10 + breath, 2, 2, cat.coat)
                r(3, -6 + breath, 2, 1, "#475569") // Closed sleeping eye
                // Floating pixel zZz
                val zy = -13 - (frame * 2)
                r(7, zy, 3, 1, "#e0f2fe")
                r(8, zy + 1, 1, 1, "#e0f2fe")
                r(7, zy + 2, 3, 1, "#e0f2fe")
                c.restore()
                return
            }

            // Standing / Walking / Eating / Playing Pose
            r(-6, -1, 12, 2, "#223824")
            if (!facingRight) c.scale(-1f, 1f)

            val bounceY = if (cat.activity == "WALK" && frame % 2 == 1) -1 else if (cat.activity == "PET" && frame % 2 == 0) -2 else 0
            val tailWagY = if (frame == 0) -1 else if (frame == 2) 1 else 0
            val headDip = if (cat.activity == "EAT" && frame % 2 == 1) 2 else 0

            // Tail
            r(-8, -8 + bounceY, 2, 3, cat.coat)
            r(-9, -11 + bounceY + tailWagY, 2, 4, cat.coat)

            // Body
            r(-6, -8 + bounceY, 11, 6, cat.coat)
            r(-6, -4 + bounceY, 11, 2, cat.shade)

            if (cat.pattern == "tuxedo") {
                r(2, -6 + bounceY, 3, 4, "#ffffff")
            } else if (cat.pattern == "tabby") {
                r(-4, -8 + bounceY, 1, 4, cat.shade)
                r(-1, -8 + bounceY, 1, 4, cat.shade)
            } else if (cat.pattern == "patches") {
                r(-4, -8 + bounceY, 4, 3, "#e07a2b")
                r(0, -7 + bounceY, 3, 3, "#2d3748")
            }

            // Lilo's Blue Collar + Gold Bell
            if (cat.collar != null) {
                r(2, -5 + bounceY, 3, 1, cat.collar)
                r(4, -4 + bounceY, 1, 1, "#fde047")
            }

            // 4-Frame Walking Legs
            val legA = if (cat.activity == "WALK" && frame % 2 == 0) -1 else 0
            val legB = if (cat.activity == "WALK" && frame % 2 == 1) -1 else 0
            r(-5, -2 + legA, 2, 2, cat.shade)
            r(-2, -2 + legB, 2, 2, cat.coat)
            r(1, -2 + legB, 2, 2, cat.shade)
            r(3, -2 + legA, 2, 2, cat.coat)

            // Head & Ears
            val hy = -13 + bounceY + headDip
            r(0, hy, 8, 6, cat.coat)
            r(1, hy - 3, 2, 2, cat.coat)
            r(5, hy - 3, 2, 2, cat.coat)
            r(1, hy - 2, 1, 1, "#ff9ebb")
            r(6, hy - 2, 1, 1, "#ff9ebb")

            // Eyes
            if (frame == 3 || cat.activity == "PET") {
                r(2, hy + 2, 2, 1, "#334155")
                r(5, hy + 2, 2, 1, "#334155")
            } else {
                r(2, hy + 1, 2, 2, cat.eyeLeft)
                r(5, hy + 1, 2, 2, cat.eyeRight)
            }
            r(4, hy + 3, 1, 1, "#ff9ebb")
            c.restore()

            if (cat.activity == "PET" || (cat.name == "Lilo" && frame % 2 == 0)) {
                drawPixelHeart(c, p, x, y - 16 - frame, "#fb7185")
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

        private fun drawPixelFishIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect(x.toFloat(), (y + 1).toFloat(), (x + 2).toFloat(), (y + 5).toFloat(), p)
            c.drawRect((x + 2).toFloat(), (y + 2).toFloat(), (x + 4).toFloat(), (y + 4).toFloat(), p)
            c.drawRect((x + 4).toFloat(), (y + 1).toFloat(), (x + 9).toFloat(), (y + 5).toFloat(), p)
        }

        private fun drawPixelSparkleIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 2).toFloat(), y.toFloat(), (x + 3).toFloat(), (y + 5).toFloat(), p)
            c.drawRect(x.toFloat(), (y + 2).toFloat(), (x + 5).toFloat(), (y + 3).toFloat(), p)
        }

        private fun drawPixelSunIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 1).toFloat(), (y + 1).toFloat(), (x + 4).toFloat(), (y + 4).toFloat(), p)
            c.drawRect((x + 2).toFloat(), y.toFloat(), (x + 3).toFloat(), (y + 5).toFloat(), p)
            c.drawRect(x.toFloat(), (y + 2).toFloat(), (x + 5).toFloat(), (y + 3).toFloat(), p)
        }

        private fun drawPixelMoonIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 1).toFloat(), y.toFloat(), (x + 4).toFloat(), (y + 1).toFloat(), p)
            c.drawRect(x.toFloat(), (y + 1).toFloat(), (x + 2).toFloat(), (y + 4).toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y + 4).toFloat(), (x + 4).toFloat(), (y + 5).toFloat(), p)
        }

        private fun drawPixelCloudIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 1).toFloat(), (y + 1).toFloat(), (x + 5).toFloat(), (y + 4).toFloat(), p)
            c.drawRect(x.toFloat(), (y + 2).toFloat(), (x + 6).toFloat(), (y + 4).toFloat(), p)
        }

        private fun drawPixelRainIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 1).toFloat(), y.toFloat(), (x + 5).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y + 3).toFloat(), (x + 2).toFloat(), (y + 5).toFloat(), p)
            c.drawRect((x + 4).toFloat(), (y + 3).toFloat(), (x + 5).toFloat(), (y + 5).toFloat(), p)
        }

        private fun drawPixelPlusIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x + 2).toFloat(), y.toFloat(), (x + 3).toFloat(), (y + 5).toFloat(), p)
            c.drawRect(x.toFloat(), (y + 2).toFloat(), (x + 5).toFloat(), (y + 3).toFloat(), p)
        }
    }
}
