package com.valois.lilosgarden

import android.app.Notification
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSession
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class LiloMediaListenerService : NotificationListenerService() {

    private var sessionManager: MediaSessionManager? = null
    private var activeController: MediaController? = null
    private val controllerCallbacks = mutableMapOf<String, MediaController.Callback>()
    private val activeControllers = mutableMapOf<String, MediaController>()

    private val pollHandler = Handler(Looper.getMainLooper())
    private val pollRunnable = object : Runnable {
        override fun run() {
            try {
                checkPlaybackStateSync()
            } catch (_: Exception) {}
            pollHandler.postDelayed(this, 2000)
        }
    }

    private val sessionsChangedListener = MediaSessionManager.OnActiveSessionsChangedListener { controllers ->
        handleSessionsChanged(controllers)
    }

    private val timeTickReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            try {
                LiloCompanionWidgetProvider.updateClockOnly(applicationContext)
                LiloWindowWidgetProvider.updateClockOnly(applicationContext)
            } catch (_: Exception) {}
        }
    }

    private val musicReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val track = intent.getStringExtra("track")
            val artist = intent.getStringExtra("artist")
            val album = intent.getStringExtra("album")
            val isPlaying = intent.getBooleanExtra("playing", intent.getBooleanExtra("playstate", false))

            if (!track.isNullOrBlank()) {
                updateMusicPrefs(
                    track = track,
                    artist = artist ?: "",
                    album = album ?: "",
                    isPlaying = isPlaying
                )
            }
        }
    }

    override fun onCreate() {
        super.onCreate()

        // 1. Register minute time ticks for custom pixel clock in companion & window widgets
        val timeFilter = IntentFilter().apply {
            addAction(Intent.ACTION_TIME_TICK)
            addAction(Intent.ACTION_TIME_CHANGED)
            addAction(Intent.ACTION_TIMEZONE_CHANGED)
        }
        registerReceiver(timeTickReceiver, timeFilter)

        // 2. Register standard music broadcast intents
        val filter = IntentFilter().apply {
            addAction("com.spotify.music.metadatachanged")
            addAction("com.spotify.music.playbackstatechanged")
            addAction("com.spotify.music.queuechanged")
            addAction("com.android.music.metadatachanged")
            addAction("com.android.music.playstatechanged")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(musicReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(musicReceiver, filter)
        }

        initMediaSessions()
        pollHandler.postDelayed(pollRunnable, 2000)
    }

    override fun onDestroy() {
        pollHandler.removeCallbacks(pollRunnable)
        try {
            unregisterReceiver(timeTickReceiver)
        } catch (_: Exception) {}
        try {
            unregisterReceiver(musicReceiver)
        } catch (_: Exception) {}
        try {
            sessionManager?.removeOnActiveSessionsChangedListener(sessionsChangedListener)
        } catch (_: Exception) {}
        try {
            for ((key, controller) in activeControllers) {
                controllerCallbacks[key]?.let { cb -> controller.unregisterCallback(cb) }
            }
            activeControllers.clear()
            controllerCallbacks.clear()
        } catch (_: Exception) {}
        super.onDestroy()
    }

    private fun initMediaSessions() {
        try {
            sessionManager = getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager
            val component = ComponentName(this, LiloMediaListenerService::class.java)
            sessionManager?.addOnActiveSessionsChangedListener(sessionsChangedListener, component)
            val controllers = sessionManager?.getActiveSessions(component)
            handleSessionsChanged(controllers)
        } catch (_: Exception) {}
    }

    private fun handleSessionsChanged(controllers: List<MediaController>?) {
        if (controllers.isNullOrEmpty()) return

        for ((key, controller) in activeControllers) {
            controllerCallbacks[key]?.let { cb -> controller.unregisterCallback(cb) }
        }
        activeControllers.clear()
        controllerCallbacks.clear()

        for (controller in controllers) {
            val key = controller.packageName
            val cb = object : MediaController.Callback() {
                override fun onMetadataChanged(metadata: MediaMetadata?) {
                    metadata?.let { extractAndSaveMetadata(it, controller.playbackState) }
                }

                override fun onPlaybackStateChanged(state: PlaybackState?) {
                    val isPlaying = state?.state == PlaybackState.STATE_PLAYING
                    savePlaybackState(isPlaying)
                    LiloMusicWidgetProvider.refreshAllMusicWidgets(this@LiloMediaListenerService)
                }
            }
            controller.registerCallback(cb)
            activeControllers[key] = controller
            controllerCallbacks[key] = cb
        }

        val primary = controllers.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
            ?: controllers[0]
        activeController = primary
        extractAndSaveMetadata(primary.metadata, primary.playbackState)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName.lowercase()
        val hasMediaSession = sbn.notification.extras.containsKey(Notification.EXTRA_MEDIA_SESSION)
        if (pkg.contains("spotify") || pkg.contains("music") || hasMediaSession) {
            val extras = sbn.notification.extras
            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim()
            val artist = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim()
            val album = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim()

            var isPlaying: Boolean? = null
            sbn.notification.actions?.forEach { action ->
                val actionTitle = action.title?.toString()?.lowercase() ?: ""
                if (actionTitle.contains("pause")) {
                    isPlaying = true
                } else if (actionTitle.contains("play")) {
                    isPlaying = false
                }
            }

            val token = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                extras.getParcelable(Notification.EXTRA_MEDIA_SESSION, MediaSession.Token::class.java)
            } else {
                @Suppress("DEPRECATION")
                extras.getParcelable<MediaSession.Token>(Notification.EXTRA_MEDIA_SESSION)
            }

            if (token != null) {
                try {
                    val controller = MediaController(this, token)
                    activeController = controller
                    if (isPlaying == null) {
                        isPlaying = controller.playbackState?.state == PlaybackState.STATE_PLAYING
                    }
                    if (title.isNullOrBlank()) {
                        extractAndSaveMetadata(controller.metadata, controller.playbackState)
                        return
                    }
                } catch (_: Exception) {}
            }

            if (isPlaying == null) {
                isPlaying = sbn.isOngoing
            }

            if (!title.isNullOrBlank()) {
                updateMusicPrefs(title, artist ?: "", album ?: "", isPlaying == true)
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName.lowercase()
        if (pkg.contains("spotify")) {
            savePlaybackState(false)
            LiloMusicWidgetProvider.refreshAllMusicWidgets(this)
        }
    }

    private fun checkPlaybackStateSync() {
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        val isMusicActive = audioManager?.isMusicActive == true
        val controllerPlaying = activeController?.playbackState?.state == PlaybackState.STATE_PLAYING
        val actualPlaying = controllerPlaying || isMusicActive

        val prefs = getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
        val savedPlaying = prefs.getBoolean("is_playing", false)

        if (actualPlaying != savedPlaying) {
            savePlaybackState(actualPlaying)
            LiloMusicWidgetProvider.refreshAllMusicWidgets(this)
        }
    }

    private fun extractAndSaveMetadata(metadata: MediaMetadata?, state: PlaybackState?) {
        if (metadata == null) return
        val title = metadata.getString(MediaMetadata.METADATA_KEY_TITLE)
            ?: metadata.getString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE)
            ?: ""
        val artist = metadata.getString(MediaMetadata.METADATA_KEY_ARTIST)
            ?: metadata.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)
            ?: ""
        val album = metadata.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: ""
        val isPlaying = state?.state == PlaybackState.STATE_PLAYING

        if (title.isNotBlank()) {
            updateMusicPrefs(title, artist, album, isPlaying)
        }
    }

    private fun savePlaybackState(isPlaying: Boolean) {
        val prefNames = arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")
        for (prefName in prefNames) {
            getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                .putBoolean("is_playing", isPlaying)
                .putBoolean("music_playing", isPlaying)
                .putBoolean("music_connected", true)
                .apply()
        }
    }

    private fun updateMusicPrefs(track: String, artist: String, album: String, isPlaying: Boolean) {
        val now = System.currentTimeMillis()
        val prefNames = arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")
        for (prefName in prefNames) {
            getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                .putString("track_title", track)
                .putString("artist_name", artist)
                .putString("album_name", album)
                .putString("music_title", track)
                .putString("music_artist", artist)
                .putString("music_album", album)
                .putBoolean("is_playing", isPlaying)
                .putBoolean("music_playing", isPlaying)
                .putBoolean("music_connected", true)
                .putLong("last_update", now)
                .apply()
        }

        LiloMusicWidgetProvider.refreshAllMusicWidgets(this)
    }
}
