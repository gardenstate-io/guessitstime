import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { calculateScore, getScoreLabel, formatShareText } from '../lib/score'
import styles from './Game.module.css'

const MIN_YEAR = 1850
const MAX_YEAR = 2010

export default function Game() {
  const { user } = useAuth()
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [guessedYear, setGuessedYear] = useState(1970)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)
  const [prevScore, setPrevScore] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchChallenge()
  }, [])

  useEffect(() => {
    if (challenge && user) checkAlreadyPlayed()
  }, [challenge, user])

  async function fetchChallenge() {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_todays_challenge')
      if (error) throw error
      if (!data || data.length === 0) {
        setError('No challenge scheduled for today. Check back soon!')
        return
      }
      setChallenge(data[0])
    } catch (e) {
      setError('Failed to load today\'s challenge.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function checkAlreadyPlayed() {
    if (!user || !challenge) return
    const { data } = await supabase
      .from('scores')
      .select('score, guessed_year')
      .eq('user_id', user.id)
      .eq('challenge_id', challenge.challenge_id)
      .maybeSingle()

    if (data) {
      setAlreadyPlayed(true)
      setPrevScore(data)
      setGuessedYear(data.guessed_year)
      setSubmitted(true)
      setScore(data.score)
    }
  }

  async function handleSubmit() {
    if (submitted) return
    const finalScore = calculateScore(guessedYear, challenge.correct_year)
    setScore(finalScore)
    setSubmitted(true)

    // Save score — works for anonymous too via localStorage fallback
    if (user) {
      await supabase.from('scores').insert({
        user_id: user.id,
        image_id: challenge.image_id,
        challenge_id: challenge.challenge_id,
        guessed_year: guessedYear,
        score: finalScore,
        mode: 'daily'
      })
    } else {
      // Anonymous — save to localStorage
      const key = `git_played_${challenge.challenge_id}`
      localStorage.setItem(key, JSON.stringify({ guessedYear, score: finalScore }))
    }
  }

  async function handleShare() {
    const text = formatShareText(score, challenge.correct_year, guessedYear, challenge.title)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      window.prompt('Copy this:', text)
    }
  }

  if (loading) return (
    <div className={styles.center}>
      <div className={styles.spinner} />
      <p>Loading today's challenge...</p>
    </div>
  )

  if (error) return (
    <div className={styles.center}>
      <p className={styles.errorText}>{error}</p>
    </div>
  )

  const diff = submitted ? Math.abs(guessedYear - challenge.correct_year) : null
  const scoreInfo = score !== null ? getScoreLabel(score) : null

  return (
    <main className={styles.main}>
      <div className={styles.card}>

        {/* Daily badge */}
        <div className={styles.badge}>Daily Challenge</div>

        {/* Image */}
        <div className={styles.imageWrap}>
          <img
            src={challenge.source_url}
            alt="Historical event — guess the year"
            className={styles.image}
          />
          {submitted && (
            <div className={styles.yearReveal}>
              <span>{challenge.correct_year}</span>
            </div>
          )}
        </div>

        {/* Slider */}
        {!submitted && (
          <div className={styles.sliderSection}>
            <div className={styles.yearDisplay}>{guessedYear}</div>
            <input
              type="range"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={guessedYear}
              onChange={e => setGuessedYear(Number(e.target.value))}
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              <span>{MIN_YEAR}</span>
              <span>{MAX_YEAR}</span>
            </div>
            <button onClick={handleSubmit} className={styles.submitBtn}>
              Lock in my guess
            </button>
          </div>
        )}

        {/* Result */}
        {submitted && (
          <div className={styles.result}>
            <div className={styles.scoreRow}>
              <span className={styles.scoreNumber} style={{ color: scoreInfo.color }}>
                {score}
              </span>
              <span className={styles.scoreMax}>/1000</span>
              <span className={styles.scoreLabel} style={{ color: scoreInfo.color }}>
                {scoreInfo.label}
              </span>
            </div>

            <div className={styles.diffRow}>
              {diff === 0
                ? '🎯 Exact year!'
                : `You were off by ${diff} year${diff !== 1 ? 's' : ''} — you guessed ${guessedYear}, correct answer is ${challenge.correct_year}`
              }
            </div>

            {challenge.description && (
              <p className={styles.description}>{challenge.description}</p>
            )}

            {challenge.attribution && (
              <p className={styles.attribution}>📷 {challenge.attribution}</p>
            )}

            <div className={styles.actions}>
              <button onClick={handleShare} className={styles.shareBtn}>
                {copied ? '✅ Copied!' : '📋 Share result'}
              </button>
              {!user && (
                <p className={styles.signInNudge}>
                  Sign in to save your streak and stats
                </p>
              )}
            </div>

            <div className={styles.comeback}>
              Come back tomorrow for a new challenge 🕰️
            </div>
          </div>
        )}

      </div>

      {/* Stats bar */}
      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{challenge.plays_count}</span>
          <span className={styles.statLabel}>plays today</span>
        </div>
        {challenge.avg_score && (
          <div className={styles.stat}>
            <span className={styles.statNum}>{Math.round(challenge.avg_score)}</span>
            <span className={styles.statLabel}>avg score</span>
          </div>
        )}
        <div className={styles.stat}>
          <span className={styles.statNum}>{challenge.difficulty}</span>
          <span className={styles.statLabel}>difficulty</span>
        </div>
      </div>
    </main>
  )
}
