import { useAuth } from '../hooks/useAuth'
import styles from './Header.module.css'

export default function Header({ theme, onToggleTheme, isAdmin }) {
  const { user, signInWithGoogle, signOut } = useAuth()

  return (
    <div className={styles.header}>
      <div className={styles.headerInner}>
        <a href="/" className={styles.logo}>GuessItsTime</a>
        <div className={styles.controls}>
          <button className={styles.themeBtn} onClick={onToggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {user ? (
            <div className={styles.userArea}>
              {user.user_metadata?.avatar_url && (
                <img src={user.user_metadata.avatar_url} alt="" className={styles.avatar} />
              )}
              <a href="/admin" className={`${styles.adminLink} ${isAdmin ? styles.adminActive : ''}`}>Admin</a>
              <button onClick={signOut} className={styles.signOutBtn}>Sign out</button>
            </div>
          ) : (
            <button onClick={signInWithGoogle} className={styles.signInBtn}>Sign in</button>
          )}
        </div>
      </div>
    </div>
  )
}
