package com.printk.deepthink.presentation.components

import androidx.compose.foundation.layout.Box
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp

/**
 * 폭에 맞춰 폰트를 자동 축소하는 한 줄 텍스트.
 * max → min 까지 줄이고, 최소에서도 넘치면 말줄임(…). (UI-DESIGN: 카드 제목 18→11px)
 */
@Composable
fun AutoResizeText(
    text: String,
    modifier: Modifier = Modifier,
    maxFontSize: TextUnit = 18.sp,
    minFontSize: TextUnit = 11.sp,
    color: Color = Color.Unspecified,
    fontWeight: FontWeight? = null,
    fontFamily: FontFamily? = null,
    maxLines: Int = 1,
    style: TextStyle = LocalTextStyle.current
) {
    var fontSize by remember(text) { mutableStateOf(maxFontSize) }
    var ready by remember(text) { mutableStateOf(false) }

    Box(modifier = modifier) {
        Text(
            text = text,
            color = color,
            fontSize = fontSize,
            fontWeight = fontWeight,
            fontFamily = fontFamily,
            maxLines = maxLines,
            softWrap = maxLines > 1,
            overflow = TextOverflow.Ellipsis,
            style = style,
            modifier = Modifier.drawWithContent { if (ready) drawContent() },
            onTextLayout = { result ->
                if (result.hasVisualOverflow && fontSize.value > minFontSize.value) {
                    fontSize = (fontSize.value - 1f).sp
                } else if (!ready) {
                    ready = true
                }
            }
        )
    }
}
