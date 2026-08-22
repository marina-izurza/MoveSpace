// Deleting an auth user needs the service_role key, which bypasses RLS and must never reach
// the browser — so it happens here, server-side, and never in the app bundle.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in the Vercel project environment.
// Project Settings → Environment Variables. Do not commit it.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://exllwrslkbdcojufpbcm.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_FG--J41NAzG8jkjtdvNrqA_T5erpghq';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Child rows first: a foreign key without ON DELETE CASCADE would otherwise block the delete
// or leave the data orphaned but still counted.
const OWNED_TABLES = ['exercises', 'sections', 'routine_likes', 'workout_sessions', 'routines'];

module.exports = async (req, res) => {
  // The native app is served from https://localhost, a different origin than this
  // function — the Authorization header alone forces the browser to preflight with
  // OPTIONS, which must get an explicit answer or the real POST never goes out.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!SERVICE_ROLE_KEY) {
    // Loud on purpose: silently doing nothing would look like the account was deleted.
    return res.status(500).json({ error: 'not_configured' });
  }

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_token' });

  try {
    // The token decides whose account this is. Never trust a user id from the body.
    const anon = createClient(SUPABASE_URL, ANON_KEY);
    const { data: { user }, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !user) return res.status(401).json({ error: 'invalid_token' });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // routines is the only table carrying user_id; the rest hang off it.
    const { data: routines, error: listErr } = await admin
      .from('routines').select('id').eq('user_id', user.id);
    if (listErr) throw listErr;
    const routineIds = (routines ?? []).map(r => r.id);

    for (const table of OWNED_TABLES) {
      let query = admin.from(table).delete();
      if (table === 'routines') query = query.eq('user_id', user.id);
      else if (table === 'routine_likes' || table === 'workout_sessions') query = query.eq('user_id', user.id);
      else if (routineIds.length) query = query.in('routine_id', routineIds);
      else continue;

      const { error } = await query;
      if (error) throw error;
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) throw delErr;

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'delete_failed', detail: String(err?.message ?? err) });
  }
};
