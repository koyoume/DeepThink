package com.printk.deepthink.presentation.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.staggeredgrid.LazyVerticalStaggeredGrid
import androidx.compose.foundation.lazy.staggeredgrid.StaggeredGridCells
import androidx.compose.foundation.lazy.staggeredgrid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.printk.deepthink.presentation.components.CategoryChip
import com.printk.deepthink.presentation.components.TopicCard
import com.printk.deepthink.presentation.theme.Pine
import com.printk.deepthink.presentation.theme.TextPrimary
import com.printk.deepthink.presentation.theme.TextSecondary
import com.printk.deepthink.presentation.theme.TextTertiary
import kotlinx.coroutines.launch

@Composable
fun DashboardScreen(
    onTopicClick: (String) -> Unit,
    innerPadding: PaddingValues,
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val categories by viewModel.categories.collectAsStateWithLifecycle()
    val selected by viewModel.selectedCategory.collectAsStateWithLifecycle()
    val topics by viewModel.topics.collectAsStateWithLifecycle()
    val previewLines by viewModel.previewLines.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()

    Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
        Column(modifier = Modifier.fillMaxSize()) {
            // 헤더
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 20.dp, end = 8.dp, top = 12.dp, bottom = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("생각 모음", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = { viewModel.cyclePreviewLines() }) {
                    Icon(Icons.Outlined.Tune, contentDescription = "뷰 옵션", tint = TextSecondary)
                }
            }

            // 카테고리 칩 (단일·필수 선택)
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(categories, key = { it.name }) { cat ->
                    CategoryChip(
                        name = cat.name,
                        selected = cat.name == selected,
                        onClick = { viewModel.selectCategory(cat.name) }
                    )
                }
            }

            // 캡션
            val previewLabel = if (previewLines <= 0) "미리보기 끔" else "미리보기 · 최대 ${previewLines}줄"
            Text(
                text = "주제 ${topics.size}개 · $previewLabel",
                color = TextTertiary,
                fontSize = 12.sp,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp)
            )

            if (topics.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("아직 주제가 없어요\n우측 하단 +로 추가하세요", color = TextTertiary, fontSize = 14.sp)
                }
            } else {
                LazyVerticalStaggeredGrid(
                    columns = StaggeredGridCells.Fixed(2),
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 96.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalItemSpacing = 12.dp
                ) {
                    items(topics, key = { it.id }) { topic ->
                        TopicCard(
                            topic = topic,
                            previewLines = previewLines,
                            onClick = { onTopicClick(topic.id) }
                        )
                    }
                }
            }
        }

        FloatingActionButton(
            onClick = {
                scope.launch {
                    val id = viewModel.addTopic()
                    if (id != null) onTopicClick(id)
                }
            },
            containerColor = Pine,
            contentColor = Color.White,
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp)
        ) {
            Icon(Icons.Default.Add, contentDescription = "주제 추가")
        }
    }
}
