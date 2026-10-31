import { createServerOnlyFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { familyRequestUrl } from "./database-target";

export const getFamilyDatabase = createServerOnlyFn(async () => {
  // Never switch the managed preview/live site merely because transfer credentials exist.
  if (process.env["VERCEL"] !== "1") {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }
  const url = process.env["EXTERNAL_SUPABASE_URL"];
  const key = process.env["EXTERNAL_SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("إعدادات قاعدة البيانات الخارجية غير مكتملة في Vercel");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => {
        const request = input instanceof Request ? input : undefined;
        const headers = new Headers(request?.headers);
        new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        const target = familyRequestUrl(request?.url ?? String(input), true);
        return fetch(request ? new Request(target, request) : target, { ...init, headers });
      },
    },
  });
});