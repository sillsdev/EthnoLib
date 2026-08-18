// The importers' client for the Ethnolib-Support database — the Node half of
// the demo's src/demos/langdata.ts, and deliberately the same shape: plain
// fetch, GET-then-POST find-or-create, a 409 answered by looking the row up
// again. The keys computed here (`alphabetKey`, `textKey`) MUST agree with that
// file's, because they are the identity of a claim: if an import spelled a key
// differently from the browser, the same alphabet submitted twice would land in
// two rows and support for it would fragment instead of accumulating.
//
// Importers only gather. Nothing here sets `rank`, and nothing here may: the
// public read path serves only `preferred` rows, and how a claim ever becomes
// preferred is a decision this project has not made.
//
// --dry-run runs every read for real and no write at all. Rows that would have
// been written get a negative synthetic id, so the caller's later lookups can
// tell "a row I only imagined" from a real one and skip asking the server
// about it.

import { randomUUID } from "node:crypto";

const DEFAULT_URL = "https://xtmvthimgiempavukycw.supabase.co";
// Publishable by design — the same key the demo ships to every browser. RLS is
// what protects the data, not this string. Override with the env vars when
// pointing an importer at another project.
const DEFAULT_ANON_KEY = "sb_publishable_IOgNimgADyR8ZUpGlwQdpw_ERvvoWa-";

export const SUPPORT_URL = process.env.ETHNOLIB_SUPPORT_URL ?? DEFAULT_URL;
export const SUPPORT_ANON_KEY =
  process.env.ETHNOLIB_SUPPORT_ANON_KEY ?? DEFAULT_ANON_KEY;

/** PostgREST's own ceiling per response; also our insert batch size. */
const PAGE = 1000;

const q = encodeURIComponent;

/**
 * The identity of an alphabet claim: NFC, entries sorted, single-spaced.
 * Sorted, because the same inventory in a different order is the same claim;
 * NOT case-folded, because whether uppercase forms are listed is information.
 * Mirrors alphabetKey in the demo's langdata.ts.
 */
export function alphabetKey(characters) {
  return characters
    .normalize("NFC")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

/** The identity of a sample text: NFC, whitespace collapsed, trimmed. */
export function textKey(text) {
  return text.normalize("NFC").replace(/\s+/g, " ").trim();
}

/**
 * How many bytes of identity key the database can actually index.
 *
 * `alphabet_identity_idx` and `sample_text_identity_idx` are btree indexes over
 * (language_id, key), and a btree index row cannot exceed 2704 bytes — a third
 * of a page. Over that the INSERT fails outright with "index row size exceeds
 * maximum", so an importer has to skip such a claim and say it did.
 *
 * The database now says this itself — `alphabet_key_indexable_check` and
 * `sample_text_key_indexable_check` refuse a longer key with a readable message
 * instead of the index's "index row size exceeds maximum" — and 2600 is that
 * constraint's number, leaving room for the bigint and the tuple's headers.
 * Keeping the same number here means an importer skips such a claim before
 * spending a request on it; `ensureClaim` still counts a refusal from the
 * database as the same kind of skip, in case the two ever drift apart.
 *
 * What this costs is small but real, and worth knowing: the SLDR lists Han and
 * Hangul inventories in the same field a Latin alphabet uses (`ko` is 11,172
 * entries, 44KB), and a few sample-text passages run long. If we ever want
 * those, the fix is a schema one — index a hash of the key rather than the key
 * — and it belongs to whoever owns create-tables.sql, not to an importer.
 */
export const INDEXABLE_KEY_BYTES = 2600;

/** Whether this identity key is too long for the unique index to hold. */
export function keyTooBigForIndex(key) {
  return Buffer.byteLength(key, "utf8") > INDEXABLE_KEY_BYTES;
}

/** A claim is about a writing system, so the tag has to say which script. */
export function tagHasScript(bcp47) {
  return /-[A-Za-z]{4}(-|$)/.test(bcp47);
}

export function createClient({ dryRun = false, verbose = false } = {}) {
  let nextSyntheticId = -1;
  const imagined = new Map();
  const stats = { reads: 0, writes: 0 };

  function headers() {
    return {
      "Content-Type": "application/json",
      apikey: SUPPORT_ANON_KEY,
      Authorization: `Bearer ${SUPPORT_ANON_KEY}`,
    };
  }

  async function getRows(pathAndQuery, extraHeaders = {}) {
    stats.reads++;
    const response = await fetch(`${SUPPORT_URL}/rest/v1/${pathAndQuery}`, {
      headers: { ...headers(), ...extraHeaders },
    });
    if (!response.ok) {
      throw new Error(
        `read failed: ${pathAndQuery} — ${response.status} ${await response.text()}`
      );
    }
    return await response.json();
  }

  /**
   * Every row of a query, a page at a time. PostgREST caps a response at 1000
   * rows however big the table is, so "read all the tags that already exist"
   * has to walk the Range header; ordering by id keeps the pages from sliding
   * under us.
   */
  async function getAllRows(table, select) {
    const rows = [];
    for (let from = 0; ; from += PAGE) {
      const page = await getRows(
        `${table}?select=${select}&order=id.asc&limit=${PAGE}&offset=${from}`
      );
      rows.push(...page);
      if (page.length < PAGE) return rows;
    }
  }

  /**
   * Insert one row and return its id, or undefined on a 409 — a lost
   * find-or-create race, whose answer is to GET again. Asks for `select=id`
   * only: `person` hides its email column, and a representation naming it
   * would be refused.
   */
  async function insertRow(table, row) {
    if (dryRun) return nextSyntheticId--;
    stats.writes++;
    const response = await fetch(`${SUPPORT_URL}/rest/v1/${table}?select=id`, {
      method: "POST",
      headers: { ...headers(), Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (response.status === 409) return undefined;
    if (!response.ok) {
      throw new Error(
        `${table} insert failed: ${response.status} ${await response.text()}`
      );
    }
    const rows = await response.json();
    return rows[0]?.id;
  }

  /**
   * A batch insert, for the one place volume makes it worth it (stage 1's
   * language rows). Conflicts are the caller's problem: it has already read
   * what exists, so a 409 here means a row appeared underneath it, and the
   * batch is retried one row at a time so the rest still land.
   */
  async function insertRows(table, rows) {
    if (rows.length === 0) return { inserted: 0, conflicted: 0 };
    if (dryRun) return { inserted: rows.length, conflicted: 0 };
    stats.writes++;
    const response = await fetch(`${SUPPORT_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...headers(), Prefer: "return=minimal" },
      body: JSON.stringify(rows),
    });
    if (response.ok) return { inserted: rows.length, conflicted: 0 };
    if (response.status !== 409) {
      throw new Error(
        `${table} batch insert failed: ${response.status} ${await response.text()}`
      );
    }
    let inserted = 0;
    let conflicted = 0;
    for (const row of rows) {
      const id = await insertRow(table, row);
      if (id === undefined) conflicted++;
      else inserted++;
    }
    return { inserted, conflicted };
  }

  /** find-or-create, retrying the find once after a lost race's 409. */
  async function ensureRow(table, findQuery, row) {
    if (dryRun) {
      // Reads are real in a dry run, so an existing row is still found; only
      // the insert is imagined, and remembered so the same identity asked for
      // twice answers with one id.
      const found = await getRows(`${table}?select=id&${findQuery}`);
      if (found.length > 0) return { id: found[0].id, created: false };
      const memo = `${table}?${findQuery}`;
      if (imagined.has(memo)) return { id: imagined.get(memo), created: false };
      const id = nextSyntheticId--;
      imagined.set(memo, id);
      return { id, created: true };
    }
    const found = await getRows(`${table}?select=id&${findQuery}`);
    if (found.length > 0) return { id: found[0].id, created: false };
    const inserted = await insertRow(table, row);
    if (inserted !== undefined) return { id: inserted, created: true };
    const again = await getRows(`${table}?select=id&${findQuery}`);
    if (again.length > 0) return { id: again[0].id, created: false };
    throw new Error(`${table}: conflict on insert but no row to find`);
  }

  /**
   * find-or-create for a claim row, matching its identity key here rather than
   * in the query string.
   *
   * A sample text's key IS the passage, hundreds of bytes of it, and
   * `text_key=eq.<passage>` comes back with the whole request URL echoed in a
   * response header — which overflows Node's 16KB header limit and fails the
   * request outright. Reading the language's few claim rows and comparing keys
   * in JavaScript costs the same one request and has no such ceiling.
   */
  async function ensureClaim(table, keyColumn, keyValue, row) {
    const find = async () => {
      const rows = await getRows(
        `${table}?select=id,${keyColumn}&language_id=eq.${row.language_id}`
      );
      return rows.find((candidate) => candidate[keyColumn] === keyValue);
    };
    const found = await find();
    if (found) return { id: found.id, created: false };

    if (dryRun) {
      const memo = `${table}?${row.language_id}?${keyValue}`;
      if (imagined.has(memo)) return { id: imagined.get(memo), created: false };
      const id = nextSyntheticId--;
      imagined.set(memo, id);
      return { id, created: true };
    }

    let inserted;
    try {
      inserted = await insertRow(table, row);
    } catch (error) {
      // The key refused for its length, by the check constraint or — if the two
      // ever drift apart — by the index itself. One claim is lost and counted;
      // the run carries on.
      if (
        /index row (size|requires)/.test(error.message) ||
        /_key_indexable_check/.test(error.message)
      ) {
        return { id: undefined, created: false, tooBigToIndex: true };
      }
      throw error;
    }
    if (inserted !== undefined) return { id: inserted, created: true };
    const again = await find();
    if (again) return { id: again.id, created: false };
    throw new Error(`${table}: conflict on insert but no row to find`);
  }

  /** True for an id that exists only in a dry run's imagination. */
  const isImagined = (id) => id < 0;

  /**
   * The language row for a writing system, created if it isn't there. The tag
   * must carry a script — the database's own check enforces it, and a failure
   * here is a bug in the caller's tag handling rather than bad input.
   */
  async function ensureLanguage(bcp47, name) {
    const tag = bcp47.trim();
    if (!tagHasScript(tag)) {
      throw new Error(
        `'${tag}' names a language, not a writing system — a script subtag is required`
      );
    }
    return ensureRow("language", `bcp47=ilike.${q(tag)}`, {
      bcp47: tag,
      name: name?.trim() || null,
    });
  }

  /** Sources dedupe by URL, so one SLDR page is one source row however often cited. */
  async function ensureSource(title, url, type) {
    return ensureRow("source", `url=eq.${q(url)}`, {
      title: title || null,
      url,
      type: type || null,
    });
  }

  /**
   * Whether this claim already carries evidence citing this source — the whole
   * of what makes an importer re-runnable. Values dedupe themselves through
   * their identity keys; evidence would otherwise pile up one row per run.
   */
  async function hasEvidenceFrom(table, claimColumn, claimId, sourceId) {
    if (isImagined(claimId) || isImagined(sourceId)) return false;
    const rows = await getRows(
      `${table}?select=id&${claimColumn}=eq.${claimId}&source_id=eq.${sourceId}&limit=1`
    );
    return rows.length > 0;
  }

  /**
   * Write down that a run happened, whether or not it wrote anything else.
   *
   * Two rows per run — 'started' then 'finished', sharing a key — because anon
   * may insert and may not update, so a run cannot come back and close its own
   * row. A start with no finish is a run that died partway, which is worth
   * being able to see.
   *
   * Never in a dry run: a dry run did not happen as far as the record goes.
   */
  async function recordRun(phase, run) {
    if (dryRun) return;
    await insertRow("import_run", {
      run_key: run.runKey,
      phase,
      tool: run.tool,
      source: run.source ?? null,
      source_generated_at: run.sourceGeneratedAt ?? null,
      invoked_as: run.invokedAs ?? null,
      counts: run.counts ?? null,
      notes: run.notes ?? null,
    });
  }

  function log(...parts) {
    if (verbose) console.log(...parts);
  }

  return {
    dryRun,
    stats,
    getRows,
    getAllRows,
    insertRow,
    insertRows,
    ensureRow,
    ensureClaim,
    ensureLanguage,
    ensureSource,
    hasEvidenceFrom,
    recordRun,
    isImagined,
    log,
    q,
  };
}

/**
 * The flags every importer takes.
 *
 *   --dry-run            read everything, write nothing
 *   --only a,b           just these tags (source key or resolved tag)
 *   --limit N            stop after N source entries
 *   --langtags <path>    langtags.json elsewhere
 *   --font-core <dir>    the font-core package holding the bundled snapshots
 *   --skip-nonscripts    (stage 1) leave out Zxxx/Zyyy/Zzzz "no script" tags
 *   --script-defaults    (stage 5) also file the per-script font fallbacks
 *   --verbose            a line per entry
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    dryRun: false,
    only: undefined,
    limit: undefined,
    langtags: undefined,
    fontCore: undefined,
    skipNonScripts: false,
    scriptDefaults: false,
    verbose: false,
  };
  for (let at = 0; at < argv.length; at++) {
    const arg = argv[at];
    const value = () => {
      const next = argv[++at];
      if (next === undefined) throw new Error(`${arg} needs a value`);
      return next;
    };
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--skip-nonscripts") options.skipNonScripts = true;
    else if (arg === "--script-defaults") options.scriptDefaults = true;
    else if (arg === "--verbose") options.verbose = true;
    else if (arg === "--only")
      options.only = new Set(
        value()
          .split(",")
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
      );
    else if (arg === "--limit") options.limit = Number(value());
    else if (arg === "--langtags") options.langtags = value();
    else if (arg === "--font-core") options.fontCore = value();
    else throw new Error(`unknown option: ${arg}`);
  }
  return options;
}

/**
 * What an importer says about itself when it records a run: which script, which
 * data set, which snapshot, and the flags it ran with — that last one so a
 * `--only aa` run is never read later as a full import.
 */
export function runDescriptor({ tool, source, sourceGeneratedAt }) {
  return {
    runKey: randomUUID(),
    tool,
    source,
    sourceGeneratedAt,
    invokedAs: process.argv.slice(2).join(" ") || "(no flags)",
  };
}

/** A counts report, printed the same way by all three importers. */
export function report(title, counts, { dryRun }) {
  const width = Math.max(...Object.keys(counts).map((key) => key.length));
  console.log(`\n${title}${dryRun ? " — DRY RUN, nothing was written" : ""}`);
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key.padEnd(width)}  ${value}`);
  }
}
