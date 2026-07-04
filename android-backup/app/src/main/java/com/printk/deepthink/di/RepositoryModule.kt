package com.printk.deepthink.di

import com.printk.deepthink.data.git.GitSyncRepositoryImpl
import com.printk.deepthink.data.settings.SettingsRepositoryImpl
import com.printk.deepthink.data.vault.TopicRepositoryImpl
import com.printk.deepthink.domain.repository.GitSyncRepository
import com.printk.deepthink.domain.repository.SettingsRepository
import com.printk.deepthink.domain.repository.TopicRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindTopicRepository(impl: TopicRepositoryImpl): TopicRepository

    @Binds
    @Singleton
    abstract fun bindSettingsRepository(impl: SettingsRepositoryImpl): SettingsRepository

    @Binds
    @Singleton
    abstract fun bindGitSyncRepository(impl: GitSyncRepositoryImpl): GitSyncRepository
}
