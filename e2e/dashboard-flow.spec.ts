import { expect, test } from '@playwright/test'

const THOUGHT_INPUTS = 'div.flex-1.px-4.pb-24.pt-3 input[type=text]'

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

  await test.step('add a thought via the bottom input bar', async () => {
    const before = await page.locator(THOUGHT_INPUTS).count()
    const draft = page.locator('footer input[type=text]')
    await draft.fill('플레이라이트로 추가한 생각')
    await draft.press('Enter')
    await expect(page.locator(THOUGHT_INPUTS)).toHaveCount(before + 1)
    const values = await page.locator(THOUGHT_INPUTS).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
    expect(values).toContain('플레이라이트로 추가한 생각')
  })

  await test.step('Tab indents the focused thought row one level', async () => {
    const lastRow = page.locator(THOUGHT_INPUTS).last()
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
