import { createBrowserClient } from "@supabase/ssr";

const DEFAULT_SUPABASE_URL = "https://mblluezhnfvziztmnwvb.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_IEnOi2N5FLI43GXME69eeA_9WbHXkI3";

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_KEY,
  );
