// The numbers the dashboard shows, read straight from the Ethnolib-Support
// database. Read-only on purpose: this file has its own small fetch helper
// rather than reusing tools/lib/langdata.mjs's client, because that client
// exists to write and a page generator should not be able to.
//
// Everything here is a COVERAGE question — how many writing systems we have an
// answer for, out of how many exist. That is why stage 1 of the import files a
// `language` row per writing system in langtags and no claims at all: without
// it, "1,943 alphabets" is a number with no denominator, and a denominator is
// the whole difference between "we have a lot" and "we have a fifth of it".

import { SUPPORT_URL, SUPPORT_ANON_KEY } from "../tools/lib/langdata.mjs";

/** PostgREST's own ceiling per response, so also our page size. */
const PAGE = 1000;

/**
 * Tags whose "script" says there isn't one. They are legitimate langtags
 * entries and legitimate `language` rows, but an unwritten language cannot have
 * an alphabet, so counting them in the denominator would invent a permanent
 * shortfall. Kept and reported separately instead of dropped silently.
 */
const NON_SCRIPTS = new Set(["Zxxx", "Zyyy", "Zzzz"]);

async function getAllRows(table, select) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const url =
      `${SUPPORT_URL}/rest/v1/${table}` +
      `?select=${select}&order=id.asc&limit=${PAGE}&offset=${offset}`;
    const response = await fetch(url, {
      headers: {
        apikey: SUPPORT_ANON_KEY,
        Authorization: `Bearer ${SUPPORT_ANON_KEY}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `read failed: ${table} — ${response.status} ${await response.text()}`
      );
    }
    const page = await response.json();
    rows.push(...page);
    if (page.length < PAGE) return rows;
  }
}

/** The script subtag a `language` row's tag carries; the check constraint guarantees one. */
function scriptOf(bcp47) {
  const subtag = bcp47.split("-")[1] ?? "";
  return subtag.length === 4
    ? subtag[0].toUpperCase() + subtag.slice(1).toLowerCase()
    : "";
}

/**
 * One claim table's contribution: how many claims, how many writing systems
 * they cover, and how many of those have rival claims — two or more distinct
 * values for the same writing system, which is the model working as intended
 * (siblings coexist) and also the pile someone will eventually have to judge.
 */
function summarizeClaims(claims, eligible) {
  const perLanguage = new Map();
  const ranks = { preferred: 0, normal: 0, deprecated: 0 };
  for (const claim of claims) {
    ranks[claim.rank] = (ranks[claim.rank] ?? 0) + 1;
    // A claim on a Zxxx tag is not wrong, but it is outside the denominator, so
    // it must not be counted as covering something the denominator doesn't hold.
    if (!eligible.has(claim.language_id)) continue;
    perLanguage.set(
      claim.language_id,
      (perLanguage.get(claim.language_id) ?? 0) + 1
    );
  }
  let rivals = 0;
  for (const count of perLanguage.values()) if (count > 1) rivals++;
  return {
    claims: claims.length,
    covered: perLanguage.size,
    rivals,
    ranks,
    coveredIds: new Set(perLanguage.keys()),
  };
}

/** How many scripts get their own row before the rest fold into "other". */
const SCRIPT_ROWS = 12;

export async function gatherCoverage() {
  const [languages, alphabets, sampleTexts, fontSupport] = await Promise.all([
    getAllRows("language", "id,bcp47"),
    getAllRows("alphabet", "language_id,rank"),
    getAllRows("sample_text", "language_id,rank"),
    getAllRows("font_support", "language_id,rank"),
  ]);

  const scriptById = new Map();
  const eligible = new Set();
  let nonScript = 0;
  for (const language of languages) {
    const script = scriptOf(language.bcp47);
    scriptById.set(language.id, script);
    if (NON_SCRIPTS.has(script)) nonScript++;
    else eligible.add(language.id);
  }

  const kinds = [
    { key: "alphabet", label: "Alphabet", slot: 1, rows: alphabets },
    { key: "sampleText", label: "Sample text", slot: 2, rows: sampleTexts },
    { key: "fonts", label: "Fonts that work", slot: 3, rows: fontSupport },
  ].map((kind) => ({ ...kind, ...summarizeClaims(kind.rows, eligible) }));

  // "Has anything at all" — the one honest headline, and not a sum: a writing
  // system with both an alphabet and a sample text is one covered writing
  // system, not two.
  const anyCovered = new Set();
  for (const kind of kinds)
    for (const id of kind.coveredIds) anyCovered.add(id);

  const byScript = new Map();
  for (const id of eligible) {
    const script = scriptById.get(id);
    let row = byScript.get(script);
    if (!row) {
      row = { script, writingSystems: 0 };
      for (const kind of kinds) row[kind.key] = 0;
      byScript.set(script, row);
    }
    row.writingSystems++;
    for (const kind of kinds) if (kind.coveredIds.has(id)) row[kind.key]++;
  }
  const scripts = [...byScript.values()].sort(
    (a, b) =>
      b.writingSystems - a.writingSystems || a.script.localeCompare(b.script)
  );
  const shown = scripts.slice(0, SCRIPT_ROWS);
  const rest = scripts.slice(SCRIPT_ROWS);
  const other = rest.length
    ? rest.reduce(
        (total, row) => {
          total.writingSystems += row.writingSystems;
          for (const kind of kinds) total[kind.key] += row[kind.key];
          return total;
        },
        {
          script: `${rest.length} other scripts`,
          writingSystems: 0,
          ...Object.fromEntries(kinds.map((k) => [k.key, 0])),
        }
      )
    : undefined;

  const claimTotal = kinds.reduce((sum, kind) => sum + kind.claims, 0);
  const preferredTotal = kinds.reduce(
    (sum, kind) => sum + kind.ranks.preferred,
    0
  );

  return {
    denominator: {
      writingSystems: eligible.size,
      nonScript,
      total: languages.length,
    },
    // Named one by one rather than spread: the working shape carries the raw rows
    // and the set of covered ids, and neither belongs in a page's data.
    kinds: kinds.map((kind) => ({
      key: kind.key,
      label: kind.label,
      slot: kind.slot,
      claims: kind.claims,
      covered: kind.covered,
      rivals: kind.rivals,
      ranks: kind.ranks,
    })),
    anyCovered: anyCovered.size,
    claimTotal,
    preferredTotal,
    scripts: shown,
    other,
  };
}
