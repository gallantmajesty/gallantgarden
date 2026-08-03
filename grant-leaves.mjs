// Grant free leaves to player 801047185 (dev/test gift).
//   +10,000 normal leaves (xp)
//   +10,000 golden leaves (premium_xp)
//   +20,000 lifetime rank XP (rank_xp)
//
// Run: node grant-leaves.mjs
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from .env.local.
// NOTE: the anon key can't run DDL — if rank_xp is missing, apply
// migrations/20260803010000_grant-free-leaves-801047185.sql in the SQL editor.

import { readFileSync, existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const PLAYER_ID = 801047185;
const NORMAL_LEAVES = 10000;
const GOLDEN_LEAVES = 10000;

function loadEnv() {
  const file = new URL('./.env.local', import.meta.url);
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.trim().match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, anon);

const { data: found, error: findErr } = await supabase
  .from('profiles')
  .select('id, player_id, display_name, xp, premium_xp, rank_xp')
  .eq('player_id', PLAYER_ID)
  .maybeSingle();

if (findErr) {
  // rank_xp column may not exist yet on the live DB.
  if (findErr.code === '42703' || /rank_xp/.test(findErr.message)) {
    console.error('rank_xp column is missing on the live database.');
    console.error('Run this in the Supabase SQL editor first:');
    console.error('  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rank_xp integer NOT NULL DEFAULT 0;');
    console.error('  UPDATE profiles SET rank_xp = xp + premium_xp WHERE rank_xp = 0 AND (xp > 0 OR premium_xp > 0);');
  } else {
    console.error('Lookup error:', findErr.message);
  }
  process.exit(1);
}
if (!found) {
  console.error(`No profile found with player_id = ${PLAYER_ID}`);
  process.exit(1);
}

const before = {
  xp: found.xp ?? 0,
  premium_xp: found.premium_xp ?? 0,
  rank_xp: found.rank_xp ?? 0,
};

const { error: updErr } = await supabase
  .from('profiles')
  .update({
    xp: before.xp + NORMAL_LEAVES,
    premium_xp: before.premium_xp + GOLDEN_LEAVES,
    rank_xp: before.rank_xp + NORMAL_LEAVES + GOLDEN_LEAVES,
  })
  .eq('player_id', PLAYER_ID);

if (updErr) {
  console.error('Update error:', updErr.message);
  process.exit(1);
}

console.log(`✅ Credited player ${PLAYER_ID} (${found.display_name || 'Explorer'}):`);
console.log(`   xp         ${before.xp}      -> ${before.xp + NORMAL_LEAVES}   (+${NORMAL_LEAVES} normal leaves)`);
console.log(`   premium_xp ${before.premium_xp} -> ${before.premium_xp + GOLDEN_LEAVES}   (+${GOLDEN_LEAVES} golden leaves)`);
console.log(`   rank_xp    ${before.rank_xp} -> ${before.rank_xp + NORMAL_LEAVES + GOLDEN_LEAVES}   (+${NORMAL_LEAVES + GOLDEN_LEAVES} lifetime rank XP)`);
