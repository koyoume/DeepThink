import diff3Merge from 'diff3'
import type { MergeDriverCallback } from 'isomorphic-git'

/**
 * "동기화" 시 사용자에게 충돌 화면을 절대 보여주지 않기 위한 커스텀 merge driver.
 *
 * vault의 각 카테고리 .md 파일은 한 줄 = 생각(thought) 하나(또는 자료 한 줄, 헤더 한 줄)라서,
 * 파일 텍스트를 그대로 줄 단위 3-way 병합(diff3)하는 것이 곧 "생각 단위 병합"과 동일한 효과를 낸다.
 * (Thought.id는 파일에 저장되지 않고 파싱할 때마다 새로 생성되므로, 애초에 ID 기반 병합 대상이 없다.)
 *
 * isomorphic-git 기본 mergeDriver(mergeFile)는 진짜 충돌(같은 줄을 양쪽이 다르게 고친 경우)에
 * <<<<<<< ======= >>>>>>> 마커를 남기고 cleanMerge:false를 반환해 사용자가 손으로 정리해야 한다.
 * 여기서는 그 대신 항상 cleanMerge:true를 반환하고, 진짜 충돌 구간은 "원격(theirs) 유지 + 그 아래
 * 로컬(ours)에서 다르게 고친 내용을 추가 보존"하는 방식으로 자동 처리한다 — 데이터 유실 없이,
 * 사용자에게 아무것도 묻지 않고 항상 병합이 끝난다.
 */
export const silentMergeDriver: MergeDriverCallback = ({ contents }) => {
  const LINEBREAKS = /^.*(\r?\n|$)/gm
  const [baseContent, ourContent, theirContent] = contents

  const ours = ourContent.match(LINEBREAKS) ?? []
  const base = baseContent.match(LINEBREAKS) ?? []
  const theirs = theirContent.match(LINEBREAKS) ?? []

  const result = diff3Merge(ours, base, theirs)

  let mergedText = ''
  for (const item of result) {
    if (item.ok) {
      mergedText += item.ok.join('')
      continue
    }
    // 진짜 충돌: 원격 버전을 우선 유지하고, 로컬 버전이 다르면 바로 아래에 이어붙여 둘 다 보존한다.
    const theirText = item.conflict.b.join('')
    const ourText = item.conflict.a.join('')
    mergedText += theirText
    if (ourText !== theirText) {
      mergedText += ourText
    }
  }

  return { cleanMerge: true, mergedText }
}
