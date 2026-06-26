# GuessItsTime

A daily historical photo guessing game. One image per day — guess the year it was taken.

## Tech Stack
- React + Vite
- Supabase (Postgres + Auth + Storage)
- Vercel (hosting)

## Local Development

```bash
npm install
npm run dev
```

Make sure `.env.local` has your Supabase credentials:
```
VITE_SUPABASE_URL=https://awwnjmsvscdrrxtwkprk.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Deploy

Push to `main` branch — Vercel auto-deploys.

```bash
git add .
git commit -m "your message"
git push origin main
```

## Scheduling Daily Challenges

In Supabase SQL Editor, run:
```sql
insert into public.daily_challenges (image_id, challenge_date)
values ('<image_uuid>', '2026-06-27');
```

Or use the admin panel (coming in V2).

## Project Structure
```
src/
  components/
    Header.jsx        — Nav + auth
    Header.module.css
    Game.jsx          — Core game loop
    Game.module.css
  hooks/
    useAuth.js        — Supabase auth hook
  lib/
    supabase.js       — Supabase client
    score.js          — Score calculation + share text
  App.jsx
  main.jsx
  index.css
```
