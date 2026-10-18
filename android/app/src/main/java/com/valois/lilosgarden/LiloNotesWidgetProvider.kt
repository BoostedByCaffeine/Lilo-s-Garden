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
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Typeface
import android.os.Bundle
import android.widget.RemoteViews
import android.widget.Toast
import androidx.core.content.res.ResourcesCompat
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

    private fun toggleTopTask(context: Context) {
        try {
            val prefs = context.getSharedPreferences("lilo_widget_prefs", Context.MODE_PRIVATE)
            var tasksJsonStr = prefs.getString("tasks_json", null)
            if (tasksJsonStr.isNullOrEmpty()) {
                val gJson = prefs.getString("garden_json", null)
                if (!gJson.isNullOrEmpty()) {
                    val gObj = JSONObject(gJson)
                    tasksJsonStr = gObj.optJSONArray("tasks")?.toString()
                }
            }

            val tasksArray = if (!tasksJsonStr.isNullOrEmpty()) JSONArray(tasksJsonStr) else JSONArray()
            if (tasksArray.length() == 0) {
                // Add default tasks
                tasksArray.put(JSONObject().apply {
                    put("id", "t1")
                    put("text", "Pet Lilo & Cheeto")
                    put("done", true)
                })
                tasksArray.put(JSONObject().apply {
                    put("id", "t2")
                    put("text", "Relax on porch deck")
                    put("done", false)
                })
            }

            // Find first incomplete task
            var toggledIndex = -1
            for (i in 0 until tasksArray.length()) {
                val t = tasksArray.optJSONObject(i) ?: continue
                if (!t.optBoolean("done", false)) {
                    t.put("done", true)
                    toggledIndex = i
                    val txt = t.optString("text", "Task")
                    Toast.makeText(context, "Completed: $txt! \u2713", Toast.LENGTH_SHORT).show()
                    break
                }
            }

            // If all were already done, uncheck all to restart the day!
            if (toggledIndex == -1) {
                for (i in 0 until tasksArray.length()) {
                    tasksArray.optJSONObject(i)?.put("done", false)
                }
                Toast.makeText(context, "All tasks reset for a cozy new day!", Toast.LENGTH_SHORT).show()
            }

            val newJson = tasksArray.toString()
            val editor = prefs.edit().putString("tasks_json", newJson)

            // Also keep garden_json in sync
            val gJson = prefs.getString("garden_json", null)
            if (!gJson.isNullOrEmpty()) {
                try {
                    val gObj = JSONObject(gJson)
                    gObj.put("tasks", tasksArray)
                    editor.putString("garden_json", gObj.toString())
                } catch (_: Exception) {}
            }
            editor.apply()
        } catch (_: Exception) {}
    }

    companion object {
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
                val views = RemoteViews(context.packageName, R.layout.lilo_notes_widget)

                // 1. Read tasks and sticky note
                var tasksJsonStr = prefs.getString("tasks_json", null)
                var stickyNote = prefs.getString("sticky_note", null)
                if (tasksJsonStr.isNullOrEmpty() || stickyNote.isNullOrEmpty()) {
                    val gJson = prefs.getString("garden_json", null)
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
                        val text = obj.optString("text", "").trim()
                        val done = obj.optBoolean("done", false)
                        if (text.isNotBlank()) {
                            tasksList.add(Pair(text, done))
                        }
                    }
                }
                if (tasksList.isEmpty()) {
                    tasksList.add(Pair("Pet Lilo & Cheeto", true))
                    tasksList.add(Pair("Relax on porch deck", false))
                    tasksList.add(Pair("Water forget-me-nots", false))
                }

                // Read recent device notes
                val deviceNotesJson = prefs.getString("device_notes_list", null)
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

                // 3. LAYER 2: High-Res Solid Notice Board & Typography Overlay (480x248 ARGB_8888)
                val hudBmp = renderNoticeBoardHud(context, tasksList, stickyNote, recentNotes)
                views.setImageViewBitmap(R.id.notes_hud_overlay, hudBmp)

                // 4. Hotspots PendingIntents
                val toggleIntent = Intent(context, LiloNotesWidgetProvider::class.java).apply {
                    action = ACTION_NOTES_TOGGLE_TOP
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                val togglePending = PendingIntent.getBroadcast(
                    context,
                    appWidgetId * 100 + 1,
                    toggleIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.notes_tasks_area, togglePending)

                val editIntent = Intent(context, MainActivity::class.java).apply {
                    action = "com.valois.lilosgarden.OPEN_TASKS"
                    putExtra("open_modal", "modalTasks")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                }
                val editPending = PendingIntent.getActivity(
                    context,
                    appWidgetId * 100 + 2,
                    editIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.notes_edit_area, editPending)

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

            // Peeking Lilo in top-right corner (x = 186, y = 3)
            val earTwitch = if (frameIdx in 4..6) -1 else 0
            val blink = frameIdx in 8..9

            // Lilo's dark seal-point ears
            px(188, 5 + earTwitch, 4, 6, "#2c1d11")
            px(204, 5, 4, 6, "#2c1d11")
            // Cream head
            px(189, 9, 18, 12, "#ffeedb")
            // Mask
            px(192, 12, 12, 7, "#422817")
            // Eyes
            if (blink) {
                px(194, 15, 3, 1, "#1e293b")
                px(199, 15, 3, 1, "#1e293b")
            } else {
                px(194, 14, 3, 3, "#38bdf8") // Bright blue eyes
                px(199, 14, 3, 3, "#38bdf8")
            }
            // Pink nose
            px(197, 18, 2, 1, "#f472b6")

            return bmp
        }

        private fun renderNoticeBoardHud(
            context: Context,
            tasks: List<Pair<String, Boolean>>,
            stickyNote: String,
            recentNotes: List<String>
        ): Bitmap {
            val w = 480
            val h = 248
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
            val c = Canvas(bmp)
            val font = loadPixelTypeface(context)

            val p = Paint().apply {
                typeface = font
                isAntiAlias = true
                isSubpixelText = true
            }

            // 1. Board Title Bar
            p.color = Color.parseColor("#3b1d0a")
            c.drawRect(18f, 14f, 400f, 44f, p)
            p.color = Color.parseColor("#8f4d22")
            c.drawRect(20f, 16f, 396f, 40f, p)

            p.color = Color.parseColor("#ffffff")
            p.textSize = 14f
            p.textAlign = Paint.Align.LEFT
            c.drawText("SANCTUARY TASKS & NOTES", 28f, 34f, p)

            // 2. Render up to 2-3 Daily Tasks
            val maxTasks = minOf(if (recentNotes.isNotEmpty()) 2 else 3, tasks.size)
            var startY = 72f
            for (i in 0 until maxTasks) {
                val (taskText, isDone) = tasks[i]

                // Checkbox Box
                p.color = Color.parseColor("#3b1d0a")
                c.drawRect(24f, startY - 14f, 42f, startY + 4f, p)

                if (isDone) {
                    p.color = Color.parseColor("#15803d")
                    c.drawRect(26f, startY - 12f, 40f, startY + 2f, p)
                    // White checkmark
                    p.color = Color.parseColor("#ffffff")
                    p.textSize = 12f
                    c.drawText("\u2713", 28f, startY, p)
                } else {
                    p.color = Color.parseColor("#fffbeb")
                    c.drawRect(26f, startY - 12f, 40f, startY + 2f, p)
                }

                // Task Text
                p.textSize = 13f
                if (isDone) {
                    p.color = Color.parseColor("#64748b")
                    val truncated = truncate(taskText, 25)
                    c.drawText(truncated, 50f, startY, p)
                    // Strikethrough line
                    val textW = p.measureText(truncated)
                    p.color = Color.parseColor("#94a3b8")
                    c.drawRect(50f, startY - 4f, 50f + textW, startY - 2f, p)
                } else {
                    p.color = Color.parseColor("#3b1d0a")
                    val truncated = truncate(taskText, 25)
                    c.drawText(truncated, 50f, startY, p)
                }

                startY += 28f
            }

            // 3. Cozy Sticky Note at Bottom (y = 138..234)
            p.color = Color.parseColor("#b45309")
            c.drawRect(20f, 136f, 460f, 234f, p)
            p.color = Color.parseColor("#fef3c7")
            c.drawRect(22f, 138f, 458f, 232f, p)

            // Red Pin at sticky note top-center
            p.color = Color.parseColor("#dc2626")
            c.drawCircle(240f, 142f, 4f, p)

            // Note Text / Recent Device Note
            val primaryNote = if (recentNotes.isNotEmpty()) recentNotes[0] else stickyNote
            val noteHeader = if (recentNotes.isNotEmpty()) "📌 RECENT NOTE:" else "📌 STICKY NOTE:"

            p.color = Color.parseColor("#b45309")
            p.textSize = 11f
            p.textAlign = Paint.Align.LEFT
            c.drawText(noteHeader, 32f, 162f, p)

            p.color = Color.parseColor("#78350f")
            p.textSize = 12f
            val noteDisplay = truncate(primaryNote, 44)
            c.drawText(noteDisplay, 32f, 186f, p)

            // If there's a second note, display second line
            if (recentNotes.size > 1) {
                p.color = Color.parseColor("#92400e")
                p.textSize = 11f
                val note2 = truncate("• " + recentNotes[1], 44)
                c.drawText(note2, 32f, 206f, p)
            }

            // "+ Edit" hint on bottom right
            p.color = Color.parseColor("#b45309")
            p.textSize = 11f
            p.textAlign = Paint.Align.RIGHT
            c.drawText("[+ Note / Edit]", 450f, 222f, p)

            return bmp
        }

        private fun truncate(str: String, maxLen: Int): String {
            return if (str.length <= maxLen) str else str.substring(0, maxLen - 1) + "\u2026"
        }
    }
}
