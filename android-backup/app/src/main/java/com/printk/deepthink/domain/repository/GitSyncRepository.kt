package com.printk.deepthink.domain.repository

sealed interface SyncResult {
    data class Success(val message: String) : SyncResult
    data class Error(val message: String) : SyncResult
}

interface GitSyncRepository {
    /** remote에 내용 있으면 clone, 없으면 init + remote 등록. 성공 시 vault 갱신 */
    suspend fun initOrClone(): SyncResult

    /** 해당 카테고리 md 파일만 add → commit → push */
    suspend fun syncCategory(category: String): SyncResult

    /** 원격에서 pull (clone된 repo 갱신) */
    suspend fun pull(): SyncResult

    /** 로컬 repo 초기화 여부 */
    suspend fun isRepoInitialized(): Boolean
}
