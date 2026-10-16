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
import android.widget.RemoteViews
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

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
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
                prefs.edit().putInt(key, nextIdx).apply()
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
                val ids = manager.getAppWidgetIds(ComponentName(context, LiloCompanionWidgetProvider::class.java))
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
                if (!preferredId.isNullOrEmpty() && !prefs.contains("comp_cat_idx_$appWidgetId")) {
                    val found = roster.indexOfFirst { it.id == preferredId }
                    if (found >= 0) catIdx = found
                }
                val cat = roster[catIdx % roster.size]
                val pose = prefs.getString("comp_pose_$appWidgetId", "GROOM") ?: "GROOM"

                val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
                val isNight = hour < 6 || hour >= 19
                val weather = prefs.getString("weather", if (isNight) "NIGHT" else "SUNNY") ?: "SUNNY"
                val tempC = prefs.getInt("tempC", if (isNight) 19 else 25)

                // Update Right Section Native TextViews
                val poseLabel = when (pose) {
                    "GROOM" -> "Grooming Paw"
                    "SLEEP" -> "Sleeping (zZz)"
                    else -> "Lounging in Bed"
                }
                views.setTextViewText(R.id.comp_cat_title, "${cat.name} • $poseLabel")

                val weatherPretty = when (weather) {
                    "RAIN" -> "Rain Shower"
                    "NIGHT" -> "Starry Night"
                    "CLOUDY" -> "Cloudy Sky"
                    else -> "Sunny Sky"
                }
                views.setTextViewText(R.id.comp_weather_text, "• ${tempC}°C $weatherPretty")

                // Render 4 Crisp Frames of the Cat on the Plush Cat Bed (76x76 -> upscaled 3x to 228x228)
                val frameIds = intArrayOf(
                    R.id.comp_frame_0,
                    R.id.comp_frame_1,
                    R.id.comp_frame_2,
                    R.id.comp_frame_3
                )
                for (f in 0..3) {
                    val raw = drawCatBedPortraitFrame(f, cat, pose, weather)
                    val scaled = Bitmap.createScaledBitmap(raw, 228, 228, false)
                    val safeBmp = scaled.copy(Bitmap.Config.RGB_565, false)
                    raw.recycle()
                    scaled.recycle()
                    views.setImageViewBitmap(frameIds[f], safeBmp)
                }

                // Tap Left Frame -> Open Main Sanctuary App
                val openIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                val openPending = PendingIntent.getActivity(
                    context,
                    appWidgetId + 500,
                    openIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.comp_flipper, openPending)

                // Button 1: Cycle Pose (Groom -> Sleep -> Sit)
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

                // Button 2: Switch Cat (Lilo -> Cheeto -> Custom Cats)
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

        private fun drawCatBedPortraitFrame(
            frame: Int,
            cat: CatSpec,
            pose: String,
            weather: String
        ): Bitmap {
            val size = 76
            val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            val p = Paint(0).apply {
                isAntiAlias = false
                isDither = false
                isFilterBitmap = false
            }

            fun px(x: Int, y: Int, w: Int, h: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(x.toFloat(), y.toFloat(), (x + w).toFloat(), (y + h).toFloat(), p)
            }

            val isNight = weather == "NIGHT"
            val isRain = weather == "RAIN"

            // 1. Cozy Stardew Nook Background & Window
            px(0, 0, size, 44, if (isNight) "#1e293b" else "#5c3820")
            // Wooden wainscoting wall planks
            for (wx in 0 until size step 12) {
                px(wx, 0, 1, 44, "#3b1d0a")
            }
            // Window looking out at the sky
            px(44, 6, 24, 22, "#3b1d0a")
            px(46, 8, 20, 18, if (isNight) "#0f172a" else if (isRain) "#334155" else "#60a5fa")
            if (isNight) {
                px(50, 11, 2, 2, "#fde047")
                px(60, 14, 3, 3, "#fef08a")
            } else if (isRain) {
                px(50, 10 + (frame * 2), 1, 4, "#bae6fd")
                px(58, 12 + (frame * 2), 1, 4, "#bae6fd")
            } else {
                px(58, 10, 5, 5, "#fde047")
            }
            px(55, 8, 2, 18, "#3b1d0a") // Window mullion
            px(46, 16, 20, 2, "#3b1d0a")

            // 2. Cozy Wooden Floor &Lush Rug
            px(0, 44, size, 32, "#8f4d22")
            px(0, 44, size, 2, "#3b1d0a")
            for (fy in 50 until size step 8) {
                px(0, fy, size, 1, "#6e3b17")
            }

            // 3. Plush Berry-Velvet Cat Bed (Center)
            val bedX = 38
            val bedY = 56
            px(bedX - 24, bedY, 48, 12, "#450a0a")       // Bed shadow
            px(bedX - 23, bedY - 4, 46, 14, "#881337")   // Outer bolster rim
            px(bedX - 21, bedY - 6, 42, 14, "#9f1239")   // Plush bolster highlight
            px(bedX - 17, bedY - 3, 34, 9, "#fda4af")    // Soft inner cushion
            px(bedX - 15, bedY - 2, 30, 7, "#fecdd3")

            // 4. Draw the Selected Cat in the Cat Bed (2x Scale Pixel Sprite)
            c.save()
            c.translate(bedX.toFloat(), (bedY - 2).toFloat())
            c.scale(1.8f, 1.8f)

            fun r(rx: Int, ry: Int, rw: Int, rh: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(rx.toFloat(), ry.toFloat(), (rx + rw).toFloat(), (ry + rh).toFloat(), p)
            }

            if (pose == "SLEEP") {
                val breath = if (frame % 2 == 0) 0 else 1
                r(-7, -6 + breath, 14, 6, cat.coat)
                r(-7, -2, 14, 2, cat.shade)
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
                if (cat.collar != null) {
                    r(0, -4 + breath, 3, 1, cat.collar)
                }
                // Rising zZz
                val zy = -13 - frame
                r(7, zy, 3, 1, "#38bdf8")
                r(8, zy + 1, 1, 1, "#38bdf8")
                r(7, zy + 2, 3, 1, "#38bdf8")
            } else if (pose == "GROOM") {
                // Grooming Pose: Cat sits and licks raised front paw on frames 1 & 2
                val headTilt = if (frame == 1 || frame == 2) 2 else 0
                val pawRaise = if (frame == 1 || frame == 2) -3 else -1

                // Tail
                r(-8, -7, 2, 4, cat.coat)
                // Body
                r(-6, -8, 11, 7, cat.coat)
                r(-6, -3, 11, 2, cat.shade)
                if (cat.pattern == "tuxedo") r(1, -6, 4, 4, "#ffffff")
                else if (cat.pattern == "tabby") r(-3, -8, 2, 4, cat.shade)
                else if (cat.pattern == "patches") r(-4, -8, 4, 3, "#e07a2b")

                if (cat.collar != null) {
                    r(1, -5, 4, 1, cat.collar)
                    r(3, -4, 1, 1, "#fde047")
                }

                // Raised Grooming Paw
                r(4, -5 + pawRaise, 3, 2, cat.coat)
                r(5, -6 + pawRaise, 1, 1, "#ff9ebb") // Pink paw pad

                // Head dipping toward paw
                val hy = -13 + headTilt
                r(-1, hy, 8, 6, cat.coat)
                r(0, hy - 2, 2, 2, cat.coat)
                r(4, hy - 2, 2, 2, cat.coat)
                // Closed happy grooming eyes
                r(1, hy + 2, 2, 1, "#334155")
                r(4, hy + 2, 2, 1, "#334155")
                // Little pink tongue licking paw on frame 1 & 2
                if (frame == 1 || frame == 2) {
                    r(4, hy + 4, 2, 2, "#fb7185")
                } else {
                    r(3, hy + 3, 1, 1, "#ff9ebb")
                }
            } else {
                // SIT Pose: Alert, blinking, tail wagging
                val tailY = if (frame % 2 == 0) -1 else 1
                r(-8, -8 + tailY, 2, 5, cat.coat)
                r(-6, -8, 11, 7, cat.coat)
                r(-6, -3, 11, 2, cat.shade)
                if (cat.collar != null) {
                    r(1, -5, 4, 1, cat.collar)
                    r(3, -4, 1, 1, "#fde047")
                }
                val hy = -13
                r(0, hy, 8, 6, cat.coat)
                r(1, hy - 2, 2, 2, cat.coat)
                r(5, hy - 2, 2, 2, cat.coat)
                if (frame == 3) {
                    r(2, hy + 2, 2, 1, "#334155")
                    r(5, hy + 2, 2, 1, "#334155")
                } else {
                    r(2, hy + 1, 2, 2, cat.eyeLeft)
                    r(5, hy + 1, 2, 2, cat.eyeRight)
                }
                r(4, hy + 3, 1, 1, "#ff9ebb")
            }
            c.restore()

            // Floating heart above cat bed
            val hy = 16 - (frame * 2)
            px(20, hy, 2, 2, "#fb7185")
            px(23, hy, 2, 2, "#fb7185")
            px(19, hy + 1, 7, 2, "#fb7185")
            px(21, hy + 3, 3, 2, "#fb7185")

            return bmp
        }
    }
}
