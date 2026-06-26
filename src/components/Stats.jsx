import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from './Stats.module.css'

export default function Stats({ onClose }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchStats()
  }, [user])

  async function fetchStats() {
    setLoading(true)
    const [{ data: prof }, { data: scores }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('scores')
        .select('*, images(title, correct_year, category)')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(20)
    ])
    setProfile(prof)
    setHistory(scores || [])
    setLoading(false)
  }

  const avgScore = history.length
    ? Math.round(history.reduce((a, s) => a + s.score, 0) / history.length)
    : 0

  const bestScore = history.length
    ? Math.max(...history.map(s => s.score))
    : 0

  function scoreColor(score) {
    if (score === 1000) return '#538d4e'
    if (score >= 800) return '#85b84a'
    if (score >= 600) return '#b59f3b'
    if (score >= 400) return '#c0732a'
    return '#e74c3c'
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Your Stats</h2>
          <button onClick={onClose} className={styles.closeBtn}>✕</button>
        </div>

        {loading ? (
          <div className={styles.loading}><div className={styles.spinner} /></div>
        ) : !user ? (
          <p className={styles.empty}>Sign in to see your stats.</p>
        ) : (
          <>
            {/* Streak row */}
            <div className={styles.streakRow}>
              <div className={styles.streakBox}>
                <span className={styles.streakNum}>{profile?.current_streak ?? 0}</span>
                <span className={styles.streakLabel}>🔥 Current streak</span>
              </div>
              <div className={styles.streakBox}>
                <span className={styles.streakNum}>{profile?.best_streak ?? 0}</span>
                <span className={styles.streakLabel}>⭐ Best streak</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statBox}>
                <span className={styles.statNum}>{profile?.total_plays ?? 0}</span>
                <span className={styles.statLabel}>Played</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>{avgScore}</span>
                <span className={styles.statLabel}>Avg score</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>{bestScore}</span>
                <span className={styles.statLabel}>Best score</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statNum}>
                  {history.filter(s => s.score === 1000).length}
                </span>
                <span className={styles.statLabel}>Perfect</span>
              </div>
            </div>

            {/* Score distribution */}
            {history.length > 0 && (
              <div className={styles.distSection}>
                <h3 className={styles.distTitle}>Score distribution</h3>
                {[
                  { label: '900–1000', min: 900, max: 1000, color: '#538d4e' },
                  { label: '700–899',  min: 700, max: 899,  color: '#85b84a' },
                  { label: '500–699',  min: 500, max: 699,  color: '#b59f3b' },
                  { label: '300–499',  min: 300, max: 499,  color: '#c0732a' },
                  { label: '0–299',    min: 0,   max: 299,  color: '#e74c3c' },
                ].map(bucket => {
                  const count = history.filter(s => s.score >= bucket.min && s.score <= bucket.max).length
                  const pct = history.length ? (count / history.length) * 100 : 0
                  return (
                    <div key={bucket.label} className={styles.distRow}>
                      <span className={styles.distLabel}>{bucket.label}</span>
                      <div className={styles.distBar}>
                        <div
                          className={styles.distFill}
                          style={{ width: `${pct}%`, background: bucket.color }}
                        />
                      </div>
                      <span className={styles.distCount}>{count}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* History */}
            {history.length > 0 && (
              <div className={styles.histSection}>
                <h3 className={styles.distTitle}>Recent games</h3>
                <div className={styles.histList}>
                  {history.map(s => (
                    <div key={s.id} className={styles.histRow}>
                      <span className={styles.histDate}>{formatDate(s.played_at)}</span>
                      <span className={styles.histTitle}>{s.images?.title?.slice(0, 35)}</span>
                      <span className={styles.histYear}>{s.images?.correct_year}</span>
                      <span className={styles.histScore} style={{ color: scoreColor(s.score) }}>
                        {s.score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {history.length === 0 && (
              <p className={styles.empty}>No games played yet. Play today's challenge!</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
