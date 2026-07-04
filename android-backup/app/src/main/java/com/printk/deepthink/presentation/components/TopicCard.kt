package com.printk.deepthink.presentation.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.printk.deepthink.domain.model.Topic
import com.printk.deepthink.presentation.theme.Divider
import com.printk.deepthink.presentation.theme.Surface
import com.printk.deepthink.presentation.theme.TextPrimary
import com.printk.deepthink.presentation.theme.TextSecondary
import com.printk.deepthink.presentation.theme.TextTertiary

@Composable
fun TopicCard(
    topic: Topic,
    previewLines: Int,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Divider)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            AutoResizeText(
                text = topic.title.ifBlank { "제목 없음" },
                maxFontSize = 18.sp,
                minFontSize = 11.sp,
                color = if (topic.title.isBlank()) TextTertiary else TextPrimary,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.fillMaxWidth()
            )

            val preview = if (previewLines > 0) topic.thoughts.takeLast(previewLines) else emptyList()
            if (preview.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                Column {
                    preview.forEach { t ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 2.dp)
                        ) {
                            ThoughtGlyph(type = t.type, done = t.done, size = 13.dp)
                            Spacer(Modifier.width(7.dp))
                            Text(
                                text = t.text.ifBlank { "…" },
                                color = if (t.done) TextTertiary else TextSecondary,
                                fontSize = 12.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                textDecoration = if (t.done) TextDecoration.LineThrough else null
                            )
                        }
                    }
                }
            }
        }
    }
}
