// @ts-nocheck -- Deno entrypoint; the portable handler is typechecked and tested by npm test.
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleRecognitionRequest } from "./handler.ts";

const uniMerNetUrl = Deno.env.get("UNIMERNET_URL")?.trim();
const uniMerNetToken = Deno.env.get("UNIMERNET_TOKEN")?.trim();
const unimernet = uniMerNetUrl && uniMerNetToken
  ? { url: uniMerNetUrl, token: uniMerNetToken }
  : undefined;

Deno.serve((request: Request) =>
  handleRecognitionRequest(
    request,
    async (token) => {
      const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await client.auth.getUser(token);
      return !error && !!data.user;
    },
    fetch,
    (metric) => console.info(JSON.stringify(metric)),
    unimernet,
  ),
);
