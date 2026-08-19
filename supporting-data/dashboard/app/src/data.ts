// Types for the baked JSON in public/data, plus the loader every tab uses.
//
// The files are written by ../export-data.mjs at build time. Nothing here talks
// to the database: `fetch` only ever reads a static file sitting next to the
// bundle, so the site works with no network access to Supabase.

import { useEffect, useState } from "react";

// ---------------------------------------------------------------- coverage.json

export type Denominator = {
  /** Every langtags writing system that names a real script. */
  writingSystems: number;
  /** Rows whose script is Zxxx/Zyyy/Zzzz, left out of every denominator. */
  nonScript: number;
  total: number;
};

export type KindKey = "alphabet" | "sampleText" | "fonts";

export type Kind = {
  key: KindKey;
  label: string;
  /** Categorical colour slot, 1–3: `var(--series-${slot})`. */
  slot: number;
  claims: number;
  /** Writing systems with at least one claim of this kind. */
  covered: number;
  /** Writing systems with more than one claim of this kind. */
  rivals: number;
  ranks: { preferred: number; normal: number; deprecated: number };
};

/** One script's row of the by-script table. `script` is a subtag, or, for the
 * folded final row, a phrase like "191 other scripts". */
export type ScriptRow = {
  script: string;
  writingSystems: number;
} & Record<KindKey, number>;

export type Coverage = {
  denominator: Denominator;
  kinds: Kind[];
  anyCovered: number;
  claimTotal: number;
  preferredTotal: number;
  scripts: ScriptRow[];
  other: ScriptRow | null;
};

// -------------------------------------------------------------------- meta.json

export type Meta = {
  /** Already formatted for display, e.g. "2026-08-18 14:52 UTC". */
  generatedAt: string;
  branch: string;
  commit: string;
};

// --------------------------------------------------------------- languages.json

export type Source = { title: string; url: string | null; type: string | null };

export type Evidence = {
  details: string | null;
  submittedVia: string | null;
  /** Null where the evidence is a person's own knowledge rather than a document. */
  source: Source | null;
};

type Claim = {
  id: number;
  rank: string | null;
  rankNote: string | null;
  evidence: Evidence[];
};

export type AlphabetClaim = Claim & {
  /** Space-separated entries in the source's order; multigraphs are one entry. */
  characters: string | null;
  charactersKey: string | null;
  orthographyLabel: string | null;
};

export type SampleTextClaim = Claim & {
  /** First 200 characters; `textLength` is the real length. */
  textPreview: string;
  textLength: number;
  orthographyLabel: string | null;
};

export type FontClaim = Claim & {
  familyName: string | null;
  /**
   * The OpenType feature settings the source records for this font in this
   * language, tag -> integer exactly as SLDR writes them
   * (`<sil:font features="cv43=0 cv46=1">`). Stylistic sets (ssXX) appear here
   * too, not just character variants, which is why this is named after the
   * standard. A value is 1-based into the font's own named forms and 0 means
   * the font's default; the human-readable names live in the font binary, not
   * here, and raw tags are the intended display — any cross-font translation
   * layer is explicitly deferred. null where the source named none.
   */
  opentypeFeatures: Record<string, number> | null;
};

/** One language (writing system) that has at least one claim. Claimless rows are
 * left out of this file: the grid answers "what do we have", not "what exists". */
export type Language = {
  id: number;
  bcp47: string;
  /** Null for some writing systems, e.g. historic-script variants. */
  name: string | null;
  alphabets: AlphabetClaim[];
  sampleTexts: SampleTextClaim[];
  fonts: FontClaim[];
};

// -------------------------------------------------------------------- venn.json

/** One writing system of the langtags denominator, and which of the three
 * alphabet sources can speak for it. The two counts are 0 for a source with no
 * corpus in it. */
export type VennSystem = {
  tag: string;
  name: string | null;
  script: string;
  /** We already hold an alphabet claim whose evidence cites the SLDR. */
  sldr: boolean;
  /** Books BloomLibrary publishes in this writing system. */
  books: number;
  /** Translations eBible.org lists in it. */
  translations: number;
};

export type VennRegionKey =
  | "sldrOnly"
  | "bloomOnly"
  | "ebibleOnly"
  | "sldrBloom"
  | "sldrEbible"
  | "bloomEbible"
  | "all"
  | "none";

export type Venn = {
  denominator: Denominator;
  sets: {
    sldr: { covered: number };
    bloom: {
      covered: number;
      books: number;
      /** What became of Bloom's language table on the way to writing systems. */
      catalogue: {
        rows: number;
        codes: number;
        codesWithBooks: number;
        unresolved: number;
        nonScript: number;
        notInLanguageTable: number;
      };
    };
    ebible: {
      covered: number;
      translations: number;
      /** Translations the catalogue marks redistributable. */
      redistributable: number;
      catalogue: {
        translations: number;
        /** The catalogue named a script we could map to ISO 15924. */
        scriptNamed: number;
        /** It named something else, so langtags' default for the code stood in. */
        scriptFromLangtags: number;
        unresolved: number;
        notInLanguageTable: number;
      };
    };
  };
  regions: Record<VennRegionKey, number>;
  /** Each pair's whole intersection, the three-way part included. */
  pairs: { sldrBloom: number; sldrEbible: number; bloomEbible: number };
  /** No SLDR alphabet, but at least one published corpus to read. */
  corpusOnly: number;
  /**
   * Writing systems with no SLDR alphabet under their own code whose
   * macrolanguage has one — the commonest way the three sources disagree about
   * which code a language is filed under. Counted, never merged.
   */
  viaMacrolanguage: {
    writingSystems: number;
    withCorpus: number;
    examples: {
      tag: string;
      name: string | null;
      books: number;
      translations: number;
      macrolanguageTag: string;
    }[];
  };
  systems: VennSystem[];
};

// ----------------------------------------------------------------- sources.json

/** One kind-of-claim count per claim kind. */
type ByKind = { alphabets: number; sampleTexts: number; fonts: number };

/** What one source has actually put into the database, counted at bake time by
 * ../sources.mjs and grouped the way lib/claimSources.ts colours a claim. */
export type SourceTally = {
  /** Evidence rows this source stands behind. */
  evidence: ByKind;
  /** Claims with at least one piece of evidence from it. */
  claims: ByKind;
  /** Writing systems it has said anything at all about. */
  writingSystems: number;
  /** Distinct upstream files or queries cited: what a reader could go check. */
  citations: number;
  /** Named in `approved_source`, so its claims are the ones a UI may serve. */
  approved: boolean;
};

/** Keyed by lib/claimSources.ts's SourceKey. A source that has filed nothing
 * has no entry at all. */
export type SourceTallies = Record<string, SourceTally>;

// -------------------------------------------------------------------- runs.json

/** An `import_run` row, raw from the table, so these keys stay snake_case. */
export type ImportRun = {
  id: number;
  created_at: string;
  /** Shared by the `started` and `finished` rows of one run. */
  run_key: string;
  phase: "started" | "finished";
  tool: string;
  source: string | null;
  source_generated_at: string | null;
  invoked_as: string | null;
  counts: Record<string, number> | null;
  notes: string | null;
};

// ----------------------------------------------------------------------- loader

/** Which file each dataset lives in. Keys are what callers name. */
const FILES = {
  coverage: "coverage.json",
  meta: "meta.json",
  languages: "languages.json",
  runs: "runs.json",
  venn: "venn.json",
  sources: "sources.json",
} as const;

type Datasets = {
  coverage: Coverage;
  meta: Meta;
  languages: Language[];
  runs: ImportRun[];
  venn: Venn;
  sources: SourceTallies;
};

const cache = new Map<keyof Datasets, Promise<unknown>>();

/**
 * Fetch one baked file, once per session. Resolved against the document's base
 * so it follows Vite's `base: "./"` onto whatever subpath Pages serves us from.
 */
export function loadJson<K extends keyof Datasets>(
  which: K
): Promise<Datasets[K]> {
  let pending = cache.get(which);
  if (!pending) {
    const url = new URL(`data/${FILES[which]}`, document.baseURI);
    pending = fetch(url).then((response) => {
      if (!response.ok)
        throw new Error(`${FILES[which]}: ${response.status} ${response.statusText}`);
      return response.json();
    });
    cache.set(which, pending);
  }
  return pending as Promise<Datasets[K]>;
}

export type Loaded<T> =
  | { state: "loading" }
  | { state: "error"; error: Error }
  | { state: "ready"; data: T };

/** Load one dataset in a component. Cached, so switching tabs does not refetch. */
export function useDataset<K extends keyof Datasets>(
  which: K
): Loaded<Datasets[K]> {
  const [result, setResult] = useState<Loaded<Datasets[K]>>({
    state: "loading",
  });

  useEffect(() => {
    let live = true;
    setResult({ state: "loading" });
    loadJson(which).then(
      (data) => live && setResult({ state: "ready", data }),
      (error: unknown) =>
        live &&
        setResult({
          state: "error",
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    );
    return () => {
      live = false;
    };
  }, [which]);

  return result;
}
