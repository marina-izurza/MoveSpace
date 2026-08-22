// Supabase Auth's password sign-in only accepts an email (or phone), never an arbitrary
// unique field — so logging in with a username means resolving it to the account's email
// here, server-side, then running the exact same signInWithPassword Supabase would run
// for an email login. The password is never stored, only relayed into that call.
//
// Requires SUPABASE_SERVICE_ROLE_KEY in the Vercel project environment (already set for
// delete-account.js) — reading another user's email needs it, the anon key cannot.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://exllwrslkbdcojufpbcm.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_FG--J41NAzG8jkjtdvNrqA_T5erpghq';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

module.exports = async (req, res) => {
  // Same reason as delete-account.js: the native app calls this cross-origin
  // (https://localhost → this domain), and a JSON POST body forces a preflight.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'not_configured' });
  }

  const { username, password } = req.body ?? {};
  if (typeof username !== 'string' || typeof password !== 'string' || !USERNAME_PATTERN.test(username) || !password) {
    // Same response as a real-but-wrong username: shape must not leak which case this is.
    return res.status(401).json({ error: 'invalid_credentials' });
  }

  try {
    const anon = createClient(SUPABASE_URL, ANON_KEY);

    const { data: userId, error: lookupErr } = await anon.rpc('get_user_id_by_username', { p_username: username });
    if (lookupErr) throw lookupErr;
    if (!userId) return res.status(401).json({ error: 'invalid_credentials' });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
    const email = userData?.user?.email;
    if (userErr || !email) return res.status(401).json({ error: 'invalid_credentials' });

    // The actual check: this is Supabase's own password verification, not a bypass of it.
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (error || !data.session) return res.status(401).json({ error: 'invalid_credentials' });

    return res.status(200).json({ session: data.session });
  } catch {
    return res.status(500).json({ error: 'login_failed' });
  }
};
