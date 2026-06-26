import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from './Admin.module.css'

const CATEGORIES = ['general','technology','war','politics','sports','culture']
const DIFFICULTIES = ['easy','medium','hard']
const ADMIN_EMAIL = 'umbhatt18@gmail.com'

export default function Admin() {
  const { user } = useAuth()
  const [images, setImages]       = useState([])
  const [challenges, setChallenges] = useState([])
  const [tab, setTab]             = useState('images')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState(null)

  // Add image form
  const [form, setForm] = useState({
    title: '', source_url: '', correct_year: '', category: 'general',
    difficulty: 'medium', description: '', attribution: '', license_type: 'public_domain'
  })

  // Schedule form
  const [schedForm, setSchedForm] = useState({ image_id: '', challenge_date: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: imgs }, { data: chals }] = await Promise.all([
      supabase.from('images').select('*').order('created_at', { ascending: false }),
      supabase.from('daily_challenges').select('*, images(title, correct_year)').order('challenge_date', { ascending: false }).limit(30)
    ])
    setImages(imgs || [])
    setChallenges(chals || [])
    setLoading(false)
  }

  function flash(text, isError = false) {
    setMsg({ text, isError })
    setTimeout(() => setMsg(null), 4000)
  }

  async function handleAddImage(e) {
    e.preventDefault()
    if (!form.title || !form.source_url || !form.correct_year) {
      flash('Title, URL, and year are required', true); return
    }
    setSaving(true)
    const { error } = await supabase.from('images').insert({
      ...form, correct_year: parseInt(form.correct_year), is_active: true
    })
    setSaving(false)
    if (error) { flash(error.message, true); return }
    flash('Image added successfully')
    setForm({ title:'', source_url:'', correct_year:'', category:'general', difficulty:'medium', description:'', attribution:'', license_type:'public_domain' })
    fetchAll()
  }

  async function handleSchedule(e) {
    e.preventDefault()
    if (!schedForm.image_id || !schedForm.challenge_date) {
      flash('Select an image and date', true); return
    }
    setSaving(true)
    const { error } = await supabase.from('daily_challenges').insert(schedForm)
    setSaving(false)
    if (error) { flash(error.message, true); return }
    flash('Challenge scheduled!')
    setSchedForm({ image_id: '', challenge_date: '' })
    fetchAll()
  }

  async function handleDeleteImage(id) {
    if (!confirm('Delete this image?')) return
    await supabase.from('images').delete().eq('id', id)
    fetchAll()
  }

  async function handleDeleteChallenge(id) {
    if (!confirm('Remove this scheduled challenge?')) return
    await supabase.from('daily_challenges').delete().eq('id', id)
    fetchAll()
  }

  async function handleToggleActive(id, current) {
    await supabase.from('images').update({ is_active: !current }).eq('id', id)
    fetchAll()
  }

  if (!user || user.email !== ADMIN_EMAIL) return (
    <div className={styles.gate}>
      <p>Sign in to access the admin panel.</p>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.topBar}>
        <h1 className={styles.title}>Admin</h1>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'images' ? styles.active : ''}`} onClick={() => setTab('images')}>
            Images ({images.length})
          </button>
          <button className={`${styles.tab} ${tab === 'schedule' ? styles.active : ''}`} onClick={() => setTab('schedule')}>
            Schedule
          </button>
          <button className={`${styles.tab} ${tab === 'add' ? styles.active : ''}`} onClick={() => setTab('add')}>
            + Add Image
          </button>
        </div>
      </div>

      {msg && (
        <div className={`${styles.msg} ${msg.isError ? styles.msgError : styles.msgOk}`}>
          {msg.text}
        </div>
      )}

      {/* ── Add image ── */}
      {tab === 'add' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Add a new image</h2>
          <form onSubmit={handleAddImage} className={styles.form}>
            <div className={styles.field}>
              <label>Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} placeholder="Moon landing — Buzz Aldrin" />
            </div>
            <div className={styles.field}>
              <label>Image URL * <span className={styles.hint}>(Supabase Storage or direct URL)</span></label>
              <input value={form.source_url} onChange={e => setForm(f => ({...f, source_url: e.target.value}))} placeholder="https://..." />
            </div>
            {form.source_url && (
              <div className={styles.preview}>
                <img src={form.source_url} alt="preview" onError={e => e.target.style.display='none'} />
              </div>
            )}
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Correct Year *</label>
                <input type="number" value={form.correct_year} onChange={e => setForm(f => ({...f, correct_year: e.target.value}))} placeholder="1969" min="1800" max="2020" />
              </div>
              <div className={styles.field}>
                <label>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Difficulty</label>
                <select value={form.difficulty} onChange={e => setForm(f => ({...f, difficulty: e.target.value}))}>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.field}>
              <label>Description <span className={styles.hint}>(shown after guess)</span></label>
              <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={3} placeholder="What happened, when, why it matters..." />
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Attribution</label>
                <input value={form.attribution} onChange={e => setForm(f => ({...f, attribution: e.target.value}))} placeholder="NASA (public domain)" />
              </div>
              <div className={styles.field}>
                <label>License</label>
                <select value={form.license_type} onChange={e => setForm(f => ({...f, license_type: e.target.value}))}>
                  <option value="public_domain">Public domain</option>
                  <option value="cc_by">CC BY</option>
                  <option value="cc_by_sa">CC BY-SA</option>
                  <option value="editorial">Editorial</option>
                </select>
              </div>
            </div>
            <button type="submit" className={styles.btn} disabled={saving}>
              {saving ? 'Saving...' : 'Add image'}
            </button>
          </form>
        </div>
      )}

      {/* ── Schedule ── */}
      {tab === 'schedule' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Schedule a daily challenge</h2>
          <form onSubmit={handleSchedule} className={styles.form}>
            <div className={styles.row}>
              <div className={styles.field} style={{flex:2}}>
                <label>Image</label>
                <select value={schedForm.image_id} onChange={e => setSchedForm(f => ({...f, image_id: e.target.value}))}>
                  <option value="">— Select an image —</option>
                  {images.map(img => (
                    <option key={img.id} value={img.id}>
                      {img.correct_year} — {img.title.slice(0, 60)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Date</label>
                <input type="date" value={schedForm.challenge_date} onChange={e => setSchedForm(f => ({...f, challenge_date: e.target.value}))} min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <button type="submit" className={styles.btn} disabled={saving}>
              {saving ? 'Scheduling...' : 'Schedule challenge'}
            </button>
          </form>

          <h3 className={styles.subTitle}>Upcoming & recent challenges</h3>
          {loading ? <p className={styles.dim}>Loading...</p> : (
            <table className={styles.table}>
              <thead>
                <tr><th>Date</th><th>Image</th><th>Year</th><th>Plays</th><th></th></tr>
              </thead>
              <tbody>
                {challenges.map(c => (
                  <tr key={c.id} className={c.challenge_date === new Date().toISOString().split('T')[0] ? styles.today : ''}>
                    <td>{c.challenge_date}</td>
                    <td>{c.images?.title?.slice(0, 45)}</td>
                    <td>{c.images?.correct_year}</td>
                    <td>{c.plays_count}</td>
                    <td>
                      <button onClick={() => handleDeleteChallenge(c.id)} className={styles.deleteBtn}>✕</button>
                    </td>
                  </tr>
                ))}
                {challenges.length === 0 && <tr><td colSpan={5} className={styles.dim}>No challenges scheduled yet</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Images list ── */}
      {tab === 'images' && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>All images ({images.length})</h2>
          {loading ? <p className={styles.dim}>Loading...</p> : (
            <table className={styles.table}>
              <thead>
                <tr><th>Year</th><th>Title</th><th>Category</th><th>Difficulty</th><th>Active</th><th></th></tr>
              </thead>
              <tbody>
                {images.map(img => (
                  <tr key={img.id}>
                    <td>{img.correct_year}</td>
                    <td>
                      <a href={img.source_url} target="_blank" rel="noreferrer" className={styles.imgLink}>
                        {img.title.slice(0, 50)}
                      </a>
                    </td>
                    <td>{img.category}</td>
                    <td>{img.difficulty}</td>
                    <td>
                      <button onClick={() => handleToggleActive(img.id, img.is_active)} className={`${styles.toggleBtn} ${img.is_active ? styles.on : styles.off}`}>
                        {img.is_active ? 'On' : 'Off'}
                      </button>
                    </td>
                    <td>
                      <button onClick={() => handleDeleteImage(img.id)} className={styles.deleteBtn}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
