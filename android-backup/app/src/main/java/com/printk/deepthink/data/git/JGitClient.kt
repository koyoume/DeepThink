package com.printk.deepthink.data.git

import com.printk.deepthink.domain.repository.GitConfig
import org.eclipse.jgit.api.Git
import org.eclipse.jgit.api.MergeCommand
import org.eclipse.jgit.lib.PersonIdent
import org.eclipse.jgit.transport.RefSpec
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider
import java.io.File

/**
 * repo working tree(= .git 위치)에 대한 JGit 래퍼. HTTPS + Personal Access Token 인증.
 * add/commit/push 는 항상 `DeepThink/<카테고리>.md` 경로 하나만 대상으로 하므로
 * repo 루트나 다른 폴더의 파일은 건드리지 않는다.
 */
class JGitClient(private val repoDir: File) {

    private val branch = "main"

    fun isInitialized(): Boolean = File(repoDir, ".git").exists()

    private fun creds(config: GitConfig) =
        UsernamePasswordCredentialsProvider(
            config.username.ifBlank { "x-access-token" },
            config.token
        )

    private fun author(config: GitConfig) = PersonIdent(config.authorName, config.authorEmail)

    /** repo가 없으면 init + remote 등록. 이미 있으면 remote만 갱신. */
    fun ensureRepo(config: GitConfig) {
        if (!repoDir.exists()) repoDir.mkdirs()
        if (!isInitialized()) {
            Git.init().setDirectory(repoDir).setInitialBranch(branch).call().use { /* created */ }
        }
        Git.open(repoDir).use { git ->
            val cfg = git.repository.config
            cfg.setString("remote", "origin", "url", config.remoteUrl)
            cfg.setString("remote", "origin", "fetch", "+refs/heads/*:refs/remotes/origin/*")
            cfg.save()
        }
    }

    /** 원격에서 fetch 후 origin/main 으로 병합 (있을 때만). */
    fun pull(config: GitConfig): String {
        ensureRepo(config)
        Git.open(repoDir).use { git ->
            git.fetch()
                .setRemote("origin")
                .setCredentialsProvider(creds(config))
                .call()
            val originMain = git.repository.resolve("refs/remotes/origin/$branch")
                ?: return "원격에 $branch 브랜치가 아직 없습니다 (첫 push 필요)"
            val result = git.merge()
                .include(originMain)
                .setFastForward(MergeCommand.FastForwardMode.FF)
                .call()
            return "pull 완료: ${result.mergeStatus}"
        }
    }

    /**
     * 지정한 카테고리 파일 1개만 add → commit → push.
     * @param relativePath repo 루트 기준 경로 (예: "DeepThink/제품 기획.md")
     * @param legacyRelativePath 예전 루트 사본 경로 (예: "제품 기획.md"). 원격에서 함께 정리.
     *   두 경로 모두 우리 카테고리 파일이므로 다른 폴더/파일에는 영향 없음.
     */
    fun commitAndPushFile(
        config: GitConfig,
        relativePath: String,
        legacyRelativePath: String?,
        message: String
    ): String {
        ensureRepo(config)
        Git.open(repoDir).use { git ->
            git.add().addFilepattern(relativePath).call()

            // 옛 루트 사본이 git에 추적되어 있으면 그 삭제도 스테이징 (working file은 이미 이전됨)
            val legacyTracked = legacyRelativePath != null &&
                git.repository.resolve("HEAD:$legacyRelativePath") != null
            if (legacyTracked) {
                git.add().addFilepattern(legacyRelativePath).setUpdate(true).call()
            }

            val status = git.status().call()
            val nothingStaged = status.added.isEmpty() && status.changed.isEmpty() && status.removed.isEmpty()
            if (!nothingStaged) {
                val commit = git.commit()
                    .setOnly(relativePath)
                    .setAuthor(author(config))
                    .setCommitter(author(config))
                    .setMessage(message)
                if (legacyTracked) commit.setOnly(legacyRelativePath)
                commit.call()
            }
            val pushResults = git.push()
                .setRemote("origin")
                .setRefSpecs(RefSpec("refs/heads/$branch:refs/heads/$branch"))
                .setCredentialsProvider(creds(config))
                .call()

            val messages = StringBuilder()
            for (pr in pushResults) {
                for (rru in pr.remoteUpdates) {
                    when (rru.status) {
                        org.eclipse.jgit.transport.RemoteRefUpdate.Status.OK,
                        org.eclipse.jgit.transport.RemoteRefUpdate.Status.UP_TO_DATE -> {
                            // success
                        }
                        org.eclipse.jgit.transport.RemoteRefUpdate.Status.REJECTED_NONFASTFORWARD ->
                            throw IllegalStateException("원격이 앞서 있습니다. 먼저 pull 하세요.")
                        else ->
                            throw IllegalStateException("push 거부: ${rru.status} ${rru.message ?: ""}")
                    }
                }
            }
            return if (nothingStaged) "변경 없음 (이미 최신)" else "push 완료: $relativePath"
        }
    }
}
