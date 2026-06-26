-- Run this in Supabase SQL Editor AFTER running bulk-import.mjs
-- This schedules the next 30 days of challenges automatically
-- using a random selection of your available images

insert into public.daily_challenges (image_id, challenge_date)
select 
  id as image_id,
  (current_date + (row_number() over (order by random()) - 1) * interval '1 day')::date as challenge_date
from public.images
where is_active = true
  and id not in (select image_id from public.daily_challenges)
limit 30
on conflict (challenge_date) do nothing;

-- Check what got scheduled:
select 
  dc.challenge_date,
  i.title,
  i.correct_year,
  i.category,
  i.difficulty
from public.daily_challenges dc
join public.images i on i.id = dc.image_id
where dc.challenge_date >= current_date
order by dc.challenge_date;
