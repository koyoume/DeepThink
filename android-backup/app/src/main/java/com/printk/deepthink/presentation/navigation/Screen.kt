package com.printk.deepthink.presentation.navigation

sealed class Screen(val route: String) {
    data object Home : Screen("home")
    data object Settings : Screen("settings")
    data object TopicDetail : Screen("topic_detail/{topicId}") {
        fun createRoute(topicId: String) = "topic_detail/$topicId"
    }
}
