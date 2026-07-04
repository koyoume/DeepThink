package com.printk.deepthink.data.vault

import com.printk.deepthink.domain.model.Material
import com.printk.deepthink.domain.model.MaterialKind
import com.printk.deepthink.domain.model.Thought
import com.printk.deepthink.domain.model.ThoughtType
import com.printk.deepthink.domain.model.Topic

/**
 * 카테고리 1개(= md 파일 1개) <-> Topic 목록 직렬화/파싱.
 *
 * 형식 (UI-DESIGN 데이터 모델 기반, round-trip 보장):
 *
 *   # <카테고리>
 *
 *   <!-- topic: <uuid> -->
 *   ## <제목>
 *
 *   ### 관련 자료
 *   - [link](url) "title" — sub
 *   - [doc] "title" — sub
 *
 *   ### 생각
 *   - [ ] 미완료 체크 (level0)
 *   - [x] 완료 체크
 *     - [ ] 하위 체크 (들여쓰기 2칸 = level+1)
 *   - 코멘트 한 줄
 */
data class ParsedCategory(val name: String, val topics: List<Topic>)

private const val INDENT = "  " // 레벨당 2칸
private const val TOPIC_MARKER = "<!-- topic:"
private const val SEC_MATERIALS = "### 관련 자료"
private const val SEC_THOUGHTS = "### 생각"

object MarkdownSerializer {

    fun serialize(category: String, topics: List<Topic>): String = buildString {
        append("# ").append(category).append("\n")
        for (topic in topics) {
            append("\n")
            append(TOPIC_MARKER).append(' ').append(topic.id).append(" -->\n")
            append("## ").append(topic.title).append("\n")

            if (topic.materials.isNotEmpty()) {
                append("\n").append(SEC_MATERIALS).append("\n")
                for (m in topic.materials) {
                    append(serializeMaterial(m)).append("\n")
                }
            }

            if (topic.thoughts.isNotEmpty()) {
                append("\n").append(SEC_THOUGHTS).append("\n")
                for (t in topic.thoughts) {
                    append(serializeThought(t)).append("\n")
                }
            }
        }
    }

    private fun serializeMaterial(m: Material): String {
        val head = when (m.kind) {
            MaterialKind.LINK -> "- [link](${m.url})"
            MaterialKind.DOC -> "- [doc]"
        }
        val titlePart = " \"${m.title}\""
        val subPart = if (m.sub.isNotBlank()) " — ${m.sub}" else ""
        return head + titlePart + subPart
    }

    private fun serializeThought(t: Thought): String {
        val indent = INDENT.repeat(t.level.coerceAtLeast(0))
        return when (t.type) {
            ThoughtType.CHECK -> {
                val box = if (t.done) "[x]" else "[ ]"
                "$indent- $box ${t.text}".trimEnd()
            }
            ThoughtType.COMMENT -> "$indent- ${t.text}".trimEnd()
        }
    }
}

object MarkdownParser {

    fun parse(markdown: String): ParsedCategory {
        val lines = markdown.replace("\r\n", "\n").split("\n")
        var name = ""
        val topics = mutableListOf<Topic>()

        var pendingId: String? = null
        var curTitle: String? = null
        var curMaterials = mutableListOf<Material>()
        var curThoughts = mutableListOf<Thought>()
        var section = Section.NONE

        fun flush() {
            if (curTitle != null || pendingId != null) {
                topics.add(
                    Topic(
                        id = pendingId ?: java.util.UUID.randomUUID().toString(),
                        category = name,
                        title = curTitle ?: "",
                        materials = curMaterials.toList(),
                        thoughts = curThoughts.toList()
                    )
                )
            }
            pendingId = null
            curTitle = null
            curMaterials = mutableListOf()
            curThoughts = mutableListOf()
            section = Section.NONE
        }

        for (raw in lines) {
            val line = raw
            val trimmedStart = line.trimStart()
            when {
                line.startsWith("# ") && name.isEmpty() && !line.startsWith("## ") -> {
                    name = line.removePrefix("# ").trim()
                }
                trimmedStart.startsWith(TOPIC_MARKER) -> {
                    flush()
                    pendingId = trimmedStart
                        .removePrefix(TOPIC_MARKER)
                        .removeSuffix("-->")
                        .trim()
                }
                line.startsWith("## ") -> {
                    curTitle = line.removePrefix("## ")
                    section = Section.NONE
                }
                line.trim() == SEC_MATERIALS -> section = Section.MATERIALS
                line.trim() == SEC_THOUGHTS -> section = Section.THOUGHTS
                line.isBlank() -> { /* skip blank separators */ }
                section == Section.MATERIALS && trimmedStart.startsWith("- ") -> {
                    parseMaterial(trimmedStart)?.let { curMaterials.add(it) }
                }
                section == Section.THOUGHTS && trimmedStart.startsWith("- ") -> {
                    curThoughts.add(parseThought(line))
                }
                else -> { /* ignore unknown lines */ }
            }
        }
        flush()
        return ParsedCategory(name, topics)
    }

    private enum class Section { NONE, MATERIALS, THOUGHTS }

    private fun parseMaterial(line: String): Material? {
        // line starts with "- "
        val body = line.removePrefix("- ").trim()

        val kind: MaterialKind
        var url = ""
        val afterKind: String
        when {
            body.startsWith("[link]") -> {
                kind = MaterialKind.LINK
                var rest = body.removePrefix("[link]")
                if (rest.startsWith("(")) {
                    val end = rest.indexOf(')')
                    if (end >= 0) {
                        url = rest.substring(1, end)
                        rest = rest.substring(end + 1)
                    }
                }
                afterKind = rest.trim()
            }
            body.startsWith("[doc]") -> {
                kind = MaterialKind.DOC
                afterKind = body.removePrefix("[doc]").trim()
            }
            else -> return null
        }

        // afterKind: "title" — sub   (title in quotes; sub optional)
        var title: String
        var sub = ""
        val q1 = afterKind.indexOf('"')
        val q2 = afterKind.lastIndexOf('"')
        if (q1 >= 0 && q2 > q1) {
            title = afterKind.substring(q1 + 1, q2)
            val tail = afterKind.substring(q2 + 1)
            val dash = tail.indexOf('—')
            if (dash >= 0) sub = tail.substring(dash + 1).trim()
        } else {
            title = afterKind.trim()
        }
        return Material(kind = kind, title = title, sub = sub, url = url)
    }

    private fun parseThought(rawLine: String): Thought {
        val leadingSpaces = rawLine.takeWhile { it == ' ' }.length
        val level = (leadingSpaces / 2).coerceIn(0, com.printk.deepthink.domain.model.MAX_THOUGHT_LEVEL)
        val content = rawLine.trimStart().removePrefix("- ")
        return when {
            content.startsWith("[ ]") ->
                Thought(type = ThoughtType.CHECK, level = level, done = false, text = content.removePrefix("[ ]").trimStart())
            content.startsWith("[x]") || content.startsWith("[X]") ->
                Thought(type = ThoughtType.CHECK, level = level, done = true, text = content.removePrefix("[x]").removePrefix("[X]").trimStart())
            else ->
                Thought(type = ThoughtType.COMMENT, level = level, text = content)
        }
    }
}
