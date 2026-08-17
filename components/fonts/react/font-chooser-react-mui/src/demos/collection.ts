/**
 * What the deployed demo sends back to us: which languages people try, and
 * their written feedback.
 *
 * Talks to Supabase's REST endpoint (PostgREST) with plain fetch rather than
 * @supabase/supabase-js. The library would pull a dependency and a few tens of
 * KB into the bundle to build the two POSTs below, and this workspace's react 17
 * pin already makes adding packages here a fight. If we ever need auth, realtime
 * or queries, switch to the library — this is only enough for insert-only
 * telemetry.
 *
 * The anon key is meant to be public: it identifies the project, it does not
 * grant anything. What it can do is decided by the row-level security policies
 * in tools/supabase-tables.sql, which allow INSERT on these two tables and
 * nothing else — no reading back, no other tables. Anyone who views source can
 * therefore post junk rows, which is the accepted cost of collecting from a
 * static site with no server of our own.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

/**
 * With no project configured — anyone's local `npm run dev`, or a build made
 * before the keys were set — collection turns itself off rather than failing.
 * The feedback dialog checks this so it can say so instead of silently
 * swallowing what someone took the trouble to write.
 */
export const collectionConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

const LANGUAGE_TRIALS_TABLE = "font_demo_language_trials";
const FEEDBACK_TABLE = "font_demo_feedback";

/**
 * A random id per browser tab, so rows can be grouped into one person's visit
 * without anything that identifies the person. It lives in sessionStorage, so
 * it dies with the tab and is not shared between tabs; that is deliberate —
 * a longer-lived id would be closer to tracking than we want here.
 */
const SESSION_ID_KEY = "fontChooserDemo.sessionId";

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : // Enough to separate visits from each other; this is not a secret.
          `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_ID_KEY, fresh);
    return fresh;
  } catch {
    // Private-mode browsers can refuse storage. Grouping is a nicety.
    return "unknown";
  }
}

async function insert(table: string, row: Record<string, unknown>) {
  if (!collectionConfigured) return;
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      // We never read the row back, and asking for it would need a SELECT
      // policy we deliberately don't grant.
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!response.ok) {
    throw new Error(
      `${table} insert failed: ${response.status} ${await response.text()}`
    );
  }
}

/**
 * Languages already recorded this session, so that flipping back and forth
 * between two languages doesn't report each of them ten times. Per tab, not
 * per person: a second visit is worth knowing about.
 */
const reportedLanguages = new Set<string>();

/**
 * Called when someone picks a language in the demo's chooser — not for the
 * language the demo happens to open on, which would report the same default
 * for every visitor and tell us nothing.
 *
 * Deliberately fire-and-forget: this is our curiosity, not the user's task, so
 * a failure must never interrupt them or show them an error.
 */
export function reportLanguageTried(
  languageTag: string,
  languageName?: string,
  scriptCode?: string
) {
  if (!languageTag || reportedLanguages.has(languageTag)) return;
  reportedLanguages.add(languageTag);
  void insert(LANGUAGE_TRIALS_TABLE, {
    language_tag: languageTag,
    language_name: languageName ?? null,
    script_code: scriptCode ?? null,
    session_id: sessionId(),
  }).catch((error) => {
    console.warn("[demo] could not record language", error);
  });
}

export interface Feedback {
  message: string;
  /** Optional: only for replying, and only if they want a reply. */
  email?: string;
  /** What they were looking at, so a comment about "this font" has a subject. */
  languageTag?: string;
  fontFamily?: string;
}

/**
 * Unlike the language ping, this one's errors matter: someone typed something
 * for us and is waiting to hear it arrived. The caller shows what happens.
 */
export async function sendFeedback(feedback: Feedback): Promise<void> {
  if (!collectionConfigured) {
    throw new Error("Feedback collection is not configured for this build.");
  }
  await insert(FEEDBACK_TABLE, {
    message: feedback.message,
    email: feedback.email?.trim() || null,
    language_tag: feedback.languageTag || null,
    font_family: feedback.fontFamily || null,
    session_id: sessionId(),
  });
}
