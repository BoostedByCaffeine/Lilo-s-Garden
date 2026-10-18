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
import android.os.Bundle
import android.widget.RemoteViews
import android.widget.Toast
import org.json.JSONArray
import org.json.JSONObject

class LiloNotesWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateNotesWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        updateNotesWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        when (intent.action) {
            ACTION_NOTES_TOGGLE_ROW_0 -> {
                toggleTaskRow(context, 0)
                refreshAllNotesWidgets(context)
            }
            ACTION_NOTES_TOGGLE_ROW_1 -> {
                toggleTaskRow(context, 1)
                refreshAllNotesWidgets(context)
            }
            ACTION_NOTES_TOGGLE_ROW_2 -> {
                toggleTaskRow(context, 2)
                refreshAllNotesWidgets(context)
            }
            ACTION_NOTES_TOGGLE_TOP -> {
                toggleTopTask(context)
                refreshAllNotesWidgets(context)
            }
            ACTION_NOTES_OPEN_DEFAULT_APP -> {
                try {
                    val keepIntent = context.packageManager.getLaunchIntentForPackage("com.google.android.keep")
                        ?: context.packageManager.getLaunchIntentForPackage("com.samsung.android.app.notes")
                    if (keepIntent != null) {
                        keepIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        context.startActivity(keepIntent)
                    } else {
                        val genericIntent = Intent(Intent.ACTION_VIEW).apply {
                            type = "vnd.android.cursor.dir/vnd.google.note"
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        if (genericIntent.resolveActivity(context.packageManager) != null) {
                            context.startActivity(genericIntent)
                        } else {
                            val createIntent = Intent("android.intent.action.CREATE_NOTE").apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                            if (createIntent.resolveActivity(context.packageManager) != null) {
                                context.startActivity(createIntent)
                            } else {
                                val appIntent = Intent(context, MainActivity::class.java).apply {
                                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                                    putExtra("open_modal", "modalTasks")
                                }
                                context.startActivity(appIntent)
                            }
                        }
                    }
                } catch (_: Exception) {}
            }
            ACTION_NOTES_SYNC_CLIPBOARD -> {
                try {
                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as? android.content.ClipboardManager
                    val clip = clipboard?.primaryClip
                    if (clip != null && clip.itemCount > 0) {
                        val text = clip.getItemAt(0).coerceToText(context)?.toString()?.trim()
                        if (!text.isNullOrBlank()) {
                            MainActivity.addDeviceNote(context, text)
                            Toast.makeText(context, "Note imported from clipboard!", Toast.LENGTH_SHORT).show()
                            refreshAllNotesWidgets(context)
                        } else {
                            Toast.makeText(context, "Clipboard is empty", Toast.LENGTH_SHORT).show()
                        }
                    } else {
                        Toast.makeText(context, "Clipboard is empty", Toast.LENGTH_SHORT).show()
                    }
                } catch (_: Exception) {}
            }
            ACTION_NOTES_REFRESH -> {
                refreshAllNotesWidgets(context)
            }
        }
    }

    private fun toggleTaskRow(context: Context, rowIndex: Int) {
        try {
            val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
            val gardenPrefs = context.getSharedPreferences("lilos_garden_prefs", Context.MODE_PRIVATE)
            var tasksJsonStr = prefs.getString("tasks_json", null)
                ?: gardenPrefs.getString("tasks_json", null)
            if (tasksJsonStr.isNullOrEmpty()) {
                val gJson = prefs.getString("garden_json", null) ?: gardenPrefs.getString("garden_json", null)
                if (!gJson.isNullOrEmpty()) {
                    val gObj = JSONObject(gJson)
                    tasksJsonStr = gObj.optJSONArray("tasks")?.toString()
                }
            }

            if (tasksJsonStr.isNullOrEmpty()) return

            val rawArray = JSONArray(tasksJsonStr)
            val customTasks = mutableListOf<JSONObject>()
            for (i in 0 until rawArray.length()) {
                val obj = rawArray.optJSONObject(i) ?: continue
                val id = obj.optString("id", "")
                if (id != "task-1" && id != "task-2" && id != "task-3") {
                    customTasks.add(obj)
                }
            }

            if (rowIndex in 0 until customTasks.size) {
                val targetObj = customTasks[rowIndex]
                val wasDone = targetObj.optBoolean("done", false)
                val newDone = !wasDone
                targetObj.put("done", newDone)
                val taskText = targetObj.optString("text", "Task")

                if (newDone) {
                    Toast.makeText(context, "Completed: $taskText! \u2713", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "Unchecked: $taskText", Toast.LENGTH_SHORT).show()
                }

                val updatedArray = JSONArray()
                for (t in customTasks) {
                    updatedArray.put(t)
                }
                val newJson = updatedArray.toString()

                prefs.edit().putString("tasks_json", newJson).apply()
                gardenPrefs.edit().putString("tasks_json", newJson).apply()

                // Keep garden_json in sync
                listOf(prefs, gardenPrefs).forEach { p ->
                    val gJson = p.getString("garden_json", null)
                    if (!gJson.isNullOrEmpty()) {
                        try {
                            val gObj = JSONObject(gJson)
                            gObj.put("tasks", updatedArray)
                            p.edit().putString("garden_json", gObj.toString()).apply()
                        } catch (_: Exception) {}
                    }
                }
            }
        } catch (_: Exception) {}
    }

    private fun toggleTopTask(context: Context) {
        try {
            val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
            val gardenPrefs = context.getSharedPreferences("lilos_garden_prefs", Context.MODE_PRIVATE)
            var tasksJsonStr = prefs.getString("tasks_json", null)
                ?: gardenPrefs.getString("tasks_json", null)
            if (tasksJsonStr.isNullOrEmpty()) return

            val rawArray = JSONArray(tasksJsonStr)
            val customTasks = mutableListOf<JSONObject>()
            for (i in 0 until rawArray.length()) {
                val obj = rawArray.optJSONObject(i) ?: continue
                val id = obj.optString("id", "")
                if (id != "task-1" && id != "task-2" && id != "task-3") {
                    customTasks.add(obj)
                }
            }
            if (customTasks.isEmpty()) return

            var toggledIndex = -1
            for (i in customTasks.indices) {
                if (!customTasks[i].optBoolean("done", false)) {
                    customTasks[i].put("done", true)
                    toggledIndex = i
                    val txt = customTasks[i].optString("text", "Task")
                    Toast.makeText(context, "Completed: $txt! \u2713", Toast.LENGTH_SHORT).show()
                    break
                }
            }

            if (toggledIndex != -1) {
                val updatedArray = JSONArray()
                for (t in customTasks) {
                    updatedArray.put(t)
                }
                val newJson = updatedArray.toString()
                prefs.edit().putString("tasks_json", newJson).apply()
                gardenPrefs.edit().putString("tasks_json", newJson).apply()
            }
        } catch (_: Exception) {}
    }

    companion object {
        const val ACTION_NOTES_TOGGLE_ROW_0 = "com.valois.lilosgarden.ACTION_NOTES_TOGGLE_ROW_0"
        const val ACTION_NOTES_TOGGLE_ROW_1 = "com.valois.lilosgarden.ACTION_NOTES_TOGGLE_ROW_1"
        const val ACTION_NOTES_TOGGLE_ROW_2 = "com.valois.lilosgarden.ACTION_NOTES_TOGGLE_ROW_2"
        const val ACTION_NOTES_TOGGLE_TOP = "com.valois.lilosgarden.ACTION_NOTES_TOGGLE_TOP"
        const val ACTION_NOTES_OPEN_DEFAULT_APP = "com.valois.lilosgarden.ACTION_NOTES_OPEN_DEFAULT_APP"
        const val ACTION_NOTES_SYNC_CLIPBOARD = "com.valois.lilosgarden.ACTION_NOTES_SYNC_CLIPBOARD"
        const val ACTION_NOTES_REFRESH = "com.valois.lilosgarden.ACTION_NOTES_REFRESH"
        private const val TOTAL_FRAMES = 12

        fun refreshAllNotesWidgets(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, LiloNotesWidgetProvider::class.java))
            if (ids.isNotEmpty()) {
                for (id in ids) {
                    updateNotesWidget(context, manager, id)
                }
            }
        }

        fun loadPixelTypeface(context: Context): Typeface {
            return WidgetFontHelper.loadPixelTypeface(context)
        }

        private fun updateNotesWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            try {
                val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
                val gardenPrefs = context.getSharedPreferences("lilos_garden_prefs", Context.MODE_PRIVATE)
                val views = RemoteViews(context.packageName, R.layout.lilo_notes_widget)

                // 1. Read tasks and sticky note (Custom Tasks Only)
                var tasksJsonStr = prefs.getString("tasks_json", null)
                    ?: gardenPrefs.getString("tasks_json", null)
                var stickyNote = prefs.getString("sticky_note", null)
                    ?: gardenPrefs.getString("sticky_note", null)

                if (tasksJsonStr.isNullOrEmpty() || stickyNote.isNullOrEmpty()) {
                    val gJson = prefs.getString("garden_json", null) ?: gardenPrefs.getString("garden_json", null)
                    if (!gJson.isNullOrEmpty()) {
                        val gObj = JSONObject(gJson)
                        if (tasksJsonStr.isNullOrEmpty()) {
                            tasksJsonStr = gObj.optJSONArray("tasks")?.toString()
                        }
                        if (stickyNote.isNullOrEmpty()) {
                            stickyNote = gObj.optString("stickyNote", "")
                        }
                    }
                }

                if (stickyNote.isNullOrBlank()) {
                    stickyNote = "Take a deep breath and listen to the birds."
                }

                val tasksList = mutableListOf<Pair<String, Boolean>>()
                if (!tasksJsonStr.isNullOrEmpty()) {
                    val arr = JSONArray(tasksJsonStr)
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        val id = obj.optString("id", "")
                        if (id == "task-1" || id == "task-2" || id == "task-3") continue
                        val text = obj.optString("text", "").trim()
                        val done = obj.optBoolean("done", false)
                        if (text.isNotBlank()) {
                            tasksList.add(Pair(text, done))
                        }
                    }
                }
                // NO hardcoded default dummy tasks added!

                // Read recent device notes if any
                val deviceNotesJson = prefs.getString("device_notes_list", null)
                    ?: gardenPrefs.getString("device_notes_list", null)
                val recentNotes = mutableListOf<String>()
                if (!deviceNotesJson.isNullOrEmpty()) {
                    try {
                        val arr = JSONArray(deviceNotesJson)
                        for (i in 0 until minOf(3, arr.length())) {
                            val obj = arr.optJSONObject(i) ?: continue
                            val txt = obj.optString("text", "").trim()
                            if (txt.isNotBlank()) {
                                recentNotes.add(txt)
                            }
                        }
                    } catch (_: Exception) {}
                }

                // 2. LAYER 1: Animation Frames Loop (12 frames @ 220x110 RGB_565)
                views.removeAllViews(R.id.notes_flipper)
                for (f in 0 until TOTAL_FRAMES) {
                    val frameBmp = renderNoticeBoardFrame(f)
                    val frameView = RemoteViews(context.packageName, R.layout.widget_flipper_frame)
                    frameView.setImageViewBitmap(R.id.frame_img, frameBmp)
                    views.addView(R.id.notes_flipper, frameView)
                }

                // 3. LAYER 2: High-Res Solid Notice Board & Typography Overlay (520x300 ARGB_8888)
                val hudBmp = renderNoticeBoardHud(context, tasksList, stickyNote, recentNotes)
                views.setImageViewBitmap(R.id.notes_hud_overlay, hudBmp)

                // 4. Hotspots PendingIntents
                // Row 0
                val row0Intent = Intent(context, LiloNotesWidgetProvider::class.java).apply {
                    action = ACTION_NOTES_TOGGLE_ROW_0
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.notes_row_0,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId * 100 + 10,
                        row0Intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                // Row 1
                val row1Intent = Intent(context, LiloNotesWidgetProvider::class.java).apply {
                    action = ACTION_NOTES_TOGGLE_ROW_1
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.notes_row_1,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId * 100 + 11,
                        row1Intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                // Row 2
                val row2Intent = Intent(context, LiloNotesWidgetProvider::class.java).apply {
                    action = ACTION_NOTES_TOGGLE_ROW_2
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                views.setOnClickPendingIntent(
                    R.id.notes_row_2,
                    PendingIntent.getBroadcast(
                        context,
                        appWidgetId * 100 + 12,
                        row2Intent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )
                )

                // Open App (Header & Sticky note)
                val openAppIntent = Intent(context, MainActivity::class.java).apply {
                    action = "com.valois.lilosgarden.OPEN_TASKS"
                    putExtra("open_modal", "modalTasks")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                }
                val openAppPending = PendingIntent.getActivity(
                    context,
                    appWidgetId * 100 + 20,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.notes_open_app, openAppPending)
                views.setOnClickPendingIntent(R.id.notes_edit_area, openAppPending)

                appWidgetManager.updateAppWidget(appWidgetId, views)
            } catch (_: Exception) {}
        }

        private fun renderNoticeBoardFrame(frameIdx: Int): Bitmap {
            val w = 220
            val h = 110
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565)
            val c = Canvas(bmp)
            val p = Paint().apply { isAntiAlias = false }

            fun px(x: Int, y: Int, rw: Int, rh: Int, colHex: String) {
                p.color = Color.parseColor(colHex)
                c.drawRect(x.toFloat(), y.toFloat(), (x + rw).toFloat(), (y + rh).toFloat(), p)
            }

            // Stardew Wooden Board Outer Frame
            px(0, 0, w, h, "#3b1d0a")
            px(2, 2, w - 4, h - 4, "#532e16")
            px(5, 5, w - 10, h - 10, "#8c5832")
            px(8, 8, w - 16, h - 16, "#fef3c7") // Parchment base

            // Corner decorative brass pins
            px(3, 3, 3, 3, "#fbbf24")
            px(w - 6, 3, 3, 3, "#fbbf24")
            px(3, h - 6, 3, 3, "#fbbf24")
            px(w - 6, h - 6, 3, 3, "#fbbf24")

            return bmp
        }

        private fun renderNoticeBoardHud(
            context: Context,
            tasks: List<Pair<String, Boolean>>,
            stickyNote: String,
            recentNotes: List<String>
        ): Bitmap {
            val w = 520
            val h = 300
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            val font = loadPixelTypeface(context)

            val p = Paint().apply {
                typeface = font
                isAntiAlias = true
                isSubpixelText = true
            }

            // 1. Board Title Bar across full width (RectF(18f, 18f, w - 18f, 54f))
            p.color = Color.parseColor("#3b1d0a")
            c.drawRect(18f, 18f, w - 18f, 54f, p)
            p.color = Color.parseColor("#8f4d22")
            c.drawRect(20f, 20f, w - 20f, 52f, p)

            p.color = Color.parseColor("#ffffff")
            p.textSize = 21f
            p.textAlign = Paint.Align.LEFT
            c.drawText("MY TASKS & STICKY NOTE", 30f, 43f, p)

            // 2. Custom Task Rows (i = 0..2, rowY = 64f + i * 38f)
            if (tasks.isEmpty()) {
                p.color = Color.parseColor("#78350f")
                p.textSize = 22f
                p.textAlign = Paint.Align.LEFT
                c.drawText("+ Tap here to add custom tasks", 34f, 115f, p)
            } else {
                val maxTasks = minOf(3, tasks.size)
                for (i in 0 until maxTasks) {
                    val rowY = 64f + i * 38f
                    val (taskText, isDone) = tasks[i]

                    // 26x26 Checkbox with 3f stroke border
                    val cbLeft = 30f
                    val cbTop = rowY
                    val cbRight = 56f
                    val cbBottom = rowY + 26f

                    p.color = Color.parseColor("#3b1d0a")
                    c.drawRect(cbLeft, cbTop, cbRight, cbBottom, p)

                    if (isDone) {
                        p.color = Color.parseColor("#15803d")
                        c.drawRect(cbLeft + 3f, cbTop + 3f, cbRight - 3f, cbBottom - 3f, p)
                        // White checkmark
                        p.color = Color.parseColor("#ffffff")
                        p.textSize = 19f
                        p.textAlign = Paint.Align.CENTER
                        c.drawText("\u2713", cbLeft + 13f, cbTop + 20f, p)
                    } else {
                        p.color = Color.parseColor("#fffbeb")
                        c.drawRect(cbLeft + 3f, cbTop + 3f, cbRight - 3f, cbBottom - 3f, p)
                    }

                    // Task Text @ 24f bold
                    p.textSize = 24f
                    p.textAlign = Paint.Align.LEFT
                    val truncated = truncate(taskText, 25)
                    if (isDone) {
                        p.color = Color.parseColor("#64748b")
                        c.drawText(truncated, 68f, rowY + 21f, p)
                        // Strikethrough line
                        val textW = p.measureText(truncated)
                        p.color = Color.parseColor("#94a3b8")
                        c.drawRect(68f, rowY + 12f, 68f + textW, rowY + 15f, p)
                    } else {
                        p.color = Color.parseColor("#3b1d0a")
                        c.drawText(truncated, 68f, rowY + 21f, p)
                    }
                }
            }

            // 3. Taller Cozy Sticky Note at Bottom (stickyTop = 182f)
            val stickyTop = 182f
            p.color = Color.parseColor("#b45309")
            c.drawRect(22f, stickyTop, w - 22f, h - 22f, p)
            p.color = Color.parseColor("#fef08a")
            c.drawRect(24f, stickyTop + 2f, w - 24f, h - 24f, p)

            // Red Pin at sticky note top-center
            p.color = Color.parseColor("#dc2626")
            c.drawCircle(w / 2f, stickyTop + 6f, 4.5f, p)

            // Label: "📌 STICKY NOTE:" @ 16f bold (#B45309) at (32f, 206f)
            p.color = Color.parseColor("#b45309")
            p.textSize = 16f
            p.textAlign = Paint.Align.LEFT
            c.drawText("📌 STICKY NOTE:", 32f, 206f, p)

            // User's sticky note text @ 24f bold (#3B1D0A) at (32f, 240f) (wrap to y=268f if > 28 chars)
            val primaryNote = if (recentNotes.isNotEmpty()) recentNotes[0] else stickyNote
            val noteDisplay = if (primaryNote.isNotBlank()) primaryNote else "Take a deep breath and listen to the birds."

            p.color = Color.parseColor("#3b1d0a")
            p.textSize = 24f
            p.textAlign = Paint.Align.LEFT
            if (noteDisplay.length <= 28) {
                c.drawText(noteDisplay, 32f, 240f, p)
            } else {
                var splitIdx = 28
                val lastSpace = noteDisplay.substring(0, 28).lastIndexOf(' ')
                if (lastSpace > 16) splitIdx = lastSpace
                val line1 = noteDisplay.substring(0, splitIdx).trim()
                val line2 = truncate(noteDisplay.substring(splitIdx).trim(), 28)
                c.drawText(line1, 32f, 240f, p)
                c.drawText(line2, 32f, 268f, p)
            }

            return bmp
        }

        private fun truncate(str: String, maxLen: Int): String {
            return if (str.length <= maxLen) str else str.substring(0, maxLen - 1) + "\u2026"
        }
    }
}
