package com.valois.lilosgarden

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.media.AudioManager
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.service.notification.NotificationListenerService
import android.view.KeyEvent
import android.widget.RemoteViews
import org.json.JSONObject
import kotlin.math.cos
import kotlin.math.sin

class LiloMusicWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        try {
            LiloMediaListenerService.instance?.initMediaSessions()
        } catch (_: Exception) {}
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

                // Direct MediaController transport controls if available
                val controller = resolveActiveController(context)
                if (controller != null) {
                    try {
                        val pbState = controller.playbackState?.state
                        if (pbState == PlaybackState.STATE_PLAYING) {
                            controller.transportControls.pause()
                        } else {
                            controller.transportControls.play()
                        }
                    } catch (_: Exception) {
                        sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
                    }
                } else {
                    sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)
                }
                refreshAllMusicWidgets(context)
            }
            ACTION_MUSIC_PREV -> {
                val now = System.currentTimeMillis()
                for (prefName in arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")) {
                    context.getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                        .putLong("last_manual_toggle_ms", now)
                        .apply()
                }
                val controller = resolveActiveController(context)
                if (controller != null) {
                    try {
                        controller.transportControls.skipToPrevious()
                    } catch (_: Exception) {
                        sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_PREVIOUS)
                    }
                } else {
                    sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_PREVIOUS)
                }
                refreshAllMusicWidgets(context)
            }
            ACTION_MUSIC_NEXT -> {
                val now = System.currentTimeMillis()
                for (prefName in arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")) {
                    context.getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                        .putLong("last_manual_toggle_ms", now)
                        .apply()
                }
                val controller = resolveActiveController(context)
                if (controller != null) {
                    try {
                        controller.transportControls.skipToNext()
                    } catch (_: Exception) {
                        sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_NEXT)
                    }
                } else {
                    sendMediaKey(context, KeyEvent.KEYCODE_MEDIA_NEXT)
                }
                refreshAllMusicWidgets(context)
            }
            ACTION_MUSIC_SWITCH_CAT -> {
                val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
                val roster = getWindowCatRoster(prefs)
                val curIdx = prefs.getInt("music_cat_idx", 0)
                val nextIdx = (curIdx + 1) % roster.size
                prefs.edit().putInt("music_cat_idx", nextIdx).apply()
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
                try {
                    LiloMediaListenerService.instance?.initMediaSessions()
                } catch (_: Exception) {}
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
        const val ACTION_MUSIC_SWITCH_CAT = "com.valois.lilosgarden.ACTION_MUSIC_SWITCH_CAT"
        const val ACTION_MUSIC_REFRESH = "com.valois.lilosgarden.ACTION_MUSIC_REFRESH"
        private const val TOTAL_FRAMES = 12

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

        fun getWindowCatRoster(prefs: SharedPreferences): List<PeekCatSpec> {
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
                } catch (_: Exception) {}
            }
            return list
        }

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

        fun resolveActiveController(context: Context): MediaController? {
            val serviceCtrl = LiloMediaListenerService.instance?.getActiveController()
            if (serviceCtrl != null) return serviceCtrl
            if (hasNotificationAccess(context)) {
                try {
                    val sm = context.getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager
                    val component = ComponentName(context, LiloMediaListenerService::class.java)
                    val controllers = sm?.getActiveSessions(component)
                    val playing = controllers?.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
                    val spotify = controllers?.firstOrNull { it.packageName.contains("spotify", ignoreCase = true) }
                    return playing ?: spotify ?: controllers?.firstOrNull()
                } catch (_: Exception) {}
            }
            return null
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
                val widgetPrefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
                val roster = getWindowCatRoster(widgetPrefs)
                val catIdx = widgetPrefs.getInt("music_cat_idx", 0) % roster.size
                val activeCat = roster[catIdx]

                var track = prefs.getString("track_title", prefs.getString("music_title", if (hasAccess) "Cozy Garden Melodies" else "TAP TO LINK SPOTIFY")) ?: "Cozy Garden Melodies"
                var artist = prefs.getString("artist_name", prefs.getString("music_artist", if (hasAccess) "Lilo & Cheeto Sanctuary" else "Notification Access Required")) ?: "Lilo & Cheeto Sanctuary"
                var album = prefs.getString("album_name", prefs.getString("music_album", if (hasAccess) "Reunited Forever" else "Settings Permission")) ?: "Reunited Forever"
                var isPlaying = prefs.getBoolean("is_playing", prefs.getBoolean("music_playing", false))

                if (hasAccess) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && LiloMediaListenerService.instance == null) {
                        try {
                            NotificationListenerService.requestRebind(ComponentName(context, LiloMediaListenerService::class.java))
                        } catch (_: Exception) {}
                    }
                    try {
                        val ctrl = resolveActiveController(context)
                        if (ctrl != null) {
                            val liveState = ctrl.playbackState
                            val liveMeta = ctrl.metadata
                            val now = System.currentTimeMillis()
                            val lastToggle = prefs.getLong("last_manual_toggle_ms", 0L)
                            if (now - lastToggle >= 600L && liveState != null) {
                                val livePlaying = (liveState.state == PlaybackState.STATE_PLAYING)
                                if (livePlaying != isPlaying) {
                                    isPlaying = livePlaying
                                    for (prefName in arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")) {
                                        context.getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                                            .putBoolean("is_playing", livePlaying)
                                            .putBoolean("music_playing", livePlaying)
                                            .apply()
                                    }
                                }
                            }
                            if (liveMeta != null) {
                                val liveTitle = liveMeta.getString(android.media.MediaMetadata.METADATA_KEY_TITLE)
                                    ?: liveMeta.getText(android.media.MediaMetadata.METADATA_KEY_TITLE)?.toString()
                                val liveArtist = liveMeta.getString(android.media.MediaMetadata.METADATA_KEY_ARTIST)
                                    ?: liveMeta.getText(android.media.MediaMetadata.METADATA_KEY_ARTIST)?.toString()
                                val liveAlbum = liveMeta.getString(android.media.MediaMetadata.METADATA_KEY_ALBUM)
                                    ?: liveMeta.getText(android.media.MediaMetadata.METADATA_KEY_ALBUM)?.toString()
                                if (!liveTitle.isNullOrBlank() && (liveTitle != track || (liveArtist != null && liveArtist != artist))) {
                                    track = liveTitle.trim()
                                    artist = liveArtist?.trim() ?: ""
                                    album = liveAlbum?.trim() ?: ""
                                    for (prefName in arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")) {
                                        context.getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                                            .putString("track_title", track)
                                            .putString("artist_name", artist)
                                            .putString("album_name", album)
                                            .putString("music_title", track)
                                            .putString("music_artist", artist)
                                            .putString("music_album", album)
                                            .apply()
                                    }
                                }
                            }
                        }
                    } catch (_: Exception) {}
                }

                val views = RemoteViews(context.packageName, R.layout.lilo_music_widget)

                // 1. LAYER 1: 12 frames (playing) or 1 frame (paused) at 220x118 RGB_565 (< 620 KB Binder memory)
                // NO setAutoStart, stopFlipping, or startFlipping calls on RemoteViews to prevent launcher ActionException!
                views.removeAllViews(R.id.music_flipper)
                val frameCount = if (isPlaying) 12 else 1
                for (f in 0 until frameCount) {
                    val bmp = renderTurntableFrame(f, isPlaying, activeCat)
                    val frameViews = RemoteViews(context.packageName, R.layout.widget_flipper_frame)
                    frameViews.setImageViewBitmap(R.id.frame_img, bmp)
                    views.addView(R.id.music_flipper, frameViews)
                }

                // 2. LAYER 2: High-Res Solid Track Typography & Button Sprites (scaled to 330x177 ARGB_8888 for safe Binder payload)
                val rawHudBmp = renderHudBitmap(context, track, artist, album, isPlaying, hasAccess)
                val hudBmp = Bitmap.createScaledBitmap(rawHudBmp, 330, 177, true)
                rawHudBmp.recycle()
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

                // Tapping the bottom-left cat area switches active cat
                val switchIntent = Intent(context, LiloMusicWidgetProvider::class.java).apply {
                    action = ACTION_MUSIC_SWITCH_CAT
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.music_btn_switch_cat,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId * 100 + 14,
                        switchIntent,
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

        private fun renderTurntableFrame(frameIdx: Int, isPlaying: Boolean, activeCat: PeekCatSpec): Bitmap {
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
            px(6, 6, w - 12, h - 12, "#181412") // Dark cozy interior

            // Turntable Deck Bay on Left (x = 8..72, y = 8..66)
            px(8, 8, 64, 58, "#261c14") // Warm walnut base
            px(9, 9, 62, 56, "#14100d") // Recessed deck plate

            val cx = 38f
            val cy = 37f
            val r = 25f

            // Metallic Platter Bezel
            p.color = Color.parseColor("#52525b")
            c.drawCircle(cx, cy, r + 1f, p)

            // Vinyl Record Disc (Black)
            p.color = Color.parseColor("#18181b")
            c.drawCircle(cx, cy, r, p)

            // Vinyl Grooves
            p.color = Color.parseColor("#27272a")
            c.drawCircle(cx, cy, 21f, p)
            p.color = Color.parseColor("#1f1f23")
            c.drawCircle(cx, cy, 17f, p)
            p.color = Color.parseColor("#27272a")
            c.drawCircle(cx, cy, 13f, p)
            p.color = Color.parseColor("#18181b")
            c.drawCircle(cx, cy, 10f, p)

            // Gold Center Label
            p.color = Color.parseColor("#f59e0b")
            c.drawCircle(cx, cy, 8f, p)
            p.color = Color.parseColor("#d97706")
            c.drawCircle(cx, cy, 5f, p)
            p.color = Color.parseColor("#09090b") // Spindle hole
            c.drawCircle(cx, cy, 2f, p)

            // Dynamic Vinyl Rotation Shine
            if (isPlaying) {
                val angle = frameIdx * (Math.PI / 6.0)
                val shine1X = cx + (cos(angle) * 16.0).toFloat()
                val shine1Y = cy + (sin(angle) * 16.0).toFloat()
                px(shine1X.toInt(), shine1Y.toInt(), 2, 2, "#e4e4e7")

                val shine2X = cx - (cos(angle) * 16.0).toFloat()
                val shine2Y = cy - (sin(angle) * 16.0).toFloat()
                px(shine2X.toInt(), shine2Y.toInt(), 2, 2, "#a1a1aa")

                // Label spinning notch
                val notchX = cx + (cos(angle) * 6.0).toFloat()
                val notchY = cy + (sin(angle) * 6.0).toFloat()
                px(notchX.toInt(), notchY.toInt(), 1, 1, "#ffffff")
            } else {
                px((cx - 11).toInt(), (cy - 11).toInt(), 2, 2, "#52525b")
                px((cx + 11).toInt(), (cy + 11).toInt(), 2, 2, "#52525b")
            }

            // Dynamic Tonearm & Rest Cradle
            val pivotX = 64f
            val pivotY = 16f

            // Brass pivot gimbal mount
            p.color = Color.parseColor("#3b1d0a")
            c.drawCircle(pivotX, pivotY, 3.5f, p)
            p.color = Color.parseColor("#ca8a04")
            c.drawCircle(pivotX, pivotY, 2.5f, p)
            p.color = Color.parseColor("#fde047")
            c.drawCircle(pivotX, pivotY, 1f, p)

            // Rest Cradle clip on the deck edge (x = 66, y = 38)
            px(65, 37, 3, 4, "#ca8a04")
            px(66, 38, 1, 2, "#181412")

            if (isPlaying) {
                // PLAYING: Tonearm placed on the vinyl grooves!
                val needleJitter = if (frameIdx % 2 == 0) 0f else 0.5f
                val needleX = 46f
                val needleY = 41f + needleJitter

                // Brass Arm
                p.color = Color.parseColor("#eab308")
                p.strokeWidth = 1.8f
                c.drawLine(pivotX, pivotY, needleX, needleY, p)
                // Highlight
                p.color = Color.parseColor("#fef08a")
                p.strokeWidth = 0.8f
                c.drawLine(pivotX - 0.5f, pivotY - 0.5f, needleX - 0.5f, needleY - 0.5f, p)

                // Headshell Cartridge
                p.color = Color.parseColor("#18181b")
                c.drawRect(needleX - 2f, needleY - 2f, needleX + 2f, needleY + 2f, p)
                // Needle point
                p.color = Color.parseColor("#fde047")
                c.drawRect(needleX - 0.5f, needleY + 1f, needleX + 0.5f, needleY + 2.5f, p)

                // Floating Music Notes
                val notePhase = (frameIdx % 6)
                val noteY = 28 - notePhase * 4
                val noteX = 48 + (frameIdx % 4) * 3
                drawPixelMusicNote(c, p, noteX, noteY, if (frameIdx % 2 == 0) "#c084fc" else "#38bdf8")
            } else {
                // PAUSED / NOT PLAYING: Tonearm detaches and rests in cradle completely off the vinyl!
                p.color = Color.parseColor("#ca8a04")
                p.strokeWidth = 1.8f
                c.drawLine(pivotX, pivotY, 66f, 38f, p)
                p.color = Color.parseColor("#fde047")
                p.strokeWidth = 0.8f
                c.drawLine(pivotX - 0.5f, pivotY - 0.5f, 65.5f, 38f, p)

                // Cartridge in rest
                p.color = Color.parseColor("#18181b")
                c.drawRect(65f, 37f, 68f, 41f, p)
            }

            // Wooden Window Sill for Peeking Cat at bottom (y = 112)
            px(8, 112, 64, 4, "#532e16")
            px(8, 112, 64, 1, "#8c5832")

            // Peeking Cat Animation (cx = 40, sillY = 112)
            drawPeekingCat(c, p, cx = 40, sillY = 112, frameIdx = frameIdx, isPlaying = isPlaying, cat = activeCat)

            return bmp
        }

        private fun drawPeekingCat(
            c: Canvas,
            p: Paint,
            cx: Int,
            sillY: Int,
            frameIdx: Int,
            isPlaying: Boolean,
            cat: PeekCatSpec
        ) {
            val bobY = if (isPlaying) {
                when (frameIdx % 4) {
                    1 -> -1
                    2 -> -2
                    3 -> -1
                    else -> 0
                }
            } else 0

            val earTwitch = if (isPlaying && (frameIdx % 6 == 2)) 1 else 0

            c.save()
            c.translate(cx.toFloat(), sillY.toFloat())
            c.scale(2.0f, 2.0f)

            fun r(rx: Int, ry: Int, rw: Int, rh: Int, hex: String) {
                p.color = Color.parseColor(hex)
                c.drawRect(rx.toFloat(), ry.toFloat(), (rx + rw).toFloat(), (ry + rh).toFloat(), p)
            }

            // Upper shoulders peeking just above sill
            r(-6, -3 + bobY, 12, 4, cat.shade)
            r(-5, -4 + bobY, 10, 4, cat.coat)
            if (cat.pattern == "tuxedo") {
                r(-2, -3 + bobY, 4, 3, "#ffffff")
            }

            // Collar & Gold Bell (Lilo's royal blue collar)
            if (cat.collar != null) {
                r(-4, -3 + bobY, 8, 1, cat.collar)
                r(-1, -2 + bobY, 2, 2, "#fde047")
            }

            // Head
            val hy = -11 + bobY
            r(-5, hy, 10, 8, cat.coat)
            r(-4, hy - 1, 8, 1, cat.coat)
            r(-5, hy + 7, 10, 1, cat.shade)

            // Pointy Ears + Pink Inner Ears
            r(-5, hy - 3 + earTwitch, 3, 3, cat.coat)
            r(2, hy - 3, 3, 3, cat.coat)
            r(-4, hy - 2 + earTwitch, 1, 2, "#ff9ebb")
            r(3, hy - 2, 1, 2, "#ff9ebb")

            // Forehead Markings (Tabby / Patches / Tuxedo)
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

            // Eyes:
            // When playing: happy blissfully closed smiling eyes listening to music!
            // When paused: curious open eyes looking up towards the vinyl!
            if (isPlaying) {
                r(-3, hy + 3, 2, 1, "#1e293b")
                r(1, hy + 3, 2, 1, "#1e293b")
            } else {
                r(-3, hy + 2, 2, 2, cat.eyeLeft)
                r(1, hy + 2, 2, 2, cat.eyeRight)
                r(-3, hy + 2, 1, 1, "#ffffff")
                r(1, hy + 2, 1, 1, "#ffffff")
            }

            // Pink Nose
            r(-1, hy + 5, 2, 1, "#ff9ebb")

            // Blushing Cheeks when enjoying music
            if (isPlaying) {
                r(-4, hy + 5, 1, 1, "#fda4af")
                r(3, hy + 5, 1, 1, "#fda4af")
            }

            // Cute Front Paws Resting Over the Sill (tapping along when playing!)
            val pawCol = if (cat.pattern == "tuxedo") "#ffffff" else cat.coat
            val tapLeft = if (isPlaying && (frameIdx % 4 == 1)) -1 else 0
            val tapRight = if (isPlaying && (frameIdx % 4 == 3)) -1 else 0
            r(-6, -1 + tapLeft, 3, 3, pawCol)
            r(-6, 1 + tapLeft, 3, 1, cat.shade)
            r(3, -1 + tapRight, 3, 3, pawCol)
            r(3, 1 + tapRight, 3, 1, cat.shade)

            c.restore()

            // Floating Heart or Music Note above Cat when Playing
            if (isPlaying) {
                val heartCol = if (cat.id == "cheeto") "#ffb300" else "#fb7185"
                val rise = (frameIdx % 6) * 2
                drawPixelHeart(c, p, cx + 12, sillY - 26 - rise, heartCol)
            }
        }

        private fun drawPixelMusicNote(c: Canvas, p: Paint, x: Int, y: Int, colHex: String) {
            p.color = Color.parseColor(colHex)
            c.drawRect(x.toFloat(), (y + 3).toFloat(), (x + 3).toFloat(), (y + 5).toFloat(), p)
            c.drawRect((x + 2).toFloat(), y.toFloat(), (x + 3).toFloat(), (y + 4).toFloat(), p)
            c.drawRect((x + 3).toFloat(), y.toFloat(), (x + 5).toFloat(), (y + 1).toFloat(), p)
        }

        private fun drawPixelHeart(c: Canvas, p: Paint, x: Int, y: Int, hex: String) {
            p.color = Color.parseColor(hex)
            c.drawRect((x - 2).toFloat(), (y - 2).toFloat(), x.toFloat(), y.toFloat(), p)
            c.drawRect((x + 1).toFloat(), (y - 2).toFloat(), (x + 3).toFloat(), y.toFloat(), p)
            c.drawRect((x - 3).toFloat(), (y - 1).toFloat(), (x + 4).toFloat(), (y + 1).toFloat(), p)
            c.drawRect((x - 2).toFloat(), (y + 1).toFloat(), (x + 3).toFloat(), (y + 2).toFloat(), p)
            c.drawRect((x - 1).toFloat(), (y + 2).toFloat(), (x + 2).toFloat(), (y + 3).toFloat(), p)
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

                // Track Title at (162f, 74f) in 21f bold Stardew_Valley.ttf (#3B1D0A, up to 250px available)
                p.textSize = 21f
                p.color = Color.parseColor("#3b1d0a")
                val truncatedTrack = truncateToWidth(track, 250f, p)
                c.drawText(truncatedTrack, 162f, 74f, p)

                // Artist & Album at (162f, 102f) in 15f bold (#6E3F1D, up to 250px available)
                p.textSize = 15f
                p.color = Color.parseColor("#6e3f1d")
                val artistAlbumStr = if (album.isNotBlank()) "$artist - $album" else artist
                val truncatedArtist = truncateToWidth(artistAlbumStr, 250f, p)
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

        private fun truncateToWidth(str: String, maxWidth: Float, paint: Paint): String {
            if (paint.measureText(str) <= maxWidth) return str
            val ellipsis = "..."
            val ellipsisW = paint.measureText(ellipsis)
            val avail = maxWidth - ellipsisW
            if (avail <= 0f) return ellipsis

            var low = 0
            var high = str.length
            var best = 0
            while (low <= high) {
                val mid = (low + high) / 2
                if (paint.measureText(str, 0, mid) <= avail) {
                    best = mid
                    low = mid + 1
                } else {
                    high = mid - 1
                }
            }
            return str.substring(0, best).trimEnd() + ellipsis
        }

        private fun truncate(str: String, maxLen: Int): String {
            return if (str.length <= maxLen) str else str.substring(0, maxLen - 1) + "..."
        }
    }
}
