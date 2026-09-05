// Supabase Edge Function: deletes the calling user's own account.
//
// This can't be done from the browser — deleting an auth user needs the
// service-role key, which must never reach client code. This function
// runs server-side (in Supabase's own infrastructure), verifies the
// caller's identity from their own session token, and only then uses the
// service-role key (available to it automatically as an environment
// variable, never sent to the browser) to delete exactly that user.
//
// Deploy via the Supabase dashboard: Edge Functions -> Create a function
// named "delete-account" -> paste this file's contents -> Deploy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Identify the caller using their own token — never trust a user id
  // passed in the request body, since that would let anyone delete
  // anyone else's account.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userData.user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
