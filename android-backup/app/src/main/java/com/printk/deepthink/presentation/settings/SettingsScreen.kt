package com.printk.deepthink.presentation.settings

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudUpload
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.printk.deepthink.presentation.theme.Divider
import com.printk.deepthink.presentation.theme.Pine
import com.printk.deepthink.presentation.theme.Surface
import com.printk.deepthink.presentation.theme.TextPrimary
import com.printk.deepthink.presentation.theme.TextSecondary
import com.printk.deepthink.presentation.theme.TextTertiary
import com.printk.deepthink.presentation.theme.getCategoryColor

@Composable
fun SettingsScreen(
    innerPadding: PaddingValues,
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val gitConfig by viewModel.gitConfig.collectAsStateWithLifecycle()
    val previewLines by viewModel.previewLines.collectAsStateWithLifecycle()
    val categories by viewModel.categories.collectAsStateWithLifecycle()
    val message by viewModel.message.collectAsStateWithLifecycle()
    val busy by viewModel.busy.collectAsStateWithLifecycle()
    val syncingCategory by viewModel.syncingCategory.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(message) {
        message?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
            viewModel.consumeMessage()
        }
    }

    var url by remember(gitConfig.remoteUrl) { mutableStateOf(gitConfig.remoteUrl) }
    var username by remember(gitConfig.username) { mutableStateOf(gitConfig.username) }
    var token by remember(gitConfig.token) { mutableStateOf(gitConfig.token) }
    var newCategory by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .padding(innerPadding)
            .verticalScroll(rememberScrollState())
            .padding(20.dp)
    ) {
        Text("설정", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)

        // ── Git 동기화 ─────────────────────────────
        Spacer(Modifier.height(20.dp))
        SectionLabel("Git 동기화")
        OutlinedTextField(
            value = url,
            onValueChange = { url = it },
            label = { Text("원격 URL (https://...)") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("사용자명") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = token,
            onValueChange = { token = it },
            label = { Text("Personal Access Token") },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = { viewModel.saveGitConfig(url, username, token) },
                colors = ButtonDefaults.buttonColors(containerColor = Pine),
                enabled = !busy
            ) { Text("설정 저장") }
            OutlinedButton(onClick = { viewModel.initOrClone() }, enabled = !busy) { Text("초기화/Pull") }
            OutlinedButton(onClick = { viewModel.pull() }, enabled = !busy) { Text("Pull") }
        }
        if (busy && syncingCategory == null) {
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(modifier = Modifier.width(16.dp).height(16.dp), strokeWidth = 2.dp, color = Pine)
                Spacer(Modifier.width(8.dp))
                Text("처리 중…", color = TextTertiary, fontSize = 12.sp)
            }
        }

        // ── 표시 설정 ─────────────────────────────
        Spacer(Modifier.height(24.dp))
        SectionLabel("표시")
        Text("대시보드 미리보기 줄 수", color = TextSecondary, fontSize = 13.sp)
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(3 to "3줄", 2 to "2줄", 1 to "1줄", 0 to "끔").forEach { (value, label) ->
                FilterChip(
                    selected = previewLines == value,
                    onClick = { viewModel.setPreviewLines(value) },
                    label = { Text(label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = Pine,
                        selectedLabelColor = Color.White
                    )
                )
            }
        }

        // ── 카테고리 관리 + 동기화 ─────────────────
        Spacer(Modifier.height(24.dp))
        SectionLabel("카테고리")
        categories.forEach { cat ->
            CategoryRow(
                name = cat.name,
                syncing = syncingCategory == cat.name,
                enabled = !busy,
                onSync = { viewModel.syncCategory(cat.name) },
                onDelete = { viewModel.deleteCategory(cat.name) }
            )
            Spacer(Modifier.height(8.dp))
        }
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            OutlinedTextField(
                value = newCategory,
                onValueChange = { newCategory = it },
                label = { Text("새 카테고리") },
                singleLine = true,
                modifier = Modifier.weight(1f)
            )
            Spacer(Modifier.width(8.dp))
            Button(
                onClick = { viewModel.addCategory(newCategory); newCategory = "" },
                colors = ButtonDefaults.buttonColors(containerColor = Pine)
            ) { Text("추가") }
        }
        Spacer(Modifier.height(40.dp))
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        color = TextTertiary,
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(bottom = 10.dp)
    )
}

@Composable
private fun CategoryRow(
    name: String,
    syncing: Boolean,
    enabled: Boolean,
    onSync: () -> Unit,
    onDelete: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            Modifier
                .width(10.dp).height(10.dp)
                .padding(0.dp)
        ) {
            Box(
                Modifier
                    .fillMaxWidth().height(10.dp)
                    .background(getCategoryColor(name).dot, RoundedCornerShape(50))
            )
        }
        Spacer(Modifier.width(12.dp))
        Text(name, color = TextPrimary, fontSize = 15.sp, modifier = Modifier.weight(1f))

        if (syncing) {
            CircularProgressIndicator(modifier = Modifier.width(18.dp).height(18.dp), strokeWidth = 2.dp, color = Pine)
            Spacer(Modifier.width(12.dp))
        } else {
            OutlinedButton(
                onClick = onSync,
                enabled = enabled,
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
            ) {
                Icon(Icons.Default.CloudUpload, contentDescription = null, modifier = Modifier.width(16.dp).height(16.dp), tint = Pine)
                Spacer(Modifier.width(6.dp))
                Text("Sync", color = Pine, fontSize = 13.sp)
            }
        }
        IconButton(onClick = onDelete, enabled = enabled) {
            Icon(Icons.Default.Delete, contentDescription = "삭제", tint = TextTertiary)
        }
    }
}
