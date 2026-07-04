package com.printk.deepthink.presentation.detail

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateMap
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.printk.deepthink.domain.model.Material
import com.printk.deepthink.domain.model.MaterialKind
import com.printk.deepthink.domain.model.Thought
import com.printk.deepthink.domain.model.ThoughtType
import com.printk.deepthink.presentation.components.AutoResizeText
import com.printk.deepthink.presentation.components.CategoryChip
import com.printk.deepthink.presentation.components.ThoughtGlyph
import com.printk.deepthink.presentation.components.ThoughtRow
import com.printk.deepthink.presentation.theme.Bg
import com.printk.deepthink.presentation.theme.Divider
import com.printk.deepthink.presentation.theme.Pine
import com.printk.deepthink.presentation.theme.SerifTitle
import com.printk.deepthink.presentation.theme.Surface
import com.printk.deepthink.presentation.theme.TextPrimary
import com.printk.deepthink.presentation.theme.TextSecondary
import com.printk.deepthink.presentation.theme.TextTertiary
import com.printk.deepthink.presentation.theme.getCategoryColor

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TopicDetailScreen(
    onBack: () -> Unit,
    viewModel: TopicDetailViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val newType by viewModel.newType.collectAsStateWithLifecycle()
    val focusedId by viewModel.focusedId.collectAsStateWithLifecycle()
    val categories by viewModel.categories.collectAsStateWithLifecycle()

    // 입력바 타입: 편집 중인 줄이 있으면 그 줄의 타입을, 없으면 새 줄 기본 타입을 표시
    val barType = state.thoughts.firstOrNull { it.id == focusedId }?.type ?: newType

    val context = androidx.compose.ui.platform.LocalContext.current
    val focusRequesters = remember { SnapshotStateMap<String, FocusRequester>() }
    var focusTarget by remember { mutableStateOf<String?>(null) }
    var editingTitle by remember { mutableStateOf(false) }
    var showMenu by remember { mutableStateOf(false) }
    var showCategorySheet by remember { mutableStateOf(false) }
    var actionSheetThoughtId by remember { mutableStateOf<String?>(null) }

    fun requesterFor(id: String): FocusRequester =
        focusRequesters.getOrPut(id) { FocusRequester() }

    LaunchedEffect(focusTarget, state.thoughts.size) {
        val target = focusTarget ?: return@LaunchedEffect
        if (state.thoughts.any { it.id == target }) {
            runCatching { requesterFor(target).requestFocus() }
            focusTarget = null
        }
    }

    DisposableEffect(Unit) { onDispose { viewModel.flush() } }

    androidx.compose.material3.Scaffold(
        containerColor = Bg,
        topBar = {
            TopAppBar(
                title = {},
                navigationIcon = {
                    IconButton(onClick = { viewModel.flush(); onBack() }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "뒤로", tint = TextPrimary)
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Default.MoreVert, contentDescription = "더보기", tint = TextPrimary)
                        }
                        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                            DropdownMenuItem(
                                text = { Text("카테고리 변경") },
                                onClick = { showMenu = false; showCategorySheet = true }
                            )
                            DropdownMenuItem(
                                text = { Text("주제 삭제", color = androidx.compose.ui.graphics.Color(0xFFB3261E)) },
                                onClick = { showMenu = false; viewModel.deleteTopic(onBack) }
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Bg)
            )
        },
        bottomBar = {
            InputBar(
                type = barType,
                editingLine = focusedId != null,
                onToggleType = { viewModel.toggleType() },
                onAdd = {
                    val id = viewModel.addAtEnd()
                    focusTarget = id
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            // 카테고리 칩
            item {
                Row(modifier = Modifier.padding(start = 20.dp, top = 4.dp)) {
                    CategoryChip(name = state.category, selected = false, onClick = { showCategorySheet = true })
                }
            }

            // 고정 높이 제목 박스 (64dp)
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(64.dp)
                        .padding(horizontal = 20.dp)
                        .clickable { editingTitle = true },
                    contentAlignment = Alignment.CenterStart
                ) {
                    if (editingTitle) {
                        val tr = remember { FocusRequester() }
                        LaunchedEffect(Unit) { runCatching { tr.requestFocus() } }
                        BasicTextField(
                            value = state.title,
                            onValueChange = { viewModel.setTitle(it.replace("\n", "")) },
                            textStyle = androidx.compose.ui.text.TextStyle(
                                fontFamily = SerifTitle,
                                fontSize = 24.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextPrimary
                            ),
                            cursorBrush = SolidColor(Pine),
                            modifier = Modifier.fillMaxWidth().focusRequester(tr)
                        )
                    } else if (state.title.isBlank()) {
                        Text("제목을 입력하세요", color = TextTertiary, fontSize = 22.sp, fontFamily = SerifTitle)
                    } else {
                        AutoResizeText(
                            text = state.title,
                            maxFontSize = 27.sp,
                            minFontSize = 15.sp,
                            maxLines = 2,
                            color = TextPrimary,
                            fontWeight = FontWeight.SemiBold,
                            fontFamily = SerifTitle,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            // 관련 자료 (선택) — 한 줄로 링크/메모 추가
            item {
                SectionHeader("관련 자료", topPadding = 6.dp)
            }
            itemsIndexed(state.materials) { index, m ->
                val isLink = m.kind == MaterialKind.LINK
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 1.dp)
                        .clickable(enabled = isLink) {
                            if (isLink) runCatching {
                                context.startActivity(
                                    android.content.Intent(
                                        android.content.Intent.ACTION_VIEW,
                                        android.net.Uri.parse(m.url)
                                    )
                                )
                            }
                        }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(if (isLink) "🔗" else "📝", fontSize = 12.sp)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        m.title.ifBlank { m.url },
                        color = if (isLink) Pine else TextPrimary,
                        fontSize = 13.sp,
                        textDecoration = if (isLink) androidx.compose.ui.text.style.TextDecoration.Underline else null,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "삭제",
                        tint = TextTertiary,
                        modifier = Modifier
                            .padding(start = 4.dp)
                            .height(16.dp).width(16.dp)
                            .clickable { viewModel.removeMaterial(index) }
                    )
                }
            }
            item {
                // 한 줄 입력 (컴팩트): URL이면 링크, 아니면 메모
                var input by remember { mutableStateOf("") }
                fun commit() {
                    buildMaterial(input)?.let { viewModel.addMaterial(it) }
                    input = ""
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 20.dp, end = 16.dp, top = 2.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, tint = TextTertiary, modifier = Modifier.height(16.dp).width(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Box(modifier = Modifier.weight(1f)) {
                        if (input.isEmpty()) {
                            Text("링크 또는 메모 한 줄 추가", color = TextTertiary, fontSize = 13.sp)
                        }
                        BasicTextField(
                            value = input,
                            onValueChange = { input = it },
                            singleLine = true,
                            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 13.sp, color = TextPrimary),
                            cursorBrush = SolidColor(Pine),
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Done),
                            keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { commit() }),
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            // 생각 리스트
            item {
                SectionHeader("생각", topPadding = 14.dp)
            }

            if (state.thoughts.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 16.dp)
                    ) {
                        Text("아직 생각이 없어요. 아래에서 한 줄 추가하세요.", color = TextTertiary, fontSize = 13.sp)
                    }
                }
            } else {
                items(state.thoughts, key = { it.id }) { thought ->
                    ThoughtRow(
                        thought = thought,
                        focusRequester = requesterFor(thought.id),
                        onTextChange = { viewModel.setText(thought.id, it) },
                        onEnter = { before, after ->
                            viewModel.setText(thought.id, before)
                            val newId = viewModel.addAfter(thought.id)
                            if (newId != null) {
                                if (after.isNotEmpty()) viewModel.setText(newId, after)
                                focusTarget = newId
                            }
                        },
                        onBackspaceEmpty = {
                            val prev = viewModel.deleteThought(thought.id)
                            focusTarget = prev
                        },
                        onToggleDone = { viewModel.toggleDone(thought.id) },
                        onIndent = { viewModel.indent(thought.id) },
                        onOutdent = { viewModel.outdent(thought.id) },
                        onLongPress = { actionSheetThoughtId = thought.id },
                        onFocusChanged = { focused ->
                            if (focused) viewModel.setFocused(thought.id)
                            else viewModel.clearFocused(thought.id)
                        },
                        modifier = Modifier.padding(start = 20.dp, end = 16.dp)
                    )
                }
            }
        }
    }

    // 카테고리 변경 시트
    if (showCategorySheet) {
        ModalBottomSheet(onDismissRequest = { showCategorySheet = false }, containerColor = Surface) {
            Text("카테고리 변경", fontWeight = FontWeight.SemiBold, color = TextPrimary,
                modifier = Modifier.padding(start = 20.dp, top = 4.dp, bottom = 8.dp))
            categories.forEach { cat ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            viewModel.changeCategory(cat.name)
                            showCategorySheet = false
                        }
                        .padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        Modifier
                            .width(10.dp).height(10.dp)
                            .background(getCategoryColor(cat.name).dot, RoundedCornerShape(50))
                    )
                    Spacer(Modifier.width(10.dp))
                    Text(
                        cat.name,
                        color = if (cat.name == state.category) Pine else TextPrimary,
                        fontWeight = if (cat.name == state.category) FontWeight.SemiBold else FontWeight.Normal
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
        }
    }

    // 줄 액션 시트 (길게 누르기)
    val actionId = actionSheetThoughtId
    if (actionId != null) {
        val thought = state.thoughts.firstOrNull { it.id == actionId }
        ModalBottomSheet(onDismissRequest = { actionSheetThoughtId = null }, containerColor = Surface) {
            Column(modifier = Modifier.padding(bottom = 16.dp)) {
                ActionItem(if (thought?.type == ThoughtType.CHECK) "코멘트로 전환" else "체크로 전환") {
                    if (thought != null) {
                        val newT = if (thought.type == ThoughtType.CHECK) ThoughtType.COMMENT else ThoughtType.CHECK
                        viewModel.setType(actionId, newT)
                    }
                    actionSheetThoughtId = null
                }
                ActionItem("들여쓰기 →") { viewModel.indent(actionId); actionSheetThoughtId = null }
                ActionItem("내어쓰기 ←") { viewModel.outdent(actionId); actionSheetThoughtId = null }
                ActionItem("삭제", danger = true) {
                    viewModel.deleteThought(actionId)
                    actionSheetThoughtId = null
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    topPadding: androidx.compose.ui.unit.Dp = 8.dp
) {
    Text(
        text = title,
        color = TextPrimary,
        fontSize = 16.sp,
        fontWeight = FontWeight.Bold,
        textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline,
        modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = topPadding, bottom = 6.dp)
    )
}

/** 한 줄 입력을 링크/메모로 변환. URL이면 LINK, 아니면 메모(DOC). */
private fun buildMaterial(input: String): Material? {
    val t = input.trim()
    if (t.isBlank()) return null
    val looksUrl = t.startsWith("http://") || t.startsWith("https://") ||
        android.util.Patterns.WEB_URL.matcher(t).matches()
    return if (looksUrl) {
        val url = if (t.startsWith("http://") || t.startsWith("https://")) t else "https://$t"
        Material(kind = MaterialKind.LINK, title = t, url = url)
    } else {
        Material(kind = MaterialKind.DOC, title = t)
    }
}

@Composable
private fun ActionItem(label: String, danger: Boolean = false, onClick: () -> Unit) {
    Text(
        text = label,
        color = if (danger) androidx.compose.ui.graphics.Color(0xFFB3261E) else TextPrimary,
        fontSize = 15.sp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 24.dp, vertical = 14.dp)
    )
}

@Composable
private fun InputBar(
    type: ThoughtType,
    editingLine: Boolean,
    onToggleType: () -> Unit,
    onAdd: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface)
            .navigationBarsPadding()
            .imePadding()
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier.clickable(onClick = onToggleType).padding(4.dp)
        ) {
            ThoughtGlyph(type = type, done = false, size = 22.dp)
        }
        val label = when {
            editingLine && type == ThoughtType.CHECK -> "이 줄: 체크 (탭하면 코멘트)"
            editingLine && type == ThoughtType.COMMENT -> "이 줄: 코멘트 (탭하면 체크)"
            type == ThoughtType.CHECK -> "체크 줄 추가"
            else -> "코멘트 줄 추가"
        }
        Text(
            text = label,
            color = TextSecondary,
            fontSize = 14.sp,
            modifier = Modifier
                .weight(1f)
                .clickable(onClick = onAdd)
        )
        IconButton(onClick = onAdd) {
            Box(
                modifier = Modifier
                    .background(Pine, RoundedCornerShape(12.dp))
                    .padding(6.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "추가", tint = androidx.compose.ui.graphics.Color.White)
            }
        }
    }
}
