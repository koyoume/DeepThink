package com.printk.deepthink.data.vault

import com.printk.deepthink.di.ApplicationScope
import com.printk.deepthink.di.IoDispatcher
import com.printk.deepthink.domain.model.Category
import com.printk.deepthink.domain.model.Topic
import com.printk.deepthink.domain.repository.TopicRepository
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import com.printk.deepthink.domain.model.Thought
import com.printk.deepthink.domain.model.ThoughtType
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TopicRepositoryImpl @Inject constructor(
    private val store: VaultFileStore,
    @ApplicationScope appScope: CoroutineScope,
    @IoDispatcher private val io: CoroutineDispatcher
) : TopicRepository {

    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    override val categories: StateFlow<List<Category>> = _categories.asStateFlow()

    private val _topics = MutableStateFlow<List<Topic>>(emptyList())
    override val topics: StateFlow<List<Topic>> = _topics.asStateFlow()

    private val mutex = Mutex()

    init {
        appScope.launch { load(seedIfEmpty = true) }
    }

    private suspend fun load(seedIfEmpty: Boolean) = withContext(io) {
        store.ensureDirs()
        store.migrateLegacyRootFiles()   // 예전 루트 저장분을 DeepThink/ 로 이전 (우리 파일만)
        if (seedIfEmpty && store.isEmpty()) seed()
        val parsed = store.readAll()
        val cats = parsed.mapIndexed { i, c -> Category(c.name, i) }
        val allTopics = parsed.flatMap { it.topics }
        _categories.value = cats
        _topics.value = allTopics
        // order meta가 비었으면 현재 순서로 기록
        if (store.readOrder().isEmpty() && cats.isNotEmpty()) store.writeOrder(cats.map { it.name })
    }

    override suspend fun reload() = load(seedIfEmpty = false)

    override fun topicsIn(category: String): Flow<List<Topic>> =
        topics.map { list -> list.filter { it.category == category } }

    override fun topic(id: String): Flow<Topic?> =
        topics.map { list -> list.firstOrNull { it.id == id } }

    override suspend fun createTopic(category: String, title: String): String = mutate {
        val topic = Topic(category = category, title = title)
        _topics.value = _topics.value + topic
        persist(category)
        topic.id
    }

    override suspend fun updateTopic(topic: Topic) {
        mutate {
            _topics.value = _topics.value.map { if (it.id == topic.id) topic else it }
            persist(topic.category)
        }
    }

    override suspend fun deleteTopic(id: String) {
        mutate {
            val target = _topics.value.firstOrNull { it.id == id } ?: return@mutate
            _topics.value = _topics.value.filterNot { it.id == id }
            persist(target.category)
        }
    }

    override suspend fun moveTopic(id: String, newCategory: String) {
        mutate {
            val target = _topics.value.firstOrNull { it.id == id } ?: return@mutate
            val old = target.category
            if (old == newCategory) return@mutate
            _topics.value = _topics.value.map { if (it.id == id) it.copy(category = newCategory) else it }
            persist(old)
            persist(newCategory)
        }
    }

    override suspend fun addCategory(name: String) {
        mutate {
            if (_categories.value.any { it.name == name }) return@mutate
            _categories.value = _categories.value + Category(name, _categories.value.size)
            withContext(io) {
                store.writeCategory(name, emptyList())
                store.writeOrder(_categories.value.map { it.name })
            }
        }
    }

    override suspend fun renameCategory(oldName: String, newName: String) {
        mutate {
            if (oldName == newName || _categories.value.none { it.name == oldName }) return@mutate
            _categories.value = _categories.value.map { if (it.name == oldName) it.copy(name = newName) else it }
            _topics.value = _topics.value.map { if (it.category == oldName) it.copy(category = newName) else it }
            withContext(io) {
                store.deleteCategoryFile(oldName)
                persist(newName)
                store.writeOrder(_categories.value.map { it.name })
            }
        }
    }

    override suspend fun deleteCategory(name: String) {
        mutate {
            _categories.value = _categories.value.filterNot { it.name == name }
            _topics.value = _topics.value.filterNot { it.category == name }
            withContext(io) {
                store.deleteCategoryFile(name)
                store.writeOrder(_categories.value.map { it.name })
            }
        }
    }

    private suspend fun persist(category: String) = withContext(io) {
        val topicsForCat = _topics.value.filter { it.category == category }
        store.writeCategory(category, topicsForCat)
    }

    private suspend fun <T> mutate(block: suspend () -> T): T = mutex.withLock { block() }

    private fun seed() {
        val now = SAMPLES
        now.forEach { (cat, topics) -> store.writeCategory(cat, topics) }
        store.writeOrder(now.map { it.first })
    }

    companion object {
        // UI-DESIGN 샘플 카테고리 + 간단한 시드 주제
        private val SAMPLES: List<Pair<String, List<Topic>>> = listOf(
            "제품 기획" to listOf(
                Topic(
                    category = "제품 기획",
                    title = "DeepThink 온보딩 흐름",
                    thoughts = listOf(
                        Thought(text = "첫 실행 시 카테고리 안내", done = true),
                        Thought(text = "git 설정은 나중에 유도"),
                        Thought(type = ThoughtType.COMMENT, level = 1, text = "토큰 입력 마찰 줄이기")
                    )
                ),
                Topic(category = "제품 기획", title = "대시보드 카드 밀도")
            ),
            "독서" to listOf(
                Topic(
                    category = "독서",
                    title = "사색적 글쓰기",
                    thoughts = listOf(
                        Thought(type = ThoughtType.COMMENT, text = "한 줄 단위로 생각을 쌓는다")
                    )
                )
            ),
            "투자" to emptyList(),
            "학습" to emptyList(),
            "일상" to emptyList(),
            "사이드 프로젝트" to emptyList()
        )
    }
}
