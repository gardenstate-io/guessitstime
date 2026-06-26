/**
 * GuessItsTime — Wikimedia Commons Auto-Harvester (v2 — rate-limit safe)
 * Pulls 1000+ public domain historical images automatically
 *
 * Run: SUPABASE_SERVICE_KEY=your_key node scripts/harvest-wikimedia.mjs
 */

import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'

const SUPABASE_URL = 'https://awwnjmsvscdrrxtwkprk.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('\n❌  Set SUPABASE_SERVICE_KEY env variable first.')
  console.error('    Supabase → Project Settings → API → service_role key\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── Wikimedia categories to harvest ──────────────────────────────────────
const HARVEST_TARGETS = [
  // Wars
  { cat: 'World_War_I', our: 'war', diff: 'medium', era: [1914,1918] },
  { cat: 'World_War_II', our: 'war', diff: 'medium', era: [1939,1945] },
  { cat: 'American_Civil_War', our: 'war', diff: 'hard', era: [1861,1865] },
  { cat: 'Vietnam_War', our: 'war', diff: 'medium', era: [1955,1975] },
  { cat: 'Korean_War', our: 'war', diff: 'hard', era: [1950,1953] },

  // Politics & History
  { cat: 'Great_Depression', our: 'general', diff: 'medium', era: [1929,1939] },
  { cat: 'Cold_War', our: 'politics', diff: 'medium', era: [1947,1991] },
  { cat: 'Civil_rights_movement', our: 'politics', diff: 'medium', era: [1954,1968] },
  { cat: 'Space_Race', our: 'technology', diff: 'medium', era: [1957,1972] },

  // Technology
  { cat: 'History_of_aviation', our: 'technology', diff: 'hard', era: [1900,1970] },
  { cat: 'History_of_the_automobile', our: 'technology', diff: 'hard', era: [1885,1960] },
  { cat: 'History_of_computing', our: 'technology', diff: 'hard', era: [1940,1990] },
  { cat: 'History_of_radio', our: 'technology', diff: 'hard', era: [1895,1950] },

  // Sports
  { cat: 'Olympic_Games', our: 'sports', diff: 'medium', era: [1896,2000] },
  { cat: 'History_of_baseball', our: 'sports', diff: 'hard', era: [1870,1970] },
  { cat: 'History_of_boxing', our: 'sports', diff: 'hard', era: [1880,1980] },

  // Culture
  { cat: 'History_of_fashion', our: 'culture', diff: 'medium', era: [1850,1980] },
  { cat: 'Silent_film', our: 'culture', diff: 'hard', era: [1890,1930] },
  { cat: 'Jazz_Age', our: 'culture', diff: 'hard', era: [1920,1940] },

  // General history
  { cat: 'Victorian_era', our: 'general', diff: 'hard', era: [1837,1901] },
  { cat: 'Edwardian_era', our: 'general', diff: 'hard', era: [1901,1910] },
  { cat: 'Roaring_Twenties', our: 'culture', diff: 'medium', era: [1920,1929] },
  { cat: 'History_of_New_York_City', our: 'general', diff: 'medium', era: [1850,1980] },
  { cat: 'History_of_London', our: 'general', diff: 'hard', era: [1850,1980] },
  { cat: 'Ellis_Island', our: 'general', diff: 'hard', era: [1892,1954] },
  { cat: 'Dust_Bowl', our: 'general', diff: 'medium', era: [1930,1940] },
]

const IMAGES_PER_CATEGORY = 40
const TARGET_TOTAL = 1000
const BASE_DELAY_MS = 2000   // 2s between requests — well under Wikimedia's rate limit
const RETRY_DELAY_MS = 30000 // 30s wait on 429

// ─── Helpers ───────────────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

function get(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const req = proto.get(url, {
      headers: {
        'User-Agent': 'GuessItsTime/1.0 (historical-photo-game; https://guessitstime.vercel.app; contact: umbhatt18@gmail.com)',
        'Accept': 'application/json'
      }
    }, async res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location, retries).then(resolve).catch(reject)
      }
      if (res.statusCode === 429) {
        res.resume()
        if (retries > 0) {
          console.log(`\n   ⏳ Rate limited — waiting ${RETRY_DELAY_MS/1000}s...`)
          await delay(RETRY_DELAY_MS)
          return get(url, retries - 1).then(resolve).catch(reject)
        }
        return reject(new Error('HTTP 429'))
      }
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { resolve(null) }
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function fetchBinary(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const req = proto.get(url, {
      headers: { 'User-Agent': 'GuessItsTime/1.0 (historical-photo-game; https://guessitstime.vercel.app)' }
    }, async res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBinary(res.headers.location, retries).then(resolve).catch(reject)
      }
      if (res.statusCode === 429) {
        res.resume()
        if (retries > 0) {
          await delay(RETRY_DELAY_MS)
          return fetchBinary(url, retries - 1).then(resolve).catch(reject)
        }
        reject(new Error('HTTP 429')); return
      }
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode}`)); return
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Download timeout')) })
  })
}

function extractYear(text) {
  if (!text) return null
  const matches = text.match(/\b(1[89]\d{2}|200\d|201[0])\b/g)
  if (!matches) return null
  const counts = {}
  matches.forEach(y => counts[y] = (counts[y] || 0) + 1)
  return parseInt(Object.entries(counts).sort((a,b) => b[1]-a[1])[0][0])
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 70)
}

function getExt(url, ct) {
  if (url?.match(/\.png/i) || ct?.includes('png')) return 'png'
  if (url?.match(/\.gif/i) || ct?.includes('gif')) return 'gif'
  return 'jpg'
}

// ─── Wikimedia API calls ───────────────────────────────────────────────────
async function getCategoryImages(category, limit = 50) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmtype=file&cmlimit=${limit}&cmnamespace=6&format=json`
  const data = await get(url)
  return data?.query?.categorymembers?.map(m => m.title) || []
}

async function getImageInfo(titles) {
  const titleStr = titles.slice(0, 10).join('|')
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(titleStr)}&prop=imageinfo|revisions&iiprop=url|size|mediatype|extmetadata&rvprop=content&format=json`
  const data = await get(url)
  if (!data?.query?.pages) return []

  return Object.values(data.query.pages).map(page => {
    const info = page.imageinfo?.[0]
    const meta = info?.extmetadata || {}
    const desc = meta.ImageDescription?.value?.replace(/<[^>]+>/g, '') || ''
    const cats = meta.Categories?.value || ''
    const license = (meta.LicenseShortName?.value || '').toLowerCase()
    const artist = meta.Artist?.value?.replace(/<[^>]+>/g, '') || ''
    const dateStr = meta.DateTimeOriginal?.value || meta.DateTime?.value || ''

    const isPD = license.includes('public domain') ||
                 license.includes('pd-') ||
                 license.includes('cc0') ||
                 license.includes('no restrictions')

    const imgUrl = info?.url || ''
    const isPhoto = imgUrl.match(/\.(jpg|jpeg|png)$/i) &&
                    !imgUrl.toLowerCase().includes('diagram') &&
                    !imgUrl.toLowerCase().includes('map') &&
                    !imgUrl.toLowerCase().includes('logo') &&
                    !imgUrl.toLowerCase().includes('icon') &&
                    (info?.width || 0) > 400 &&
                    (info?.height || 0) > 300

    const year = extractYear(dateStr) ||
                 extractYear(desc) ||
                 extractYear(page.title) ||
                 extractYear(cats)

    return {
      title: page.title?.replace('File:', '').replace(/\.(jpg|jpeg|png|gif)/i, ''),
      url: imgUrl,
      desc: desc.slice(0, 400),
      artist: artist.slice(0, 100),
      year,
      isPD,
      isPhoto,
      width: info?.width,
      height: info?.height
    }
  }).filter(i => i.isPD && i.isPhoto && i.year && i.url)
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function run() {
  console.log(`\n🕰️  GuessItsTime — Wikimedia Harvester (rate-limit safe)`)
  console.log(`   Target: ${TARGET_TOTAL} images`)
  console.log(`   Delay: ${BASE_DELAY_MS}ms between requests\n`)

  const { data: existing } = await supabase.from('images').select('title')
  const existingTitles = new Set((existing || []).map(r => r.title))
  console.log(`   Existing images: ${existingTitles.size}\n`)

  let totalImported = 0
  let totalSkipped  = 0
  let totalFailed   = 0

  for (const target of HARVEST_TARGETS) {
    if (totalImported >= TARGET_TOTAL) break

    console.log(`\n📂 ${target.cat} (${target.our}, ${target.diff})`)

    try {
      const files = await getCategoryImages(target.cat, IMAGES_PER_CATEGORY)
      await delay(BASE_DELAY_MS)

      if (!files.length) { console.log('   No files found'); continue }

      for (let i = 0; i < files.length; i += 10) {
        if (totalImported >= TARGET_TOTAL) break
        const batch = files.slice(i, i + 10)

        let infos
        try {
          infos = await getImageInfo(batch)
          await delay(BASE_DELAY_MS)
        } catch(e) {
          console.log(`   Batch error: ${e.message}`)
          await delay(BASE_DELAY_MS * 2)
          continue
        }

        for (const img of infos) {
          if (totalImported >= TARGET_TOTAL) break

          if (img.year < target.era[0] - 5 || img.year > target.era[1] + 5) continue

          if (existingTitles.has(img.title)) { totalSkipped++; continue }

          process.stdout.write(`   ${img.year}  ${img.title.slice(0, 45).padEnd(45)} `)

          try {
            const { buffer, contentType } = await fetchBinary(img.url)

            // Validate it's actually an image (not an error page)
            if (!contentType?.includes('image')) {
              throw new Error(`Not an image: ${contentType}`)
            }

            const ext = getExt(img.url, contentType)
            const filename = `${img.year}-${slugify(img.title)}.${ext}`

            const { error: upErr } = await supabase.storage
              .from('images')
              .upload(filename, buffer, { contentType: contentType || 'image/jpeg', upsert: true })

            if (upErr && !upErr.message?.includes('already exists')) {
              throw new Error(upErr.message)
            }

            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filename)

            const { error: dbErr } = await supabase.from('images').insert({
              title:        img.title.slice(0, 200),
              source_url:   publicUrl,
              correct_year: img.year,
              category:     target.our,
              difficulty:   img.year < 1920 ? 'hard' : img.year < 1960 ? 'medium' : 'easy',
              description:  img.desc || `Historical photograph from ${img.year}.`,
              attribution:  img.artist || 'Wikimedia Commons (public domain)',
              license_type: 'public_domain',
              is_active:    true
            })

            if (dbErr) throw new Error(dbErr.message)

            existingTitles.add(img.title)
            console.log('✅')
            totalImported++

          } catch(e) {
            console.log(`❌ ${e.message.slice(0, 40)}`)
            totalFailed++
          }

          await delay(BASE_DELAY_MS)
        }

        await delay(BASE_DELAY_MS)
      }
    } catch(e) {
      console.log(`   Category error: ${e.message}`)
      await delay(BASE_DELAY_MS * 3)
    }
  }

  console.log(`\n${'─'.repeat(50)}`)
  console.log(`✅ Imported : ${totalImported}`)
  console.log(`⏭  Skipped  : ${totalSkipped}`)
  console.log(`❌ Failed   : ${totalFailed}`)
  console.log(`📦 Total in DB: ${existingTitles.size}`)
  console.log(`\nRun scripts/schedule-challenges.sql to schedule challenges.\n`)
}

run().catch(console.error)
