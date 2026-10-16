package com.valois.lilosgarden

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
import android.graphics.Typeface
import android.widget.RemoteViews
import androidx.core.content.res.ResourcesCompat
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
            val activity: String
        )

        data class GardenSprites(
            val grassTile: Bitmap?,
            val tree1: Bitmap?,
            val bush1: Bitmap?,
            val bush2: Bitmap?,
            val lamp1: Bitmap?,
            val log1: Bitmap?,
            val stone7: Bitmap?,
            val flower1: Bitmap?,
            val flower3: Bitmap?,
            val campfireActive: Bitmap?,
            val campfireSmoke: Bitmap?
        ) {
            fun recycleAll() {
                grassTile?.recycle()
                tree1?.recycle()
                bush1?.recycle()
                bush2?.recycle()
                lamp1?.recycle()
                log1?.recycle()
                stone7?.recycle()
                flower1?.recycle()
                flower3?.recycle()
                campfireActive?.recycle()
                campfireSmoke?.recycle()
            }
        }

        private val PRESET_COMPANIONS = arrayOf(
            WidgetCat("Mochi", "#f59e42", "#c96f18", "#4ade80", "#4ade80", null, "tabby", 54, 72, "WALK"),
            WidgetCat("Luna", "#374151", "#1f2937", "#fde047", "#fde047", null, "tuxedo", 142, 70, "SLEEP"),
            WidgetCat("Cleo", "#f5deb3", "#d4b47c", "#29b6f6", "#29b6f6", null, "patches", 68, 58, "WALK"),
            WidgetCat("Bambi", "#7c98b3", "#536b82", "#c084fc", "#c084fc", null, "solid", 130, 56, "SLEEP")
        )

        private fun loadAssetBitmap(context: Context, relPath: String): Bitmap? {
            return try {
                context.assets.open("www/$relPath").use { stream ->
                    BitmapFactory.decodeStream(stream)
                }
            } catch (e: Exception) {
                null
            }
        }

        fun refreshAllWidgets(context: Context) {
            try {
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(ComponentName(context, LiloWidgetProvider::class.java))
                for (id in ids) {
                    updateAppWidget(context, manager, id)
                }
            } catch (e: Exception) {}
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

                val sprites = GardenSprites(
                    grassTile = loadAssetBitmap(context, "assets/sprites/tileSprite/1 Tiles/FieldsTile_38.png"),
                    tree1 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/7 Decor/Tree1.png"),
                    bush1 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/9 Bush/1.png"),
                    bush2 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/9 Bush/2.png"),
                    lamp1 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/7 Decor/Lamp1.png"),
                    log1 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/7 Decor/Log1.png"),
                    stone7 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/4 Stone/7.png"),
                    flower1 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/6 Flower/1.png"),
                    flower3 = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/6 Flower/3.png"),
                    campfireActive = loadAssetBitmap(context, "assets/sprites/tileSprite/3 Animated Objects/2 Campfire/2.png"),
                    campfireSmoke = loadAssetBitmap(context, "assets/sprites/tileSprite/3 Animated Objects/2 Campfire/1.png")
                )

                val pixelTypeface = try {
                    Typeface.createFromAsset(context.assets, "www/assets/fonts/Stardew_Valley.ttf")
                } catch (e: Exception) {
                    try {
                        Typeface.createFromAsset(context.assets, "www/assets/fonts/Stardew_Valley.otf")
                    } catch (e2: Exception) {
                        try {
                            ResourcesCompat.getFont(context, R.font.press_start_2p)
                                ?: Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        } catch (e3: Exception) {
                            Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                        }
                    }
                }

                val frameIds = intArrayOf(
                    R.id.widget_frame_0,
                    R.id.widget_frame_1,
                    R.id.widget_frame_2,
                    R.id.widget_frame_3
                )

                for (frameIdx in 0..3) {
                    val raw = drawStardewGardenFrame(frameIdx, mode, activeWeather, blooms, stepTick, cats, sprites)
                    val scaledRaw = Bitmap.createScaledBitmap(raw, 440, 246, false)
                    val scaled = (if (scaledRaw.isMutable) scaledRaw else scaledRaw.copy(Bitmap.Config.ARGB_8888, true)) ?: scaledRaw
                    raw.recycle()
                    if (scaledRaw != scaled) scaledRaw.recycle()

                    val hiCanvas = Canvas(scaled)
                    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        typeface = pixelTypeface
                        isFakeBoldText = true
                        textAlign = Paint.Align.CENTER
                        textSize = 17f
                    }

                    val bannerText = when {
                        activeWeather == "RAIN" -> "Cozy Rain • ${cats.size} Cats"
                        mode == "PET" -> "Purring • $blooms/24 Blooms"
                        mode == "EAT" -> "Munching • ${cats.size} Cats"
                        mode == "SLEEP" -> "Napping (zZz) • ${cats.size} Cats"
                        mode == "YARN" -> "Playing Yarn • ${cats.size} Cats"
                        else -> "${cats.size} Cats • $activeWeather Sky"
                    }
                    textPaint.color = Color.parseColor("#3b1d0a")
                    hiCanvas.drawText(bannerText, 220f, 30f, textPaint)

                    textPaint.textSize = 16f
                    val btnTextY = 225f
                    textPaint.color = Color.parseColor("#3b1d0a")
                    hiCanvas.drawText("Pet", 69f, btnTextY, textPaint)
                    textPaint.color = Color.parseColor("#ffffff")
                    hiCanvas.drawText("Feed", 178f, btnTextY, textPaint)
                    textPaint.color = Color.parseColor("#0c4a6e")
                    hiCanvas.drawText("Sky", 280f, btnTextY, textPaint)
                    textPaint.color = Color.parseColor("#3b1d0a")
                    hiCanvas.drawText("Cat(${cats.size})", 384f, btnTextY, textPaint)

                    val safeBmp = scaled.copy(Bitmap.Config.RGB_565, false) ?: scaled
                    if (safeBmp != scaled) scaled.recycle()
                    views.setImageViewBitmap(frameIds[frameIdx], safeBmp)
                }

                sprites.recycleAll()

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
            } catch (e: Exception) {}
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

            list.add(
                WidgetCat(
                    "Lilo", "#ffffff", "#dbe7f5",
                    "#29b6f6", "#29b6f6", "#1e88e5",
                    "solid", liloStartX, liloStartY, liloAct
                )
            )
            list.add(
                WidgetCat(
                    "Cheeto", "#ffffff", "#eee8dc",
                    "#ffb300", "#29b6f6", null,
                    "solid", cheetoStartX, cheetoStartY, cheetoAct
                )
            )

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
                            val cx = if (act == "SHELTER") 148 + (i * 8) else 52 + ((i * 28 + stepTick * 11) % 92)
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
                } catch (e: Exception) {}
            }

            for (i in 0 until extraCatsCount) {
                if (list.size >= 6) break
                val preset = PRESET_COMPANIONS[(i + addedFromJson) % PRESET_COMPANIONS.size]
                val act = if (weather == "RAIN") "SHELTER" else if (mode == "EAT") "EAT" else if ((i + stepTick) % 2 == 0) "WALK" else "SLEEP"
                val cx = when (act) {
                    "SHELTER" -> 150 + (i * 7)
                    "EAT" -> 76 + (i * 14)
                    else -> 50 + ((i * 31 + stepTick * 13) % 96)
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
            cats: List<WidgetCat>,
            sprites: GardenSprites
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

            // 1. Deep Forest Horizon & Top Hedge (Matching app.js)
            px(0, 0, w, 34, "#172d1a")
            px(0, 22, w, 12, "#2d5c2b")
            for (hx in 6 until w step 12) {
                px(hx, 23 + (if (hx % 24 == 0) 2 else 0), 9, 11, "#386e35")
            }

            // 2. Seamless Tiled Meadow Lawn using FieldsTile_38.png (#a6b04f)
            if (sprites.grassTile != null) {
                for (gy in 34 until h step 32) {
                    for (gx in 0 until w step 32) {
                        c.drawBitmap(sprites.grassTile, null, Rect(gx, gy, gx + 32, gy + 32), p)
                    }
                }
            } else {
                px(0, 34, w, h - 34, "#a6b04f")
            }

            // 3. Wooden Fence with Center Gate Opening
            px(6, 29, w - 12, 2, "#8c5832")
            px(6, 33, w - 12, 2, "#8c5832")
            for (fx in 10 until w - 10 step 14) {
                if (fx in 90..110) continue
                px(fx, 25, 4, 11, "#6e4223")
                px(fx + 1, 26, 2, 9, "#a86e42")
            }

            // 4. Fence Bushes & Wildflowers from Sprite Pack
            if (sprites.bush1 != null) {
                c.drawBitmap(sprites.bush1, null, Rect(36, 26, 52, 38), p)
                c.drawBitmap(sprites.bush1, null, Rect(122, 26, 138, 38), p)
            }
            if (sprites.bush2 != null) {
                c.drawBitmap(sprites.bush2, null, Rect(70, 26, 88, 38), p)
            }
            if (sprites.flower1 != null) {
                c.drawBitmap(sprites.flower1, null, Rect(64, 48, 70, 54), p)
                c.drawBitmap(sprites.flower1, null, Rect(136, 44, 142, 50), p)
            }
            if (sprites.flower3 != null) {
                c.drawBitmap(sprites.flower3, null, Rect(80, 62, 86, 68), p)
            }

            // 5. Stepping Stone Path
            val stones = arrayOf(
                Pair(96, 36), Pair(94, 42), Pair(86, 46), Pair(74, 48),
                Pair(97, 50), Pair(98, 57), Pair(97, 64)
            )
            for ((sx, sy) in stones) {
                px(sx, sy + 1, 8, 4, "#64748b")
                px(sx, sy, 7, 3, "#94a3b8")
            }

            // 6. Birdbath Pond with Ripples & Corner Stone (Bottom-Left)
            val pdX = 52
            val pdY = 78
            px(pdX - 9, pdY - 5, 18, 10, "#57534e")
            px(pdX - 8, pdY - 6, 16, 11, "#78716c")
            px(pdX - 7, pdY - 4, 14, 8, "#0284c7")
            px(pdX - 6, pdY - 3, 12, 6, "#38bdf8")
            px(pdX - 3 + (frame % 2), pdY - 1, 4, 1, "#bae6fd")
            if (sprites.stone7 != null) {
                c.drawBitmap(sprites.stone7, null, Rect(pdX - 12, pdY - 7, pdX - 4, pdY), p)
            }

            // 7. Sunny Nap Picnic Rug
            px(114, 58, 24, 13, "#fef3c7")
            for (rx in 116 until 136 step 6) {
                px(rx, 60, 2, 2, "#f59e0b")
                px(rx + 3, 65, 2, 2, "#f59e0b")
            }

            // 8. Western Garden Shade Tree (Moved Left) & Memorial Stone + Shrine Lamp (Separated Cleanly)
            if (sprites.tree1 != null) {
                c.drawBitmap(sprites.tree1, null, Rect(2, 26, 25, 58), p)
            }
            if (sprites.lamp1 != null) {
                c.drawBitmap(sprites.lamp1, null, Rect(33, 36, 41, 52), p)
            }
            val msX = 48
            val msY = 51
            px(msX - 7, msY - 2, 14, 5, "#64748b")
            px(msX - 5, msY - 12, 10, 11, "#94a3b8")
            px(msX - 4, msY - 13, 8, 2, "#cbd5e1")
            px(msX - 3, msY - 8, 2, 2, if (frame % 2 == 0) "#38bdf8" else "#7dd3fc")
            px(msX + 1, msY - 8, 2, 2, if (frame % 2 == 1) "#ffb300" else "#fde047")

            val flowerOffsets = arrayOf(
                Pair(-9, 2), Pair(-7, 6), Pair(8, 3), Pair(9, 6),
                Pair(-6, -4), Pair(7, -3), Pair(-3, 8), Pair(4, 8)
            )
            val visibleFlowers = (blooms / 3).coerceIn(3, flowerOffsets.size)
            for (i in 0 until visibleFlowers) {
                val (ox, oy) = flowerOffsets[i]
                val bob = if ((frame + i) % 2 == 0) 0 else -1
                px(msX + ox - 1, msY + oy + bob, 3, 2, "#38bdf8")
                px(msX + ox, msY + oy + bob, 1, 1, "#fef08a")
            }

            // 9. Covered Wooden Gazebo Shelter (Right)
            val gzX = 164
            val gzY = 50
            px(gzX - 18, gzY - 4, 36, 18, "#532e16")
            px(gzX - 17, gzY - 5, 34, 17, "#78431e")
            px(gzX - 12, gzY - 2, 24, 10, "#9f1239")
            px(gzX - 16, gzY - 20, 3, 28, "#532e16")
            px(gzX + 13, gzY - 20, 3, 28, "#532e16")
            px(gzX - 2, gzY - 15, 4, 5, if (isRain || isNight) "#fde047" else "#fef08a")
            px(gzX - 20, gzY - 24, 40, 8, "#6e3818")
            px(gzX - 15, gzY - 28, 30, 5, "#8c4820")

            // 10. Animated Campfire & Fallen Camp Log (Bottom-Right)
            val fireSheet = if (isRain) sprites.campfireSmoke else sprites.campfireActive
            if (fireSheet != null && fireSheet.width >= 192) {
                val srcX = (frame % 6) * 32
                c.drawBitmap(
                    fireSheet,
                    Rect(srcX, 0, srcX + 32, fireSheet.height),
                    Rect(144, 68, 160, 84),
                    p
                )
            }
            if (sprites.log1 != null) {
                c.drawBitmap(sprites.log1, null, Rect(162, 73, 180, 84), p)
            }

            // 11. Ceramic Food Bowl & Rolling Blue Yarn Ball
            val bwX = 98
            val bwY = 74
            px(bwX - 7, bwY, 14, 5, "#0284c7")
            px(bwX - 6, bwY - 1, 12, 4, "#38bdf8")
            px(bwX - 4, bwY - 2, 8, 3, "#d97706")

            val yarnX = if (mode == "YARN") 84 + (frame * 5) else 74
            val yarnY = 72 + (if (frame % 2 == 0) 0 else -1)
            px(yarnX - 3, yarnY - 3, 5, 5, "#1e88e5")
            px(yarnX - 2, yarnY - 2, 3, 2, "#60a5fa")

            // 12. Draw All Cats
            val sortedCats = cats.sortedBy { it.baseY }
            for ((idx, cat) in sortedCats.withIndex()) {
                val walkDir = if ((idx + stepTick) % 2 == 0) 1 else -1
                val animX = when (cat.activity) {
                    "WALK" -> (cat.baseX + walkDir * (frame * 5)).coerceIn(28, w - 24)
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

            // 13. Weather Particles & Atmospheric Tint (Matching app.js)
            if (isRain) {
                for (rx in 18 until w - 18 step 20) {
                    val ry = 34 + ((rx * 3 + frame * 11) % 48)
                    px(rx, ry, 1, 5, "#bae6fd")
                }
                p.color = Color.argb(65, 30, 41, 59)
                c.drawRect(0f, 22f, w.toFloat(), (h - 20).toFloat(), p)
            } else if (isNight) {
                p.color = Color.argb(95, 15, 23, 42)
                c.drawRect(0f, 22f, w.toFloat(), (h - 20).toFloat(), p)
                val fy = 44 + (frame % 2) * 3
                px(56, fy, 2, 2, "#fde047")
                px(140, 48 - (frame % 2) * 3, 2, 2, "#fde047")
            } else if (isCloudy) {
                p.color = Color.argb(32, 148, 163, 184)
                c.drawRect(0f, 22f, w.toFloat(), (h - 20).toFloat(), p)
            } else {
                val bfX = 58 + (frame * 4)
                val bfY = 42 + (if (frame % 2 == 0) -2 else 1)
                px(bfX, bfY, if (frame % 2 == 0) 3 else 1, 2, "#f472b6")
            }

            // 14. Top Stardew Banner Plaque
            px(10, 4, w - 20, 15, "#3b1d0a")
            px(12, 6, w - 24, 11, "#f7dba7")
            when (weather) {
                "NIGHT" -> drawPixelMoonIcon(c, p, 16, 9, "#7c3aed")
                "RAIN" -> drawPixelRainIcon(c, p, 16, 9, "#0284c7")
                "CLOUDY" -> drawPixelCloudIcon(c, p, 16, 9, "#475569")
                else -> drawPixelSunIcon(c, p, 16, 9, "#d97706")
            }
            drawPixelSparkleIcon(c, p, w - 22, 9, "#0284c7")

            // 15. Bottom 4-Button Stardew Toolbar (Pet | Feed | Sky | +Cat)
            val btnY = h - 19
            px(6, btnY, 45, 14, "#3b1d0a")
            px(7, btnY + 1, 43, 12, "#f6d397")
            drawPixelHeart(c, p, 14, btnY + 7, "#e11d48")

            px(53, btnY, 45, 14, "#3b1d0a")
            px(54, btnY + 1, 43, 12, "#68b82e")
            drawPixelFishIcon(c, p, 58, btnY + 4, "#fde047")

            px(100, btnY, 45, 14, "#3b1d0a")
            px(101, btnY + 1, 43, 12, "#7dd3fc")
            drawPixelSunIcon(c, p, 106, btnY + 4, "#0369a1")

            px(147, btnY, 47, 14, "#3b1d0a")
            px(148, btnY + 1, 45, 12, "#fbbf24")
            drawPixelPlusIcon(c, p, 153, btnY + 4, "#3b1d0a")

            // 16. Outer Stardew Wooden Frame
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

            if (cat.activity == "SLEEP") {
                val breath = if (frame % 2 == 0) 0 else 1
                r(-7, -1, 14, 3, "#223824")
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
                r(3, -6 + breath, 2, 1, "#475569")
                val zy = -13 - (frame * 2)
                r(7, zy, 3, 1, "#e0f2fe")
                r(8, zy + 1, 1, 1, "#e0f2fe")
                r(7, zy + 2, 3, 1, "#e0f2fe")
                c.restore()
                return
            }

            r(-6, -1, 12, 2, "#223824")
            if (!facingRight) c.scale(-1f, 1f)

            val bounceY = if (cat.activity == "WALK" && frame % 2 == 1) -1 else if (cat.activity == "PET" && frame % 2 == 0) -2 else 0
            val tailWagY = if (frame == 0) -1 else if (frame == 2) 1 else 0
            val headDip = if (cat.activity == "EAT" && frame % 2 == 1) 2 else 0

            r(-8, -8 + bounceY, 2, 3, cat.coat)
            r(-9, -11 + bounceY + tailWagY, 2, 4, cat.coat)
            r(-6, -8 + bounceY, 11, 6, cat.coat)
            r(-6, -4 + bounceY, 11, 2, cat.shade)

            if (cat.pattern == "tuxedo") {
                r(2, -6 + bounceY, 3, 4, "#ffffff")
            } else if (cat.pattern == "tabby") {
                r(-4, -8 + bounceY, 1, 4, cat.shade)
                r(-1, -8 + bounceY, 1, 4, cat.shade)
                r(2, -8 + bounceY, 1, 3, cat.shade)
            } else if (cat.pattern == "patches") {
                r(-4, -8 + bounceY, 4, 3, "#e07a2b")
                r(0, -7 + bounceY, 3, 3, "#2d3748")
            }

            if (cat.collar != null) {
                r(2, -5 + bounceY, 3, 1, cat.collar)
                r(4, -4 + bounceY, 1, 1, "#fde047")
            }

            val legA = if (cat.activity == "WALK" && frame % 2 == 0) -1 else 0
            val legB = if (cat.activity == "WALK" && frame % 2 == 1) -1 else 0
            r(-5, -2 + legA, 2, 2, cat.shade)
            r(-2, -2 + legB, 2, 2, cat.coat)
            r(1, -2 + legB, 2, 2, cat.shade)
            r(3, -2 + legA, 2, 2, cat.coat)

            val hy = -13 + bounceY + headDip
            r(0, hy, 8, 6, cat.coat)
            r(1, hy - 3, 2, 2, cat.coat)
            r(5, hy - 3, 2, 2, cat.coat)
            r(1, hy - 2, 1, 1, "#ff9ebb")
            r(6, hy - 2, 1, 1, "#ff9ebb")

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
