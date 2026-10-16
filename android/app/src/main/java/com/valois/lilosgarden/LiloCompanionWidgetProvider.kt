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
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Bundle
import android.widget.RemoteViews
import androidx.core.content.res.ResourcesCompat
import org.json.JSONObject
import java.util.Calendar

class LiloCompanionWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateCompanionWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateCompanionWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val appWidgetId = intent.getIntExtra(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        )
        val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)

        when (intent.action) {
            ACTION_COMP_POSE -> {
                val poses = arrayOf("GROOM", "SLEEP", "SIT")
                val key = "comp_pose_$appWidgetId"
                val cur = prefs.getString(key, "GROOM") ?: "GROOM"
                val next = poses[(poses.indexOf(cur) + 1) % poses.size]
                prefs.edit().putString(key, next).apply()
                refreshAllCompanionWidgets(context)
            }
            ACTION_COMP_SWITCH_CAT -> {
                val roster = getAvailableCats(prefs)
                val key = "comp_cat_idx_$appWidgetId"
                val nextIdx = (prefs.getInt(key, 0) + 1) % roster.size
                prefs.edit()
                    .putInt(key, nextIdx)
                    .remove("preferred_comp_cat_id")
                    .apply()
                refreshAllCompanionWidgets(context)
            }
        }
    }

    companion object {
        const val ACTION_COMP_POSE = "com.valois.lilosgarden.ACTION_COMP_POSE"
        const val ACTION_COMP_SWITCH_CAT = "com.valois.lilosgarden.ACTION_COMP_SWITCH_CAT"

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

        fun refreshAllCompanionWidgets(context: Context) {
            try {
                val manager = AppWidgetManager.getInstance(context)
                val ids = manager.getAppWidgetIds(
                    ComponentName(context, LiloCompanionWidgetProvider::class.java)
                )
                for (id in ids) {
                    updateCompanionWidget(context, manager, id)
                }
            } catch (_: Exception) {}
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
                                    c.optString("eyeColorRight", "#4ade80"),
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

        fun updateCompanionWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            try {
                val views = RemoteViews(context.packageName, R.layout.lilo_companion_widget)
                val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
                val roster = getAvailableCats(prefs)

                val preferredId = prefs.getString("preferred_comp_cat_id", null)
                var catIdx = prefs.getInt("comp_cat_idx_$appWidgetId", 0)
                if (!preferredId.isNullOrEmpty()) {
                    val found = roster.indexOfFirst { it.id == preferredId }
                    if (found >= 0) catIdx = found
                }
                val cat = roster[catIdx % roster.size]
                val pose = prefs.getString("comp_pose_$appWidgetId", "GROOM") ?: "GROOM"

                val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
                val isNight = hour < 6 || hour >= 19
                val weather = prefs.getString("weather", if (isNight) "NIGHT" else "SUNNY") ?: "SUNNY"
                val tempC = prefs.getInt("tempC", if (isNight) 19 else 25)

                val grassTileBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/1 Tiles/FieldsTile_38.png")
                val bushBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/9 Bush/1.png")
                val lampBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/7 Decor/Lamp1.png")
                val flowerBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/6 Flower/3.png")
                val stoneBmp = loadAssetBitmap(context, "assets/sprites/tileSprite/2 Objects/4 Stone/7.png")

                val pixelTypeface = try {
                    ResourcesCompat.getFont(context, R.font.press_start_2p)
                        ?: Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                } catch (_: Exception) {
                    Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                }

                val frameIds = intArrayOf(
                    R.id.comp_frame_0,
                    R.id.comp_frame_1,
                    R.id.comp_frame_2,
                    R.id.comp_frame_3
                )

                for (f in 0..3) {
                    val raw = drawStardewCompanionHudPixelPass(
                        f, cat, pose, weather,
                        grassTileBmp, bushBmp, lampBmp, flowerBmp, stoneBmp
                    )
                    // 440x224 matches 220x112 at 2x nearest-neighbor scale
                    val scaledRaw = Bitmap.createScaledBitmap(raw, 440, 224, false)
                    val scaled = if (scaledRaw.isMutable) scaledRaw else scaledRaw.copy(Bitmap.Config.ARGB_8888, true)
                    raw.recycle()
                    if (scaledRaw != scaled) scaledRaw.recycle()

                    val hiCanvas = Canvas(scaled)
                    val tp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        typeface = pixelTypeface
                    }

                    val poseLabel = when (pose) {
                        "GROOM" -> "Grooming"
                        "SLEEP" -> "Sleeping"
                        else -> "Lounging"
                    }

                    // 1. Top Scroll Banner Title (Pixel Font)
                    tp.textSize = 9.5f
                    tp.color = Color.parseColor("#3b1d0a")
                    tp.textAlign = Paint.Align.LEFT
                    hiCanvas.drawText("${cat.name} • $poseLabel", 232f, 39f, tp)

                    // 2. Weather Badge inside Bottom-Left of Clock Plaque
                    val weatherShort = when (weather) {
                        "RAIN" -> "Rain"
                        "NIGHT" -> "Night"
                        "CLOUDY" -> "Cloudy"
                        else -> "Sunny"
                    }
                    tp.textSize = 8.5f
                    tp.color = Color.parseColor("#0369a1")
                    tp.textAlign = Paint.Align.LEFT
                    hiCanvas.drawText("${tempC}°C $weatherShort", 242f, 176f, tp)

                    val safeBmp = scaled.copy(Bitmap.Config.RGB_565, false)
                    scaled.recycle()
                    views.setImageViewBitmap(frameIds[f], safeBmp)
                }

                grassTileBmp?.recycle()
                bushBmp?.recycle()
                lampBmp?.recycle()
                flowerBmp?.recycle()
                stoneBmp?.recycle()

                val openIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val openPending = PendingIntent.getActivity(
                    context,
                    appWidgetId + 500,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.comp_left_frame, openPending)
                views.setOnClickPendingIntent(R.id.comp_weather_hotspot, openPending)

                val poseIntent = Intent(context, LiloCompanionWidgetProvider::class.java).apply {
                    action = ACTION_COMP_POSE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                val posePending = PendingIntent.getBroadcast(
                    context,
                    appWidgetId + 600,
                    poseIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.comp_btn_action, posePending)

                val switchIntent = Intent(context, LiloCompanionWidgetProvider::class.java).apply {
                    action = ACTION_COMP_SWITCH_CAT
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                val switchPending = PendingIntent.getBroadcast(
                    context,
                    appWidgetId + 700,
                    switchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.comp_btn_switch_cat, switchPending)

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (_: Exception) {}
        }

        private fun drawStardewCompanionHudPixelPass(
            frame: Int,
            cat: CatSpec,
            pose: String,
            weather: String,
            grassTileBmp: Bitmap?,
            bushBmp: Bitmap?,
            lampBmp: Bitmap?,
            flowerBmp: Bitmap?,
            stoneBmp: Bitmap?
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

            val isNight = weather == "NIGHT"
            val isRain = weather == "RAIN"

            // 1. OUTER CARVED STARDEW VALLEY WOODEN FRAME
            px(0, 0, w, h, "#3b1d0a")
            px(2, 2, w - 4, h - 4, "#8f4d22")
            px(4, 4, w - 8, h - 8, "#c87d3b")
            px(6, 6, w - 12, h - 12, "#3b1d0a")

            val rivets = arrayOf(Pair(3, 3), Pair(w - 5, 3), Pair(3, h - 5), Pair(w - 5, h - 5))
            for ((rx, ry) in rivets) {
                px(rx, ry, 2, 2, "#fde047")
            }

            // 2. LEFT SECTION (x = 8..96, y = 8..104): PIXEL GARDEN SANCTUARY PATIO NOOK
            val nookX = 8
            val nookY = 8
            val nookW = 88
            val nookH = 96

            // Sky & Distant Forest Hedge at Top of Nook
            val skyCol = when {
                isNight -> "#0f172a"
                isRain -> "#1e293b"
                else -> "#38bdf8"
            }
            px(nookX, nookY, nookW, 20, skyCol)
            if (isNight) {
                px(nookX + 12, nookY + 4, 2, 2, if (frame % 2 == 0) "#fde047" else "#ffffff")
                px(nookX + 44, nookY + 6, 1, 1, "#bae6fd")
                drawPixelMoonIcon(c, p, nookX + 70, nookY + 4, "#fde047")
            } else if (!isRain) {
                drawPixelSunIcon(c, p, nookX + 70, nookY + 4, "#fde047")
                px(nookX + 16 + frame, nookY + 6, 10, 3, "#e0f2fe")
            }

            // Lush Forest Hedge & Wooden Garden Fence
            px(nookX, nookY + 16, nookW, 10, "#2d5c2b")
            for (hx in nookX until (nookX + nookW) step 10) {
                px(hx, nookY + 18 + (if (hx % 20 == 0) 1 else 0), 8, 8, "#386e35")
            }
            px(nookX, nookY + 22, nookW, 2, "#8c5832")
            px(nookX, nookY + 26, nookW, 2, "#8c5832")
            for (fx in (nookX + 4) until (nookX + nookW - 4) step 14) {
                px(fx, nookY + 19, 4, 11, "#6e4223")
                px(fx + 1, nookY + 20, 2, 9, "#a86e42")
            }

            // Tiled Meadow Lawn using FieldsTile_38.png
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

            // Bushes & Stepping Stones on the Lawn
            if (bushBmp != null) {
                c.drawBitmap(bushBmp, null, Rect(nookX + 4, nookY + 22, nookX + 24, nookY + 38), p)
                c.drawBitmap(bushBmp, null, Rect(nookX + 66, nookY + 22, nookX + 86, nookY + 38), p)
            }
            px(nookX + 36, nookY + 42, 10, 5, "#64748b")
            px(nookX + 36, nookY + 41, 9, 4, "#94a3b8")
            px(nookX + 48, nookY + 49, 11, 5, "#64748b")
            px(nookX + 48, nookY + 48, 10, 4, "#94a3b8")

            if (stoneBmp != null) {
                c.drawBitmap(stoneBmp, null, Rect(nookX + 68, nookY + 50, nookX + 80, nookY + 60), p)
            }

            // Cozy Gazebo Cedar Deck in Foreground (y = 72..104)
            px(nookX, nookY + 64, nookW, 3, "#3b1d0a")
            px(nookX, nookY + 67, nookW, 29, "#78431e")
            for (fy in (nookY + 72) until (nookY + nookH) step 6) {
                px(nookX, fy, nookW, 1, "#532e16")
            }

            // Shrine Lantern with Warm Glow
            if (lampBmp != null) {
                c.drawBitmap(lampBmp, null, Rect(nookX + 5, nookY + 38, nookX + 21, nookY + 68), p)
                val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
                glowPaint.shader = RadialGradient(
                    (nookX + 15).toFloat(), (nookY + 48).toFloat(), 18f,
                    Color.argb(95, 253, 224, 71), Color.argb(0, 253, 224, 71),
                    Shader.TileMode.CLAMP
                )
                c.drawCircle((nookX + 15).toFloat(), (nookY + 48).toFloat(), 18f, glowPaint)
            }
            if (flowerBmp != null) {
                c.drawBitmap(flowerBmp, null, Rect(nookX + 72, nookY + 38, nookX + 82, nookY + 48), p)
                c.drawBitmap(flowerBmp, null, Rect(nookX + 24, nookY + 52, nookX + 32, nookY + 60), p)
            }

            // Rain Drops or Night Atmosphere inside Nook
            if (isRain) {
                for (rx in (nookX + 8) until (nookX + nookW - 6) step 14) {
                    val ry = nookY + 8 + ((frame * 7 + rx) % 45)
                    px(rx, ry, 1, 5, "#bae6fd")
                }
            }
            if (isNight) {
                p.color = Color.argb(65, 15, 23, 42)
                c.drawRect(nookX.toFloat(), (nookY + 16).toFloat(), (nookX + nookW).toFloat(), (nookY + nookH).toFloat(), p)
            }

            // Plush Stardew Berry-Velvet Cat Bed on the Cedar Deck
            val bedX = 52
            val bedY = 84
            px(bedX - 26, bedY + 2, 52, 11, "#2a1208")
            px(bedX - 24, bedY - 4, 48, 14, "#4c0519")
            px(bedX - 22, bedY - 6, 44, 14, "#881337")
            px(bedX - 20, bedY - 7, 40, 13, "#be123c")
            px(bedX - 16, bedY - 3, 32, 8, "#fda4af")
            px(bedX - 14, bedY - 2, 28, 6, "#ffe4e6")

            drawRefinedCatOnBed(c, p, bedX, bedY - 2, frame, cat, pose)

            val floatY = 44 - (frame * 2)
            drawPixelHeart(c, p, 34, floatY, if (cat.id == "cheeto") "#ffb300" else "#fb7185")

            // 3. CENTER CARVED WOODEN DIVIDER
            px(96, 6, 5, h - 12, "#3b1d0a")
            px(98, 6, 1, h - 12, "#8f4d22")

            // 4. RIGHT SECTION (x = 101..212, y = 8..104): STARDEW PARCHMENT HUD
            val hudX = 101
            val hudY = 8
            val hudW = 111
            val hudH = 96
            px(hudX, hudY, hudW, hudH, "#f7dba7")
            for (gy in hudY until (hudY + hudH) step 4) {
                for (gx in hudX until (hudX + hudW) step 4) {
                    if (((gx + gy) / 4) % 2 == 0) {
                        px(gx, gy, 2, 2, "#efd095")
                    }
                }
            }

            // A. Top Recessed Scroll Banner
            px(105, 11, 103, 15, "#5e2c11")
            px(106, 12, 101, 13, "#ffefc7")
            px(106, 24, 101, 1, "#dfb573")
            drawPixelPawIcon(c, p, 108, 15, "#8f4d22")
            drawPixelSparkleIcon(c, p, 200, 16, "#0284c7")

            // B. Expanded Recessed Clock, Date, Weather & Compact Icon Buttons Plaque
            px(105, 29, 103, 71, "#5e2c11")
            px(106, 30, 101, 69, "#3b1d0a")
            px(107, 31, 99, 67, "#e9c78b")
            px(108, 32, 97, 65, "#f5deb3")

            // Subtle Horizontal Divider above Weather & Icon Buttons Row
            px(112, 74, 89, 1, "#dfb573")

            // Weather Pixel Icon on Bottom-Left of Plaque
            when (weather) {
                "NIGHT" -> drawPixelMoonIcon(c, p, 112, 83, "#7c3aed")
                "RAIN" -> drawPixelRainIcon(c, p, 112, 83, "#0284c7")
                "CLOUDY" -> drawPixelCloudIcon(c, p, 112, 83, "#475569")
                else -> drawPixelSunIcon(c, p, 112, 83, "#d97706")
            }

            // C. Two Compact 3D Beveled Pixel-Icon Buttons (Bottom-Right of Plaque)
            // Button 1: Pose / Pet Icon Button (x = 162..181, y = 77..94)
            px(162, 77, 19, 17, "#1e4206")
            px(163, 78, 17, 15, "#448514")
            px(163, 78, 17, 2, "#76c932")
            px(163, 91, 17, 2, "#2e5c0d")
            drawPixelHeart(c, p, 171, 86, "#ffffff")

            // Button 2: Switch Cat Icon Button (x = 184..203, y = 77..94)
            px(184, 77, 19, 17, "#3b1d0a")
            px(185, 78, 17, 15, "#dca03a")
            px(185, 78, 17, 2, "#ffe08a")
            px(185, 91, 17, 2, "#9c5a2d")
            drawPixelSwitchIcon(c, p, 189, 81, "#3b1d0a")

            return bmp
        }

        private fun drawPixelSwitchIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            // Top right-pointing pixel arrow
            c.drawRect((x + 1).toFloat(), (y + 1).toFloat(), (x + 8).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x + 6).toFloat(), y.toFloat(), (x + 7).toFloat(), (y + 3).toFloat(), p)
            // Bottom left-pointing pixel arrow
            c.drawRect((x + 1).toFloat(), (y + 5).toFloat(), (x + 8).toFloat(), (y + 6).toFloat(), p)
            c.drawRect((x + 2).toFloat(), (y + 4).toFloat(), (x + 3).toFloat(), (y + 7).toFloat(), p)
        }

        private fun drawRefinedCatOnBed(
            c: Canvas,
            p: Paint,
            bedX: Int,
            bedY: Int,
            frame: Int,
            cat: CatSpec,
            pose: String
        ) {
            c.save()
            c.translate(bedX.toFloat(), bedY.toFloat())
            c.scale(2.0f, 2.0f)

            fun r(rx: Int, ry: Int, rw: Int, rh: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(rx.toFloat(), ry.toFloat(), (rx + rw).toFloat(), (ry + rh).toFloat(), p)
            }

            if (pose == "SLEEP") {
                val breath = if (frame % 2 == 0) 0 else 1
                r(-7, -6 + breath, 14, 6, cat.coat)
                r(-6, -7 + breath, 12, 2, cat.coat)
                r(-7, -2, 14, 2, cat.shade)
                if (cat.pattern == "tabby") {
                    r(-3, -7 + breath, 2, 3, cat.shade)
                    r(1, -7 + breath, 2, 3, cat.shade)
                } else if (cat.pattern == "patches") {
                    r(-4, -6 + breath, 4, 3, "#d97706")
                }
                r(1, -8 + breath, 6, 5, cat.coat)
                r(2, -10 + breath, 2, 2, cat.coat)
                r(5, -10 + breath, 2, 2, cat.coat)
                r(2, -9 + breath, 1, 1, "#ff9ebb")
                r(5, -9 + breath, 1, 1, "#ff9ebb")
                r(3, -6 + breath, 2, 1, "#475569")
                if (cat.collar != null) {
                    r(0, -4 + breath, 3, 1, cat.collar)
                    r(2, -3 + breath, 1, 1, "#fde047")
                }
                val zy = -13 - frame
                r(7, zy, 3, 1, "#bae6fd")
                r(8, zy + 1, 1, 1, "#bae6fd")
                r(7, zy + 2, 3, 1, "#bae6fd")
                c.restore()
                return
            }

            val isGroom = pose == "GROOM"
            val headDip = if (isGroom && (frame == 1 || frame == 2)) 1 else 0
            val tailWagY = if (frame == 0) -1 else if (frame == 2) 1 else 0

            r(-8, -7, 2, 3, cat.coat)
            r(-9, -10 + tailWagY, 2, 4, cat.coat)
            r(-6, -8, 11, 6, cat.coat)
            r(-6, -4, 11, 2, cat.shade)

            if (cat.pattern == "tuxedo") {
                r(2, -6, 3, 4, "#ffffff")
            } else if (cat.pattern == "tabby") {
                r(-4, -8, 1, 4, cat.shade)
                r(-1, -8, 1, 4, cat.shade)
                r(2, -8, 1, 3, cat.shade)
            } else if (cat.pattern == "patches") {
                r(-5, -8, 4, 3, "#e07a2b")
                r(0, -7, 3, 3, "#2d3748")
            }

            if (cat.collar != null) {
                r(2, -5, 3, 1, cat.collar)
                r(4, -4, 1, 1, "#fde047")
            }

            r(-5, -2, 2, 2, cat.shade)
            r(-2, -2, 2, 2, cat.coat)
            r(1, -2, 2, 2, cat.shade)
            if (isGroom) {
                val pawY = if (frame == 1 || frame == 2) -8 else -6
                r(6, pawY, 2, 2, cat.coat)
                r(7, pawY, 1, 1, "#ff9ebb")
            } else {
                r(3, -2, 2, 2, cat.coat)
            }

            val hy = -13 + headDip
            r(0, hy, 8, 6, cat.coat)
            r(1, hy - 1, 6, 1, cat.coat)
            r(0, hy + 5, 8, 1, cat.shade)
            r(1, hy - 3, 2, 2, cat.coat)
            r(5, hy - 3, 2, 2, cat.coat)
            r(1, hy - 2, 1, 1, "#ff9ebb")
            r(6, hy - 2, 1, 1, "#ff9ebb")

            if (frame == 3 || (isGroom && (frame == 1 || frame == 2))) {
                r(2, hy + 2, 2, 1, "#334155")
                r(5, hy + 2, 2, 1, "#334155")
            } else {
                r(2, hy + 1, 2, 2, cat.eyeLeft)
                r(5, hy + 1, 2, 2, cat.eyeRight)
                r(2, hy + 1, 1, 1, "#ffffff")
                r(5, hy + 1, 1, 1, "#ffffff")
            }
            r(4, hy + 3, 1, 1, "#ff9ebb")
            if (isGroom && frame == 2) {
                r(5, hy + 4, 1, 1, "#fb7185")
            }

            c.restore()
        }

        private fun drawPixelHeart(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x - 2).toFloat(), (y - 2).toFloat(), x.toFloat(), y.toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y - 2).toFloat(), (x + 3).toFloat(), y.toFloat(), p)
            c.drawRect((x - 3).toFloat(), (y - 1).toFloat(), (x + 4).toFloat(), (y + 1).toFloat(), p)
            c.drawRect((x - 2).toFloat(), (y + 1).toFloat(), (x + 3).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x - 1).toFloat(), (y + 2).toFloat(), (x + 2).toFloat(), (y + 3).toFloat(), p)
        }

        private fun drawPixelPawIcon(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect(x.toFloat(), (y + 1).toFloat(), (x + 1).toFloat(), (y + 3).toFloat(), p)
            c.drawRect((x + 2).toFloat(), y.toFloat(), (x + 3).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x + 4).toFloat(), y.toFloat(), (x + 5).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x + 6).toFloat(), (y + 1).toFloat(), (x + 7).toFloat(), (y + 3).toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y + 3).toFloat(), (x + 6).toFloat(), (y + 6).toFloat(), p)
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
    }
}
