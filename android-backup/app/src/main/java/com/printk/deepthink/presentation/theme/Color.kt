package com.printk.deepthink.presentation.theme

import androidx.compose.ui.graphics.Color

// UI-DESIGN.md light "paper" tokens
val Bg = Color(0xFFFBFAF7)          // 배경
val Surface = Color(0xFFFFFFFF)     // 카드/표면
val TextPrimary = Color(0xFF1F2421) // 본문 텍스트
val TextSecondary = Color(0xFF6E726A)
val TextTertiary = Color(0xFF8A8F87)
val Divider = Color(0xFFECEAE3)     // 구분선
val IndentGuide = Color(0xFFE3E1D9) // 들여쓰기 가이드선

val Pine = Color(0xFF2D6A5A)        // 강조(주요 액션·체크)
val PineBg = Color(0x1F2D6A5A)
val Amber = Color(0xFFC9803A)       // 코멘트
val AmberBg = Color(0x1FC9803A)

// 카테고리 색 점 (저채도/어스톤)
data class CategoryColor(val dot: Color)

val categoryColors = mapOf(
    "제품 기획" to CategoryColor(Color(0xFF2D6A5A)),
    "독서" to CategoryColor(Color(0xFFB0793C)),
    "투자" to CategoryColor(Color(0xFF8E6F4E)),
    "학습" to CategoryColor(Color(0xFF6E6A9E)),
    "일상" to CategoryColor(Color(0xFF7A8A6E)),
    "사이드 프로젝트" to CategoryColor(Color(0xFF5A7693))
)

// 사용자 생성 카테고리용 폴백 팔레트
private val fallbackColors = listOf(
    CategoryColor(Color(0xFF5A8A7B)),
    CategoryColor(Color(0xFF9E7B5A)),
    CategoryColor(Color(0xFF7E6E9E)),
    CategoryColor(Color(0xFF8A7E6E)),
    CategoryColor(Color(0xFF6E8A9E))
)

fun getCategoryColor(categoryName: String?): CategoryColor {
    if (categoryName == null) return CategoryColor(TextTertiary)
    categoryColors[categoryName]?.let { return it }
    val index = (categoryName.hashCode().and(0x7FFFFFFF)) % fallbackColors.size
    return fallbackColors[index]
}
