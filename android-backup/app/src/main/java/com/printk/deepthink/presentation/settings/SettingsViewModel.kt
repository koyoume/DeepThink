package com.printk.deepthink.presentation.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.printk.deepthink.domain.model.Category
import com.printk.deepthink.domain.repository.GitConfig
import com.printk.deepthink.domain.repository.GitSyncRepository
import com.printk.deepthink.domain.repository.SettingsRepository
import com.printk.deepthink.domain.repository.SyncResult
import com.printk.deepthink.domain.repository.TopicRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val settings: SettingsRepository,
    private val gitSync: GitSyncRepository,
    private val topicRepository: TopicRepository
) : ViewModel() {

    val gitConfig: StateFlow<GitConfig> =
        settings.gitConfigFlow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), GitConfig())

    val previewLines: StateFlow<Int> =
        settings.previewLines.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 2)

    val categories: StateFlow<List<Category>> = topicRepository.categories

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()

    /** 현재 동기화 중인 카테고리 이름 (UI 진행 표시) */
    private val _syncingCategory = MutableStateFlow<String?>(null)
    val syncingCategory: StateFlow<String?> = _syncingCategory.asStateFlow()

    fun consumeMessage() { _message.value = null }

    fun saveGitConfig(remoteUrl: String, username: String, token: String) {
        viewModelScope.launch {
            val current = gitConfig.value
            settings.setGitConfig(
                current.copy(remoteUrl = remoteUrl.trim(), username = username.trim(), token = token.trim())
            )
            _message.value = "Git 설정을 저장했습니다."
        }
    }

    fun setPreviewLines(value: Int) {
        viewModelScope.launch { settings.setPreviewLines(value) }
    }

    fun initOrClone() {
        run("저장소 초기화") { gitSync.initOrClone() }
    }

    fun pull() {
        run("Pull") { gitSync.pull() }
    }

    fun syncCategory(name: String) {
        viewModelScope.launch {
            _busy.value = true
            _syncingCategory.value = name
            _message.value = when (val r = gitSync.syncCategory(name)) {
                is SyncResult.Success -> "[$name] ${r.message}"
                is SyncResult.Error -> "[$name] 오류: ${r.message}"
            }
            _syncingCategory.value = null
            _busy.value = false
        }
    }

    private fun run(label: String, block: suspend () -> SyncResult) {
        viewModelScope.launch {
            _busy.value = true
            _message.value = when (val r = block()) {
                is SyncResult.Success -> "$label: ${r.message}"
                is SyncResult.Error -> "$label 오류: ${r.message}"
            }
            _busy.value = false
        }
    }

    fun addCategory(name: String) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            topicRepository.addCategory(trimmed)
            _message.value = "카테고리 추가: $trimmed"
        }
    }

    fun renameCategory(oldName: String, newName: String) {
        val trimmed = newName.trim()
        if (trimmed.isEmpty() || trimmed == oldName) return
        viewModelScope.launch {
            topicRepository.renameCategory(oldName, trimmed)
            _message.value = "이름 변경: $oldName → $trimmed"
        }
    }

    fun deleteCategory(name: String) {
        viewModelScope.launch {
            topicRepository.deleteCategory(name)
            _message.value = "카테고리 삭제: $name"
        }
    }
}
