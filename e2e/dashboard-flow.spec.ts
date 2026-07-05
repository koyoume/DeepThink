import { expect, test } from '@playwright/test'

const THOUGHT_INPUT = '[data-testid="thought-input"]'
const THOUGHT_VIEW = '[data-testid="thought-view"]'

test('dashboard → detail → settings core flow', async ({ page }) => {
  await test.step('dashboard loads with seeded categories and topics', async () => {
    await page.goto('/')
    await expect(page.getByText('생각 모음')).toBeVisible()
    await expect(page.getByText('제품 기획')).toBeVisible()
    await expect(page.getByText('DeepThink 온보딩 흐름')).toBeVisible()
  })

  await test.step('open a topic and edit its title', async () => {
    await page.getByText('DeepThink 온보딩 흐름').click()
    const title = page.locator('textarea').first()
    await expect(title).toBeVisible()
    await title.fill('제목 수정 테스트')
    await expect(title).toHaveValue('제목 수정 테스트')
  })

  await test.step('pressing Enter on the last thought row inserts a new line below it (no separate input bar)', async () => {
    const beforeCount = await page.locator(`${THOUGHT_INPUT}, ${THOUGHT_VIEW}`).count()
    // 마지막 줄을 편집 모드로 전환(블러 상태면 뷰 버튼을 클릭, 이미 편집 중이면 그대로)
    const lastView = page.locator(THOUGHT_VIEW).last()
    if (await lastView.count()) {
      await lastView.click()
    }
    const lastInput = page.locator(THOUGHT_INPUT).last()
    await expect(lastInput).toBeVisible()
    await lastInput.press('End')
    await lastInput.press('Enter')
    await expect(page.locator(`${THOUGHT_INPUT}, ${THOUGHT_VIEW}`)).toHaveCount(beforeCount + 1)
    // Enter로 생긴 새 줄은 비어있는 채로 자동 포커스되어 있어야 함
    const newLast = page.locator(THOUGHT_INPUT).last()
    await expect(newLast).toHaveValue('')
    await newLast.fill('플레이라이트로 추가한 생각')
    await expect(newLast).toHaveValue('플레이라이트로 추가한 생각')
  })

  await test.step('Tab indents the focused thought row one level', async () => {
    const lastRow = page.locator(THOUGHT_INPUT).last()
    await lastRow.focus()
    await page.keyboard.press('Tab')
    const marginLeft = await lastRow.evaluate((el) => getComputedStyle(el.closest('.group')!).marginLeft)
    expect(marginLeft).toBe('22px')
  })

  await test.step('back button returns to dashboard, and the reload survives (IndexedDB flush)', async () => {
    await page.getByRole('button', { name: '뒤로가기' }).click()
    await expect(page.getByText('생각 모음')).toBeVisible()
    await page.reload()
    await expect(page.getByText('제목 수정 테스트')).toBeVisible({ timeout: 10_000 })
  })

  await test.step('settings screen opens and the browser back button returns to dashboard', async () => {
    await page.getByText('설정', { exact: true }).click()
    await expect(page.getByText('Git 저장소')).toBeVisible()
    await page.goBack()
    await expect(page.getByText('생각 모음')).toBeVisible()
  })
})
