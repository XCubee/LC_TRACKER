// src/services/students.js
import { getSupabase } from './supabaseClient';

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateFromEpochSeconds(seconds) {
  return formatLocalDate(new Date(Number(seconds) * 1000));
}

function sumSubmissionCalendar(raw, startDate, endDate) {
  const calendar = raw?.submissionCalendar ?? {};

  return Object.entries(calendar).reduce((sum, [epochSeconds, count]) => {
    const date = dateFromEpochSeconds(epochSeconds);
    if (date < startDate || date > endDate) return sum;
    return sum + Number(count || 0);
  }, 0);
}

function diffSnapshot(current, baseline, key) {
  if (!current || !baseline) return 0;
  return Math.max(0, Number(current[key] ?? 0) - Number(baseline[key] ?? 0));
}

function latestOnOrBefore(snapshots, date) {
  return snapshots.find((snapshot) => snapshot.captured_on <= date) ?? null;
}

/**
 * Registers a new student. Triggers an immediate sync via the edge
 * function right after, so they appear with real data instantly
 * instead of waiting for the next cron run.
 */
export async function registerStudent(username, displayName) {
  const supabase = getSupabase();
  const cleanUsername = username.trim();
  if (!cleanUsername) throw new Error('LeetCode username is required.');

  const { data, error } = await supabase
    .from('students')
    .insert({
      leetcode_username: cleanUsername,
      display_name: displayName?.trim() || cleanUsername,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`"${cleanUsername}" is already on the leaderboard.`);
    }
    throw error;
  }

  // Fire-and-forget initial sync so the student isn't stuck at 0 until
  // the next scheduled run.
  await syncStudent(cleanUsername);

  return data;
}

/**
 * Calls the sync-student edge function for one username.
 */
export async function syncStudent(username) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('sync-student', {
    body: { username },
  });
  if (error) {
    throw new Error(
      'Stats sync failed because the Supabase Edge Function "sync-student" is not deployed or returned an error. Deploy it, then click Refresh All.'
    );
  }
  return data;
}

/**
 * Calls the sync-student edge function with no username, which makes
 * it refresh every active student. Used by the "Refresh All" button.
 */
export async function syncAllStudents() {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('sync-student', {
    body: { all: true },
  });
  if (error) {
    throw new Error(
      'Stats refresh failed because the Supabase Edge Function "sync-student" is not deployed or returned an error.'
    );
  }
  return data;
}

/**
 * Pulls the roster and snapshot history. Daily/weekly totals come from
 * LeetCode's submission calendar so a new user's all-time total is not
 * misreported as today's work.
 */
export async function fetchLeaderboardData() {
  const supabase = getSupabase();
  const [{ data: students, error: studentsErr }, { data: snapshots, error: snapshotsErr }] =
    await Promise.all([
      supabase.from('students').select('*').eq('is_active', true).order('joined_at'),
      supabase
        .from('snapshots')
        .select('student_id,captured_on,easy_solved,medium_solved,hard_solved,total_solved,ranking,raw')
        .order('captured_on', { ascending: false }),
    ]);

  if (studentsErr) throw studentsErr;
  if (snapshotsErr) throw snapshotsErr;

  const today = new Date();
  const todayKey = formatLocalDate(today);
  const yesterdayKey = formatLocalDate(addDays(today, -1));
  const weekStartKey = formatLocalDate(addDays(today, -6));
  const weekBaselineKey = formatLocalDate(addDays(today, -7));

  const snapshotsByStudent = (snapshots ?? []).reduce((acc, snapshot) => {
    acc[snapshot.student_id] ??= [];
    acc[snapshot.student_id].push(snapshot);
    return acc;
  }, {});

  return (students ?? []).map((s) => {
    const studentSnapshots = snapshotsByStudent[s.id] ?? [];
    const l = studentSnapshots[0];
    const yesterday = latestOnOrBefore(studentSnapshots, yesterdayKey);
    const weekBaseline = latestOnOrBefore(studentSnapshots, weekBaselineKey);

    const solvedTodayFromCalendar = sumSubmissionCalendar(l?.raw, todayKey, todayKey);
    const solvedWeekFromCalendar = sumSubmissionCalendar(l?.raw, weekStartKey, todayKey);

    const hasYesterday = Boolean(yesterday);
    const hasWeekBaseline = Boolean(weekBaseline);

    return {
      id: s.id,
      username: s.leetcode_username,
      displayName: s.display_name,
      joinedAt: s.joined_at,
      hasData: Boolean(l),
      easySolved: l?.easy_solved ?? 0,
      mediumSolved: l?.medium_solved ?? 0,
      hardSolved: l?.hard_solved ?? 0,
      totalSolved: l?.total_solved ?? 0,
      ranking: l?.ranking ?? null,
      solvedToday: hasYesterday ? diffSnapshot(l, yesterday, 'total_solved') : solvedTodayFromCalendar,
      easyToday: hasYesterday ? diffSnapshot(l, yesterday, 'easy_solved') : 0,
      mediumToday: hasYesterday ? diffSnapshot(l, yesterday, 'medium_solved') : 0,
      hardToday: hasYesterday ? diffSnapshot(l, yesterday, 'hard_solved') : 0,
      hasTodayDifficultyBreakdown: hasYesterday,
      solvedWeek: hasWeekBaseline ? diffSnapshot(l, weekBaseline, 'total_solved') : solvedWeekFromCalendar,
      easyWeek: hasWeekBaseline ? diffSnapshot(l, weekBaseline, 'easy_solved') : 0,
      mediumWeek: hasWeekBaseline ? diffSnapshot(l, weekBaseline, 'medium_solved') : 0,
      hardWeek: hasWeekBaseline ? diffSnapshot(l, weekBaseline, 'hard_solved') : 0,
      hasWeekDifficultyBreakdown: hasWeekBaseline,
    };
  });
}

/** Removes a student from the leaderboard (their row only). */
export async function removeStudent(studentId) {
  const supabase = getSupabase();
  const { error } = await supabase.from('students').delete().eq('id', studentId);
  if (error) throw error;
}
