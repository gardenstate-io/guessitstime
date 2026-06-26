import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { calculateScore, formatShareText } from '../lib/score'
import styles from './Game.module.css'

const MIN_YEAR = 1850
const MAX_YEAR = 2010

function getScoreClass(score) {
  if (score === 1000) return { cls: styles.perfect, label: 'Perfect!' }
  if (score >= 800)  return { cls: styles.great,   label: 'Excellent' }
  if (score >= 600)  return { cls: styles.good,    label: 'Good' }
  if (score >= 400)  return { cls: styles.okay,    label: 'Not bad' }
  return { cls: styles.miss, label: 'Way off' }
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })
}

export default function Game() {
  const { user } = useAuth()
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [guessedYear, setGuessedYear] = useState(1960)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore]         = useState(null)
  const [copied, setCopied]       = useState(false)
  const [imgError, setImgError]   = useState(false)

  useEffect(() => { fetchChallenge() }, [])
  useEffect(() => { if (challenge && user) checkPlayed() }, [challenge, user])

  async function fetchChallenge() {
    try {
      const { data, error } = await supabase.rpc('get_todays_challenge')
      if (error) throw error
      if (!data?.length) { setError('No challenge today — check back soon.'); return }
      setChallenge(data[0])
    } catch { setError('Could not load today\'s challenge.') }
    finally   { setLoading(false) }
  }

  async function checkPlayed() {
    if (!user || !challenge) return
    const { data } = await supabase
      .from('scores')
      .select('score, guessed_year')
      .eq('user_id', user.id)
      .eq('challenge_id', challenge.challenge_id)
      .maybeSingle()
    if (data) {
      setGuessedYear(data.guessed_year)
      setScore(data.score)
      setSubmitted(true)
    }
  }

  async function handleSubmit() {
    if (submitted) return
    const s = calculateScore(guessedYear, challenge.correct_year)
    setScore(s)
    setSubmitted(true)
    if (user) {
      await supabase.from('scores').insert({
        user_id: user.id,
        image_id: challenge.image_id,
        challenge_id: challenge.challenge_id,
        guessed_year: guessedYear,
        score: s,
        mode: 'daily'
      })
    }
  }

  async function handleShare() {
    const text = formatShareText(score, challenge.correct_year, guessedYear, challenge.title)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { window.prompt('Copy:', text) }
  }

  if (loading) return (
    <div className={styles.center}><div className={styles.spinner} /></div>
  )
  if (error) return (
    <div className={styles.center}><p className={styles.errorText}>{error}</p></div>
  )

  const diff = submitted ? Math.abs(guessedYear - challenge.correct_year) : null
  const { cls, label } = score !== null ? getScoreClass(score) : {}

  // Build a proxied image URL to avoid Wikimedia hotlink blocking
  const imageUrl = challenge.source_url?.includes('wikimedia.org')
    ? `https://images.weserv.nl/?url=${encodeURIComponent(challenge.source_url)}&w=700&output=jpg`
    : challenge.source_url

  return (
    <div className={styles.wrap}>
      <div className={styles.dateRow}>{todayLabel()}</div>

      {/* Image */}
      <div className={styles.imageWrap}>
        {!imgError ? (
          <img
            src={imageUrl}
            alt="Guess the year of this historical photo"
            className={styles.image}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.imageFallback}>
            <span>🖼️</span>
            <span>Image unavailable</span>
          </div>
        )}
        {submitted && (
          <div className={styles.answerBadge}>{challenge.correct_year}</div>
        )}
      </div>

      {/* Slider */}
      {!submitted && (
        <div className={styles.sliderSection}>
          <div className={styles.yearDisplay}>{guessedYear}</div>
          <div className={styles.sliderWrap}>
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
          </div>
          <button onClick={handleSubmit} className={styles.submitBtn}>
            Lock in my guess
          </button>
        </div>
      )}

      {/* Result */}
      {submitted && (
        <>
          <hr className={styles.divider} />
          <div className={styles.result}>
            <div className={styles.scoreRow}>
              <span className={`${styles.scoreNum} ${cls}`}>{score}</span>
              <span className={styles.scoreMax}>/1000</span>
              <span className={`${styles.scoreLabel} ${cls}`}>{label}</span>
            </div>

            <p className={styles.diffText}>
              {diff === 0
                ? '🎯 Exact year — perfect!'
                : <>You guessed <strong>{guessedYear}</strong> — off by <strong>{diff} year{diff !== 1 ? 's' : ''}</strong></>
              }
            </p>

            {challenge.description && (
              <p className={styles.description}>{challenge.description}</p>
            )}
            {challenge.attribution && (
              <p className={styles.attribution}>Photo: {challenge.attribution}</p>
            )}

            <button onClick={handleShare} className={styles.shareBtn}>
              {copied ? '✓ Copied to clipboard' : 'Share result'}
            </button>

            {!user && (
              <p className={styles.signInNudge}>Sign in to save your streak</p>
            )}

            <p className={styles.comeback}>Come back tomorrow for a new challenge</p>
          </div>
        </>
      )}

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{challenge.plays_count ?? 0}</span>
          <span className={styles.statLabel}>Played</span>
        </div>
        {challenge.avg_score != null && (
          <div className={styles.stat}>
            <span className={styles.statNum}>{Math.round(challenge.avg_score)}</span>
            <span className={styles.statLabel}>Avg score</span>
          </div>
        )}
        <div className={styles.stat}>
          <span className={styles.statNum} style={{textTransform:'capitalize'}}>
            {challenge.difficulty}
          </span>
          <span className={styles.statLabel}>Difficulty</span>
        </div>
      </div>
    </div>
  )
}
