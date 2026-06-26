import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import Stats from './Stats'
import styles from './Header.module.css'

const ADMIN_EMAIL = 'umbhatt18@gmail.com'

export default function Header({ theme, onToggleTheme, isAdmin }) {
  const { user, signInWithGoogle, signOut } = useAuth()
  const [streak, setStreak]     = useState(null)
  const [showStats, setShowStats] = useState(false)
  const isAdminUser = user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (user) fetchStreak()
  }, [user])

  async function fetchStreak() {
    const { data } = await supabase
      .from('users').select('current_streak').eq('id', user.id).single()
    if (data) setStreak(data.current_streak)
  }

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/" className={styles.logo}>GuessItsTime</a>
          <div className={styles.controls}>
            <button className={styles.themeBtn} onClick={onToggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {user ? (
              <div className={styles.userArea}>
                {streak !== null && streak > 0 && (
                  <span className={styles.streak}>🔥 {streak}</span>
                )}
                <button onClick={() => setShowStats(true)} className={styles.statsBtn}>
                  {user.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} alt="" className={styles.avatar} />
                    : <span className={styles.avatarFallback}>{user.email?.[0]?.toUpperCase()}</span>
                  }
                </button>
                {isAdminUser && (
                  <a href="/admin" className={`${styles.adminLink} ${isAdmin ? styles.adminActive : ''}`}>
                    Admin
                  </a>
                )}
                <button onClick={signOut} className={styles.signOutBtn}>Sign out</button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} className={styles.signInBtn}>Sign in</button>
            )}
          </div>
        </div>
      </div>

      {showStats && <Stats onClose={() => { setShowStats(false); fetchStreak() }} />}
    </>
  )
}
