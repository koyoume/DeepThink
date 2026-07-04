/** android-backup의 kotlinx.coroutines Mutex와 동일한 목적: vault 쓰기를 한 번에 하나씩 직렬화 */
export function createMutex() {
  let tail: Promise<unknown> = Promise.resolve()
  return function withMutex<T>(fn: () => Promise<T>): Promise<T> {
    const result = tail.then(fn, fn)
    tail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }
}
