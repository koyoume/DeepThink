package com.printk.deepthink.presentation.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.layout.Spacer
import com.printk.deepthink.presentation.theme.Divider
import com.printk.deepthink.presentation.theme.Pine
import com.printk.deepthink.presentation.theme.TextSecondary
import com.printk.deepthink.presentation.theme.getCategoryColor

@Composable
fun CategoryChip(
    name: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val shape = RoundedCornerShape(50)
    val base = if (selected) {
        Modifier.background(Pine, shape)
    } else {
        Modifier.border(1.dp, Divider, shape)
    }
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .clip(shape)
            .then(base)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Spacer(
            Modifier
                .size(8.dp)
                .clip(CircleShape)
                .background(if (selected) Color.White else getCategoryColor(name).dot)
        )
        Spacer(Modifier.width(7.dp))
        Text(
            text = name,
            color = if (selected) Color.White else TextSecondary,
            fontSize = 13.sp
        )
    }
}
