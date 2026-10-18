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
import android.media.AudioManager
import android.os.Bundle
import android.os.SystemClock
import android.view.KeyEvent
import android.widget.RemoteViews
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
                val now = System.currentTimeMillis()
                val prefs = context.getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
                val curState = prefs.getBoolean("is_playing", false)
                val newState = !curState
                for (prefName in arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")) {
                    context.getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                        .putBoolean("is_playing", newState)
                        .putBoolean("music_playing", newState)
                        .putLong("last_manual_toggle_ms", now)
                        .apply()
                }
                sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
                refreshAllMusicWidgets(context)
            }
            ACTION_MUSIC_PREV -> {
                val now = System.currentTimeMillis()
                for (prefName in arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")) {
                    context.getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                        .putLong("last_manual_toggle_ms", now)
                        .apply()
                }
                sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_PREVIOUS)
                refreshAllMusicWidgets(context)
            }
            ACTION_MUSIC_NEXT -> {
                val now = System.currentTimeMillis()
                for (prefName in arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")) {
                    context.getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                        .putLong("last_manual_toggle_ms", now)
                        .apply()
                }
                sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_NEXT)
                refreshAllMusicWidgets(context)
            }
            "com.spotify.music.metadatachanged", "com.android.music.metadatachanged" -> {
                val track = intent.getStringExtra("track")
                val artist = intent.getStringExtra("artist")
                val album = intent.getStringExtra("album")
                if (!track.isNullOrBlank()) {
                    for (prefName in arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")) {
                        context.getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                            .putString("track_title", track)
                            .putString("artist_name", artist ?: "")
                            .putString("album_name", album ?: "")
                            .putString("music_title", track)
                            .putString("music_artist", artist ?: "")
                            .putString("music_album", album ?: "")
                            .putLong("last_update", System.currentTimeMillis())
                            .apply()
                    }
                    refreshAllMusicWidgets(context)
                }
            }
            "com.spotify.music.playbackstatechanged", "com.android.music.playstatechanged" -> {
                val playing = intent.getBooleanExtra("playing", intent.getBooleanExtra("playstate", false))
                for (prefName in arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")) {
                    context.getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                        .putBoolean("is_playing", playing)
                        .putBoolean("music_playing", playing)
                        .apply()
                }
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

        fun hasNotificationAccess(context: Context): Boolean {
            return try {
                val enabledListeners = android.provider.Settings.Secure.getString(
                    context.contentResolver,
                    "enabled_notification_listeners"
                ) ?: return false
                val myComponent = ComponentName(context, LiloMediaListenerService::class.java).flattenToString()
                enabledListeners.contains(myComponent) || enabledListeners.contains(context.packageName)
            } catch (_: Exception) {
                false
            }
        }

        fun refreshAllMusicWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, LiloMusicWidgetProvider::class.java))
            if (ids.isNotEmpty()) {
                for (id in ids) {
                    updateMusicWidget(context, manager, id)
                }
            }
        }

        fun updateAllWidgets(context: Context) {
            refreshAllMusicWidgets(context)
        }

        fun loadPixelTypeface(context: Context): Typeface {
            return WidgetFontHelper.loadPixelTypeface(context)
        }

        private fun updateMusicWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            try {
                val hasAccess = hasNotificationAccess(context)
                val prefs = context.getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
                val track = prefs.getString("track_title", prefs.getString("music_title", if (hasAccess) "Cozy Garden Melodies" else "TAP TO LINK SPOTIFY")) ?: "Cozy Garden Melodies"
                val artist = prefs.getString("artist_name", prefs.getString("music_artist", if (hasAccess) "Lilo & Cheeto Sanctuary" else "Notification Access Required")) ?: "Lilo & Cheeto Sanctuary"
                val album = prefs.getString("album_name", prefs.getString("music_album", if (hasAccess) "Reunited Forever" else "Settings Permission")) ?: "Reunited Forever"
                val isPlaying = prefs.getBoolean("is_playing", prefs.getBoolean("music_playing", false))

                val views = RemoteViews(context.packageName, R.layout.lilo_music_widget)

                // 1. LAYER 1: 12 frames (playing) or 1 frame (paused) at 220x118 RGB_565 (< 620 KB Binder memory)
                // NO setAutoStart, stopFlipping, or startFlipping calls on RemoteViews to prevent launcher ActionException!
                views.removeAllViews(R.id.music_flipper)
                val frameCount = if (isPlaying) 12 else 1
                for (f in 0 until frameCount) {
                    val bmp = renderTurntableFrame(f, isPlaying)
                    val frameViews = RemoteViews(context.packageName, R.layout.widget_flipper_frame)
                    frameViews.setImageViewBitmap(R.id.frame_img, bmp)
                    views.addView(R.id.music_flipper, frameViews)
                }

                // 2. LAYER 2: High-Res Solid Track Typography & Button Sprites (440x236 ARGB_8888, exact 2.0x scale of 220x118)
                val hudBmp = renderHudBitmap(context, track, artist, album, isPlaying, hasAccess)
                views.setImageViewBitmap(R.id.music_hud_overlay, hudBmp)

                // 3. Hotspots
                val prevIntent = Intent(context, LiloMusicWidgetProvider::class.java).apply {
                    action = ACTION_MUSIC_PREV
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.music_btn_prev,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId * 100 + 10,
                        prevIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                val playIntent = Intent(context, LiloMusicWidgetProvider::class.java).apply {
                    action = ACTION_MUSIC_PLAY_PAUSE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.music_btn_play_pause,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId * 100 + 11,
                        playIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                val nextIntent = Intent(context, LiloMusicWidgetProvider::class.java).apply {
                    action = ACTION_MUSIC_NEXT
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.music_btn_next,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId * 100 + 12,
                        nextIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                // Tapping track info or turntable opens Settings (if no access) or Spotify / MainActivity
                val launchIntent = if (!hasAccess) {
                    Intent(android.provider.Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                } else {
                    context.packageManager.getLaunchIntentForPackage("com.spotify.music")
                        ?: Intent(context, MainActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                        }
                }
                val launchPending = PendingIntent.getActivity(
                    context,
                    appWidgetId * 100 + 13,
                    launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.music_info_hotspot, launchPending)
                views.setOnClickPendingIntent(R.id.music_open_app, launchPending)

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        private fun renderTurntableFrame(frameIdx: Int, isPlaying: Boolean): Bitmap {
            val w = 220
            val h = 118
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565)
            val c = Canvas(bmp)
            val p = Paint().apply { isAntiAlias = true }

            fun px(x: Int, y: Int, rw: Int, rh: Int, colHex: String) {
                p.color = Color.parseColor(colHex)
                c.drawRect(x.toFloat(), y.toFloat(), (x + rw).toFloat(), (y + rh).toFloat(), p)
            }

            // Stardew Wooden Frame (220 x 118)
            px(0, 0, w, h, "#3b1d0a")
            px(2, 2, w - 4, h - 4, "#532e16")
            px(4, 4, w - 8, h - 8, "#8c5832")
            px(6, 6, w - 12, h - 12, "#1e1b18") // Dark velvet interior

            // Turntable Platter (cx = 52, cy = 50, r = 34)
            val cx = 52f
            val cy = 50f
            val r = 34f
            p.color = Color.parseColor("#18181b") // Vinyl Black
            c.drawCircle(cx, cy, r, p)
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
            c.drawLine(82f, 20f, 62f, 44f, p)
            px(80, 18, 5, 5, "#ca8a04") // Tone arm base

            // Cats Sitting Underneath the Vinyl on the Left (x < 76):
            // Lilo at (cx = 36, cy = 104) and Cheeto at (cx = 68, cy = 104)
            val bobL = if (isPlaying && (frameIdx % 4 in 1..2)) -2 else 0
            val bobC = if (isPlaying && (frameIdx % 4 in 2..3)) -2 else 0

            // 1. Lilo (cx = 36, cy = 104)
            val ly = 104 - 18 + bobL
            px(36 - 5, ly, 3, 4, "#2c1d11") // Left Ear
            px(36 + 2, ly, 3, 4, "#2c1d11") // Right Ear
            px(36 - 6, ly + 2, 12, 8, "#ffeedb") // Cream Head
            px(36 - 4, ly + 4, 8, 5, "#422817") // Mask
            if (isPlaying) {
                px(36 - 3, ly + 5, 2, 1, "#1e293b")
                px(36 + 1, ly + 5, 2, 1, "#1e293b")
            } else {
                px(36 - 3, ly + 5, 2, 2, "#38bdf8")
                px(36 + 1, ly + 5, 2, 2, "#38bdf8")
            }
            px(36 - 7, 104 - 9, 14, 11, "#ffeedb") // Body

            // 2. Cheeto (cx = 68, cy = 104)
            val cyPos = 104 - 18 + bobC
            px(68 - 5, cyPos, 3, 4, "#c2410c") // Left Ear
            px(68 + 2, cyPos, 3, 4, "#c2410c") // Right Ear
            px(68 - 6, cyPos + 2, 12, 8, "#f97316") // Orange Head
            px(68 - 2, cyPos + 3, 1, 3, "#c2410c") // Stripes
            px(68 + 1, cyPos + 3, 1, 3, "#c2410c")
            if (isPlaying) {
                px(68 - 3, cyPos + 5, 2, 1, "#431407")
                px(68 + 1, cyPos + 5, 2, 1, "#431407")
            } else {
                px(68 - 3, cyPos + 5, 2, 2, "#22c55e")
                px(68 + 1, cyPos + 5, 2, 2, "#22c55e")
            }
            px(68 - 7, 104 - 9, 14, 11, "#ea580c") // Body

            // Floating Music Notes when playing
            if (isPlaying) {
                val noteY = 20 + (frameIdx % 6) * -2
                val noteX = 70 + (frameIdx % 4) * 2
                px(noteX, noteY, 2, 4, "#c084fc")
                px(noteX + 2, noteY, 3, 2, "#c084fc")
                px(noteX + 4, noteY, 2, 4, "#c084fc")
            }

            return bmp
        }

        private fun renderHudBitmap(
            context: Context,
            track: String,
            artist: String,
            album: String,
            isPlaying: Boolean,
            hasAccess: Boolean
        ): Bitmap {
            val w = 440
            val h = 236
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            val font = loadPixelTypeface(context)

            val p = Paint().apply {
                typeface = font
                isAntiAlias = true
                isSubpixelText = true
            }

            // Right Area: Music Information Card (RectF(152f, 18f, 422f, 146f))
            p.color = Color.parseColor("#3b1d0a")
            c.drawRect(152f, 18f, 422f, 146f, p)
            p.color = Color.parseColor("#532e16")
            c.drawRect(154f, 20f, 420f, 144f, p)
            p.color = Color.parseColor("#ffefc7") // Warm parchment card
            c.drawRect(156f, 22f, 418f, 142f, p)

            if (!hasAccess) {
                // Amber pill badge: "CONNECT SPOTIFY"
                p.color = Color.parseColor("#b45309")
                c.drawRect(162f, 26f, 286f, 44f, p)
                p.color = Color.parseColor("#ffffff")
                p.textSize = 12f
                p.textAlign = Paint.Align.LEFT
                c.drawText("CONNECT SPOTIFY", 168f, 40f, p)

                // Bold Prompt: "TAP TO LINK SPOTIFY" @ 20f bold
                p.textSize = 20f
                p.color = Color.parseColor("#3b1d0a")
                c.drawText("TAP TO LINK SPOTIFY", 162f, 74f, p)

                // Subtitle
                p.textSize = 14f
                p.color = Color.parseColor("#8f4d22")
                c.drawText("Tap card to open settings \u2192", 162f, 102f, p)

                // Status
                p.textSize = 14f
                p.color = Color.parseColor("#b45309")
                c.drawText("Notification access needed", 162f, 130f, p)
            } else {
                // Green pill badge: "SPOTIFY LIVE" (RectF(162f, 26f, 276f, 44f)), text 12f bold white
                p.color = Color.parseColor("#15803d")
                c.drawRect(162f, 26f, 276f, 44f, p)
                p.color = Color.parseColor("#ffffff")
                p.textSize = 12f
                p.textAlign = Paint.Align.LEFT
                c.drawText("SPOTIFY LIVE", 168f, 40f, p)

                // Track Title at (162f, 74f) in 21f bold Stardew_Valley.ttf (#3B1D0A, max 20 chars)
                p.textSize = 21f
                p.color = Color.parseColor("#3b1d0a")
                val truncatedTrack = truncate(track, 20)
                c.drawText(truncatedTrack, 162f, 74f, p)

                // Artist & Album at (162f, 102f) in 15f bold (#6E3F1D)
                p.textSize = 15f
                p.color = Color.parseColor("#6e3f1d")
                val artistAlbumStr = if (album.isNotBlank()) "$artist - $album" else artist
                val truncatedArtist = truncate(artistAlbumStr, 26)
                c.drawText(truncatedArtist, 162f, 102f, p)

                // Status text at (162f, 130f) in 15f bold: "▶ PLAYING" (#15803D) if isPlaying else "⏸ PAUSED" (#B45309)
                p.textSize = 15f
                p.color = if (isPlaying) Color.parseColor("#15803d") else Color.parseColor("#b45309")
                val badgeText = if (isPlaying) "\u25B6 PLAYING" else "\u23F8 PAUSED"
                c.drawText(badgeText, 162f, 130f, p)
            }

            // 3 Tactile Media Control Buttons on bottom-right (y = 158f..214f)
            // Button 1: Previous (RectF(152f, 158f, 234f, 214f))
            drawPixelMediaButton(c, 152f, 158f, 234f, 214f, "|<<", p, isHighlight = false)

            // Button 2: Play / Pause (RectF(244f, 158f, 330f, 214f))
            val playIcon = if (isPlaying) "||" else "\u25B6"
            drawPixelMediaButton(c, 244f, 158f, 330f, 214f, playIcon, p, isHighlight = true)

            // Button 3: Next (RectF(340f, 158f, 422f, 214f))
            drawPixelMediaButton(c, 340f, 158f, 422f, 214f, ">>|", p, isHighlight = false)

            return bmp
        }

        private fun drawPixelMediaButton(
            c: Canvas,
            left: Float,
            top: Float,
            right: Float,
            bottom: Float,
            label: String,
            p: Paint,
            isHighlight: Boolean = false
        ) {
            val w = right - left
            val h = bottom - top

            // Button border
            p.color = Color.parseColor("#3b1d0a")
            c.drawRect(left, top, right, bottom, p)

            // Button gradient fill
            p.color = if (isHighlight) Color.parseColor("#68b82e") else Color.parseColor("#ffe08a")
            c.drawRect(left + 2f, top + 2f, right - 2f, bottom - 2f, p)
            p.color = if (isHighlight) Color.parseColor("#3d7a14") else Color.parseColor("#dca03a")
            c.drawRect(left + 2f, top + h / 2f, right - 2f, bottom - 2f, p)

            // Button label (22f bold)
            p.color = if (isHighlight) Color.parseColor("#ffffff") else Color.parseColor("#3b1d0a")
            p.textSize = 22f
            p.textAlign = Paint.Align.CENTER
            c.drawText(label, (left + right) / 2f, top + 36f, p)
        }

        private fun truncate(str: String, maxLen: Int): String {
            return if (str.length <= maxLen) str else str.substring(0, maxLen - 1) + "\u2026"
        }
    }
}
