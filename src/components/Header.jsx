import { useAuth } from '../hooks/useAuth'
import styles from './Header.module.css'

export default function Header() {
  const { user, signInWithGoogle, signOut } = useAuth()

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>🕰️</span>
        <span className={styles.logoText}>GuessItsTime</span>
      </div>
      <div className={styles.auth}>
        {user ? (
          <div className={styles.userArea}>
            <img src={user.user_metadata?.avatar_url} alt="" className={styles.avatar} />
            <span className={styles.userName}>{user.user_metadata?.full_name?.split(' ')[0]}</span>
            <button onClick={signOut} className={styles.signOutBtn}>Sign out</button>
          </div>
        ) : (
          <button onClick={signInWithGoogle} className={styles.signInBtn}>
            Sign in with Google
          </button>
        )}
      </div>
    </header>
  )
}
