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

                // 1. LAYER 1: If playing, 12-Frame Spinning Turntable & Bobbing Cats (260x135 RGB_565). If paused, exactly 1 static frame!
                views.removeAllViews(R.id.music_flipper)
                if (isPlaying) {
                    views.setBoolean(R.id.music_flipper, "setAutoStart", true)
                    for (f in 0 until TOTAL_FRAMES) {
                        val frameBmp = renderMusicFrame(f, true)
                        val frameView = RemoteViews(context.packageName, R.layout.widget_flipper_frame)
                        frameView.setImageViewBitmap(R.id.frame_img, frameBmp)
                        views.addView(R.id.music_flipper, frameView)
                    }
                } else {
                    views.setBoolean(R.id.music_flipper, "setAutoStart", false)
                    val frameBmp = renderMusicFrame(0, false)
                    val frameView = RemoteViews(context.packageName, R.layout.widget_flipper_frame)
                    frameView.setImageViewBitmap(R.id.frame_img, frameBmp)
                    views.addView(R.id.music_flipper, frameView)
                }

                // 2. LAYER 2: High-Res Solid Track Typography & Button Sprites (520x270 ARGB_8888)
                val hudBmp = renderMusicHud(context, track, artist, album, isPlaying, hasAccess)
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
            } catch (_: Exception) {}
        }

        private fun renderMusicFrame(frameIdx: Int, isPlaying: Boolean): Bitmap {
            val w = 260
            val h = 135
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565)
            val c = Canvas(bmp)
            val p = Paint().apply { isAntiAlias = true }
            c.scale(w / 520f, h / 270f)

            fun px(x: Int, y: Int, rw: Int, rh: Int, colHex: String) {
                p.color = Color.parseColor(colHex)
                c.drawRect(x.toFloat(), y.toFloat(), (x + rw).toFloat(), (y + rh).toFloat(), p)
            }

            // Stardew Wooden Frame
            px(0, 0, 520, 270, "#3b1d0a")
            px(4, 4, 512, 262, "#532e16")
            px(10, 10, 500, 250, "#8c5832")
            px(14, 14, 492, 242, "#1e1b18") // Dark velvet interior

            // Turntable Platter (upper-left: cx = 92, cy = 104, r = 64)
            val cx = 92f
            val cy = 104f
            val r = 64f
            p.color = Color.parseColor("#18181b") // Vinyl Black
            c.drawCircle(cx, cy, r, p)
            p.color = Color.parseColor("#27272a")
            c.drawCircle(cx, cy, 52f, p)
            p.color = Color.parseColor("#3f3f46")
            c.drawCircle(cx, cy, 38f, p)

            // Spinning Vinyl Center Label & Grooves
            val angle = if (isPlaying) (frameIdx * 30.0 * Math.PI / 180.0) else 0.0
            p.color = Color.parseColor("#eab308") // Gold label
            c.drawCircle(cx, cy, 20f, p)
            p.color = Color.parseColor("#ca8a04")
            c.drawCircle(cx, cy, 10f, p)
            p.color = Color.parseColor("#09090b") // Center spindle
            c.drawCircle(cx, cy, 4f, p)

            // Spinning shine dot on vinyl
            val shineX = cx + (cos(angle) * 32).toFloat()
            val shineY = cy + (sin(angle) * 32).toFloat()
            px((shineX - 2).toInt(), (shineY - 2).toInt(), 5, 5, "#ffffff")

            // Brass Tone Arm
            p.color = Color.parseColor("#eab308")
            p.strokeWidth = 3f
            c.drawLine(156f, 42f, (cx + 22).toFloat(), (cy - 12).toFloat(), p)
            px(152, 38, 9, 9, "#ca8a04") // Tone arm base

            // Cats Sitting Underneath the Vinyl on the Left: Lilo (cx = 62, cy = 236) & Cheeto (cx = 114, cy = 236)
            val bobL = if (isPlaying && (frameIdx % 4 in 1..2)) -3 else 0

            // 1. Lilo (cx = 62, cy = 236)
            val lx = 62
            val ly = 236 + bobL
            // Ears
            px(lx - 10, ly - 28, 6, 9, "#2c1d11")
            px(lx + 4, ly - 28, 6, 9, "#2c1d11")
            // Cream Head
            px(lx - 11, ly - 22, 22, 17, "#ffeedb")
            // Mask
            px(lx - 7, ly - 18, 14, 10, "#422817")
            // Eyes
            if (isPlaying) {
                px(lx - 5, ly - 14, 3, 2, "#1e293b")
                px(lx + 2, ly - 14, 3, 2, "#1e293b")
            } else {
                px(lx - 5, ly - 15, 4, 4, "#38bdf8")
                px(lx + 1, ly - 15, 4, 4, "#38bdf8")
            }
            // Body
            px(lx - 14, ly - 5, 28, 26, "#ffeedb")

            // 2. Cheeto (cx = 114, cy = 236)
            val bobC = if (isPlaying && (frameIdx % 4 in 2..3)) -3 else 0
            val cx2 = 114
            val cy2 = 236 + bobC
            // Ears
            px(cx2 - 10, cy2 - 28, 6, 9, "#c2410c")
            px(cx2 + 4, cy2 - 28, 6, 9, "#c2410c")
            // Orange Head
            px(cx2 - 11, cy2 - 22, 22, 17, "#f97316")
            // Stripes
            px(cx2 - 4, cy2 - 20, 2, 6, "#c2410c")
            px(cx2, cy2 - 20, 2, 6, "#c2410c")
            px(cx2 + 4, cy2 - 20, 2, 6, "#c2410c")
            // Eyes
            if (isPlaying) {
                px(cx2 - 5, cy2 - 14, 3, 2, "#431407")
                px(cx2 + 2, cy2 - 14, 3, 2, "#431407")
            } else {
                px(cx2 - 5, cy2 - 15, 4, 4, "#22c55e") // Green eyes
                px(cx2 + 1, cy2 - 15, 4, 4, "#22c55e")
            }
            // Body
            px(cx2 - 14, cy2 - 5, 28, 26, "#ea580c")

            // Floating Music Notes when playing
            if (isPlaying) {
                val noteY = 40 + (frameIdx % 6) * -4
                val noteX = 140 + (frameIdx % 4) * 4
                px(noteX, noteY, 4, 8, "#c084fc")
                px(noteX + 4, noteY, 6, 4, "#c084fc")
                px(noteX + 10, noteY, 4, 10, "#c084fc")
            }

            return bmp
        }

        private fun renderMusicHud(
            context: Context,
            track: String,
            artist: String,
            album: String,
            isPlaying: Boolean,
            hasAccess: Boolean
        ): Bitmap {
            val w = 520
            val h = 270
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            val font = loadPixelTypeface(context)

            val p = Paint().apply {
                typeface = font
                isAntiAlias = true
                isSubpixelText = true
            }

            // Right Area: Music Information Card (x = 206..502, y = 14..156)
            p.color = Color.parseColor("#3b1d0a")
            c.drawRect(206f, 14f, 502f, 158f, p)
            p.color = Color.parseColor("#532e16")
            c.drawRect(208f, 16f, 500f, 156f, p)
            p.color = Color.parseColor("#ffefc7") // Warm parchment card
            c.drawRect(210f, 18f, 498f, 154f, p)

            if (!hasAccess) {
                // Header Tag: "CONNECT SPOTIFY"
                p.color = Color.parseColor("#b45309")
                c.drawRect(218f, 24f, 386f, 44f, p)
                p.color = Color.parseColor("#ffffff")
                p.textSize = 14f
                p.textAlign = Paint.Align.LEFT
                c.drawText("CONNECT SPOTIFY", 226f, 40f, p)

                // Bold Prompt: "TAP TO LINK SPOTIFY" @ 20f bold
                p.textSize = 20f
                p.color = Color.parseColor("#3b1d0a")
                c.drawText("TAP TO LINK SPOTIFY", 218f, 78f, p)

                // Subtitle
                p.textSize = 14f
                p.color = Color.parseColor("#8f4d22")
                c.drawText("Notification access needed for live track sync", 218f, 108f, p)

                // Status label
                p.textSize = 14f
                p.color = Color.parseColor("#b45309")
                c.drawText("Tap card to enable in Settings \u2192", 218f, 136f, p)
            } else {
                // Header Tag: "SPOTIFY / LIVE"
                p.color = Color.parseColor("#15803d")
                c.drawRect(218f, 24f, 370f, 44f, p)
                p.color = Color.parseColor("#ffffff")
                p.textSize = 14f
                p.textAlign = Paint.Align.LEFT
                c.drawText("SPOTIFY LIVE", 226f, 40f, p)

                // Track Title @ 24f bold (#3B1D0A)
                p.textSize = 24f
                p.color = Color.parseColor("#3b1d0a")
                val truncatedTrack = truncate(track, 20)
                c.drawText(truncatedTrack, 218f, 78f, p)

                // Artist & Album @ 18f bold (#6E3F1D)
                p.textSize = 18f
                p.color = Color.parseColor("#6e3f1d")
                val artistAlbumStr = if (album.isNotBlank()) "$artist - $album" else artist
                val truncatedArtist = truncate(artistAlbumStr, 26)
                c.drawText(truncatedArtist, 218f, 108f, p)

                // Status Badge @ 16f bold (PLAYING in emerald #15803D or PAUSED in amber #B45309)
                p.textSize = 16f
                p.color = if (isPlaying) Color.parseColor("#15803d") else Color.parseColor("#b45309")
                val badgeText = if (isPlaying) "\u25B6 PLAYING" else "\u23F8 PAUSED"
                c.drawText(badgeText, 218f, 136f, p)
            }

            // 3 Oversized Tactile Stardew Buttons (90x52 px each, icons @ 24f bold)
            // Button 1: Previous (x = 210..300, y = 174..226)
            drawPixelMediaButton(c, 210f, 174f, 90f, 52f, "|<<", p, isHighlight = false)

            // Button 2: Play / Pause (x = 308..398, y = 174..226)
            val playIcon = if (isPlaying) "||" else "\u25B6"
            drawPixelMediaButton(c, 308f, 174f, 90f, 52f, playIcon, p, isHighlight = true)

            // Button 3: Next (x = 406..496, y = 174..226)
            drawPixelMediaButton(c, 406f, 174f, 90f, 52f, ">>|", p, isHighlight = false)

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

            // Button label (24f bold)
            p.color = if (isHighlight) Color.parseColor("#ffffff") else Color.parseColor("#3b1d0a")
            p.textSize = 24f
            p.textAlign = Paint.Align.CENTER
            c.drawText(label, x + w / 2f, y + h / 2f + 8f, p)
        }

        private fun truncate(str: String, maxLen: Int): String {
            return if (str.length <= maxLen) str else str.substring(0, maxLen - 1) + "\u2026"
        }
    }
}
