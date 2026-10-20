package com.valois.lilosgarden

import android.app.Notification
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
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
    private val mainHandler by lazy { Handler(Looper.getMainLooper()) }

    companion object {
        @Volatile
        var instance: LiloMediaListenerService? = null
            private set
    }

    fun getActiveController(): MediaController? {
        if (activeController != null) return activeController
        val playing = activeControllers.values.firstOrNull {
            it.playbackState?.state == PlaybackState.STATE_PLAYING
        }
        if (playing != null) {
            activeController = playing
            return playing
        }
        val spotify = activeControllers.values.firstOrNull {
            it.packageName.contains("spotify", ignoreCase = true)
        }
        if (spotify != null) {
            activeController = spotify
            return spotify
        }
        return activeControllers.values.firstOrNull()
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
        instance = this

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
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        instance = this
        initMediaSessions()
        return super.onStartCommand(intent, flags, startId)
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        initMediaSessions()
    }

    override fun onListenerDisconnected() {
        try {
            sessionManager?.removeOnActiveSessionsChangedListener(sessionsChangedListener)
        } catch (_: Exception) {}
        cleanupControllers()
        super.onListenerDisconnected()
    }

    override fun onDestroy() {
        if (instance == this) {
            instance = null
        }
        try {
            unregisterReceiver(timeTickReceiver)
        } catch (_: Exception) {}
        try {
            unregisterReceiver(musicReceiver)
        } catch (_: Exception) {}
        try {
            sessionManager?.removeOnActiveSessionsChangedListener(sessionsChangedListener)
        } catch (_: Exception) {}
        cleanupControllers()
        super.onDestroy()
    }

    private fun cleanupControllers() {
        try {
            for ((key, controller) in activeControllers) {
                controllerCallbacks[key]?.let { cb ->
                    try { controller.unregisterCallback(cb) } catch (_: Exception) {}
                }
            }
            activeControllers.clear()
            controllerCallbacks.clear()
            activeController = null
        } catch (_: Exception) {}
    }

    fun initMediaSessions() {
        try {
            sessionManager = getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager
            val component = ComponentName(this, LiloMediaListenerService::class.java)
            try {
                sessionManager?.removeOnActiveSessionsChangedListener(sessionsChangedListener)
            } catch (_: Exception) {}
            sessionManager?.addOnActiveSessionsChangedListener(sessionsChangedListener, component, mainHandler)
            val controllers = sessionManager?.getActiveSessions(component)
            handleSessionsChanged(controllers)
        } catch (_: Exception) {}
    }

    private fun handleSessionsChanged(controllers: List<MediaController>?) {
        if (controllers.isNullOrEmpty()) {
            cleanupControllers()
            savePlaybackState(false)
            return
        }

        val currentTokens = mutableSetOf<MediaSession.Token>()
        for (controller in controllers) {
            val token = controller.sessionToken
            currentTokens.add(token)
            val key = controller.packageName + "_" + token.hashCode()
            if (!activeControllers.containsKey(key)) {
                registerController(key, controller)
            }
        }

        // Clean up removed controllers
        val toRemove = activeControllers.filter { (_, c) -> c.sessionToken !in currentTokens }
        for ((oldKey, oldCtrl) in toRemove) {
            controllerCallbacks[oldKey]?.let { cb ->
                try { oldCtrl.unregisterCallback(cb) } catch (_: Exception) {}
            }
            activeControllers.remove(oldKey)
            controllerCallbacks.remove(oldKey)
        }

        // Pick primary controller: playing > token match with current active > spotify > first
        val playing = controllers.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
        val existingActive = controllers.firstOrNull { it.sessionToken == activeController?.sessionToken }
        val spotify = controllers.firstOrNull { it.packageName.contains("spotify", ignoreCase = true) }
        val primary = playing ?: existingActive ?: spotify ?: controllers[0]

        activeController = primary
        primary.let {
            val isPlaying = it.playbackState?.state == PlaybackState.STATE_PLAYING
            if (it.metadata != null) {
                extractAndSaveMetadata(it.metadata, it.playbackState, isPlaying)
            } else {
                savePlaybackState(isPlaying)
            }
        }
    }

    private fun registerController(key: String, controller: MediaController) {
        val cb = object : MediaController.Callback() {
            override fun onMetadataChanged(metadata: MediaMetadata?) {
                if (metadata == null) return
                val isThisPlaying = controller.playbackState?.state == PlaybackState.STATE_PLAYING
                val isActivePlaying = activeController?.playbackState?.state == PlaybackState.STATE_PLAYING
                val isSpotify = controller.packageName.contains("spotify", ignoreCase = true)
                val isSameAsActive = (controller.sessionToken == activeController?.sessionToken)

                if (isThisPlaying || isSameAsActive || (!isActivePlaying && isSpotify) || activeController == null) {
                    activeController = controller
                    extractAndSaveMetadata(metadata, controller.playbackState, isThisPlaying)
                }
            }

            override fun onPlaybackStateChanged(state: PlaybackState?) {
                val stateVal = state?.state ?: PlaybackState.STATE_NONE
                val isPlaying = when (stateVal) {
                    PlaybackState.STATE_PLAYING,
                    PlaybackState.STATE_BUFFERING,
                    PlaybackState.STATE_CONNECTING,
                    PlaybackState.STATE_SKIPPING_TO_NEXT,
                    PlaybackState.STATE_SKIPPING_TO_PREVIOUS -> true
                    else -> false
                }
                val isSameAsActive = (controller.sessionToken == activeController?.sessionToken)

                if (isPlaying) {
                    activeController = controller
                    if (controller.metadata != null) {
                        extractAndSaveMetadata(controller.metadata, state, true)
                    } else {
                        savePlaybackState(true)
                    }
                } else if (isSameAsActive || activeController?.playbackState?.state != PlaybackState.STATE_PLAYING) {
                    val otherPlaying = activeControllers.values.firstOrNull {
                        it.sessionToken != controller.sessionToken && it.playbackState?.state == PlaybackState.STATE_PLAYING
                    }
                    if (otherPlaying != null) {
                        activeController = otherPlaying
                        if (otherPlaying.metadata != null) {
                            extractAndSaveMetadata(otherPlaying.metadata, otherPlaying.playbackState, true)
                        } else {
                            savePlaybackState(true)
                        }
                    } else {
                        activeController = controller
                        if (controller.metadata != null) {
                            extractAndSaveMetadata(controller.metadata, state, false)
                        } else {
                            savePlaybackState(false)
                        }
                    }
                }
            }

            override fun onSessionDestroyed() {
                try {
                    controllerCallbacks[key]?.let { controller.unregisterCallback(it) }
                } catch (_: Exception) {}
                activeControllers.remove(key)
                controllerCallbacks.remove(key)
                if (activeController?.sessionToken == controller.sessionToken) {
                    val fallback = activeControllers.values.firstOrNull {
                        it.playbackState?.state == PlaybackState.STATE_PLAYING
                    } ?: activeControllers.values.firstOrNull()
                    activeController = fallback
                    if (fallback != null) {
                        val isPlaying = fallback.playbackState?.state == PlaybackState.STATE_PLAYING
                        if (fallback.metadata != null) {
                            extractAndSaveMetadata(fallback.metadata, fallback.playbackState, isPlaying)
                        } else {
                            savePlaybackState(isPlaying)
                        }
                    } else {
                        savePlaybackState(false)
                    }
                }
            }
        }

        try {
            // Always pass mainHandler to ensure callback registration is thread-safe on Binder threads
            controller.registerCallback(cb, mainHandler)
            activeControllers[key] = controller
            controllerCallbacks[key] = cb
        } catch (_: Exception) {}
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

            // 1. Determine playback state strictly from MediaSession Token & register callback
            val token = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                extras.getParcelable(Notification.EXTRA_MEDIA_SESSION, MediaSession.Token::class.java)
            } else {
                @Suppress("DEPRECATION")
                extras.getParcelable<MediaSession.Token>(Notification.EXTRA_MEDIA_SESSION)
            }

            if (token != null) {
                try {
                    val controller = MediaController(this, token)
                    val key = controller.packageName + "_" + token.hashCode()
                    if (!activeControllers.containsKey(key)) {
                        registerController(key, controller)
                    }
                    activeController = controller

                    val state = controller.playbackState
                    if (state != null) {
                        isPlaying = when (state.state) {
                            PlaybackState.STATE_PLAYING,
                            PlaybackState.STATE_BUFFERING,
                            PlaybackState.STATE_CONNECTING,
                            PlaybackState.STATE_SKIPPING_TO_NEXT,
                            PlaybackState.STATE_SKIPPING_TO_PREVIOUS -> true
                            PlaybackState.STATE_PAUSED,
                            PlaybackState.STATE_STOPPED,
                            PlaybackState.STATE_ERROR,
                            PlaybackState.STATE_NONE -> false
                            else -> null
                        }
                    }

                    // 2. If state is not determined yet from controller, inspect notification action buttons
                    if (isPlaying == null) {
                        sbn.notification.actions?.forEach { action ->
                            val actionTitle = action.title?.toString()?.lowercase() ?: ""
                            if (actionTitle.contains("pause")) {
                                isPlaying = true
                            } else if (actionTitle.contains("play")) {
                                isPlaying = false
                            }
                        }
                    }

                    if (controller.metadata != null) {
                        extractAndSaveMetadata(controller.metadata, state, isPlaying)
                        return
                    }
                } catch (_: Exception) {}
            }

            // 3. Fallback: check notification action buttons if token was null or controller threw
            if (isPlaying == null) {
                sbn.notification.actions?.forEach { action ->
                    val actionTitle = action.title?.toString()?.lowercase() ?: ""
                    if (actionTitle.contains("pause")) {
                        isPlaying = true
                    } else if (actionTitle.contains("play")) {
                        isPlaying = false
                    }
                }
            }

            // Fallback: If still unknown, retrieve cached playing state from prefs
            val prefs = getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
            val finalPlaying = isPlaying ?: prefs.getBoolean("is_playing", false)

            if (!title.isNullOrBlank()) {
                updateMusicPrefs(title, artist ?: "", album ?: "", finalPlaying)
            }
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName.lowercase()
        if (pkg.contains("spotify") || pkg.contains("music")) {
            val anyPlaying = activeControllers.values.firstOrNull {
                it.packageName.lowercase() != pkg && it.playbackState?.state == PlaybackState.STATE_PLAYING
            }
            if (anyPlaying != null) {
                activeController = anyPlaying
                val isPlaying = anyPlaying.playbackState?.state == PlaybackState.STATE_PLAYING
                if (anyPlaying.metadata != null) {
                    extractAndSaveMetadata(anyPlaying.metadata, anyPlaying.playbackState, isPlaying)
                } else {
                    savePlaybackState(isPlaying)
                }
            } else {
                savePlaybackState(false)
            }
        }
    }

    private fun extractAndSaveMetadata(
        metadata: MediaMetadata?,
        state: PlaybackState?,
        explicitIsPlaying: Boolean? = null
    ) {
        if (metadata == null) return
        val title = metadata.getString(MediaMetadata.METADATA_KEY_TITLE)
            ?: metadata.getText(MediaMetadata.METADATA_KEY_TITLE)?.toString()
            ?: metadata.getString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE)
            ?: metadata.getText(MediaMetadata.METADATA_KEY_DISPLAY_TITLE)?.toString()
            ?: ""
        val artist = metadata.getString(MediaMetadata.METADATA_KEY_ARTIST)
            ?: metadata.getText(MediaMetadata.METADATA_KEY_ARTIST)?.toString()
            ?: metadata.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)
            ?: metadata.getText(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)?.toString()
            ?: metadata.getString(MediaMetadata.METADATA_KEY_AUTHOR)
            ?: metadata.getText(MediaMetadata.METADATA_KEY_AUTHOR)?.toString()
            ?: ""
        val album = metadata.getString(MediaMetadata.METADATA_KEY_ALBUM)
            ?: metadata.getText(MediaMetadata.METADATA_KEY_ALBUM)?.toString()
            ?: ""

        val isPlaying = explicitIsPlaying ?: when (state?.state) {
            PlaybackState.STATE_PLAYING,
            PlaybackState.STATE_BUFFERING,
            PlaybackState.STATE_CONNECTING,
            PlaybackState.STATE_SKIPPING_TO_NEXT,
            PlaybackState.STATE_SKIPPING_TO_PREVIOUS -> true
            PlaybackState.STATE_PAUSED,
            PlaybackState.STATE_STOPPED,
            PlaybackState.STATE_ERROR,
            PlaybackState.STATE_NONE -> false
            null -> {
                val prefs = getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
                prefs.getBoolean("is_playing", false)
            }
            else -> false
        }

        if (title.isNotBlank()) {
            updateMusicPrefs(title.trim(), artist.trim(), album.trim(), isPlaying)
        }
    }

    private fun savePlaybackState(isPlaying: Boolean) {
        val prefs = getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val lastManualToggle = prefs.getLong("last_manual_toggle_ms", 0L)
        var effectivePlaying = isPlaying
        if (now - lastManualToggle < 600L) {
            effectivePlaying = prefs.getBoolean("is_playing", isPlaying)
        }

        val oldPlaying = prefs.getBoolean("is_playing", false)
        if (effectivePlaying == oldPlaying) {
            return // DEBOUNCE: Do not refresh if playback state unchanged
        }

        val prefNames = arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")
        for (prefName in prefNames) {
            getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                .putBoolean("is_playing", effectivePlaying)
                .putBoolean("music_playing", effectivePlaying)
                .putBoolean("music_connected", true)
                .apply()
        }

        LiloMusicWidgetProvider.refreshAllMusicWidgets(this)
    }

    private fun updateMusicPrefs(track: String, artist: String, album: String, isPlaying: Boolean) {
        val prefs = getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val lastManualToggle = prefs.getLong("last_manual_toggle_ms", 0L)
        var effectivePlaying = isPlaying
        if (now - lastManualToggle < 600L) {
            effectivePlaying = prefs.getBoolean("is_playing", isPlaying)
        }

        val oldTitle = prefs.getString("track_title", "") ?: ""
        val oldArtist = prefs.getString("artist_name", "") ?: ""
        val oldAlbum = prefs.getString("album_name", "") ?: ""
        val oldPlaying = prefs.getBoolean("is_playing", false)

        if (track == oldTitle && artist == oldArtist && album == oldAlbum && effectivePlaying == oldPlaying) {
            return // DEBOUNCE: Eliminate blinking if nothing changed
        }

        val prefNames = arrayOf("lilo_music_prefs", "lilo_widget_prefs", "lilos_garden_prefs")
        for (prefName in prefNames) {
            getSharedPreferences(prefName, Context.MODE_PRIVATE).edit()
                .putString("track_title", track)
                .putString("artist_name", artist)
                .putString("album_name", album)
                .putString("music_title", track)
                .putString("music_artist", artist)
                .putString("music_album", album)
                .putBoolean("is_playing", effectivePlaying)
                .putBoolean("music_playing", effectivePlaying)
                .putBoolean("music_connected", true)
                .putLong("last_update", now)
                .apply()
        }

        LiloMusicWidgetProvider.refreshAllMusicWidgets(this)
    }
}
