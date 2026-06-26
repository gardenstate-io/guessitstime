export function calculateScore(guessedYear, correctYear) {
  const diff = Math.abs(guessedYear - correctYear)
  return Math.max(0, 1000 - diff * 10)
}

export function getScoreLabel(score) {
  if (score === 1000) return { label: 'Perfect!', color: '#22c55e' }
  if (score >= 800)  return { label: 'Excellent', color: '#84cc16' }
  if (score >= 600)  return { label: 'Good', color: '#eab308' }
  if (score >= 400)  return { label: 'Not bad', color: '#f97316' }
  if (score >= 200)  return { label: 'Keep trying', color: '#ef4444' }
  return { label: 'Way off!', color: '#dc2626' }
}

export function formatShareText(score, correctYear, guessedYear, title) {
  const diff = Math.abs(guessedYear - correctYear)
  const emoji = score === 1000 ? '🎯' : score >= 800 ? '🔥' : score >= 600 ? '✅' : score >= 400 ? '😅' : '💀'
  return `${emoji} GuessItsTime Daily\nScore: ${score}/1000\nOff by: ${diff} year${diff !== 1 ? 's' : ''}\n\nguessitstime.com`
}
