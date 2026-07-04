package com.printk.deepthink.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.LocalTextStyle
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.printk.deepthink.domain.model.Thought
import com.printk.deepthink.domain.model.ThoughtType
import com.printk.deepthink.presentation.theme.IndentGuide
import com.printk.deepthink.presentation.theme.Pine
import com.printk.deepthink.presentation.theme.TextPrimary
import com.printk.deepthink.presentation.theme.TextTertiary

private const val INDENT_DP = 22

@Composable
fun ThoughtRow(
    thought: Thought,
    focusRequester: FocusRequester,
    onTextChange: (String) -> Unit,
    onEnter: (before: String, after: String) -> Unit,
    onBackspaceEmpty: () -> Unit,
    onToggleDone: () -> Unit,
    onIndent: () -> Unit,
    onOutdent: () -> Unit,
    onLongPress: () -> Unit,
    onFocusChanged: (Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    var dragAmount = 0f

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 28.dp)
            .pointerInput(thought.id) {
                detectHorizontalDragGestures(
                    onDragStart = { dragAmount = 0f },
                    onDragEnd = {
                        if (dragAmount > 40f) onIndent()
                        else if (dragAmount < -40f) onOutdent()
                    }
                ) { _, delta -> dragAmount += delta }
            }
            .padding(vertical = 6.dp)
    ) {
        // 들여쓰기 가이드선
        if (thought.level > 0) {
            repeat(thought.level) {
                Box(
                    Modifier
                        .width(INDENT_DP.dp)
                        .fillMaxHeight()
                ) {
                    Box(
                        Modifier
                            .width(1.dp)
                            .fillMaxHeight()
                            .background(IndentGuide)
                            .align(Alignment.CenterStart)
                            .padding(start = 4.dp)
                    )
                }
            }
        }

        // 좌측 아이콘: 탭=체크 토글, 길게=메뉴
        Box(
            modifier = Modifier
                .padding(end = 10.dp)
                .pointerInput(thought.id, thought.type, thought.done) {
                    detectTapGestures(
                        onTap = { if (thought.type == ThoughtType.CHECK) onToggleDone() },
                        onLongPress = { onLongPress() }
                    )
                }
        ) {
            ThoughtGlyph(type = thought.type, done = thought.done, size = 20.dp)
        }

        // 텍스트 인라인 편집
        val baseStyle = LocalTextStyle.current.copy(
            fontSize = 15.sp,
            color = if (thought.done) TextTertiary else TextPrimary,
            textDecoration = if (thought.done) TextDecoration.LineThrough else null
        )
        BasicTextField(
            value = thought.text,
            onValueChange = { newValue ->
                if (newValue.contains('\n')) {
                    val i = newValue.indexOf('\n')
                    onEnter(newValue.substring(0, i), newValue.substring(i + 1))
                } else {
                    onTextChange(newValue)
                }
            },
            textStyle = baseStyle,
            cursorBrush = androidx.compose.ui.graphics.SolidColor(Pine),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Default),
            modifier = Modifier
                .fillMaxWidth()
                .focusRequester(focusRequester)
                .onFocusChanged { onFocusChanged(it.isFocused) }
                .onPreviewKeyEvent { event ->
                    if (event.type == KeyEventType.KeyDown &&
                        event.key == Key.Backspace &&
                        thought.text.isEmpty()
                    ) {
                        onBackspaceEmpty()
                        true
                    } else false
                }
        )
    }
}
