package com.printk.deepthink.data.git

import com.printk.deepthink.data.vault.VaultFileStore
import com.printk.deepthink.di.IoDispatcher
import com.printk.deepthink.domain.repository.GitSyncRepository
import com.printk.deepthink.domain.repository.SettingsRepository
import com.printk.deepthink.domain.repository.SyncResult
import com.printk.deepthink.domain.repository.TopicRepository
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GitSyncRepositoryImpl @Inject constructor(
    private val client: JGitClient,
    private val store: VaultFileStore,
    private val settings: SettingsRepository,
    private val topicRepository: TopicRepository,
    @IoDispatcher private val io: CoroutineDispatcher
) : GitSyncRepository {

    override suspend fun isRepoInitialized(): Boolean = withContext(io) { client.isInitialized() }

    override suspend fun initOrClone(): SyncResult = withContext(io) {
        val config = settings.getGitConfig()
        if (!config.isConfigured) return@withContext SyncResult.Error("원격 URL과 토큰을 먼저 입력하세요.")
        runCatching {
            client.ensureRepo(config)
            val msg = client.pull(config)
            topicRepository.reload()
            SyncResult.Success(msg)
        }.getOrElse { e -> SyncResult.Error(e.message ?: "초기화 실패") }
    }

    override suspend fun pull(): SyncResult = withContext(io) {
        val config = settings.getGitConfig()
        if (!config.isConfigured) return@withContext SyncResult.Error("원격 URL과 토큰을 먼저 입력하세요.")
        runCatching {
            val msg = client.pull(config)
            topicRepository.reload()
            SyncResult.Success(msg)
        }.getOrElse { e -> SyncResult.Error(e.message ?: "pull 실패") }
    }

    override suspend fun syncCategory(category: String): SyncResult = withContext(io) {
        val config = settings.getGitConfig()
        if (!config.isConfigured) return@withContext SyncResult.Error("원격 URL과 토큰을 먼저 입력하세요.")
        runCatching {
            val relative = store.relativePath(store.categoryFile(category))
            val legacy = store.legacyRelativePath(category)
            val msg = client.commitAndPushFile(config, relative, legacy, "update $category")
            SyncResult.Success(msg)
        }.getOrElse { e -> SyncResult.Error(e.message ?: "동기화 실패") }
    }
}
