const SUPABASE_URL = "https://haawjoesqdlccertgpqi.supabase.co";
const SUPABASE_KEY = "sb_publishable_GsWcsI7pnPuUdW5Wz15YRQ_NbtgGABm";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export default supabase;
