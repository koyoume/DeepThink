declare module 'diff3' {
  export interface Diff3OkChunk {
    ok: string[]
    conflict?: undefined
  }
  export interface Diff3ConflictChunk {
    ok?: undefined
    conflict: {
      a: string[]
      aIndex: number
      o: string[]
      oIndex: number
      b: string[]
      bIndex: number
    }
  }
  export type Diff3Chunk = Diff3OkChunk | Diff3ConflictChunk

  /** ours(a), base(o), theirs(b) — 줄(line) 배열 3-way 병합. */
  export default function diff3Merge(a: string[], o: string[], b: string[]): Diff3Chunk[]
}
