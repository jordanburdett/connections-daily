import type { CategoryColor } from '../types'

interface CategoryBannerProps {
  name: string
  color: CategoryColor | 'grey'
  words: string[]
}

export function CategoryBanner({ name, color, words }: CategoryBannerProps) {
  return (
    <div className={`banner banner--${color}`}>
      <div className="banner-name">{name}</div>
      <div className="banner-words">{words.join(', ')}</div>
    </div>
  )
}
