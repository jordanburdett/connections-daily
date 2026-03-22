interface OneAwayToastProps {
  show: boolean
}

export function OneAwayToast({ show }: OneAwayToastProps) {
  if (!show) return null
  return <div className="one-away-toast">One away! 🔥</div>
}
