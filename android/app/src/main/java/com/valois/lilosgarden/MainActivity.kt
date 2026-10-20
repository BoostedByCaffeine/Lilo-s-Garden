package com.valois.lilosgarden

import android.Manifest
import android.annotation.SuppressLint
import android.app.WallpaperManager
import android.appwidget.AppWidgetManager
import android.content.ClipboardManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    private var pendingGeoOrigin: String? = null

    companion object {
        private const val LOCATION_REQ_CODE = 1001

        fun addDeviceNote(context: Context, noteText: String) {
            try {
                val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
                val currentNotesJson = prefs.getString("device_notes_list", "[]") ?: "[]"
                val jsonArr = JSONArray(currentNotesJson)
                val newArr = JSONArray()
                newArr.put(JSONObject().apply {
                    put("text", noteText)
                    put("time", System.currentTimeMillis())
                })
                for (i in 0 until minOf(9, jsonArr.length())) {
                    val obj = jsonArr.optJSONObject(i) ?: continue
                    newArr.put(obj)
                }
                prefs.edit()
                    .putString("device_notes_list", newArr.toString())
                    .putString("sticky_note", noteText)
                    .apply()
            } catch (_: Exception) {}
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // CRITICAL FIX: Always call setContentView BEFORE accessing window.insetsController
        setContentView(R.layout.activity_main)
        window.decorView.post { hideSystemUI() }

        webView = findViewById(R.id.webView)
        configureWebView()

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (::webView.isInitialized && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        webView.loadUrl("file:///android_asset/www/index.html")
        handleIncomingNoteIntent(intent)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            window.decorView.post { hideSystemUI() }
        }
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) webView.onResume()
        window.decorView.post { hideSystemUI() }
        syncTasksFromWidget()
    }

    private fun syncTasksFromWidget() {
        try {
            val prefs = getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
            val gardenPrefs = getSharedPreferences("lilos_garden_prefs", Context.MODE_PRIVATE)
            val tasksJson = prefs.getString("tasks_json", null) ?: gardenPrefs.getString("tasks_json", null)
            if (!tasksJson.isNullOrEmpty() && ::webView.isInitialized) {
                val quoted = JSONObject.quote(tasksJson)
                webView.post {
                    webView.evaluateJavascript(
                        """
                        (function() {
                            if (typeof world !== 'undefined' && Array.isArray(world.tasks)) {
                                try {
                                    const widgetTasks = JSON.parse($quoted);
                                    if (Array.isArray(widgetTasks) && widgetTasks.length > 0) {
                                        let changed = false;
                                        widgetTasks.forEach(function(wt) {
                                            if (wt && wt.id !== 'task-1' && wt.id !== 'task-2' && wt.id !== 'task-3') {
                                                const existing = world.tasks.find(function(t) { return t.id === wt.id; });
                                                if (existing) {
                                                    if (existing.done !== wt.done) {
                                                        existing.done = wt.done;
                                                        changed = true;
                                                    }
                                                }
                                            }
                                        });
                                        if (changed) {
                                            if (typeof world.save === 'function') world.save();
                                            if (typeof renderTasksUI === 'function') renderTasksUI();
                                        }
                                    }
                                } catch (e) {}
                            }
                        })();
                        """.trimIndent(),
                        null
                    )
                }
            }
        } catch (_: Exception) {}
    }

    private fun checkIntentModal() {
        val modal = intent?.getStringExtra("open_modal")
        if (modal == "modalTasks" || intent?.action == "com.valois.lilosgarden.OPEN_TASKS") {
            webView.post {
                webView.evaluateJavascript("if (typeof openModal === 'function') { if (typeof renderTasksUI === 'function') renderTasksUI(); openModal('modalTasks'); }", null)
            }
        }
    }

    private fun handleIncomingNoteIntent(incomingIntent: Intent?) {
        if (incomingIntent == null) return
        if (incomingIntent.action == Intent.ACTION_SEND && incomingIntent.type?.startsWith("text/") == true) {
            val sharedText = incomingIntent.getStringExtra(Intent.EXTRA_TEXT)?.trim()
            if (!sharedText.isNullOrBlank()) {
                addDeviceNote(this, sharedText)
                LiloNotesWidgetProvider.refreshAllNotesWidgets(this)
                val safeText = JSONObject.quote(sharedText)
                webView.post {
                    webView.evaluateJavascript(
                        "if (typeof world !== 'undefined') { world.stickyNote = $safeText; if (typeof saveGameState === 'function') saveGameState(); if (typeof showToast === 'function') showToast('Note received from share menu!', 'star', '#fde047'); }",
                        null
                    )
                }
                Toast.makeText(this, "Saved to Cozy Sticky Note!", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun hideSystemUI() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.insetsController?.let { controller ->
                    controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                    controller.systemBarsBehavior =
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                }
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        or View.SYSTEM_UI_FLAG_FULLSCREEN
                        or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                )
            }
        } catch (e: Exception) {}
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true
            mediaPlaybackRequiresUserGesture = false
            cacheMode = WebSettings.LOAD_NO_CACHE
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(true)
            builtInZoomControls = false
            displayZoomControls = false
        }
        webView.clearCache(true)

        webView.addJavascriptInterface(AndroidBridge(this), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                checkIntentModal()
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                return if (url.startsWith("file:///android_asset/")) {
                    false
                } else {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, request.url))
                    } catch (e: Exception) {}
                    true
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                pendingGeoOrigin = origin
                pendingGeoCallback = callback

                val hasFine = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
                val hasCoarse = ContextCompat.checkSelfPermission(
                    this@MainActivity,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED

                if (hasFine || hasCoarse) {
                    callback?.invoke(origin, true, false)
                } else {
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        arrayOf(
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        ),
                        LOCATION_REQ_CODE
                    )
                }
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_REQ_CODE) {
            val granted = grantResults.isNotEmpty() &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED
            pendingGeoCallback?.invoke(pendingGeoOrigin, granted, false)
        }
    }

    override fun onPause() {
        if (::webView.isInitialized) webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }

    class AndroidBridge(private val activity: MainActivity) {

        @JavascriptInterface
        fun syncGardenToWidget(jsonState: String) {
            try {
                val obj = JSONObject(jsonState)
                val prefs = activity.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
                val editor = prefs.edit()
                editor.putString("garden_json", jsonState)
                if (obj.has("blooms")) editor.putInt("blooms", obj.optInt("blooms", 8))
                if (obj.has("weather")) editor.putString("weather", obj.optString("weather", "SUNNY"))
                if (obj.has("tempC")) editor.putInt("tempC", obj.optInt("tempC", 24))
                if (!obj.isNull("lat") && !obj.isNull("lon")) {
                    editor.putFloat("lat", obj.optDouble("lat").toFloat())
                    editor.putFloat("lon", obj.optDouble("lon").toFloat())
                    editor.putLong("weather_updated_at", System.currentTimeMillis())
                }
                val stats = obj.optJSONObject("stats")
                if (stats != null) {
                    editor.putInt("pets", stats.optInt("pets", 8))
                }
                if (obj.has("tasks")) {
                    editor.putString("tasks_json", obj.optJSONArray("tasks")?.toString() ?: "[]")
                }
                if (obj.has("stickyNote")) {
                    editor.putString("sticky_note", obj.optString("stickyNote", ""))
                }
                editor.apply()
                LiloWidgetProvider.refreshAllWidgets(activity)
                LiloCompanionWidgetProvider.refreshAllCompanionWidgets(activity)
                LiloWindowWidgetProvider.refreshAllWindowWidgets(activity)
                LiloBatteryWidgetProvider.refreshAllBatteryWidgets(activity)
                LiloPomodoroWidgetProvider.refreshAllPomodoroWidgets(activity)
                LiloNotesWidgetProvider.refreshAllNotesWidgets(activity)
                LiloMusicWidgetProvider.refreshAllMusicWidgets(activity)
            } catch (e: Exception) {}
        }

        @JavascriptInterface
        fun openWallpaperPicker() {
            activity.runOnUiThread {
                try {
                    val intent = Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER).apply {
                        putExtra(
                            WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                            ComponentName(activity, LiloWallpaperService::class.java)
                        )
                    }
                    activity.startActivity(intent)
                } catch (e: Exception) {
                    try {
                        activity.startActivity(Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER))
                    } catch (e: Exception) {
                        Toast.makeText(
                            activity,
                            "Choose Lilo's Garden in your phone's Live Wallpaper settings",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        }

        @JavascriptInterface
        fun pinWidget() {
            activity.runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val appWidgetManager = AppWidgetManager.getInstance(activity)
                        val widgetProvider = ComponentName(activity, LiloWidgetProvider::class.java)
                        if (appWidgetManager.isRequestPinAppWidgetSupported) {
                            appWidgetManager.requestPinAppWidget(widgetProvider, null, null)
                            return@runOnUiThread
                        }
                    }
                } catch (e: Exception) {}
                Toast.makeText(
                    activity,
                    "Long-press Home Screen -> Widgets -> Lilo's Garden",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

        @JavascriptInterface
        fun setCompanionWidgetCat(catId: String, catName: String) {
            try {
                val prefs = activity.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
                prefs.edit().putString("preferred_comp_cat_id", catId).apply()
                LiloCompanionWidgetProvider.refreshAllCompanionWidgets(activity)
                LiloWindowWidgetProvider.refreshAllWindowWidgets(activity)
                activity.runOnUiThread {
                    val displayName = if (catName.isNotBlank()) catName else "Selected cat"
                    Toast.makeText(
                        activity,
                        "$displayName featured in Companion Widget!",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } catch (e: Exception) {}
        }

        @JavascriptInterface
        fun setCompanionWidgetCat(catId: String) {
            setCompanionWidgetCat(catId, "")
        }

        @JavascriptInterface
        fun pinCompanionWidget() {
            activity.runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val appWidgetManager = AppWidgetManager.getInstance(activity)
                        val widgetProvider = ComponentName(activity, LiloCompanionWidgetProvider::class.java)
                        if (appWidgetManager.isRequestPinAppWidgetSupported) {
                            appWidgetManager.requestPinAppWidget(widgetProvider, null, null)
                            return@runOnUiThread
                        }
                    }
                } catch (e: Exception) {}
                Toast.makeText(
                    activity,
                    "Long-press Home Screen -> Widgets -> Cat Companion Widget",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

        @JavascriptInterface
        fun pinWindowWidget() {
            activity.runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val appWidgetManager = AppWidgetManager.getInstance(activity)
                        val widgetProvider = ComponentName(activity, LiloWindowWidgetProvider::class.java)
                        if (appWidgetManager.isRequestPinAppWidgetSupported) {
                            appWidgetManager.requestPinAppWidget(widgetProvider, null, null)
                            return@runOnUiThread
                        }
                    }
                } catch (e: Exception) {}
                Toast.makeText(
                    activity,
                    "Long-press Home Screen -> Widgets -> Lilo's Window Peek Widget",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

        @JavascriptInterface
        fun pinBatteryWidget() {
            activity.runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val appWidgetManager = AppWidgetManager.getInstance(activity)
                        val widgetProvider = ComponentName(activity, LiloBatteryWidgetProvider::class.java)
                        if (appWidgetManager.isRequestPinAppWidgetSupported) {
                            appWidgetManager.requestPinAppWidget(widgetProvider, null, null)
                            return@runOnUiThread
                        }
                    }
                } catch (_: Exception) {}
                Toast.makeText(
                    activity,
                    "Long-press Home Screen -> Widgets -> Lilo's Purr-cent Battery Widget",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

        @JavascriptInterface
        fun pinPomodoroWidget() {
            activity.runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val appWidgetManager = AppWidgetManager.getInstance(activity)
                        val widgetProvider = ComponentName(activity, LiloPomodoroWidgetProvider::class.java)
                        if (appWidgetManager.isRequestPinAppWidgetSupported) {
                            appWidgetManager.requestPinAppWidget(widgetProvider, null, null)
                            return@runOnUiThread
                        }
                    }
                } catch (_: Exception) {}
                Toast.makeText(
                    activity,
                    "Long-press Home Screen -> Widgets -> Lilo's Campfire Focus Widget",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

        @JavascriptInterface
        fun pinNotesWidget() {
            activity.runOnUiThread {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val appWidgetManager = AppWidgetManager.getInstance(activity)
                        val widgetProvider = ComponentName(activity, LiloNotesWidgetProvider::class.java)
                        if (appWidgetManager.isRequestPinAppWidgetSupported) {
                            appWidgetManager.requestPinAppWidget(widgetProvider, null, null)
                            return@runOnUiThread
                        }
                    }
                } catch (_: Exception) {}
                Toast.makeText(
                    activity,
                    "Long-press Home Screen -> Widgets -> Lilo's Cozy Tasks & Notes",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

        @JavascriptInterface
        fun pinMusicWidget() {
            activity.runOnUiThread {
                try {
                    val enabled = android.provider.Settings.Secure.getString(activity.contentResolver, "enabled_notification_listeners") ?: ""
                    if (!enabled.contains(activity.packageName)) {
                        Toast.makeText(
                            activity,
                            "Please enable 'Lilo\'s Garden' in Notification Access to sync live Spotify music!",
                            Toast.LENGTH_LONG
                        ).show()
                        activity.startActivity(Intent(android.provider.Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                    }

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val appWidgetManager = AppWidgetManager.getInstance(activity)
                        val widgetProvider = ComponentName(activity, LiloMusicWidgetProvider::class.java)
                        if (appWidgetManager.isRequestPinAppWidgetSupported) {
                            appWidgetManager.requestPinAppWidget(widgetProvider, null, null)
                            return@runOnUiThread
                        }
                    }
                } catch (_: Exception) {}
                Toast.makeText(
                    activity,
                    "Long-press Home Screen -> Widgets -> Lilo's Vinyl & Spotify Widget",
                    Toast.LENGTH_LONG
                ).show()
            }
        }

        @JavascriptInterface
        fun getWidgetBlooms(): Int {
            val prefs = activity.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
            return prefs.getInt("blooms", 8)
        }

        @JavascriptInterface
        fun openDeviceNotesApp() {
            activity.runOnUiThread {
                try {
                    val keepIntent = activity.packageManager.getLaunchIntentForPackage("com.google.android.keep")
                        ?: activity.packageManager.getLaunchIntentForPackage("com.samsung.android.app.notes")
                    if (keepIntent != null) {
                        activity.startActivity(keepIntent)
                        return@runOnUiThread
                    }
                    val genericIntent = Intent(Intent.ACTION_VIEW).apply {
                        type = "vnd.android.cursor.dir/vnd.google.note"
                    }
                    if (genericIntent.resolveActivity(activity.packageManager) != null) {
                        activity.startActivity(genericIntent)
                        return@runOnUiThread
                    }
                    val createIntent = Intent("android.intent.action.CREATE_NOTE")
                    if (createIntent.resolveActivity(activity.packageManager) != null) {
                        activity.startActivity(createIntent)
                        return@runOnUiThread
                    }
                    Toast.makeText(activity, "No dedicated notes app installed", Toast.LENGTH_SHORT).show()
                } catch (_: Exception) {
                    Toast.makeText(activity, "Could not open notes app", Toast.LENGTH_SHORT).show()
                }
            }
        }

        @JavascriptInterface
        fun importClipboardNote() {
            activity.runOnUiThread {
                try {
                    val clipboard = activity.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
                    val clip = clipboard?.primaryClip
                    if (clip != null && clip.itemCount > 0) {
                        val text = clip.getItemAt(0).coerceToText(activity)?.toString()?.trim()
                        if (!text.isNullOrBlank()) {
                            addDeviceNote(activity, text)
                            LiloNotesWidgetProvider.refreshAllNotesWidgets(activity)
                            val safeText = JSONObject.quote(text)
                            activity.webView.evaluateJavascript(
                                "if (typeof world !== 'undefined') { world.stickyNote = $safeText; if (typeof saveGameState === 'function') saveGameState(); if (typeof showToast === 'function') showToast('Sticky note imported from clipboard!', 'star', '#fde047'); }",
                                null
                            )
                            Toast.makeText(activity, "Imported clipboard to Sticky Note!", Toast.LENGTH_SHORT).show()
                        } else {
                            Toast.makeText(activity, "Clipboard is empty", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(activity, "Clipboard is empty", Toast.LENGTH_SHORT).show()
                    }
                } catch (_: Exception) {}
            }
        }

        @JavascriptInterface
        fun isNativeApp(): Boolean = true
    }
}
