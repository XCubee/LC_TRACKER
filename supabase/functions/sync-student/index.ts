// supabase/functions/sync-student/index.ts
//
// Deploy with: supabase functions deploy sync-student
//
// Two ways this gets called:
//   1. On-demand from the frontend, right after a student registers,
//      with { "username": "someUser" } in the POST body — fetches +
//      stores just that one student.
//   2. On a schedule (pg_cron, see supabase/migrations/0002_cron.sql),
//      with no body / { "all": true } — loops over every active
//      student and refreshes everyone. This is what makes daily/weekly
//      deltas meaningful, since it guarantees a snapshot row per day.
//
// This function is the ONLY thing that talks to the LeetCode API. It
// runs on Supabase's edge runtime (Deno), so the browser never calls
// LeetCode directly and there's no CORS problem.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// --- swap this one function if your LeetCode API source is different ---
const LEETCODE_API_BASE = "https://leetcode-api-faisalshohag.vercel.app";

async function fetchLeetCodeStats(username: string) {
  const res = await fetch(`${LEETCODE_API_BASE}/${encodeURIComponent(username)}`);
  if (!res.ok) {
    throw new Error(`LeetCode API returned ${res.status} for "${username}"`);
  }
  const data = await res.json();

  // Normalize whatever shape the upstream API gives us into a flat record.
  // The faisalshohag API returns: totalSolved, easySolved, mediumSolved,
  // hardSolved, ranking, submissionCalendar (epoch-seconds -> count map).
  return {
    easySolved: data.easySolved ?? 0,
    mediumSolved: data.mediumSolved ?? 0,
    hardSolved: data.hardSolved ?? 0,
    totalSolved: data.totalSolved ?? 0,
    ranking: data.ranking ?? null,
    raw: data,
  };
}
// -------------------------------------------------------------------

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function syncOne(student: { id: string; leetcode_username: string }) {
  try {
    const stats = await fetchLeetCodeStats(student.leetcode_username);

    const { error } = await supabaseAdmin.from("snapshots").upsert(
      {
        student_id: student.id,
        captured_on: new Date().toISOString().slice(0, 10),
        easy_solved: stats.easySolved,
        medium_solved: stats.mediumSolved,
        hard_solved: stats.hardSolved,
        total_solved: stats.totalSolved,
        ranking: stats.ranking,
        raw: stats.raw,
      },
      { onConflict: "student_id,captured_on" }
    );

    if (error) throw error;
    return { username: student.leetcode_username, ok: true };
  } catch (err) {
    return { username: student.leetcode_username, ok: false, error: String(err) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine, e.g. cron calls with no payload
    }

    if (body.username) {
      // --- single-student sync (called right after registration) ---
      const { data: student, error } = await supabaseAdmin
        .from("students")
        .select("id, leetcode_username")
        .eq("leetcode_username", body.username)
        .single();

      if (error || !student) {
        return new Response(
          JSON.stringify({ error: `Student "${body.username}" not found.` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await syncOne(student);
      return new Response(JSON.stringify(result), {
        status: result.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- bulk sync (cron job, or manual "refresh all" trigger) ---
    const { data: allStudents, error } = await supabaseAdmin
      .from("students")
      .select("id, leetcode_username")
      .eq("is_active", true);

    if (error) throw error;

    const results = await Promise.all((allStudents ?? []).map(syncOne));

    return new Response(JSON.stringify({ count: results.length, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
