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
import android.graphics.RectF
import android.graphics.Typeface
import android.media.AudioManager
import android.os.Bundle
import android.os.SystemClock
import android.view.KeyEvent
import android.widget.RemoteViews
import androidx.core.content.res.ResourcesCompat
import kotlin.math.cos
import kotlin.math.sin

class LiloMusicWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateMusicWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateMusicWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_MUSIC_PLAY_PAUSE -> {
                sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
                val prefs = context.getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
                val curState = prefs.getBoolean("is_playing", false)
                prefs.edit().putBoolean("is_playing", !curState).apply()
                refreshAllMusicWidgets(context)
            }
            ACTION_MUSIC_PREV -> {
                sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_PREVIOUS)
                refreshAllMusicWidgets(context)
            }
            ACTION_MUSIC_NEXT -> {
                sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_NEXT)
                refreshAllMusicWidgets(context)
            }
            "com.spotify.music.metadatachanged", "com.android.music.metadatachanged" -> {
                val track = intent.getStringExtra("track")
                val artist = intent.getStringExtra("artist")
                val album = intent.getStringExtra("album")
                if (!track.isNullOrBlank()) {
                    val prefs = context.getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
                    prefs.edit()
                        .putString("track_title", track)
                        .putString("artist_name", artist ?: "")
                        .putString("album_name", album ?: "")
                        .putLong("last_update", System.currentTimeMillis())
                        .apply()
                    refreshAllMusicWidgets(context)
                }
            }
            "com.spotify.music.playbackstatechanged", "com.android.music.playstatechanged" -> {
                val playing = intent.getBooleanExtra("playing", intent.getBooleanExtra("playstate", false))
                val prefs = context.getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
                prefs.edit().putBoolean("is_playing", playing).apply()
                refreshAllMusicWidgets(context)
            }
            ACTION_MUSIC_REFRESH -> {
                refreshAllMusicWidgets(context)
            }
        }
    }

    private fun sendMediaKey(context: Context, keyCode: Int) {
        try {
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            val eventTime = SystemClock.uptimeMillis()
            val down = KeyEvent(eventTime, eventTime, KeyEvent.ACTION_DOWN, keyCode, 0)
            val up = KeyEvent(eventTime, eventTime, KeyEvent.ACTION_UP, keyCode, 0)
            audioManager.dispatchMediaKeyEvent(down)
            audioManager.dispatchMediaKeyEvent(up)
        } catch (_: Exception) {}
    }

    companion object {
        const val ACTION_MUSIC_PLAY_PAUSE = "com.valois.lilosgarden.ACTION_MUSIC_PLAY_PAUSE"
        const val ACTION_MUSIC_PREV = "com.valois.lilosgarden.ACTION_MUSIC_PREV"
        const val ACTION_MUSIC_NEXT = "com.valois.lilosgarden.ACTION_MUSIC_NEXT"
        const val ACTION_MUSIC_REFRESH = "com.valois.lilosgarden.ACTION_MUSIC_REFRESH"
        private const val TOTAL_FRAMES = 12

        fun refreshAllMusicWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, LiloMusicWidgetProvider::class.java))
            if (ids.isNotEmpty()) {
                for (id in ids) {
                    updateMusicWidget(context, manager, id)
                }
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

        private fun updateMusicWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            try {
                val prefs = context.getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
                val track = prefs.getString("track_title", "Cozy Garden Melodies") ?: "Cozy Garden Melodies"
                val artist = prefs.getString("artist_name", "Lilo & Cheeto Sanctuary") ?: "Lilo & Cheeto Sanctuary"
                val album = prefs.getString("album_name", "Reunited Forever") ?: "Reunited Forever"
                val isPlaying = prefs.getBoolean("is_playing", false)

                val views = RemoteViews(context.packageName, R.layout.lilo_music_widget)

                // 1. LAYER 1: 12-Frame Spinning Turntable & Bobbing Cats (220x110 RGB_565)
                views.removeAllViews(R.id.music_flipper)
                for (f in 0 until TOTAL_FRAMES) {
                    val frameBmp = renderMusicFrame(f, isPlaying)
                    val frameView = RemoteViews(context.packageName, R.layout.widget_flipper_frame)
                    frameView.setImageViewBitmap(R.id.flipper_frame_img, frameBmp)
                    views.addView(R.id.music_flipper, frameView)
                }

                // 2. LAYER 2: High-Res Solid Track Typography & Button Sprites (440x220 ARGB_8888)
                val hudBmp = renderMusicHud(context, track, artist, album, isPlaying)
                views.setImageViewBitmap(R.id.music_hud_overlay, hudBmp)

                // 3. Hotspots
                val prevIntent = Intent(context, LiloMusicWidgetProvider::class.java).apply {
                    action = ACTION_MUSIC_PREV
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                val prevPending = PendingIntent.getBroadcast(
                    context,
                    appWidgetId * 100 + 10,
                    prevIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.music_btn_prev, prevPending)

                val playIntent = Intent(context, LiloMusicWidgetProvider::class.java).apply {
                    action = ACTION_MUSIC_PLAY_PAUSE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                val playPending = PendingIntent.getBroadcast(
                    context,
                    appWidgetId * 100 + 11,
                    playIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.music_btn_play_pause, playPending)

                val nextIntent = Intent(context, LiloMusicWidgetProvider::class.java).apply {
                    action = ACTION_MUSIC_NEXT
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                val nextPending = PendingIntent.getBroadcast(
                    context,
                    appWidgetId * 100 + 12,
                    nextIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.music_btn_next, nextPending)

                // Tapping track info or turntable opens Spotify or MainActivity
                val launchIntent = context.packageManager.getLaunchIntentForPackage("com.spotify.music")
                    ?: Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    }
                val launchPending = PendingIntent.getActivity(
                    context,
                    appWidgetId * 100 + 13,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.music_track_area, launchPending)
                views.setOnClickPendingIntent(R.id.music_turntable_area, launchPending)

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (_: Exception) {}
        }

        private fun renderMusicFrame(frameIdx: Int, isPlaying: Boolean): Bitmap {
            val w = 220
            val h = 110
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565)
            val c = Canvas(bmp)
            val p = Paint().apply { isAntiAlias = false }

            fun px(x: Int, y: Int, rw: Int, rh: Int, colHex: String) {
                p.color = Color.parseColor(colHex)
                c.drawRect(x.toFloat(), y.toFloat(), (x + rw).toFloat(), (y + rh).toFloat(), p)
            }

            // Stardew Wooden Frame
            px(0, 0, w, h, "#3b1d0a")
            px(2, 2, w - 4, h - 4, "#532e16")
            px(5, 5, w - 10, h - 10, "#8c5832")
            px(7, 7, w - 14, h - 14, "#1e1b18") // Dark velvet interior

            // Turntable Platter (Center at x = 46, y = 55, radius = 34)
            val cx = 46f
            val cy = 55f
            p.color = Color.parseColor("#18181b") // Vinyl Black
            c.drawCircle(cx, cy, 34f, p)
            p.color = Color.parseColor("#27272a")
            c.drawCircle(cx, cy, 28f, p)
            p.color = Color.parseColor("#3f3f46")
            c.drawCircle(cx, cy, 20f, p)

            // Spinning Vinyl Center Label & Grooves
            val angle = if (isPlaying) (frameIdx * 30.0 * Math.PI / 180.0) else 0.0
            p.color = Color.parseColor("#eab308") // Gold label
            c.drawCircle(cx, cy, 10f, p)
            p.color = Color.parseColor("#ca8a04")
            c.drawCircle(cx, cy, 5f, p)
            p.color = Color.parseColor("#09090b") // Center spindle
            c.drawCircle(cx, cy, 2f, p)

            // Spinning shine dot on vinyl
            val shineX = cx + (cos(angle) * 16).toFloat()
            val shineY = cy + (sin(angle) * 16).toFloat()
            px(shineX.toInt(), shineY.toInt(), 3, 3, "#ffffff")

            // Brass Tone Arm
            p.color = Color.parseColor("#eab308")
            p.strokeWidth = 2f
            c.drawLine(82f, 22f, (cx + 12).toFloat(), (cy - 6).toFloat(), p)
            px(80, 20, 5, 5, "#ca8a04") // Tone arm base

            // Cats Sitting on the Deck: Lilo & Cheeto
            // Head bob beat
            val bob = if (isPlaying && (frameIdx % 4 in 1..2)) -2 else 0

            // 1. Lilo sitting on right side of turntable (x = 84, y = 62)
            val lx = 84
            val ly = 62 + bob
            // Ears
            px(lx + 1, ly, 3, 5, "#2c1d11")
            px(lx + 11, ly, 3, 5, "#2c1d11")
            // Cream Head
            px(lx + 2, ly + 3, 11, 9, "#ffeedb")
            // Mask
            px(lx + 4, ly + 5, 7, 5, "#422817")
            // Eyes
            if (isPlaying) {
                // Happy closed curved eyes
                px(lx + 5, ly + 7, 2, 1, "#1e293b")
                px(lx + 8, ly + 7, 2, 1, "#1e293b")
            } else {
                px(lx + 5, ly + 6, 2, 2, "#38bdf8")
                px(lx + 8, ly + 6, 2, 2, "#38bdf8")
            }
            // Body
            px(lx, ly + 12, 15, 14, "#ffeedb")

            // 2. Cheeto sitting next to Lilo (x = 100, y = 64)
            val cx2 = 100
            val cy2 = 64 + (if (isPlaying && (frameIdx % 4 in 2..3)) -2 else 0)
            // Ears
            px(cx2 + 1, cy2, 3, 5, "#c2410c")
            px(cx2 + 11, cy2, 3, 5, "#c2410c")
            // Orange Head
            px(cx2 + 2, cy2 + 3, 11, 9, "#f97316")
            // Stripes
            px(cx2 + 5, cy2 + 4, 1, 3, "#c2410c")
            px(cx2 + 7, cy2 + 4, 1, 3, "#c2410c")
            px(cx2 + 9, cy2 + 4, 1, 3, "#c2410c")
            // Eyes
            if (isPlaying) {
                px(cx2 + 4, cy2 + 7, 2, 1, "#431407")
                px(cx2 + 9, cy2 + 7, 2, 1, "#431407")
            } else {
                px(cx2 + 4, cy2 + 6, 2, 2, "#22c55e") // Green eyes
                px(cx2 + 9, cy2 + 6, 2, 2, "#22c55e")
            }
            // Body
            px(cx2, cy2 + 12, 15, 12, "#ea580c")

            // Floating Music Notes when playing
            if (isPlaying) {
                val noteY = 22 + (frameIdx % 6) * -2
                val noteX = 96 + (frameIdx % 4) * 3
                px(noteX, noteY, 2, 4, "#c084fc")
                px(noteX + 2, noteY, 3, 2, "#c084fc")
                px(noteX + 5, noteY, 2, 5, "#c084fc")
            }

            return bmp
        }

        private fun renderMusicHud(
            context: Context,
            track: String,
            artist: String,
            album: String,
            isPlaying: Boolean
        ): Bitmap {
            val w = 440
            val h = 220
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            val font = loadPixelTypeface(context)

            val p = Paint().apply {
                typeface = font
                isAntiAlias = false
            }

            // Right Half: Music Information Box (x = 236..424, y = 16..114)
            p.color = Color.parseColor("#3b1d0a")
            c.drawRect(236f, 16f, 424f, 118f, p)
            p.color = Color.parseColor("#532e16")
            c.drawRect(238f, 18f, 422f, 116f, p)
            p.color = Color.parseColor("#ffefc7") // Parchment box
            c.drawRect(240f, 20f, 420f, 114f, p)

            // Header Tag: "SPOTIFY / LIVE"
            p.color = Color.parseColor("#15803d")
            c.drawRect(246f, 24f, 342f, 38f, p)
            p.color = Color.parseColor("#ffffff")
            p.textSize = 9f
            p.textAlign = Paint.Align.LEFT
            c.drawText("SPOTIFY LIVE", 252f, 34f, p)

            // Track Title
            p.textSize = 14f
            p.color = Color.parseColor("#3b1d0a")
            val truncatedTrack = truncate(track, 15)
            c.drawText(truncatedTrack, 246f, 62f, p)

            // Artist & Album
            p.textSize = 11f
            p.color = Color.parseColor("#8f4d22")
            val truncatedArtist = truncate("$artist \u2022 $album", 20)
            c.drawText(truncatedArtist, 246f, 82f, p)

            // Status label
            p.textSize = 10f
            p.color = if (isPlaying) Color.parseColor("#16a34a") else Color.parseColor("#b45309")
            c.drawText(if (isPlaying) "\u25B6 Playing" else "\u23F8 Paused", 246f, 102f, p)

            // 3 Media Control Buttons (y = 136..196)
            // Button 1: Previous (x = 240..290)
            drawPixelMediaButton(c, 240f, 136f, 50f, 42f, "|<<", p)

            // Button 2: Play / Pause (x = 300..360)
            val playIcon = if (isPlaying) "||" else "\u25B6"
            drawPixelMediaButton(c, 302f, 134f, 58f, 46f, playIcon, p, isHighlight = true)

            // Button 3: Next (x = 370..420)
            drawPixelMediaButton(c, 370f, 136f, 50f, 42f, ">>|", p)

            return bmp
        }

        private fun drawPixelMediaButton(
            c: Canvas,
            x: Float,
            y: Float,
            w: Float,
            h: Float,
            label: String,
            p: Paint,
            isHighlight: Boolean = false
        ) {
            // Button border
            p.color = Color.parseColor("#3b1d0a")
            c.drawRect(x, y, x + w, y + h, p)

            // Button gradient fill
            p.color = if (isHighlight) Color.parseColor("#68b82e") else Color.parseColor("#ffe08a")
            c.drawRect(x + 2f, y + 2f, x + w - 2f, y + h - 2f, p)
            p.color = if (isHighlight) Color.parseColor("#3d7a14") else Color.parseColor("#dca03a")
            c.drawRect(x + 2f, y + h / 2f, x + w - 2f, y + h - 2f, p)

            // Button label
            p.color = if (isHighlight) Color.parseColor("#ffffff") else Color.parseColor("#3b1d0a")
            p.textSize = if (isHighlight) 16f else 13f
            p.textAlign = Paint.Align.CENTER
            c.drawText(label, x + w / 2f, y + h / 2f + 5f, p)
        }

        private fun truncate(str: String, maxLen: Int): String {
            return if (str.length <= maxLen) str else str.substring(0, maxLen - 1) + "\u2026"
        }
    }
}
