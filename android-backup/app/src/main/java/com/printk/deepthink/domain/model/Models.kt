package com.printk.deepthink.domain.model

import java.util.UUID

/** 생각 줄 유형: 체크리스트 / 코멘트 */
enum class ThoughtType { CHECK, COMMENT }

/** 관련 자료 유형: 링크 / 문서 */
enum class MaterialKind { LINK, DOC }

/** 들여쓰기 최대 깊이 (UI-DESIGN: 4단계) */
const val MAX_THOUGHT_LEVEL = 4

/**
 * 한 줄 단위 생각.
 * @param level 들여쓰기 레벨 (0 = 최상위)
 * @param done  CHECK 타입에서만 의미
 */
data class Thought(
    val id: String = UUID.randomUUID().toString(),
    val type: ThoughtType = ThoughtType.CHECK,
    val level: Int = 0,
    val text: String = "",
    val done: Boolean = false
)

/** 주제에 딸린 관련 자료 (선택) */
data class Material(
    val kind: MaterialKind,
    val title: String,
    val sub: String = "",
    val url: String = ""
)

/**
 * 핵심 단위. 하나의 카테고리에 속하며 제목 + 관련자료 + 여러 줄 생각으로 구성.
 * @param id unique id (요구사항 4)
 */
data class Topic(
    val id: String = UUID.randomUUID().toString(),
    val category: String,
    val title: String = "",
    val materials: List<Material> = emptyList(),
    val thoughts: List<Thought> = emptyList()
)

/** 카테고리 = vault 안의 md 파일 1개 */
data class Category(
    val name: String,
    val order: Int = 0
)
