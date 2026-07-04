package com.printk.deepthink.data.settings

import android.content.Context
import android.content.SharedPreferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.printk.deepthink.di.IoDispatcher
import com.printk.deepthink.domain.repository.GitConfig
import com.printk.deepthink.domain.repository.SettingsRepository
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "deepthink_settings")
private val PREVIEW_LINES = intPreferencesKey("preview_lines")

@Singleton
class SettingsRepositoryImpl @Inject constructor(
    @ApplicationContext private val context: Context,
    @IoDispatcher private val io: CoroutineDispatcher
) : SettingsRepository {

    private val secure: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "deepthink_git",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    private val _gitConfig = MutableStateFlow(readGitConfig())
    override val gitConfigFlow: Flow<GitConfig> = _gitConfig.asStateFlow()

    override val previewLines: Flow<Int> =
        context.dataStore.data.map { it[PREVIEW_LINES] ?: 2 }

    override suspend fun setPreviewLines(value: Int) {
        context.dataStore.edit { it[PREVIEW_LINES] = value.coerceIn(0, 3) }
    }

    override suspend fun getGitConfig(): GitConfig = _gitConfig.value

    override suspend fun setGitConfig(config: GitConfig) = withContext(io) {
        secure.edit()
            .putString("remoteUrl", config.remoteUrl)
            .putString("username", config.username)
            .putString("token", config.token)
            .putString("authorName", config.authorName)
            .putString("authorEmail", config.authorEmail)
            .apply()
        _gitConfig.value = config
    }

    private fun readGitConfig(): GitConfig = GitConfig(
        remoteUrl = secure.getString("remoteUrl", "") ?: "",
        username = secure.getString("username", "") ?: "",
        token = secure.getString("token", "") ?: "",
        authorName = secure.getString("authorName", "DeepThink") ?: "DeepThink",
        authorEmail = secure.getString("authorEmail", "deepthink@local") ?: "deepthink@local"
    )
}
