const isProd = window.location.hostname === "www.psicotarefas.com.br";

const SUPABASE_URL = isProd
  ? "https://haawjoesqdlccertgpqi.supabase.co"
  : "https://jejrlonadetfetlrqxer.supabase.co";

const SUPABASE_KEY = isProd
  ? "sb_publishable_GsWcsI7pnPuUdW5Wz15YRQ_NbtgGABm"
  : "sb_publishable_MFFMOtnTNy0c1rhu3wmHqg_9zvfDSQA";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

export default supabase;
