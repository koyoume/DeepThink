package com.printk.deepthink.data.vault

import com.printk.deepthink.domain.model.Material
import com.printk.deepthink.domain.model.MaterialKind
import com.printk.deepthink.domain.model.Thought
import com.printk.deepthink.domain.model.ThoughtType
import com.printk.deepthink.domain.model.Topic
import org.junit.Assert.assertEquals
import org.junit.Test

class MarkdownCodecTest {

    /** Thought id는 런타임 전용(영속 안 함) → 비교 시 정규화 */
    private fun normalize(t: Topic): Topic = t.copy(
        thoughts = t.thoughts.map { it.copy(id = "x") }
    )

    private fun roundTrip(category: String, topics: List<Topic>) {
        val md = MarkdownSerializer.serialize(category, topics)
        val parsed = MarkdownParser.parse(md)
        assertEquals(category, parsed.name)
        assertEquals(topics.map { normalize(it) }, parsed.topics.map { normalize(it) })
    }

    @Test
    fun basicTopicsRoundTrip() {
        roundTrip(
            "제품 기획",
            listOf(
                Topic(
                    id = "id-1",
                    category = "제품 기획",
                    title = "온보딩 흐름",
                    thoughts = listOf(
                        Thought(type = ThoughtType.CHECK, level = 0, text = "카테고리 안내", done = true),
                        Thought(type = ThoughtType.CHECK, level = 0, text = "git 설정 유도", done = false),
                        Thought(type = ThoughtType.COMMENT, level = 1, text = "토큰 마찰 줄이기")
                    )
                ),
                Topic(id = "id-2", category = "제품 기획", title = "카드 밀도")
            )
        )
    }

    @Test
    fun materialsRoundTrip() {
        roundTrip(
            "독서",
            listOf(
                Topic(
                    id = "id-3",
                    category = "독서",
                    title = "사색적 글쓰기",
                    materials = listOf(
                        Material(MaterialKind.LINK, "Paul Graham 에세이", "paulgraham.com", "http://paulgraham.com/essay.html"),
                        Material(MaterialKind.DOC, "독서 노트", "로컬")
                    ),
                    thoughts = listOf(Thought(type = ThoughtType.COMMENT, text = "한 줄 단위로 쌓기"))
                )
            )
        )
    }

    @Test
    fun deepIndentAndEmptySections() {
        roundTrip(
            "학습",
            listOf(
                Topic(
                    id = "id-4",
                    category = "학습",
                    title = "깊은 들여쓰기",
                    thoughts = listOf(
                        Thought(level = 0, text = "L0"),
                        Thought(level = 1, text = "L1"),
                        Thought(level = 2, text = "L2"),
                        Thought(level = 3, text = "L3", done = true)
                    )
                ),
                Topic(id = "id-5", category = "학습", title = "빈 주제")
            )
        )
    }

    @Test
    fun specialCharsInTitle() {
        roundTrip(
            "일상",
            listOf(
                Topic(id = "id-6", category = "일상", title = "제목에 — 대시와 \"따옴표\" 포함", thoughts = emptyList())
            )
        )
    }
}
