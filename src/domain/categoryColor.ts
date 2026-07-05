/**
 * 카테고리 색 — 순서(index) 기반 팔레트.
 * 모델(Category)에 색 필드가 없으므로, 카테고리 배열 순서로 결정론적 배정한다.
 * 이름이 바뀌거나 추가돼도 순서만 유지되면 색이 안정적으로 유지된다.
 * 종이 배경에 어울리는 중채도 톤. (UI-DESIGN 시각 §5.1)
 */
const PALETTE = [
  '#6B4EFF', // violet (brand)
  '#C77D3A', // ochre
  '#2FA36B', // green
  '#D8497F', // pink
  '#3E7CC4', // blue
  '#8A6FB0', // mauve
  '#C25A4E', // terracotta
  '#4FA3A0', // teal
]

export function categoryColorByIndex(index: number): string {
  if (index < 0) return PALETTE[0]
  return PALETTE[index % PALETTE.length]
}

/** 카테고리 이름 → 색. names 배열(표시 순서)에서의 위치로 결정. */
export function categoryColorByName(name: string, names: string[]): string {
  const i = names.indexOf(name)
  return categoryColorByIndex(i)
}
