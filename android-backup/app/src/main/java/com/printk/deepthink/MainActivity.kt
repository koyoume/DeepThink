package com.printk.deepthink

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.printk.deepthink.presentation.navigation.NavGraph
import com.printk.deepthink.presentation.theme.DeepThinkTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            DeepThinkTheme {
                NavGraph()
            }
        }
    }
}
