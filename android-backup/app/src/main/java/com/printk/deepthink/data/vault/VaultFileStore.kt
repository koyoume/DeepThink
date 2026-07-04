package com.printk.deepthink.data.vault

import com.printk.deepthink.domain.model.Topic
import org.json.JSONArray
import java.io.File

/**
 * 저장소 레이아웃 (요구: repo의 다른 폴더/파일에 영향 주지 않기)
 *
 *   <repoDir>/                 ← git working tree (= .git 위치, 원격이 clone 되는 곳)
 *     DeepThink/               ← DeepThink 데이터는 이 하위 폴더에만 격리 저장
 *       <카테고리>.md          ← 카테고리 1개 = md 1개
 *       .deepthink/
 *         categories.json      ← 카테고리 순서(로컬)
 *
 * git add/commit/push 는 항상 `DeepThink/<카테고리>.md` 경로 하나만 대상으로 하므로
 * repo 루트나 다른 폴더의 파일은 절대 건드리지 않는다.
 */
class VaultFileStore(val repoDir: File) {

    /** DeepThink 데이터 전용 하위 폴더 */
    val dataDir: File get() = File(repoDir, DATA_SUBDIR)
    private val metaDir: File get() = File(dataDir, META_DIR)
    private val orderFile: File get() = File(metaDir, "categories.json")

    fun ensureDirs() {
        if (!repoDir.exists()) repoDir.mkdirs()
        if (!dataDir.exists()) dataDir.mkdirs()
        if (!metaDir.exists()) metaDir.mkdirs()
    }

    /**
     * 예전 레이아웃(repo 루트에 저장한 우리 카테고리 md)을 DeepThink/ 로 이전.
     * **우리 앱 포맷 파일만** 선별 이동한다(= topic 마커 포함 또는 옛 categories.json에 등록된 이름).
     * WORKFLOW.md 등 사용자의 무관한 파일은 절대 건드리지 않는다.
     * 이동된 카테고리명 목록을 반환(원격의 옛 루트 사본 정리에 사용).
     */
    fun migrateLegacyRootFiles(): List<String> {
        ensureDirs()
        val moved = mutableListOf<String>()
        val oldMeta = File(repoDir, META_DIR)
        val knownNames: Set<String> = runCatching {
            val f = File(oldMeta, "categories.json")
            if (f.exists()) {
                val arr = JSONArray(f.readText())
                (0 until arr.length()).map { arr.getString(it) }.toSet()
            } else emptySet()
        }.getOrDefault(emptySet())

        val rootMd = repoDir.listFiles { f -> f.isFile && f.name.endsWith(".md") } ?: emptyArray()
        rootMd.forEach { f ->
            val text = runCatching { f.readText() }.getOrDefault("")
            val parsedName = MarkdownParser.parse(text).name
            val isOurs = text.contains(OUR_MARKER) || (parsedName.isNotBlank() && knownNames.contains(parsedName))
            if (isOurs) {
                val dest = File(dataDir, f.name)
                if (!dest.exists()) f.copyTo(dest, overwrite = false)
                f.delete()
                if (parsedName.isNotBlank()) moved += parsedName
            }
        }

        // 옛 루트 메타(.deepthink)를 DeepThink/.deepthink 로 이전
        if (oldMeta.exists() && oldMeta.isDirectory) {
            oldMeta.listFiles()?.forEach { m ->
                m.copyTo(File(metaDir, m.name), overwrite = true)
                m.delete()
            }
            oldMeta.delete()
        }
        return moved
    }

    /** 옛 레이아웃에서 이 카테고리의 루트 파일 (git 정리용). repo 루트 기준 상대 경로. */
    fun legacyRelativePath(name: String): String = slug(name) + ".md"

    /** repo에 실제로 루트 사본이 존재/추적되었는지 판단할 때 사용 */
    fun legacyRootFile(name: String): File = File(repoDir, slug(name) + ".md")

    fun isEmpty(): Boolean = listMarkdownFiles().isEmpty()

    fun listMarkdownFiles(): List<File> =
        dataDir.listFiles { f -> f.isFile && f.name.endsWith(".md") }?.sortedBy { it.name } ?: emptyList()

    /** 모든 카테고리 파일을 파싱해 순서대로 반환 */
    fun readAll(): List<ParsedCategory> {
        val parsed = listMarkdownFiles().map { MarkdownParser.parse(it.readText()) }
            .filter { it.name.isNotBlank() }
        val order = readOrder()
        return parsed.sortedBy { c ->
            val i = order.indexOf(c.name)
            if (i >= 0) i else Int.MAX_VALUE
        }
    }

    fun writeCategory(name: String, topics: List<Topic>) {
        ensureDirs()
        categoryFile(name).writeText(MarkdownSerializer.serialize(name, topics))
    }

    fun deleteCategoryFile(name: String) {
        categoryFile(name).takeIf { it.exists() }?.delete()
    }

    /** 카테고리 파일 경로 (DeepThink/ 하위) */
    fun categoryFile(name: String): File = File(dataDir, slug(name) + ".md")

    /** git add/commit 용 상대 경로 (repo 루트 기준) → 예: "DeepThink/제품 기획.md" */
    fun relativePath(file: File): String = file.relativeTo(repoDir).path

    // ---- order meta ----

    fun readOrder(): List<String> {
        if (!orderFile.exists()) return emptyList()
        return runCatching {
            val arr = JSONArray(orderFile.readText())
            (0 until arr.length()).map { arr.getString(it) }
        }.getOrDefault(emptyList())
    }

    fun writeOrder(names: List<String>) {
        ensureDirs()
        val arr = JSONArray()
        names.forEach { arr.put(it) }
        orderFile.writeText(arr.toString(2))
    }

    private fun slug(name: String): String =
        name.trim().replace(Regex("[/\\\\:*?\"<>|]"), "_").ifBlank { "untitled" }

    companion object {
        const val DATA_SUBDIR = "DeepThink"
        private const val META_DIR = ".deepthink"
        private const val OUR_MARKER = "<!-- topic:"
    }
}
