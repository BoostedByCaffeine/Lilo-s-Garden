package com.valois.lilosgarden

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

object WeatherSyncHelper {
    private val executor = Executors.newSingleThreadExecutor()
    private var lastFetchAttemptMs = 0L

    fun syncIfStale(context: Context) {
        val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
        val lastUpdated = prefs.getLong("weather_updated_at", 0L)
        val now = System.currentTimeMillis()

        if (now - lastUpdated < 15 * 60 * 1000L || now - lastFetchAttemptMs < 60 * 1000L) {
            return
        }
        lastFetchAttemptMs = now

        val appCtx = context.applicationContext
        executor.execute {
            try {
                var lat = prefs.getFloat("lat", Float.NaN).toDouble()
                var lon = prefs.getFloat("lon", Float.NaN).toDouble()

                if (lat.isNaN() || lon.isNaN()) {
                    val geoConn = (URL("https://get.geojs.io/v1/ip/geo.json").openConnection() as HttpURLConnection).apply {
                        connectTimeout = 5000
                        readTimeout = 5000
                    }
                    if (geoConn.responseCode == 200) {
                        val geoJson = JSONObject(geoConn.inputStream.bufferedReader().use { it.readText() })
                        lat = geoJson.optString("latitude").toDoubleOrNull() ?: Double.NaN
                        lon = geoJson.optString("longitude").toDoubleOrNull() ?: Double.NaN
                        if (!lat.isNaN() && !lon.isNaN()) {
                            prefs.edit()
                                .putFloat("lat", lat.toFloat())
                                .putFloat("lon", lon.toFloat())
                                .apply()
                        }
                    }
                    geoConn.disconnect()
                }

                if (lat.isNaN() || lon.isNaN()) return@execute

                val url = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon&current=temperature_2m,weather_code,is_day,precipitation,rain,showers,cloud_cover&timezone=auto"
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    connectTimeout = 6000
                    readTimeout = 6000
                }
                if (conn.responseCode == 200) {
                    val body = conn.inputStream.bufferedReader().use { it.readText() }
                    val cur = JSONObject(body).optJSONObject("current")
                    if (cur != null) {
                        val tempC = Math.round(cur.optDouble("temperature_2m", 26.0)).toInt()
                        val code = cur.optInt("weather_code", 0)
                        val isDay = cur.optInt("is_day", 1) == 1
                        val precip = cur.optDouble("precipitation", 0.0) +
                                     cur.optDouble("rain", 0.0) +
                                     cur.optDouble("showers", 0.0)
                        val cloudCover = cur.optInt("cloud_cover", 0)

                        val isRainCode = code in intArrayOf(51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99)
                        val isCloudyCode = code in intArrayOf(2, 3, 45, 48) || cloudCover >= 65

                        val mappedWeather = when {
                            isRainCode || precip > 0.05 -> "RAIN"
                            !isDay -> "NIGHT"
                            isCloudyCode -> "CLOUDY"
                            else -> "SUNNY"
                        }

                        prefs.edit()
                            .putInt("tempC", tempC)
                            .putString("weather", mappedWeather)
                            .putLong("weather_updated_at", System.currentTimeMillis())
                            .apply()

                        LiloWidgetProvider.refreshAllWidgets(appCtx)
                        LiloCompanionWidgetProvider.refreshAllCompanionWidgets(appCtx)
                        LiloWindowWidgetProvider.refreshAllWindowWidgets(appCtx)
                        LiloWeatherWidgetProvider.refreshAllWeatherWidgets(appCtx)
                    }
                }
                conn.disconnect()
            } catch (_: Exception) {}
        }
    }
}
