import { useState, useEffect } from 'react'
import Header from './components/Header'
import Game from './components/Game'
import Admin from './components/Admin'
import './index.css'

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('git-theme') || 'dark')
  const isAdmin = window.location.pathname === '/admin'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('git-theme', theme)
  }, [theme])

  return (
    <div>
      <Header theme={theme} onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} isAdmin={isAdmin} />
      {isAdmin ? <Admin /> : <Game />}
    </div>
  )
}
