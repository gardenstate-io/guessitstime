/**
 * GuessItsTime — Wikimedia Bulk Image Importer
 * Run: SUPABASE_SERVICE_KEY=your_key node scripts/bulk-import.mjs
 * Get service key: Supabase Dashboard → Project Settings → API → service_role
 */

import { createClient } from '@supabase/supabase-js'
import https from 'https'
import http from 'http'

const SUPABASE_URL = 'https://awwnjmsvscdrrxtwkprk.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('\n❌  Set SUPABASE_SERVICE_KEY env variable first.')
  console.error('    Get it: Supabase → Project Settings → API → service_role key\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const IMAGES = [
  { title:'Moon landing — Buzz Aldrin', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/9/9c/Aldrin_Apollo_11_original.jpg', correct_year:1969, category:'technology', difficulty:'medium', description:'Buzz Aldrin stands on the lunar surface during Apollo 11 on July 20, 1969 — the first crewed Moon landing.', attribution:'NASA (public domain)' },
  { title:'First powered flight — Wright Brothers', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/8/87/Wrightflyer.jpg', correct_year:1903, category:'technology', difficulty:'easy', description:'Orville Wright pilots the Flyer at Kitty Hawk, NC — the first successful powered airplane flight, lasting 12 seconds.', attribution:'Library of Congress (public domain)' },
  { title:'D-Day — Normandy beach landings', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg', correct_year:1944, category:'war', difficulty:'easy', description:'US troops wade ashore at Omaha Beach, Normandy on June 6, 1944 — the largest seaborne invasion in history.', attribution:'US National Archives (public domain)' },
  { title:'V-J Day kiss in Times Square', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/9/95/Legendary_kiss_V-J_day_in_Times_Square_Alfred_Eisenstaedt.jpg', correct_year:1945, category:'culture', difficulty:'easy', description:'A sailor kisses a woman in Times Square on August 14, 1945, celebrating the end of World War II.', attribution:'Alfred Eisenstaedt / LIFE (public domain)' },
  { title:'Raising the flag on Iwo Jima', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/b/b0/The_raising_of_the_flag_on_Iwo_Jima%2C_Feb._23%2C_1945_-_NARA_-_520748.jpg', correct_year:1945, category:'war', difficulty:'easy', description:'US Marines raise the flag atop Mount Suribachi during the Battle of Iwo Jima, February 23, 1945.', attribution:'Joe Rosenthal / AP (public domain)' },
  { title:'Berlin Wall falls', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/b/be/Mauer.jpg', correct_year:1989, category:'politics', difficulty:'medium', description:'East and West Germans celebrate atop the Berlin Wall on November 9, 1989 — ending 28 years of division.', attribution:'Wikimedia Commons (public domain)' },
  { title:'Martin Luther King Jr. — I Have a Dream', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/4/4a/Martin_Luther_King_Jr_NYWTS.jpg', correct_year:1963, category:'politics', difficulty:'easy', description:'Martin Luther King Jr. delivers his "I Have a Dream" speech to 250,000 people at the Lincoln Memorial.', attribution:'Library of Congress (public domain)' },
  { title:'JFK motorcade — Dallas', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/b/b4/Kennedy_motorcade_dallas.png', correct_year:1963, category:'politics', difficulty:'easy', description:'President Kennedy\'s motorcade moves through Dealey Plaza minutes before his assassination on November 22, 1963.', attribution:'Walt Cisco / Dallas Morning News (public domain)' },
  { title:'Hindenburg disaster', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/1/15/Hindenburg_disaster.jpg', correct_year:1937, category:'general', difficulty:'easy', description:'The German airship LZ 129 Hindenburg catches fire while docking in Lakehurst, NJ on May 6, 1937.', attribution:'Sam Shere (public domain)' },
  { title:'Atomic bomb mushroom cloud — Nagasaki', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/e/e1/Nagasakibomb.jpg', correct_year:1945, category:'war', difficulty:'medium', description:'The mushroom cloud from the Fat Man atomic bomb rises over Nagasaki, Japan on August 9, 1945.', attribution:'Charles Levy / US Army (public domain)' },
  { title:'RMS Titanic departing Southampton', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/f/fd/RMS_Titanic_3.jpg', correct_year:1912, category:'general', difficulty:'medium', description:'RMS Titanic departs Southampton on April 10, 1912 — four days before sinking in the North Atlantic.', attribution:'F.G.O. Stuart (public domain)' },
  { title:'Charles Lindbergh and Spirit of St. Louis', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/0/00/Charles_Lindbergh_and_the_Spirit_of_St._Louis_%28Underwood_%26_Underwood%29.jpg', correct_year:1927, category:'technology', difficulty:'medium', description:'Lindbergh poses with the Spirit of St. Louis before completing the first solo nonstop transatlantic flight.', attribution:'Underwood & Underwood (public domain)' },
  { title:'Jesse Owens — 1936 Berlin Olympics', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/b/b7/Jesse_Owens2.jpg', correct_year:1936, category:'sports', difficulty:'medium', description:'Jesse Owens at the 1936 Berlin Olympics, where he won four gold medals in front of Adolf Hitler.', attribution:'Bundesarchiv (public domain)' },
  { title:'Muhammad Ali vs Sonny Liston', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/b/b3/CassiusClay_SonnyListon.jpg', correct_year:1965, category:'sports', difficulty:'medium', description:'Muhammad Ali stands over knocked-down Sonny Liston in the first round of their rematch, May 25, 1965.', attribution:'Associated Press (public domain)' },
  { title:'Babe Ruth batting', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/1/13/Babe_Ruth2.jpg', correct_year:1920, category:'sports', difficulty:'hard', description:'Babe Ruth at bat during his legendary career with the New York Yankees, where he hit 714 career home runs.', attribution:'Library of Congress (public domain)' },
  { title:'Albert Einstein portrait', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/d/d3/Albert_Einstein_Head.jpg', correct_year:1921, category:'general', difficulty:'hard', description:'Albert Einstein, photographed around 1921 — the year he won the Nobel Prize in Physics.', attribution:'Ferdinand Schmutzer (public domain)' },
  { title:'Amelia Earhart with her Lockheed Electra', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/9/98/Amelia_Earhart_standing_under_nose_of_her_Lockheed_Model_10-E_Electra%2C_small.jpg', correct_year:1937, category:'technology', difficulty:'hard', description:'Amelia Earhart stands with her Lockheed Electra before her ill-fated attempt to circumnavigate the globe.', attribution:'Purdue University Libraries (public domain)' },
  { title:'Nelson Mandela — first presidential election', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/0/02/Nelson_Mandela_1994.jpg', correct_year:1994, category:'politics', difficulty:'hard', description:'Nelson Mandela, photographed in 1994 — the year he became South Africa\'s first democratically elected president.', attribution:'Wikimedia Commons (public domain)' },
  { title:'Oldest known photograph — View from Le Gras', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/5/5c/Niepce_Restoration.jpg', correct_year:1826, category:'technology', difficulty:'hard', description:'The oldest surviving photograph, taken by Nicéphore Niépce in 1826 using an 8-hour exposure.', attribution:'Nicéphore Niépce (public domain)' },
  { title:'First Model T Ford rolls off assembly line', wikimedia_url:'https://upload.wikimedia.org/wikipedia/commons/1/16/1910Ford-T.jpg', correct_year:1908, category:'technology', difficulty:'hard', description:'The Ford Model T, introduced in 1908 — the first automobile mass-produced on a moving assembly line.', attribution:'Wikimedia Commons (public domain)' },
]

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    const req = protocol.get(url, { headers: { 'User-Agent': 'GuessItsTime/1.0 historical-photo-game' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject)
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] }))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)
}

function ext(url, ct) {
  if (url.match(/\.png/i) || ct?.includes('png')) return 'png'
  return 'jpg'
}

async function run() {
  console.log(`\n🕰️  GuessItsTime Bulk Importer — ${IMAGES.length} images\n`)
  let ok=0, skip=0, fail=0

  for (const img of IMAGES) {
    process.stdout.write(`  ${img.correct_year}  ${img.title.slice(0,50).padEnd(50)} `)

    const { data: existing } = await supabase.from('images').select('id').eq('title', img.title).maybeSingle()
    if (existing) { console.log('⏭  exists'); skip++; continue }

    try {
      const { buffer, contentType } = await fetchBuffer(img.wikimedia_url)
      const filename = `${img.correct_year}-${slugify(img.title)}.${ext(img.wikimedia_url, contentType)}`

      const { error: upErr } = await supabase.storage.from('images').upload(filename, buffer, {
        contentType: contentType || 'image/jpeg', upsert: true
      })
      if (upErr) throw new Error(upErr.message)

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filename)

      const { error: dbErr } = await supabase.from('images').insert({
        title: img.title, source_url: publicUrl, correct_year: img.correct_year,
        category: img.category, difficulty: img.difficulty,
        description: img.description, attribution: img.attribution,
        license_type: 'public_domain', is_active: true
      })
      if (dbErr) throw new Error(dbErr.message)

      console.log('✅'); ok++
    } catch(e) {
      console.log(`❌ ${e.message.slice(0,40)}`); fail++
    }

    await new Promise(r => setTimeout(r, 600))
  }

  console.log(`\n  ✅ ${ok} imported   ⏭  ${skip} skipped   ❌ ${fail} failed`)
  console.log(`\n  Next: schedule challenges in Supabase SQL Editor`)
  console.log(`  select id, title, correct_year from public.images order by correct_year;\n`)
}

run().catch(console.error)
