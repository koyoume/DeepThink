package com.printk.deepthink.presentation.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.printk.deepthink.domain.model.Category
import com.printk.deepthink.domain.model.MAX_THOUGHT_LEVEL
import com.printk.deepthink.domain.model.Material
import com.printk.deepthink.domain.model.Thought
import com.printk.deepthink.domain.model.ThoughtType
import com.printk.deepthink.domain.model.Topic
import com.printk.deepthink.domain.repository.TopicRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DetailState(
    val loaded: Boolean = false,
    val exists: Boolean = true,
    val category: String = "",
    val title: String = "",
    val materials: List<Material> = emptyList(),
    val thoughts: List<Thought> = emptyList()
)

@HiltViewModel
class TopicDetailViewModel @Inject constructor(
    private val repository: TopicRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val topicId: String = checkNotNull(savedStateHandle["topicId"])

    private val _state = MutableStateFlow(DetailState())
    val state: StateFlow<DetailState> = _state.asStateFlow()

    /** 입력바에서 새 줄 추가 시 기본 타입 */
    private val _newType = MutableStateFlow(ThoughtType.CHECK)
    val newType: StateFlow<ThoughtType> = _newType.asStateFlow()

    /** 현재 인라인 편집 중(포커스)인 생각 줄 id */
    private val _focusedId = MutableStateFlow<String?>(null)
    val focusedId: StateFlow<String?> = _focusedId.asStateFlow()

    val categories: StateFlow<List<Category>> = repository.categories

    fun setFocused(id: String) { _focusedId.value = id }
    fun clearFocused(id: String) { if (_focusedId.value == id) _focusedId.value = null }

    private var saveJob: Job? = null

    init {
        viewModelScope.launch {
            val topic = repository.topic(topicId).filterNotNull().first()
            _state.value = DetailState(
                loaded = true,
                exists = true,
                category = topic.category,
                title = topic.title,
                materials = topic.materials,
                thoughts = topic.thoughts
            )
        }
    }

    private fun update(transform: (DetailState) -> DetailState) {
        _state.value = transform(_state.value)
        scheduleSave()
    }

    private fun scheduleSave() {
        saveJob?.cancel()
        saveJob = viewModelScope.launch {
            delay(400)
            persist()
        }
    }

    private suspend fun persist() {
        val s = _state.value
        if (!s.loaded) return
        repository.updateTopic(
            Topic(
                id = topicId,
                category = s.category,
                title = s.title,
                materials = s.materials,
                thoughts = s.thoughts
            )
        )
    }

    fun toggleNewType() {
        _newType.value = if (_newType.value == ThoughtType.CHECK) ThoughtType.COMMENT else ThoughtType.CHECK
    }

    /**
     * 입력바 타입 토글.
     * 편집 중인 줄이 있으면 그 줄의 타입을 바꾸고, 없으면 새 줄 기본 타입만 바꾼다.
     * (요구사항: 체크/코멘트 선택이 현재 작성 중인 줄에 반영)
     */
    fun toggleType() {
        val focused = _focusedId.value
        val target = if (focused != null) {
            _state.value.thoughts.firstOrNull { it.id == focused }?.type
        } else null
        val next = if ((target ?: _newType.value) == ThoughtType.CHECK) ThoughtType.COMMENT else ThoughtType.CHECK
        _newType.value = next
        if (focused != null) setType(focused, next)
    }

    fun setTitle(title: String) = update { it.copy(title = title) }

    fun setText(id: String, text: String) = update { s ->
        s.copy(thoughts = s.thoughts.map { if (it.id == id) it.copy(text = text) else it })
    }

    fun toggleDone(id: String) = update { s ->
        s.copy(thoughts = s.thoughts.map {
            if (it.id == id && it.type == ThoughtType.CHECK) it.copy(done = !it.done) else it
        })
    }

    fun setType(id: String, type: ThoughtType) = update { s ->
        s.copy(thoughts = s.thoughts.map {
            if (it.id == id) it.copy(type = type, done = if (type == ThoughtType.COMMENT) false else it.done) else it
        })
    }

    /** id 줄 바로 아래에 같은 레벨·타입 새 줄 삽입. 새 줄 id 반환 */
    fun addAfter(id: String): String? {
        val s = _state.value
        val idx = s.thoughts.indexOfFirst { it.id == id }
        if (idx < 0) return null
        val cur = s.thoughts[idx]
        val newThought = Thought(type = cur.type, level = cur.level, text = "")
        val newList = s.thoughts.toMutableList().apply { add(idx + 1, newThought) }
        update { it.copy(thoughts = newList) }
        return newThought.id
    }

    /** 입력바: 맨 아래 level0 새 줄 추가. 새 줄 id 반환 */
    fun addAtEnd(): String {
        val newThought = Thought(type = _newType.value, level = 0, text = "")
        update { it.copy(thoughts = it.thoughts + newThought) }
        return newThought.id
    }

    /** 빈 줄 삭제 후 포커스 옮길 이전 줄 id 반환 */
    fun deleteThought(id: String): String? {
        val s = _state.value
        val idx = s.thoughts.indexOfFirst { it.id == id }
        if (idx < 0) return null
        val prevId = if (idx > 0) s.thoughts[idx - 1].id else null
        update { it.copy(thoughts = it.thoughts.filterNot { t -> t.id == id }) }
        return prevId
    }

    fun indent(id: String) = shiftLevel(id, +1)
    fun outdent(id: String) = shiftLevel(id, -1)

    private fun shiftLevel(id: String, delta: Int) = update { s ->
        val idx = s.thoughts.indexOfFirst { it.id == id }
        if (idx < 0) return@update s
        val cur = s.thoughts[idx]
        // 들여쓰기 상한: 바로 위 줄 레벨 + 1
        val prevLevel = if (idx > 0) s.thoughts[idx - 1].level else -1
        val maxAllowed = if (delta > 0) minOf(prevLevel + 1, MAX_THOUGHT_LEVEL) else MAX_THOUGHT_LEVEL
        val newLevel = (cur.level + delta).coerceIn(0, maxAllowed)
        if (newLevel == cur.level) return@update s
        val applied = newLevel - cur.level
        // 하위 줄(level > cur.level, 연속) 함께 이동
        val end = run {
            var e = idx + 1
            while (e < s.thoughts.size && s.thoughts[e].level > cur.level) e++
            e
        }
        val list = s.thoughts.toMutableList()
        for (i in idx until end) {
            val t = list[i]
            list[i] = t.copy(level = (t.level + applied).coerceIn(0, MAX_THOUGHT_LEVEL))
        }
        s.copy(thoughts = list)
    }

    fun changeCategory(newCategory: String) {
        update { it.copy(category = newCategory) }
        viewModelScope.launch { repository.moveTopic(topicId, newCategory) }
    }

    fun deleteTopic(onDone: () -> Unit) {
        viewModelScope.launch {
            saveJob?.cancel()
            repository.deleteTopic(topicId)
            onDone()
        }
    }

    fun addMaterial(material: Material) = update { it.copy(materials = it.materials + material) }
    fun removeMaterial(index: Int) = update { s ->
        s.copy(materials = s.materials.filterIndexed { i, _ -> i != index })
    }

    /** 화면 이탈 시 즉시 저장 */
    fun flush() {
        saveJob?.cancel()
        viewModelScope.launch { persist() }
    }
}
