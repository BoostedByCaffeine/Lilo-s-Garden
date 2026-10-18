package com.valois.lilosgarden

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class LiloMediaListenerService : NotificationListenerService() {

    private var sessionManager: MediaSessionManager? = null
    private var activeController: MediaController? = null

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

    private val controllerCallback = object : MediaController.Callback() {
        override fun onMetadataChanged(metadata: MediaMetadata?) {
            metadata?.let { extractAndSaveMetadata(it, activeController?.playbackState) }
        }

        override fun onPlaybackStateChanged(state: PlaybackState?) {
            val isPlaying = state?.state == PlaybackState.STATE_PLAYING
            val prefs = getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
            prefs.edit().putBoolean("is_playing", isPlaying).apply()
            LiloMusicWidgetProvider.refreshAllMusicWidgets(this@LiloMediaListenerService)
        }
    }

    override fun onCreate() {
        super.onCreate()
        val filter = IntentFilter().apply {
            addAction("com.spotify.music.metadatachanged")
            addAction("com.spotify.music.playbackstatechanged")
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

    override fun onDestroy() {
        try {
            unregisterReceiver(musicReceiver)
        } catch (_: Exception) {}
        try {
            activeController?.unregisterCallback(controllerCallback)
        } catch (_: Exception) {}
        super.onDestroy()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        checkMediaSessions()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        checkMediaSessions()
    }

    private fun initMediaSessions() {
        try {
            sessionManager = getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager
            checkMediaSessions()
        } catch (_: Exception) {}
    }

    private fun checkMediaSessions() {
        try {
            val sessions = sessionManager?.getActiveSessions(
                android.content.ComponentName(this, LiloMediaListenerService::class.java)
            )
            if (!sessions.isNullOrEmpty()) {
                val controller = sessions.firstOrNull {
                    it.playbackState?.state == PlaybackState.STATE_PLAYING
                } ?: sessions[0]

                if (controller != activeController) {
                    activeController?.unregisterCallback(controllerCallback)
                    activeController = controller
                    activeController?.registerCallback(controllerCallback)
                }

                extractAndSaveMetadata(controller.metadata, controller.playbackState)
            }
        } catch (_: Exception) {}
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

    private fun updateMusicPrefs(track: String, artist: String, album: String, isPlaying: Boolean) {
        val prefs = getSharedPreferences("lilo_music_prefs", Context.MODE_PRIVATE)
        prefs.edit()
            .putString("track_title", track)
            .putString("artist_name", artist)
            .putString("album_name", album)
            .putBoolean("is_playing", isPlaying)
            .putLong("last_update", System.currentTimeMillis())
            .apply()

        LiloMusicWidgetProvider.refreshAllMusicWidgets(this)
    }
}
