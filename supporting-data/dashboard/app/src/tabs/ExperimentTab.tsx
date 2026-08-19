// An experiment, reported rather than a part of the pipeline: eighteen writing
// systems where a BloomLibrary book scan can be checked against an alphabet we
// already hold from the SLDR, and what the comparison came out as.
//
// Nothing on this tab is baked from the database, because none of it was ever
// filed as a claim. The numbers are one run's output (see experimentSets.ts and
// docs/sldr-comparison.md), so they are stated as of that run and not as the
// current state of anything.

import type { ReactNode } from "react";

import { plural } from "../lib/format";
import {
  COMPARED,
  SHAPE_LABEL,
  entries,
  type ComparedSystem,
} from "./experimentSets";

import "./ExperimentTab.css";

/** "3 entries", which `plural` cannot spell because it only appends an "s". */
const countEntries = (n: number) => `${n} ${n === 1 ? "entry" : "entries"}`;

/** `a `b` c` — renders the backticked runs of a string as code spans. */
function marked(text: string): ReactNode[] {
  return text.split("`").map((part, at) =>
    at % 2 === 1 ? (
      <code key={at}>{part}</code>
    ) : (
      <span key={at}>{part}</span>
    )
  );
}

/**
 * Two sheets of colour laid over each other, each as wide as the number of
 * entries it stands for. The middle colour is not chosen: the sheets are
 * semi-transparent and blend, so where they lie over each other you see both.
 *
 * The two hues are not the provenance hues the rest of the app uses for these
 * sources. SIL teal and BloomLibrary red are near-complementary, so their mix
 * has almost no chroma and the overlap renders as plain grey — which reads as
 * "neither source" exactly where it means "both". Blue and magenta mix to a
 * true purple.
 */
function Sheets({ system }: { system: ComparedSystem }) {
  const onlySldr = entries(system.onlySldr).length;
  const onlyBooks = entries(system.onlyBooks).length;
  const sldrCount = entries(system.sldr).length;
  const booksCount = entries(system.books_).length;
  const both = sldrCount - onlySldr;
  const span = onlySldr + both + onlyBooks;
  const pct = (n: number) => `${((n / span) * 100).toFixed(3)}%`;

  const label = (
    kind: "side" | "mid",
    left: number,
    width: number,
    count: number,
    what: string
  ) =>
    count === 0 ? null : (
      <span
        className={`x-tag x-${kind}`}
        style={{ left: pct(left), width: pct(width) }}
        title={`${countEntries(count)} ${what}`}
      >
        {count}
      </span>
    );

  return (
    <div className="x-venn">
      <div className="x-span-row">
        <div className="x-span x-sldr" style={{ width: pct(onlySldr + both) }}>
          <span>SLDR, {countEntries(sldrCount)}</span>
        </div>
      </div>
      <div className="x-sheets">
        <div
          className="x-sheet x-a"
          style={{ left: 0, width: pct(onlySldr + both) }}
        />
        <div
          className="x-sheet x-b"
          style={{ left: pct(onlySldr), width: pct(both + onlyBooks) }}
        />
        <div className="x-labels">
          {label("side", 0, onlySldr, onlySldr, "only in the SLDR")}
          {label("mid", onlySldr, both, both, "in both")}
          {label("side", onlySldr + both, onlyBooks, onlyBooks, "only in the books")}
        </div>
      </div>
      <div className="x-span-row">
        <div
          className="x-span x-books"
          style={{ left: pct(onlySldr), width: pct(both + onlyBooks) }}
        >
          <span>books, {countEntries(booksCount)}</span>
        </div>
      </div>
    </div>
  );
}

/** One alphabet written out, with the entries the other side lacks outlined. */
function Alphabet({
  title,
  list,
  exclusive,
  kind,
  note,
}: {
  title: string;
  list: string;
  exclusive: string;
  kind: "sldr" | "books";
  note: string;
}) {
  const own = new Set(entries(exclusive));
  return (
    <div className="x-alpha">
      <h4>
        {title}
        <em>{note}</em>
      </h4>
      <div className="x-chips">
        {entries(list).map((entry) => (
          <span
            key={entry}
            className={own.has(entry) ? `x-chip x-own x-${kind}-own` : "x-chip"}
          >
            {entry}
          </span>
        ))}
      </div>
    </div>
  );
}

function Section({ system }: { system: ComparedSystem }) {
  const onlySldr = entries(system.onlySldr).length;
  const onlyBooks = entries(system.onlyBooks).length;
  return (
    <section className="x-lang" id={`x-${system.tag}`}>
      <h3>{system.name}</h3>
      <p className="x-meta">
        <code>{system.tag}</code> &middot; {plural(system.books, "book")}{" "}
        &middot; frequency floor {system.floor} &middot;{" "}
        {SHAPE_LABEL[system.shape]}
      </p>

      <Sheets system={system} />

      <div className="x-alphabets">
        <Alphabet
          title="The SLDR's alphabet"
          list={system.sldr}
          exclusive={system.onlySldr}
          kind="sldr"
          note={
            onlySldr === 0
              ? `${entries(system.sldr).length} entries, all of them in the books`
              : `${entries(system.sldr).length} entries, ${onlySldr} not in the books`
          }
        />
        <Alphabet
          title="What the books produced"
          list={system.books_}
          exclusive={system.onlyBooks}
          kind="books"
          note={
            onlyBooks === 0
              ? `${entries(system.books_).length} entries, none outside the SLDR`
              : `${entries(system.books_).length} entries, ${onlyBooks} not in the SLDR`
          }
        />
      </div>

      <p className="x-reading">
        {marked(system.reading)}
        {system.variantCount > 1 && (
          <>
            {" "}
            The SLDR has {system.variantCount} sets for this writing system; this
            is <code>{system.sldrTag}</code>.
          </>
        )}
      </p>
    </section>
  );
}

export function ExperimentTab() {
  const covers = COMPARED.filter((r) => r.shape === "covers").length;
  const subset = COMPARED.filter((r) => r.shape === "subset").length;
  const partial = COMPARED.filter((r) => r.shape === "partial").length;

  const shares = COMPARED.map((r) => {
    const sldr = entries(r.sldr).length;
    return (sldr - entries(r.onlySldr).length) / sldr;
  }).sort((a, b) => a - b);
  const middle = Math.floor(shares.length / 2);
  const median = Math.round(
    (shares.length % 2 === 1
      ? shares[middle]
      : (shares[middle - 1] + shares[middle]) / 2) * 100
  );

  return (
    <section className="experiment">
      <p className="lede">
        Reading an alphabet out of published books gives an answer with nothing to
        check it against: <code>a b c … z</code> looks like an alphabet whatever
        language it was filed under. For {COMPARED.length} writing systems we
        already hold an alphabet from the SLDR and can also derive one from
        BloomLibrary books, so those are the ones where the scan's answer can be
        set beside somebody else's. Nothing here was filed as a claim.
      </p>

      <h2>What the {COMPARED.length} came out as</h2>
      <div className="tiles">
        <Tile value={`${median}%`}>
          of the SLDR's entries the books reproduce, median across the{" "}
          {COMPARED.length}
        </Tile>
        <Tile value={covers}>
          where the books produce every entry the SLDR lists
        </Tile>
        <Tile value={subset}>
          where the books produce a subset and add nothing
        </Tile>
        <Tile value={partial}>
          where each side holds something the other lacks
        </Tile>
      </div>

      <div className="x-verdict">
        <p>
          The median writing system reproduces {median}% of the SLDR's entries,
          which is high enough to say the books are being read correctly. Whether
          reading books tells us an alphabet we did not already have is a
          different question, and there the answer is mostly no.
        </p>
        <p>
          Three of the {COMPARED.length} produce every entry the SLDR lists, and
          all three are the smallest alphabets, each with twelve books. Seven
          produce a strict subset and contribute nothing the SLDR did not already
          have. Eight overlap partially, and in almost all of those the entries
          the books hold alone are loan letters (<code>c v x z f é</code>), a
          different way of writing the same sound (<code>ɲ</code> for{" "}
          <code>ny</code>), or the same character composed differently.
        </p>
        <p>
          Only two hold something the SLDR lacks that a person should care about:
          Chichewa's apostrophe, 119 occurrences and absent from its exemplar
          set, and five Kaqchikel vowels the plain <code>cak</code> set omits
          while its town-named variants list them.
        </p>
        <p>
          Completeness also falls as the alphabet grows, so the languages with the
          least data elsewhere are the ones books serve worst. Amharic reaches 180
          of 282 Ethiopic entries from four books; Bengali 54 of 72; the
          19-to-24-entry Latin alphabets reach all of theirs.
        </p>
        <p>
          So published books answer "is this entry in use, and how often" well,
          and "what is the complete alphabet" badly.
        </p>
      </div>

      <h2>Reading the diagrams</h2>
      <p className="x-body">
        Each writing system gets two sheets of colour, each as wide as the number
        of entries it stands for. The SLDR's sheet is on the left, the books' on
        the right, and where both colours show, both sources have the entry. Every
        region prints its own count, so nothing here is carried by colour alone.
      </p>
      <p className="x-legend">
        <span className="x-sheet-key" aria-hidden="true">
          <span className="x-sheet x-a" />
          <span className="x-sheet x-b" />
        </span>
        the SLDR&rsquo;s sheet, the books&rsquo; sheet, and the mix where both
        cover
      </p>
      <p className="x-body">
        Below each diagram both alphabets are written out, with each side's
        exclusive entries outlined. An entry is one character after case-folding
        and after every apostrophe-shaped character is folded to U+02BC; in
        Devanagari, Thai, Khmer, Arabic and the other scripts whose orthographies
        list them separately, a combining mark is an entry of its own.
      </p>

      <h2>
        The {COMPARED.length}, by how much of the SLDR&rsquo;s alphabet the books
        reproduce
      </h2>
      {COMPARED.map((system) => (
        <Section key={system.tag} system={system} />
      ))}

      <h2>Three reasons a difference is not a fault</h2>
      <ul className="x-reasons">
        <li>
          <strong>An entry written with two characters is out of reach.</strong>{" "}
          Hausa's <code>sh</code> and <code>ts</code>, K'iche's twelve apostrophe
          digraphs, Jarai's <code>dj</code> and <code>ng</code>. Nothing in a text
          file says two characters are one letter, so these are inventories of
          characters.
        </li>
        <li>
          <strong>
            Publishers use less of an orthography than it describes.
          </strong>{" "}
          Mam, K'iche', Ixil and Kaqchikel books all leave off the Spanish accents
          their sets list. The SLDR is right about the orthography and the books
          are right about the practice.
        </li>
        <li>
          <strong>The same character can be described two ways.</strong> Zaiwa's
          set lists three bare combining marks; the books carry the sixteen
          precomposed vowels those marks make. 310 of the 1,654 Latin-script SLDR
          sets are written that way.
        </li>
      </ul>

      <details className="x-table">
        <summary>Every writing system as a table</summary>
        <div className="x-scroller">
          <table>
            <thead>
              <tr>
                <th>Writing system</th>
                <th>SLDR set</th>
                <th className="num">books</th>
                <th className="num">SLDR</th>
                <th className="num">both</th>
                <th className="num">SLDR only</th>
                <th className="num">books only</th>
                <th className="num">share</th>
              </tr>
            </thead>
            <tbody>
              {COMPARED.map((r) => {
                const sldr = entries(r.sldr).length;
                const onlySldr = entries(r.onlySldr).length;
                return (
                  <tr key={r.tag}>
                    <td>
                      <code>{r.tag}</code> {r.name}
                    </td>
                    <td>
                      <code>{r.sldrTag}</code>
                    </td>
                    <td className="num">{r.books}</td>
                    <td className="num">{sldr}</td>
                    <td className="num">{sldr - onlySldr}</td>
                    <td className="num">{onlySldr}</td>
                    <td className="num">{entries(r.onlyBooks).length}</td>
                    <td className="num">
                      {Math.round(((sldr - onlySldr) / sldr) * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      <p className="x-foot">
        Produced by <code>importBloomBooks.mjs --compare-sldr</code>, which writes
        nothing and decides nothing. The comparison has run on{" "}
        {COMPARED.length} writing systems out of the 338 codes that have both an
        SLDR alphabet and five or more books. Detail in{" "}
        <code>docs/sldr-comparison.md</code>.
      </p>
    </section>
  );
}

/** The app's stat tile, value first because the label is a whole clause. */
function Tile({ value, children }: { value: ReactNode; children: ReactNode }) {
  return (
    <div className="tile">
      <p className="value">{value}</p>
      <p className="note">{children}</p>
    </div>
  );
}
