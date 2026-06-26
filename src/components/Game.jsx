import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { calculateScore, formatShareText } from '../lib/score'
import styles from './Game.module.css'

const MIN_YEAR = 1850
const MAX_YEAR = 2010

function getScoreInfo(score) {
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

  // Mode: 'daily' | 'unlimited'
  const [mode, setMode]           = useState('daily')
  const [challenge, setChallenge] = useState(null)
  const [unlimitedImg, setUnlimitedImg] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [guessedYear, setGuessedYear] = useState(1960)
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore]         = useState(null)
  const [copied, setCopied]       = useState(false)
  const [imgError, setImgError]   = useState(false)
  const [unlimitedCount, setUnlimitedCount] = useState(0)
  const [usedIds, setUsedIds]     = useState([])

  useEffect(() => { fetchDaily() }, [])
  useEffect(() => { if (challenge && user) checkPlayed() }, [challenge, user])

  async function fetchDaily() {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_todays_challenge')
      if (error) throw error
      if (!data?.length) { setError('No challenge today — check back soon.'); return }
      setChallenge(data[0])
    } catch { setError('Could not load today\'s challenge.') }
    finally { setLoading(false) }
  }

  async function fetchUnlimited() {
    setLoading(true)
    setImgError(false)
    setSubmitted(false)
    setScore(null)
    setGuessedYear(1960)
    try {
      let query = supabase.from('images').select('*').eq('is_active', true)
      if (usedIds.length) query = query.not('id', 'in', `(${usedIds.join(',')})`)
      // Random image — fetch a few and pick one
      const { data, error } = await query.limit(50)
      if (error) throw error
      if (!data?.length) {
        // Ran out — reset used list
        setUsedIds([])
        const { data: fresh } = await supabase.from('images').select('*').eq('is_active', true).limit(50)
        const pick = fresh[Math.floor(Math.random() * fresh.length)]
        setUnlimitedImg(pick)
        setUsedIds([pick.id])
      } else {
        const pick = data[Math.floor(Math.random() * data.length)]
        setUnlimitedImg(pick)
        setUsedIds(prev => [...prev, pick.id])
      }
    } catch { setError('Could not load image.') }
    finally { setLoading(false) }
  }

  async function checkPlayed() {
    if (!user || !challenge) return
    const { data } = await supabase
      .from('scores').select('score, guessed_year')
      .eq('user_id', user.id).eq('challenge_id', challenge.challenge_id)
      .maybeSingle()
    if (data) {
      setGuessedYear(data.guessed_year)
      setScore(data.score)
      setSubmitted(true)
    }
  }

  async function handleSubmit() {
    if (submitted) return
    const img = mode === 'daily' ? challenge : unlimitedImg
    const s = calculateScore(guessedYear, img.correct_year)
    setScore(s)
    setSubmitted(true)

    if (user) {
      await supabase.from('scores').insert({
        user_id: user.id,
        image_id: img.image_id || img.id,
        challenge_id: mode === 'daily' ? challenge.challenge_id : null,
        guessed_year: guessedYear,
        score: s,
        mode
      })
    }
  }

  async function handleShare() {
    const img = mode === 'daily' ? challenge : unlimitedImg
    const text = formatShareText(score, img.correct_year, guessedYear, img.title)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { window.prompt('Copy:', text) }
  }

  function handleNextUnlimited() {
    setUnlimitedCount(c => c + 1)
    fetchUnlimited()
  }

  function switchMode(newMode) {
    setMode(newMode)
    setSubmitted(false)
    setScore(null)
    setGuessedYear(1960)
    setImgError(false)
    if (newMode === 'unlimited' && !unlimitedImg) fetchUnlimited()
    else if (newMode === 'daily') { setLoading(false) }
  }

  const currentImg = mode === 'daily' ? challenge : unlimitedImg
  const proxyUrl = (url) => url?.includes('wikimedia.org')
    ? `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=700&output=jpg`
    : url

  if (loading) return (
    <div className={styles.center}><div className={styles.spinner} /></div>
  )
  if (error) return (
    <div className={styles.center}><p className={styles.errorText}>{error}</p></div>
  )

  const diff = submitted && currentImg ? Math.abs(guessedYear - currentImg.correct_year) : null
  const { cls, label } = score !== null ? getScoreInfo(score) : {}
  const imageUrl = proxyUrl(currentImg?.source_url)

  return (
    <div className={styles.wrap}>

      {/* Mode tabs */}
      <div className={styles.modeTabs}>
        <button
          className={`${styles.modeTab} ${mode === 'daily' ? styles.modeActive : ''}`}
          onClick={() => switchMode('daily')}
        >Daily</button>
        <button
          className={`${styles.modeTab} ${mode === 'unlimited' ? styles.modeActive : ''}`}
          onClick={() => switchMode('unlimited')}
        >Unlimited</button>
      </div>

      {mode === 'daily' && (
        <div className={styles.dateRow}>{todayLabel()}</div>
      )}
      {mode === 'unlimited' && (
        <div className={styles.dateRow}>Round {unlimitedCount + 1}</div>
      )}

      {/* Image */}
      <div className={styles.imageWrap}>
        {!imgError && imageUrl ? (
          <img
            src={imageUrl}
            alt="Guess the year"
            className={styles.image}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.imageFallback}>
            <span>🖼️</span>
            <span>Image unavailable</span>
          </div>
        )}
        {submitted && currentImg && (
          <div className={styles.answerBadge}>{currentImg.correct_year}</div>
        )}
      </div>

      {/* Slider */}
      {!submitted && (
        <div className={styles.sliderSection}>
          <div className={styles.yearDisplay}>{guessedYear}</div>
          <div className={styles.sliderWrap}>
            <input
              type="range" min={MIN_YEAR} max={MAX_YEAR} value={guessedYear}
              onChange={e => setGuessedYear(Number(e.target.value))}
              className={styles.slider}
            />
            <div className={styles.sliderLabels}>
              <span>{MIN_YEAR}</span><span>{MAX_YEAR}</span>
            </div>
          </div>
          <button onClick={handleSubmit} className={styles.submitBtn}>
            Lock in my guess
          </button>
        </div>
      )}

      {/* Result */}
      {submitted && currentImg && (
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
            {currentImg.description && (
              <p className={styles.description}>{currentImg.description}</p>
            )}
            {currentImg.attribution && (
              <p className={styles.attribution}>Photo: {currentImg.attribution}</p>
            )}

            <div className={styles.actionRow}>
              <button onClick={handleShare} className={styles.shareBtn}>
                {copied ? '✓ Copied' : 'Share result'}
              </button>
              {mode === 'unlimited' && (
                <button onClick={handleNextUnlimited} className={styles.nextBtn}>
                  Next photo →
                </button>
              )}
            </div>

            {!user && (
              <p className={styles.signInNudge}>Sign in to save your streak and history</p>
            )}
            {mode === 'daily' && (
              <p className={styles.comeback}>Come back tomorrow for a new challenge</p>
            )}
          </div>
        </>
      )}

      {/* Stats bar — daily only */}
      {mode === 'daily' && challenge && (
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
      )}

    </div>
  )
}
