// Supabase Edge Function: deletes an account — the caller's own by
// default, or (only for an admin) a target account passed in the body.
//
// This can't be done from the browser — deleting an auth user needs the
// service-role key, which must never reach client code. This function
// runs server-side (in Supabase's own infrastructure), verifies the
// caller's identity from their own session token, and only then uses the
// service-role key (available to it automatically as an environment
// variable, never sent to the browser) to delete the right user.
//
// A request body of { target_user_id } asks to delete someone else's
// account — that's only honored once this function has independently
// checked, server-side, that the CALLER's own profiles.is_admin is true.
// The client can send whatever it wants in the body; it can never claim
// admin status for itself, since that check reads the caller's own row
// under the service-role key, not anything the request asserts.
//
// Deploy via the Supabase dashboard: Edge Functions -> Create a function
// named "delete-account" -> paste this file's contents -> Deploy.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Edge Functions don't add CORS headers on their own — a browser call
// (like supabase-js's functions.invoke) sends a preflight OPTIONS request
// first, and without these headers the browser blocks the real request
// before it ever reaches this function.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Default: delete your own account. A target_user_id in the body asks
  // to delete someone else's — only ever honored after an independent
  // is_admin check below, never on the request's say-so.
  let userIdToDelete = userData.user.id;
  const body = await req.json().catch(() => ({}) as { target_user_id?: string });
  const targetUserId = typeof body?.target_user_id === "string" ? body.target_user_id : null;

  if (targetUserId && targetUserId !== userData.user.id) {
    const { data: callerProfile, error: profileError } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", userData.user.id)
      .single();
    if (profileError || !callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: "Not authorized to delete another account." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    userIdToDelete = targetUserId;
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userIdToDelete);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
