// The last section of the Sources tab: where an alphabet could come from, drawn
// as areas. The outer circle is every
// writing system in langtags, one inner circle is the ones the SLDR has already
// given us an alphabet for, and the other two are the ones BloomLibrary and
// eBible.org have published something in. The interesting part is everything
// outside the SLDR circle and inside another, because that is the share of the
// world where a corpus exists and no dataset we hold has an answer.
//
// What is to scale and what is not is spelled out in lib/vennLayout.ts and
// repeated in the caption: every circle's area and every pair's overlap are
// exact, the middle where all three meet is not.
//
// Two ways to read the same data, and the page keeps them apart on purpose,
// because mixing them is how "eBible" comes to mean 1,128 in one place and 146
// in another: the CARDS are whole sets, overlaps included, and the LEGEND is the
// diagram's regions, each of which excludes the others and says so in its name.
// Both are clickable and both drive the same list.
//
// Region shapes are built by clipping, not by stacking, because with three
// circles no stacking order gives the right shape under the pointer.

import { useMemo, useState } from "react";

import { count, percent, plural } from "../lib/format";
import { SCRIPT_NAMES } from "../lib/scriptNames";
import {
  circlePath,
  lensPath,
  outsidePath,
  vennLayout,
  type RegionKey,
  type SetKey,
} from "../lib/vennLayout";
import { useDataset, type Venn, type VennSystem } from "../data";

import "./OverlapSection.css";

/** What the list is showing: one region of the diagram, or one whole set. */
type Choice = {
  id: string;
  label: string;
  blurb: string;
  holds: (system: VennSystem) => boolean;
};

const REGIONS: (Choice & {
  key: RegionKey;
  /** The label inside the diagram, one string per line. */
  lines: string[];
})[] = [
  {
    id: "region:sldrOnly",
    key: "sldrOnly",
    label: "SLDR only",
    lines: ["SLDR only"],
    blurb:
      "An alphabet is already here, cited to the SLDR, and neither library has anything published to check it against.",
    holds: (s) => s.sldr && !s.books && !s.translations,
  },
  {
    id: "region:sldrBloom",
    key: "sldrBloom",
    label: "SLDR + Bloom only",
    lines: ["SLDR + Bloom", "only"],
    blurb:
      "An SLDR alphabet, and Bloom books to check it against — where the walker's output is worth most, because there is something to agree or disagree with.",
    holds: (s) => s.sldr && s.books > 0 && !s.translations,
  },
  {
    id: "region:sldrEbible",
    key: "sldrEbible",
    label: "SLDR + eBible only",
    lines: ["SLDR + eBible", "only"],
    blurb:
      "An SLDR alphabet, and a published translation in the same writing system.",
    holds: (s) => s.sldr && !s.books && s.translations > 0,
  },
  {
    id: "region:all",
    key: "all",
    label: "All three",
    lines: ["all three"],
    blurb:
      "An SLDR alphabet and both libraries. The best-covered writing systems here, and the ones any check of one source against another should start from.",
    holds: (s) => s.sldr && s.books > 0 && s.translations > 0,
  },
  {
    id: "region:bloomOnly",
    key: "bloomOnly",
    label: "Bloom only",
    lines: ["Bloom only"],
    blurb:
      "No SLDR alphabet. Bloom books are the only lead, and reading them is what stage 4 exists for.",
    holds: (s) => !s.sldr && s.books > 0 && !s.translations,
  },
  {
    id: "region:ebibleOnly",
    key: "ebibleOnly",
    label: "eBible only",
    lines: ["eBible only"],
    blurb:
      "No SLDR alphabet and no Bloom books. A published translation is the only corpus anyone has listed in these.",
    holds: (s) => !s.sldr && !s.books && s.translations > 0,
  },
  {
    id: "region:bloomEbible",
    key: "bloomEbible",
    label: "Bloom + eBible only",
    lines: ["Bloom + eBible", "only"],
    blurb:
      "No SLDR alphabet, and two independent corpora — which is the rare case where one harvest could be checked against another before anybody trusts it.",
    holds: (s) => !s.sldr && s.books > 0 && s.translations > 0,
  },
  {
    id: "region:none",
    key: "none",
    label: "None of the three",
    lines: ["none of the three"],
    blurb:
      "No SLDR alphabet, no Bloom books, no eBible translation. Nothing here can be gathered by any of these routes; these wait on a source we do not have yet.",
    holds: (s) => !s.sldr && !s.books && !s.translations,
  },
];

const REGION_BY_KEY = new Map(REGIONS.map((region) => [region.key, region]));

/** Whole sets: what each source reaches in total, overlaps included. */
const SETS: (Choice & { key: SetKey | "any"; swatch: string })[] = [
  {
    id: "set:sldr",
    key: "sldr",
    label: "SLDR",
    swatch: "var(--source-sil)",
    blurb:
      "Every writing system with an alphabet claim citing the SIL Locale Data Repository, whether or not a library also has something published in it.",
    holds: (s) => s.sldr,
  },
  {
    id: "set:bloom",
    key: "bloom",
    label: "BloomLibrary",
    swatch: "var(--source-bloom)",
    blurb:
      "Every writing system BloomLibrary publishes books in, whether or not the SLDR or eBible also covers it.",
    holds: (s) => s.books > 0,
  },
  {
    id: "set:ebible",
    key: "ebible",
    label: "eBible",
    swatch: "var(--source-ebible)",
    blurb:
      "Every writing system eBible.org lists a translation in, whether or not the SLDR or Bloom also covers it.",
    holds: (s) => s.translations > 0,
  },
  {
    id: "set:any",
    key: "any",
    label: "Any of the three",
    swatch: "var(--text-primary)",
    blurb:
      "The three sources put together, counted once each: every writing system at least one of them reaches. Everything else is the emptiest region of the diagram.",
    holds: (s) => s.sldr || s.books > 0 || s.translations > 0,
  },
];

const CHOICES = new Map<string, Choice>(
  [...REGIONS, ...SETS].map((choice) => [choice.id, choice])
);

/** How many rows the list draws before asking the reader to narrow it. */
const LIST_CAP = 300;

/**
 * Room a region needs — distance from its label spot to the nearest edge — before
 * a label fits inside it. Below the first, nothing is printed and the caption
 * names the region instead; between the two, the count gets one tight line of
 * text rather than the full name on two.
 */
const ROOM_FOR_FIGURE = 13;
const ROOM_FOR_TWO_LINES = 27;

function SystemList({
  systems,
  choice,
}: {
  systems: VennSystem[];
  choice: Choice;
}) {
  const [filter, setFilter] = useState("");

  const matching = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const chosen = systems.filter(choice.holds);
    if (!needle) return chosen;
    return chosen.filter(
      (system) =>
        system.tag.toLowerCase().includes(needle) ||
        (system.name ?? "").toLowerCase().includes(needle)
    );
  }, [systems, choice, filter]);

  const shown = matching.slice(0, LIST_CAP);

  return (
    <div className="overlap-list">
      <div className="overlap-list-head">
        <h3>
          {choice.label}
          <span className="overlap-list-count">
            {count(matching.length)} {plural(matching.length, "writing system")}
          </span>
        </h3>
        <input
          type="search"
          value={filter}
          placeholder="Filter by tag or name"
          aria-label={`Filter the ${choice.label} writing systems`}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>
      <p className="overlap-list-blurb">{choice.blurb}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Writing system</th>
              <th scope="col">Script</th>
              <th scope="col">Bloom books</th>
              <th scope="col">eBible texts</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((system) => (
              <tr key={system.tag}>
                <th scope="row">
                  {system.name ?? "—"}
                  <span className="script-code">{system.tag}</span>
                </th>
                <td>{SCRIPT_NAMES[system.script] ?? system.script}</td>
                <td className="num">{system.books ? count(system.books) : ""}</td>
                <td className="num">
                  {system.translations ? count(system.translations) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {matching.length > shown.length && (
        <p className="status">
          Showing the first {count(shown.length)} of {count(matching.length)}.
          Type in the box to narrow it.
        </p>
      )}
      {!matching.length && <p className="status">Nothing matches that filter.</p>}
    </div>
  );
}

function Diagram({
  venn,
  selectedId,
  onSelect,
}: {
  venn: Venn;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const { denominator, sets, regions, pairs } = venn;
  const layout = useMemo(
    () =>
      vennLayout(
        denominator.writingSystems,
        {
          sldr: sets.sldr.covered,
          bloom: sets.bloom.covered,
          ebible: sets.ebible.covered,
        },
        pairs
      ),
    [denominator.writingSystems, sets, pairs]
  );

  const { circles, outer, frame } = layout;

  // Each region is one shape, clipped down from a circle or a lens, so the
  // pointer always lands on the region it looks like it landed on.
  const attributes = (key: RegionKey) => {
    const region = REGION_BY_KEY.get(key)!;
    return {
      className: `overlap-region region-${key}${
        selectedId === region.id ? " is-selected" : ""
      }`,
      onClick: () => onSelect(region.id),
      tabIndex: 0,
      role: "button",
      "aria-pressed": selectedId === region.id,
      "aria-label": `${region.label}: ${count(regions[key])} writing systems`,
      children: <title>{`${region.label}: ${count(regions[key])} writing systems`}</title>,
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(region.id);
        }
      },
    };
  };

  const sldrBloom = lensPath(circles.sldr, circles.bloom);
  const sldrEbible = lensPath(circles.sldr, circles.ebible);
  const bloomEbible = lensPath(circles.bloom, circles.ebible);

  const label = (key: RegionKey) => {
    const at = layout.labels[key];
    if (!at || !regions[key] || at.clearance < ROOM_FOR_FIGURE) return null;
    const region = REGION_BY_KEY.get(key)!;
    const roomy = at.clearance >= ROOM_FOR_TWO_LINES;
    // A sliver gets the name on one tight line; a roomy region gets it laid out
    // the way it was written. Either way the name says "only", because a region
    // is not a set and the two counts are different numbers.
    const lines = roomy ? region.lines : [region.lines.join(" ")];
    return (
      <g key={key}>
        <text x={at.x} y={at.y} className="figure">
          {count(regions[key])}
        </text>
        {lines.map((line, index) => (
          <text
            key={line}
            x={at.x}
            y={at.y + 15 + index * 12}
            className={roomy ? "caption" : "caption tight"}
          >
            {line}
          </text>
        ))}
      </g>
    );
  };

  // Anything with no room for a label at all is named underneath, so a region
  // that exists on the picture is never a shape with nothing to say.
  const unlabelled = REGIONS.filter(
    (region) =>
      regions[region.key] &&
      (layout.labels[region.key]?.clearance ?? 0) < ROOM_FOR_FIGURE
  );

  return (
    <figure className="overlap-figure">
      <svg
        viewBox={`0 0 ${frame.width} ${frame.height}`}
        className="overlap-svg"
        role="group"
        aria-label="Where an alphabet could come from, drawn to scale"
      >
        <defs>
          <clipPath id="clip-in-ebible">
            <path d={circlePath(circles.ebible)} />
          </clipPath>
          {(["sldr", "bloom", "ebible"] as SetKey[]).map((key) => (
            <clipPath key={`out-${key}`} id={`clip-out-${key}`}>
              <path d={outsidePath(circles[key], frame)} clipRule="evenodd" />
            </clipPath>
          ))}
          {/* Nesting a clip on a clipPath intersects the two, which is how a
              region gets to be "inside one circle and outside another". */}
          <clipPath id="clip-out-bloom-ebible" clipPath="url(#clip-out-ebible)">
            <path d={outsidePath(circles.bloom, frame)} clipRule="evenodd" />
          </clipPath>
          <clipPath id="clip-out-sldr-ebible" clipPath="url(#clip-out-ebible)">
            <path d={outsidePath(circles.sldr, frame)} clipRule="evenodd" />
          </clipPath>
          <clipPath id="clip-out-sldr-bloom" clipPath="url(#clip-out-bloom)">
            <path d={outsidePath(circles.sldr, frame)} clipRule="evenodd" />
          </clipPath>
          <clipPath
            id="clip-out-all-three"
            clipPath="url(#clip-out-bloom-ebible)"
          >
            <path d={outsidePath(circles.sldr, frame)} clipRule="evenodd" />
          </clipPath>
        </defs>

        {/* The denominator, and the part of it no source reaches. */}
        <path
          d={circlePath(outer)}
          clipPath="url(#clip-out-all-three)"
          {...attributes("none")}
        />

        <path
          d={circlePath(circles.sldr)}
          clipPath="url(#clip-out-bloom-ebible)"
          {...attributes("sldrOnly")}
        />
        <path
          d={circlePath(circles.bloom)}
          clipPath="url(#clip-out-sldr-ebible)"
          {...attributes("bloomOnly")}
        />
        <path
          d={circlePath(circles.ebible)}
          clipPath="url(#clip-out-sldr-bloom)"
          {...attributes("ebibleOnly")}
        />
        {sldrBloom && (
          <path
            d={sldrBloom}
            clipPath="url(#clip-out-ebible)"
            {...attributes("sldrBloom")}
          />
        )}
        {sldrEbible && (
          <path
            d={sldrEbible}
            clipPath="url(#clip-out-bloom)"
            {...attributes("sldrEbible")}
          />
        )}
        {bloomEbible && (
          <path
            d={bloomEbible}
            clipPath="url(#clip-out-sldr)"
            {...attributes("bloomEbible")}
          />
        )}
        {sldrBloom && (
          <path
            d={sldrBloom}
            clipPath="url(#clip-in-ebible)"
            {...attributes("all")}
          />
        )}

        {/* Outlines, so each set reads as one shape rather than as its pieces. */}
        <g className="overlap-outlines">
          <circle cx={outer.cx} cy={outer.cy} r={outer.r} className="outline-all" />
          {(["sldr", "bloom", "ebible"] as SetKey[]).map((key) => (
            <circle
              key={key}
              cx={circles[key].cx}
              cy={circles[key].cy}
              r={circles[key].r}
              className={`outline-${key}`}
            />
          ))}
        </g>

        <g className="overlap-labels">
          <text x={outer.cx} y={outer.cy - outer.r + 30} className="denominator">
            {count(denominator.writingSystems)} writing systems in langtags
          </text>
          {REGIONS.map((region) => label(region.key))}
        </g>
      </svg>
      <figcaption>
        Every circle's area is to scale, the outer one included, and so is each
        pair's overlap
        {layout.pairwiseExact ? "" : ", as far as three circles allow"}. The
        middle, where all three meet, is not: three circles cannot carry seven
        regions truthfully, so the counts printed there are the honest part.
        Click a region to list it.
        {unlabelled.length > 0 && (
          <>
            {" "}
            Too thin on the page to carry a label:{" "}
            {unlabelled
              .map((region) => `${region.label} (${count(regions[region.key])})`)
              .join(", ")}
            .
          </>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * The one mismatch between the three sources that is checkable rather than
 * guessable, said here because the diagram cannot say it: langtags records which
 * codes are members of a macrolanguage, so "SLDR has nothing for this writing
 * system" can be separated from "SLDR filed it under the macrolanguage instead".
 * Nothing is merged on the strength of that — see venn.mjs.
 */
function MacrolanguageCaution({ venn }: { venn: Venn }) {
  const { writingSystems, withCorpus, examples } = venn.viaMacrolanguage;
  if (!writingSystems) return null;
  const first = examples[0];
  return (
    <div className="callout caution">
      <span>
        <strong>The three do not always file a language under the same tag.</strong>{" "}
        SLDR often writes an alphabet for a macrolanguage where BloomLibrary and
        eBible publish under one of its members
        {first && (
          <>
            {" "}
            — SLDR has <code>{first.macrolanguageTag}</code> but not{" "}
            <code>{first.tag}</code> ({first.name}
            {first.books > 0 && `, ${count(first.books)} books`})
          </>
        )}
        . {count(writingSystems)} writing systems here show no SLDR alphabet
        while their macrolanguage has one, {count(withCorpus)} of them with a
        corpus, so part of what the diagram counts as an SLDR gap is a tag gap.
        Nothing is merged on that basis: whether one alphabet covers both codes
        is a question about the languages, not about the tags.
      </span>
    </div>
  );
}

export function OverlapSection() {
  const venn = useDataset("venn");
  const meta = useDataset("meta");
  const [selectedId, setSelectedId] = useState("region:bloomOnly");

  if (venn.state === "error")
    return (
      <p className="status error">
        Could not load venn.json: {venn.error.message}
      </p>
    );
  if (venn.state === "loading") return <p className="status">Loading the sets…</p>;

  const data = venn.data;
  const { denominator, sets, regions } = data;
  const choice = CHOICES.get(selectedId)!;

  /** The three sources put together, each writing system counted once. */
  const anyOfThem = denominator.writingSystems - regions.none;
  const setTotals: Record<string, number> = {
    "set:sldr": sets.sldr.covered,
    "set:bloom": sets.bloom.covered,
    "set:ebible": sets.ebible.covered,
    "set:any": anyOfThem,
  };
  const setNotes: Record<string, string> = {
    "set:sldr": "alphabet claims already in this database",
    "set:bloom": `${count(sets.bloom.books)} published books`,
    "set:ebible": `${count(sets.ebible.translations)} translations, ${count(
      sets.ebible.redistributable
    )} of them marked redistributable`,
    "set:any": `${count(regions.none)} writing systems are reached by none of them`,
  };

  return (
    <>
      <p className="section-intro">
        Where could an alphabet for a writing system come from?{" "}
        <strong>The SLDR has already answered for some of them.</strong>{" "}
        BloomLibrary and eBible.org have published something in others, which is
        a corpus somebody could read an alphabet out of — not an answer, and not
        an approved source. This is the overlap of those three against every
        writing system langtags knows.
      </p>

      <section className="hero">
        <p className="label">No SLDR alphabet, but somebody has published in it</p>
        <p className="figure">{count(data.corpusOnly)}</p>
        <p className="figure-detail">
          writing systems — {count(regions.bloomOnly)} through Bloom alone,{" "}
          {count(regions.ebibleOnly)} through eBible alone, and{" "}
          {count(regions.bloomEbible)} where both have something
        </p>
        <p className="sub">
          These are what a harvest is for. A published text is somebody writing
          the language for readers of it, which is worth reading even though a
          character inventory scraped from running text is weaker than an
          exemplar set: it can miss rare letters, absorb loanword characters, and
          cannot recover multigraphs at all.
        </p>
      </section>

      <div className="callout">
        <span>
          <strong>Neither library is an approved source.</strong> Nothing
          harvested from a book or a translation reaches a user under the rules
          in <code>docs/approved-sources.md</code>; it gathers and waits. This
          diagram is about where evidence could come from, not about what is
          served.
        </span>
      </div>

      <MacrolanguageCaution venn={data} />

      <h2>Each source in total, overlaps included</h2>
      <div className="overlap-sets">
        {SETS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`overlap-set${
              selectedId === entry.id ? " is-selected" : ""
            }${entry.key === "any" ? " is-union" : ""}`}
            aria-pressed={selectedId === entry.id}
            onClick={() => setSelectedId(entry.id)}
          >
            <span className="overlap-set-name">
              <span className="swatch" style={{ background: entry.swatch }} />
              {entry.label}
            </span>
            <span className="overlap-set-value">{count(setTotals[entry.id])}</span>
            <span className="overlap-set-share">
              {percent(setTotals[entry.id], denominator.writingSystems)} of the{" "}
              {count(denominator.writingSystems)} writing systems
            </span>
            <span className="overlap-set-note">{setNotes[entry.id]}</span>
          </button>
        ))}
      </div>

      <h2>Split into the diagram's regions, which do not overlap</h2>
      <Diagram venn={data} selectedId={selectedId} onSelect={setSelectedId} />

      <div className="overlap-legend">
        {REGIONS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`overlap-key region-${entry.key}${
              selectedId === entry.id ? " is-selected" : ""
            }`}
            aria-pressed={selectedId === entry.id}
            onClick={() => setSelectedId(entry.id)}
          >
            <span className="swatch" />
            <span className="overlap-key-label">{entry.label}</span>
            <span className="overlap-key-value">
              {count(regions[entry.key])}
              <span className="cell-share">
                {percent(regions[entry.key], denominator.writingSystems)}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Keyed by the choice so picking another one starts with an empty filter:
          a filter left over from the last one reads as an empty region. */}
      <SystemList key={choice.id} systems={data.systems} choice={choice} />

      <footer>
        <p>
          <strong>Only the catalogues were read.</strong> Bloom's language table
          and eBible's <code>translations.csv</code> are indexes of what exists;
          no book file and no scripture text was fetched to build this page. What
          a corpus would yield if it were read is a different question, and a
          sharper one for eBible: much of it is scripture, which is fine as
          evidence about letters and risky as a sample text for a language.
        </p>
        <p>
          <strong>What the Bloom circle counts.</strong> Bloom's language table
          holds {count(sets.bloom.catalogue.rows)} rows,{" "}
          {count(sets.bloom.catalogue.codes)} distinct codes once rows for the
          same code are merged, {count(sets.bloom.catalogue.codesWithBooks)} of
          them with books. Bloom records no script — <code>isoCode</code> is a
          bare <code>ace</code> — so each code is placed under langtags' default
          script for that language. That is a guess wherever a language is
          published in more than one script, and the walker settles it from the
          text of the books rather than from this, so it can file under a tag
          this page did not predict. {count(sets.bloom.catalogue.unresolved)}{" "}
          codes resolve to no writing system at all (<code>qaa</code> private-use
          codes, mostly), {count(sets.bloom.catalogue.nonScript)} to an unwritten
          or signed one, and {count(sets.bloom.catalogue.notInLanguageTable)} to
          a tag we hold no row for.
        </p>
        <p>
          <strong>What the eBible circle counts.</strong>{" "}
          {count(sets.ebible.catalogue.translations)} listed translations. eBible
          names a script per translation, so{" "}
          {count(sets.ebible.catalogue.scriptNamed)} of them are placed by what
          the catalogue itself says;{" "}
          {count(sets.ebible.catalogue.scriptFromLangtags)} name something that is
          not a script ("Amheric", "Hindi", "Code for uncoded script") and fall
          back to langtags' default, and{" "}
          {count(sets.ebible.catalogue.unresolved)} resolve to no writing system
          at all. {count(sets.ebible.catalogue.notInLanguageTable)} land on a tag
          we hold no row for, which is the langtags default-script guess and the
          catalogue's own script name disagreeing about a language.
        </p>
        <p>
          <strong>What the SLDR circle counts.</strong> Writing systems with at
          least one alphabet claim whose evidence cites the SIL Locale Data
          Repository — {count(sets.sldr.covered)},{" "}
          {percent(sets.sldr.covered, denominator.writingSystems)} of the
          denominator. Claims from other sources are not in this circle.
        </p>
        {meta.state === "ready" && (
          <p>
            Generated {meta.data.generatedAt}; both catalogues were read at that
            moment. Built from <code>{meta.data.branch}</code> at{" "}
            <code>{meta.data.commit}</code>.
          </p>
        )}
        <p>
          {count(denominator.nonScript)} of the {count(denominator.total)}{" "}
          imported langtags rows name no script (<code>Zxxx</code>,{" "}
          <code>Zyyy</code>, <code>Zzzz</code>) and are left out, here as
          everywhere: an unwritten language having no alphabet is not a gap
          anyone could fill.
        </p>
      </footer>
    </>
  );
}
