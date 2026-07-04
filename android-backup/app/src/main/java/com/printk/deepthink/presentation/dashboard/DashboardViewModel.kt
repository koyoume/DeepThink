package com.printk.deepthink.presentation.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.printk.deepthink.domain.model.Category
import com.printk.deepthink.domain.model.Topic
import com.printk.deepthink.domain.repository.SettingsRepository
import com.printk.deepthink.domain.repository.TopicRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val repository: TopicRepository,
    settings: SettingsRepository
) : ViewModel() {

    val categories: StateFlow<List<Category>> = repository.categories

    private val _pickedCategory = MutableStateFlow<String?>(null)

    /** 항상 1개 선택 (없으면 첫 카테고리) */
    val selectedCategory: StateFlow<String?> =
        combine(_pickedCategory, categories) { picked, cats ->
            picked?.takeIf { name -> cats.any { it.name == name } } ?: cats.firstOrNull()?.name
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val topics: StateFlow<List<Topic>> =
        combine(repository.topics, selectedCategory) { all, cat ->
            if (cat == null) emptyList() else all.filter { it.category == cat }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _previewOverride = MutableStateFlow<Int?>(null)

    /** 미리보기 줄 수: 뷰옵션 임시값 우선, 없으면 설정값 */
    val previewLines: StateFlow<Int> =
        combine(settings.previewLines, _previewOverride) { setting, override ->
            override ?: setting
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 2)

    fun selectCategory(name: String) {
        _pickedCategory.value = name
    }

    /** 3 → 2 → 1 → 0(끔) → 3 순환 */
    fun cyclePreviewLines() {
        val current = previewLines.value
        _previewOverride.value = if (current <= 0) 3 else current - 1
    }

    /** 현재 선택 카테고리에 빈 주제 생성 후 id 반환 (상세로 이동) */
    suspend fun addTopic(): String? {
        val cat = selectedCategory.value ?: return null
        return repository.createTopic(cat, "")
    }
}
