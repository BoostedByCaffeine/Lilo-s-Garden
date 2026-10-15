package com.valois.lilosgarden

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
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

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.lilo_widget)
            val bitmap = createWidgetPixelArt(context)
            views.setImageViewBitmap(R.id.widget_canvas_img, bitmap)

            // Open Sanctuary MainActivity on click
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                appWidgetId,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)
            views.setOnClickPendingIntent(R.id.widget_canvas_img, pendingIntent)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun createWidgetPixelArt(context: Context): Bitmap {
            val width = 320
            val height = 160
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            val paint = Paint(0).apply {
                isAntiAlias = false
                isDither = false
            }

            val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
            val isNight = hour < 6 || hour >= 19
            val isSunset = hour in 17..18

            // 1. Sky Background
            paint.color = when {
                isNight -> Color.parseColor("#0f172a")
                isSunset -> Color.parseColor("#ea580c")
                else -> Color.parseColor("#60a5fa")
            }
            canvas.drawRect(0f, 0f, width.toFloat(), 64f, paint)

            // Stars & Fireflies at Night
            if (isNight) {
                paint.color = Color.parseColor("#ffffff")
                val starCoords = arrayOf(
                    Pair(24, 16), Pair(56, 28), Pair(92, 18), Pair(130, 24),
                    Pair(186, 14), Pair(220, 26), Pair(264, 18), Pair(295, 25),
                    Pair(42, 42), Pair(278, 40)
                )
                for ((sx, sy) in starCoords) {
                    canvas.drawRect(sx.toFloat(), sy.toFloat(), (sx + 2).toFloat(), (sy + 2).toFloat(), paint)
                }

                paint.color = Color.parseColor("#facc15")
                val fireflyCoords = arrayOf(Pair(72, 52), Pair(110, 46), Pair(210, 50), Pair(245, 44))
                for ((fx, fy) in fireflyCoords) {
                    canvas.drawRect(fx.toFloat(), fy.toFloat(), (fx + 2).toFloat(), (fy + 2).toFloat(), paint)
                }
            } else if (!isSunset) {
                // Cheerful Pixel Sun
                paint.color = Color.parseColor("#fde047")
                canvas.drawRect(276f, 16f, 296f, 36f, paint)
                paint.color = Color.parseColor("#fef08a")
                canvas.drawRect(280f, 20f, 292f, 32f, paint)
            }

            // 2. Lush Lawn with Checkerboard Pixel Grass
            val lawnDark = Color.parseColor("#387332")
            val lawnLight = Color.parseColor("#478942")
            val lawnHighlight = Color.parseColor("#5ba854")

            for (y in 60 until height step 8) {
                for (x in 0 until width step 8) {
                    paint.color = if (((x / 8) + (y / 8)) % 2 == 0) lawnLight else lawnDark
                    canvas.drawRect(x.toFloat(), y.toFloat(), (x + 8).toFloat(), (y + 8).toFloat(), paint)
                }
            }

            // Lawn Highlights & flower blades
            paint.color = lawnHighlight
            val bladeCoords = arrayOf(
                Pair(18, 75), Pair(52, 90), Pair(88, 120), Pair(112, 140),
                Pair(205, 138), Pair(242, 110), Pair(285, 78), Pair(290, 130)
            )
            for ((bx, by) in bladeCoords) {
                canvas.drawRect(bx.toFloat(), by.toFloat(), (bx + 3).toFloat(), (by + 2).toFloat(), paint)
            }

            // 3. Blue Forget-Me-Not Blooms
            paint.color = Color.parseColor("#38bdf8")
            val bloomCoords = arrayOf(
                Pair(32, 102), Pair(46, 124), Pair(82, 85), Pair(98, 110),
                Pair(226, 114), Pair(248, 88), Pair(272, 126), Pair(286, 105)
            )
            for ((fx, fy) in bloomCoords) {
                // Petals
                paint.color = Color.parseColor("#38bdf8")
                canvas.drawRect((fx - 2).toFloat(), (fy - 2).toFloat(), (fx + 4).toFloat(), (fy + 4).toFloat(), paint)
                // Center
                paint.color = Color.parseColor("#fef08a")
                canvas.drawRect(fx.toFloat(), fy.toFloat(), (fx + 2).toFloat(), (fy + 2).toFloat(), paint)
            }

            // 4. Memorial Stone Sanctuary (Left Side)
            paint.color = Color.parseColor("#64748b")
            canvas.drawRect(34f, 54f, 62f, 78f, paint)
            paint.color = Color.parseColor("#94a3b8")
            canvas.drawRect(36f, 52f, 60f, 54f, paint)
            paint.color = Color.parseColor("#475569")
            canvas.drawRect(36f, 78f, 60f, 82f, paint)
            // Memorial Stone forget-me-nots
            paint.color = Color.parseColor("#38bdf8")
            canvas.drawRect(42f, 62f, 46f, 66f, paint)
            canvas.drawRect(50f, 62f, 54f, 66f, paint)
            paint.color = Color.parseColor("#fef08a")
            canvas.drawRect(47f, 63f, 49f, 65f, paint)

            // 5. Ceramic Food Bowl (Right Side)
            paint.color = Color.parseColor("#0284c7")
            canvas.drawRect(252f, 70f, 276f, 80f, paint)
            paint.color = Color.parseColor("#38bdf8")
            canvas.drawRect(254f, 68f, 274f, 71f, paint)
            paint.color = Color.parseColor("#d97706") // Golden Kibble
            canvas.drawRect(256f, 70f, 272f, 74f, paint)

            // 6. Draw Pixel-Art Cats: Lilo (Left) & Cheeto (Right)
            // Cat Palette
            val catWhite = Color.parseColor("#ffffff")
            val catShade = Color.parseColor("#cbd5e1")
            val catPink = Color.parseColor("#ffb6c1")
            val liloBlue = Color.parseColor("#29b6f6")
            val cheetoAmber = Color.parseColor("#ffb300")
            val collarBlue = Color.parseColor("#1e88e5")
            val collarGold = Color.parseColor("#fde047")

            // --- LILO (x = 118, y = 84) ---
            val lx = 118f
            val ly = 84f
            // Body
            paint.color = catWhite
            canvas.drawRect(lx, ly + 14f, lx + 26f, ly + 36f, paint)
            paint.color = catShade
            canvas.drawRect(lx + 2f, ly + 34f, lx + 24f, ly + 37f, paint)
            // Head
            paint.color = catWhite
            canvas.drawRect(lx + 4f, ly + 2f, lx + 24f, ly + 16f, paint)
            // Ears
            canvas.drawRect(lx + 4f, ly - 4f, lx + 10f, ly + 2f, paint)
            canvas.drawRect(lx + 18f, ly - 4f, lx + 24f, ly + 2f, paint)
            paint.color = catPink
            canvas.drawRect(lx + 6f, ly - 2f, lx + 8f, ly + 1f, paint)
            canvas.drawRect(lx + 20f, ly - 2f, lx + 22f, ly + 1f, paint)
            // Blue Collar & Gold Bell
            paint.color = collarBlue
            canvas.drawRect(lx + 6f, ly + 14f, lx + 22f, ly + 17f, paint)
            paint.color = collarGold
            canvas.drawRect(lx + 12f, ly + 16f, lx + 16f, ly + 19f, paint)
            // Twin Blue Eyes
            paint.color = liloBlue
            canvas.drawRect(lx + 8f, ly + 7f, lx + 11f, ly + 11f, paint)
            canvas.drawRect(lx + 17f, ly + 7f, lx + 20f, ly + 11f, paint)
            // Cute Nose
            paint.color = catPink
            canvas.drawRect(lx + 13f, ly + 11f, lx + 15f, ly + 13f, paint)

            // --- CHEETO (x = 176, y = 84) ---
            val cx = 176f
            val cy = 84f
            // Body
            paint.color = catWhite
            canvas.drawRect(cx, cy + 14f, cx + 26f, cy + 36f, paint)
            paint.color = catShade
            canvas.drawRect(cx + 2f, cy + 34f, cx + 24f, cy + 37f, paint)
            // Head
            paint.color = catWhite
            canvas.drawRect(cx + 2f, cy + 2f, cx + 22f, cy + 16f, paint)
            // Ears
            canvas.drawRect(cx + 2f, cy - 4f, cx + 8f, cy + 2f, paint)
            canvas.drawRect(cx + 16f, cy - 4f, cx + 22f, cy + 2f, paint)
            paint.color = catPink
            canvas.drawRect(cx + 4f, cy - 2f, cx + 6f, cy + 1f, paint)
            canvas.drawRect(cx + 18f, cy - 2f, cx + 20f, cy + 1f, paint)
            // Amber (Left) & Blue (Right) Eyes
            paint.color = cheetoAmber
            canvas.drawRect(cx + 6f, cy + 7f, cx + 9f, cy + 11f, paint)
            paint.color = liloBlue
            canvas.drawRect(cx + 15f, cy + 7f, cx + 18f, cy + 11f, paint)
            // Cute Nose
            paint.color = catPink
            canvas.drawRect(cx + 11f, cy + 11f, cx + 13f, cy + 13f, paint)

            // Floating Pink Pixel Heart between brothers
            paint.color = Color.parseColor("#fb7185")
            val hx = 156f
            val hy = 76f
            canvas.drawRect(hx, hy - 4f, hx + 3f, hy - 1f, paint)
            canvas.drawRect(hx + 5f, hy - 4f, hx + 8f, hy - 1f, paint)
            canvas.drawRect(hx - 1f, hy - 1f, hx + 9f, hy + 2f, paint)
            canvas.drawRect(hx + 1f, hy + 2f, hx + 7f, hy + 4f, paint)
            canvas.drawRect(hx + 3f, hy + 4f, hx + 5f, hy + 6f, paint)

            // 7. Top Stardew Valley Wooden Plaque Banner
            paint.color = Color.parseColor("#3b1d0a") // Dark frame
            canvas.drawRect(24f, 8f, 296f, 32f, paint)
            paint.color = Color.parseColor("#8f4d22") // Mid wood
            canvas.drawRect(26f, 10f, 294f, 30f, paint)
            paint.color = Color.parseColor("#fdf6e2") // Parchment fill
            canvas.drawRect(28f, 12f, 292f, 28f, paint)

            // Banner Text
            paint.color = Color.parseColor("#3b1d0a")
            paint.isAntiAlias = true
            paint.textSize = 10.5f
            paint.typeface = Typeface.DEFAULT_BOLD
            paint.textAlign = Paint.Align.CENTER
            canvas.drawText("Lilo & Cheeto's Sanctuary • Tap to Visit", 160f, 23.5f, paint)
            paint.isAntiAlias = false

            // 8. Stardew Valley Widget Outer Wooden Box Border
            paint.color = Color.parseColor("#3b1d0a") // Outer dark border
            canvas.drawRect(0f, 0f, width.toFloat(), 4f, paint)
            canvas.drawRect(0f, (height - 4).toFloat(), width.toFloat(), height.toFloat(), paint)
            canvas.drawRect(0f, 0f, 4f, height.toFloat(), paint)
            canvas.drawRect((width - 4).toFloat(), 0f, width.toFloat(), height.toFloat(), paint)

            paint.color = Color.parseColor("#8f4d22") // Mid wood border
            canvas.drawRect(4f, 4f, (width - 4).toFloat(), 7f, paint)
            canvas.drawRect(4f, (height - 7).toFloat(), (width - 4).toFloat(), (height - 4).toFloat(), paint)
            canvas.drawRect(4f, 4f, 7f, (height - 4).toFloat(), paint)
            canvas.drawRect((width - 7).toFloat(), 4f, (width - 4).toFloat(), (height - 4).toFloat(), paint)

            paint.color = Color.parseColor("#f7dba7") // Inner honey bevel
            canvas.drawRect(7f, 7f, (width - 7).toFloat(), 8f, paint)
            canvas.drawRect(7f, 7f, 8f, (height - 7).toFloat(), paint)

            return bitmap
        }
    }
}
