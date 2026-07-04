package com.printk.deepthink.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.printk.deepthink.domain.model.ThoughtType
import com.printk.deepthink.presentation.theme.Amber
import com.printk.deepthink.presentation.theme.AmberBg
import com.printk.deepthink.presentation.theme.Pine
import com.printk.deepthink.presentation.theme.TextTertiary

/**
 * 생각 줄의 좌측 아이콘.
 * - CHECK: 둥근 사각 체크박스 (완료 시 pine 채움 + 흰 체크)
 * - COMMENT: 둥근 말풍선 (amber 외곽 + 연한 amber 배경)
 */
@Composable
fun ThoughtGlyph(
    type: ThoughtType,
    done: Boolean,
    size: Dp = 18.dp
) {
    when (type) {
        ThoughtType.CHECK -> {
            val shape = RoundedCornerShape(5.dp)
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(size)
                    .clip(shape)
                    .then(
                        if (done) Modifier.background(Pine)
                        else Modifier.border(1.5.dp, TextTertiary, shape)
                    )
            ) {
                if (done) {
                    Icon(
                        Icons.Filled.Check,
                        contentDescription = "완료",
                        tint = androidx.compose.ui.graphics.Color.White,
                        modifier = Modifier.size(size * 0.72f)
                    )
                }
            }
        }
        ThoughtType.COMMENT -> {
            Box(
                modifier = Modifier
                    .size(size)
                    .clip(RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp, bottomEnd = 6.dp, bottomStart = 2.dp))
                    .background(AmberBg)
                    .border(1.5.dp, Amber, RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp, bottomEnd = 6.dp, bottomStart = 2.dp))
            )
        }
    }
}
