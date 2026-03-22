export type CategoryColor = 'yellow' | 'green' | 'blue' | 'purple'

export interface PuzzleCategory {
  name: string
  color: CategoryColor
  words: [string, string, string, string]
}

export interface PuzzleData {
  puzzleId: number
  categories: [PuzzleCategory, PuzzleCategory, PuzzleCategory, PuzzleCategory]
}

export interface TileState {
  word: string
  categoryColor: CategoryColor
  categoryName: string
  solved: boolean
  selected: boolean
}

export interface GuessRecord {
  words: string[]
  correct: boolean
  categoryColor: CategoryColor | null
}

export interface SolvedGroup {
  name: string
  color: CategoryColor
  words: string[]
}

export interface GuessResult {
  correct: boolean
  categoryColor: CategoryColor | null
  oneAway: boolean
  alreadyGuessed: boolean
}

export const GameStatus = {
  IDLE: 'IDLE',
  PLAYING: 'PLAYING',
  WON: 'WON',
  LOST: 'LOST',
} as const
export type GameStatus = typeof GameStatus[keyof typeof GameStatus]

export interface GameState {
  tiles: TileState[]
  solvedGroups: SolvedGroup[]
  livesRemaining: number
  guessHistory: GuessRecord[]
  gameStatus: GameStatus
}
