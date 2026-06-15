import { createClient } from "@supabase/supabase-js";

// Backend Supabase compartilhado com o projeto original "Cotação Bebidas".
// A anon key é pública (publishable) — segura no código.
const SUPABASE_URL = "https://ztnyvrmiwmrqhquavfhl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0bnl2cm1pd21ycWhxdWF2ZmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTEyMTYsImV4cCI6MjA5MzI4NzIxNn0.GuWFB1xy1ycIBvhqTi2QLJzjdAVFV65cqykkEZT-jDA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});