// Every source this project reads, what each one can answer, and what it has
// actually put in. The overlap diagram is the last section, because it is one
// question about three of these sources rather than the whole picture.
//
// The prose per source is written here; the numbers under it are baked (see
// ../sources.mjs), so a card cannot go on claiming a contribution that has
// stopped being true. A source with nothing filed yet has no entry in
// sources.json, and its card says so rather than printing zeroes.

import type { ReactNode } from "react";

import { count, plural } from "../lib/format";
import { useDataset, type SourceTallies, type Venn } from "../data";
import { OverlapSection } from "./OverlapSection";

import "./SourcesTab.css";

/**
 * Where a source stands in the pipeline. Only `approved` claims are ever served
 * to a user (docs/approved-sources.md); `gathered` is filed and held; `context`
 * never becomes a claim at all.
 */
type Standing = "approved" | "gathered" | "context";

const STANDING_LABEL: Record<Standing, string> = {
  approved: "Approved source",
  gathered: "Gathered, not approved",
  context: "Not a claim source",
};

const STANDING_NOTE: Record<Standing, string> = {
  approved: "its claims are the ones a UI is allowed to serve",
  gathered: "filed with its evidence and held; nothing from it reaches a user",
  context: "read to understand the landscape, never filed as a claim",
};

type SourceCard = {
  id: string;
  name: string;
  /** Colour, matching the provenance hue the rest of the app uses. */
  swatch: string;
  standing: Standing;
  /** Key into sources.json, for the sources that file claims. */
  tally?: string;
  answers: ReactNode;
  read: ReactNode;
  /** Extra line under the counts: a caveat, or the counts themselves for a
   * source that files no claims. */
  note?: (venn: Venn) => ReactNode;
};

const THE_LIST: SourceCard[] = [
  {
    id: "langtags",
    name: "SIL langtags",
    swatch: "var(--source-sil)",
    standing: "context",
    answers: (
      <>
        Which writing systems exist at all. Every coverage figure on this site
        divides by this list, which is the difference between "we have a lot" and
        "we have a fifth of it".
      </>
    ),
    read: (
      <>
        The copy of <code>langtags.json</code> this repo already ships for the
        language chooser. Nothing is downloaded.
      </>
    ),
    note: (venn) => (
      <>
        {count(venn.denominator.total)} entries, {" "}
        {count(venn.denominator.writingSystems)} of them naming a real script.
        The other {count(venn.denominator.nonScript)} are Zxxx, Zyyy or Zzzz —
        unwritten, undetermined, unknown — and stay out of every denominator
        rather than inventing a permanent shortfall.
      </>
    ),
  },
  {
    id: "sldr",
    name: "SIL Locale Data Repository (SLDR)",
    swatch: "var(--source-sil)",
    standing: "approved",
    tally: "sil",
    answers: (
      <>
        Alphabets, which fonts a language's community recommends, and the
        OpenType feature settings those fonts need — three answers out of one
        XML file per language.
      </>
    ),
    read: (
      <>
        Not the SLDR service: the three snapshots <code>@ethnolib/font-core</code>{" "}
        bundles (<code>alphabets.json</code>, <code>languageFonts.json</code>,{" "}
        <code>fontFeatureDefaults.json</code>). Each claim cites the language's
        own file on github.com, so a disputed one can be read at its source.
      </>
    ),
  },
  {
    id: "lff",
    name: "SIL Language Font Finder",
    swatch: "var(--source-lff)",
    standing: "gathered",
    tally: "lff",
    answers: <>Which fonts the service itself recommends for a language tag.</>,
    read: (
      <>
        One live request per tag to <code>lff.api.languagetechnology.org</code>,
        recorded verbatim as its own source. We never re-derive its reasoning:
        the point is to hold what it said, not to model why.
      </>
    ),
    note: () => (
      <>
        Kept separate from the font recommendations SLDR records, on purpose. The
        two agree often and are still different statements, and merging them
        would present one with the other's weight.
      </>
    ),
  },
  {
    id: "gflanguages",
    name: "Google Fonts language data (gflanguages)",
    swatch: "var(--source-google)",
    standing: "approved",
    tally: "google",
    answers: <>A few sentences of sample text per language.</>,
    read: (
      <>
        font-core's bundled <code>sampleTexts.json</code>; each claim cites the
        language's <code>.textproto</code> file on github.com.
      </>
    ),
    note: () => (
      <>
        Some passages are scripture or prayer excerpts. The importer files them
        as they are — they are evidence about the writing system either way — and
        leaves to a person the question of whether one should be shown as a
        language's sample text.
      </>
    ),
  },
  {
    id: "bloom-books",
    name: "BloomLibrary.org books",
    swatch: "var(--source-bloom)",
    standing: "gathered",
    tally: "bloom",
    answers: (
      <>
        Alphabets and fonts read out of the text of published books — the only
        source here that is evidence of a language as people actually write it,
        rather than a dataset about it.
      </>
    ),
    read: (
      <>
        The Parse index says which books exist; the text comes from the
        harvester's already-unpacked copy, one request per book, never by
        scraping the site. Each claim cites the book by title and URL.
      </>
    ),
    note: () => (
      <>
        Barely started. The walker has run over a handful of writing systems
        chosen by hand rather than by the library, and an inventory scraped from
        running text is weaker than an exemplar set: it misses rare letters,
        absorbs loanword characters, and cannot recover multigraphs at all.
      </>
    ),
  },
  {
    id: "bloom-catalogue",
    name: "BloomLibrary.org language catalogue",
    swatch: "var(--source-bloom)",
    standing: "context",
    answers: (
      <>
        How many books exist per language code — where a harvest would find
        something to read, before anyone reads it.
      </>
    ),
    read: <>The Parse language table only. No book files.</>,
    note: (venn) => (
      <>
        {count(venn.sets.bloom.catalogue.rows)} rows,{" "}
        {count(venn.sets.bloom.catalogue.codes)} distinct codes once rows sharing
        a code are merged, {count(venn.sets.bloom.catalogue.codesWithBooks)} of
        them with books, reaching {count(venn.sets.bloom.covered)} writing
        systems in the diagram below.
      </>
    ),
  },
  {
    id: "ebible",
    name: "eBible.org catalogue",
    swatch: "var(--source-ebible)",
    standing: "context",
    answers: <>Which languages have a published scripture translation.</>,
    read: (
      <>
        One file, <code>translations.csv</code>, which is the catalogue's index.
        No scripture text is fetched.
      </>
    ),
    note: (venn) => (
      <>
        {count(venn.sets.ebible.catalogue.translations)} translations, reaching{" "}
        {count(venn.sets.ebible.covered)} writing systems below.{" "}
        {count(venn.sets.ebible.redistributable)} are marked redistributable. The
        catalogue names a script in words, which maps to a real script subtag for{" "}
        {count(venn.sets.ebible.catalogue.scriptNamed)} of them; the rest fall
        back to langtags' default script for the code.
      </>
    ),
  },
  {
    id: "github",
    name: "github.com",
    swatch: "var(--source-other)",
    standing: "context",
    answers: (
      <>
        Nothing of its own. It is where SLDR's XML and gflanguages'{" "}
        <code>.textproto</code> files live, so it is what a claim from either of
        those points at.
      </>
    ),
    read: (
      <>
        As pages, not as an API: an importer builds the URL of the file its
        answer came from and stores it. Nothing here calls the GitHub API, and
        nothing depends on being able to reach github.com at import time.
      </>
    ),
  },
];

const GROUPS: { title: string; blurb: string; ids: string[] }[] = [
  {
    title: "The list of writing systems",
    blurb: "What everything else is measured against.",
    ids: ["langtags"],
  },
  {
    title: "Sources that file claims",
    blurb:
      "Each one is imported as claims, and every claim carries evidence naming the exact file or query it came from.",
    ids: ["sldr", "lff", "gflanguages", "bloom-books"],
  },
  {
    title: "Read for context, never filed",
    blurb:
      "These answer where evidence could come from. Nothing they say becomes a claim.",
    ids: ["bloom-catalogue", "ebible", "github"],
  },
];

function Card({
  card,
  tallies,
  venn,
}: {
  card: SourceCard;
  tallies: SourceTallies;
  venn: Venn;
}) {
  const tally = card.tally ? tallies[card.tally] : undefined;
  const claims = tally
    ? [
        [tally.claims.alphabets, "alphabet"],
        [tally.claims.sampleTexts, "sample text"],
        [tally.claims.fonts, "font"],
      ].filter(([n]) => (n as number) > 0)
    : [];

  return (
    <article className="source-card">
      <header>
        <span className="swatch" style={{ background: card.swatch }} />
        <h3>{card.name}</h3>
        <span className={`standing standing-${card.standing}`}>
          {STANDING_LABEL[card.standing]}
        </span>
      </header>
      <p className="source-standing-note">{STANDING_NOTE[card.standing]}</p>

      <dl>
        <dt>Answers</dt>
        <dd>{card.answers}</dd>
        <dt>Read as</dt>
        <dd>{card.read}</dd>
      </dl>

      {card.tally &&
        (tally ? (
          <p className="source-counts">
            {claims.map(([n, label], at) => (
              <span key={label as string}>
                {at > 0 && " · "}
                <strong>{count(n as number)}</strong> {label as string}{" "}
                {plural(n as number, "claim")}
              </span>
            ))}
            {" · "}
            <strong>{count(tally.writingSystems)}</strong>{" "}
            {plural(tally.writingSystems, "writing system")}
            {" · "}
            <strong>{count(tally.citations)}</strong> cited{" "}
            {tally.citations === 1 ? "file or query" : "files or queries"}
          </p>
        ) : (
          <p className="source-counts">Nothing filed from it yet.</p>
        ))}

      {card.note && <p className="source-note">{card.note(venn)}</p>}
    </article>
  );
}

export function SourcesTab() {
  const sources = useDataset("sources");
  const venn = useDataset("venn");

  if (sources.state === "error" || venn.state === "error")
    return (
      <p className="status error">
        Could not load the source data:{" "}
        {(sources.state === "error" ? sources.error : (venn as { error: Error }).error)
          .message}
      </p>
    );
  if (sources.state === "loading" || venn.state === "loading")
    return <p className="status">Loading the sources…</p>;

  const byId = new Map(THE_LIST.map((card) => [card.id, card]));
  // Counted rather than written down: approval is a row in `approved_source`,
  // and a sentence claiming a number here would be the first thing to go stale.
  const approvedCount = Object.values(sources.data).filter(
    (tally) => tally.approved
  ).length;

  return (
    <section className="sources">
      <p className="lede">
        Everything this database reads, and what each one is good for.{" "}
        {approvedCount} of them {approvedCount === 1 ? "is an" : "are"}{" "}
        <strong>approved {plural(approvedCount, "source")}</strong>, which is the
        only rule that decides what a user is ever shown; the rest are gathered
        and held, or read only to understand where evidence could come from.
      </p>

      {GROUPS.map((group) => (
        <div key={group.title} className="source-group">
          <h2>{group.title}</h2>
          <p className="source-group-blurb">{group.blurb}</p>
          {group.ids.map((id) => (
            <Card
              key={id}
              card={byId.get(id)!}
              tallies={sources.data}
              venn={venn.data}
            />
          ))}
        </div>
      ))}

      <div className="source-divider" />

      <h2>Where the alphabet sources overlap</h2>
      <OverlapSection />
    </section>
  );
}
