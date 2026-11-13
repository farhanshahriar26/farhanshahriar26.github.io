/* =====================================================================
   Agroscope · backend configuration
   ---------------------------------------------------------------------
   ── Live Supabase (recommended for production) ──────────────────────
   Fill these two values in after creating your Supabase project:

     Supabase Dashboard → Project Settings → API
       · Project URL   →  SUPABASE_URL      (e.g. "https://abcdxyz.supabase.co")
       · anon public   →  SUPABASE_ANON_KEY (starts with "eyJhbGciOi…")

   The anon key is SAFE to publish: every table is protected by Row Level
   Security (see supabase/schema.sql), so a visitor can only ever read and
   write their own rows.  NEVER put the service_role key in this file.

   You can also set the values WITHOUT editing this file (handy for dev):
     localStorage.setItem("agroscope_sb_url",  "https://….supabase.co")
     localStorage.setItem("agroscope_sb_key",  "eyJ…")
   ── Local demo mode (default when unconfigured) ─────────────────────
   AUTH_MODE: "auto"      → use Supabase when configured; otherwise run
                            a fully local demo backend (register, log in,
                            save your farm, analyses & plans — data stays
                            in this browser's localStorage).
             : "supabase" → require a live Supabase project; the Log in
                            button then shows the setup help panel.
             : "off"      → accounts disabled entirely.
   A status pill in the account menu shows which mode is active.
   ===================================================================== */

window.AG_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  /* Where Supabase sends the user after they click the password-reset link
     in their e-mail. Must match a page that hosts Agroscope. */
  RESET_REDIRECT: "",

  /* Supabase Auth JS (UMD build — no bundler required). */
  SUPABASE_SCRIPT: "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js",

  /* "auto" | "supabase" | "off" — see header comment. */
  AUTH_MODE: "auto",

  /* Show a "Continue with Google" button in the auth modal.
     Requires the Google provider to be enabled in Supabase → Auth →
     Providers, and live SUPABASE_URL / SUPABASE_ANON_KEY above. */
  GOOGLE_OAUTH: false
};

/* dev overrides — configure without touching this file */
try {
  var _sbUrl = window.localStorage.getItem("agroscope_sb_url");
  var _sbKey = window.localStorage.getItem("agroscope_sb_key");
  if (_sbUrl) window.AG_CONFIG.SUPABASE_URL = _sbUrl;
  if (_sbKey) window.AG_CONFIG.SUPABASE_ANON_KEY = _sbKey;
} catch (e) {}
