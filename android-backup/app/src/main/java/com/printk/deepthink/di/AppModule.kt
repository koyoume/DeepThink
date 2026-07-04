package com.printk.deepthink.di

import android.content.Context
import com.printk.deepthink.data.git.JGitClient
import com.printk.deepthink.data.vault.VaultFileStore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import java.io.File
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @IoDispatcher
    fun provideIoDispatcher(): CoroutineDispatcher = Dispatchers.IO

    @Provides
    @Singleton
    @ApplicationScope
    fun provideApplicationScope(
        @IoDispatcher io: CoroutineDispatcher
    ): CoroutineScope = CoroutineScope(SupervisorJob() + io)

    @Provides
    @Singleton
    fun provideVaultDir(@ApplicationContext context: Context): File =
        File(context.filesDir, "vault")

    @Provides
    @Singleton
    fun provideVaultFileStore(vaultDir: File): VaultFileStore = VaultFileStore(vaultDir)

    @Provides
    @Singleton
    fun provideJGitClient(vaultDir: File): JGitClient = JGitClient(vaultDir)
}
