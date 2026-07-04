import { defineConfig } from '@playwright/test'

/**
 * WEB_DEV_GUIDE.md §5.3: 처음부터 완벽한 스위트를 짜지 않고, 실사용 중 발견된 버그마다
 * 재현 케이스를 추가하며 키운다. 배포 파이프라인의 배포 전 게이트로 연결됨(.github/workflows/deploy.yml).
 *
 * `npm run build`로 만든 실제 프로덕션 산출물(dist/)을 preview 서버로 띄워서 검증한다
 * (dev 서버가 아니라 배포될 결과물과 최대한 가깝게).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4300',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4300',
    port: 4300,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
