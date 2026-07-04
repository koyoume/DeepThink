package com.printk.deepthink.domain.repository

import com.printk.deepthink.domain.model.Category
import com.printk.deepthink.domain.model.Topic
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow

interface TopicRepository {
    val categories: StateFlow<List<Category>>
    val topics: StateFlow<List<Topic>>

    fun topicsIn(category: String): Flow<List<Topic>>
    fun topic(id: String): Flow<Topic?>

    suspend fun createTopic(category: String, title: String = ""): String
    suspend fun updateTopic(topic: Topic)
    suspend fun deleteTopic(id: String)
    suspend fun moveTopic(id: String, newCategory: String)

    suspend fun addCategory(name: String)
    suspend fun renameCategory(oldName: String, newName: String)
    suspend fun deleteCategory(name: String)

    /** 디스크에서 다시 로드 (예: git pull/clone 직후) */
    suspend fun reload()
}
