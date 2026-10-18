package com.valois.lilosgarden

import android.content.Context
import android.graphics.Typeface
import androidx.core.content.res.ResourcesCompat

object WidgetFontHelper {
    private var cachedTypeface: Typeface? = null

    fun loadPixelTypeface(context: Context): Typeface {
        cachedTypeface?.let { return it }
        val tf = try {
            Typeface.createFromAsset(context.assets, "www/assets/fonts/Stardew_Valley.ttf")
        } catch (e1: Exception) {
            try {
                Typeface.createFromAsset(context.assets, "assets/fonts/Stardew_Valley.ttf")
            } catch (e2: Exception) {
                try {
                    ResourcesCompat.getFont(context, R.font.press_start_2p) ?: Typeface.MONOSPACE
                } catch (e3: Exception) {
                    Typeface.MONOSPACE
                }
            }
        }
        cachedTypeface = tf
        return tf
    }
}
