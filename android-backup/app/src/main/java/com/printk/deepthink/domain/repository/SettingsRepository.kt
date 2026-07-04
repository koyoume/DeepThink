package com.printk.deepthink.domain.repository

import kotlinx.coroutines.flow.Flow

/** Git 원격 설정 (토큰은 보안 저장소) */
data class GitConfig(
    val remoteUrl: String = "",
    val username: String = "",
    val token: String = "",
    val authorName: String = "DeepThink",
    val authorEmail: String = "deepthink@local"
) {
    val isConfigured: Boolean get() = remoteUrl.isNotBlank() && token.isNotBlank()
}

interface SettingsRepository {
    /** 대시보드 미리보기 기본 줄 수 (0 = 끔, 1~3) */
    val previewLines: Flow<Int>
    suspend fun setPreviewLines(value: Int)

    suspend fun getGitConfig(): GitConfig
    val gitConfigFlow: Flow<GitConfig>
    suspend fun setGitConfig(config: GitConfig)
}
