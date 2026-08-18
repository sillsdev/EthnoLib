// What this database is, and how data moves through it — prose plus two
// pipeline diagrams. The diagrams are inline SVG rather than images so they
// inherit the app's colour variables and follow the light/dark theme.

import type { ReactNode } from "react";

import "./AboutTab.css";

/** A rounded box with a title and up to a few lines under it, centered. */
function Node({
  x,
  y,
  w,
  h,
  title,
  sub = [],
  accent = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string[];
  accent?: boolean;
}) {
  const cx = x + w / 2;
  const lineHeight = 15;
  const lineCount = 1 + sub.length;
  const firstBaseline = y + h / 2 - ((lineCount - 1) * lineHeight) / 2 + 4;
  return (
    <g>
      <rect
        className={accent ? "d-node d-node-accent" : "d-node"}
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
      />
      <text className="d-title" x={cx} y={firstBaseline} textAnchor="middle">
        {title}
      </text>
      {sub.map((line, i) => (
        <text
          key={line}
          className="d-sub"
          x={cx}
          y={firstBaseline + (i + 1) * lineHeight}
          textAnchor="middle"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/** A straight arrow, with an optional label sitting above its midpoint. */
function Arrow({
  from,
  to,
  marker,
  label = [],
}: {
  from: [number, number];
  to: [number, number];
  marker: string;
  label?: string[];
}) {
  const midX = (from[0] + to[0]) / 2;
  const labelBottom = Math.min(from[1], to[1]) - 8;
  return (
    <g>
      <line
        className="d-arrow"
        x1={from[0]}
        y1={from[1]}
        x2={to[0]}
        y2={to[1]}
        markerEnd={`url(#${marker})`}
      />
      {label.map((line, i) => (
        <text
          key={line}
          className="d-arrow-label"
          x={midX}
          y={labelBottom - (label.length - 1 - i) * 13}
          textAnchor="middle"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function ArrowheadDefs({ id }: { id: string }) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX={9}
        refY={5}
        markerWidth={7}
        markerHeight={7}
        orient="auto-start-reverse"
      >
        <path className="d-arrowhead" d="M 0 1 L 9 5 L 0 9 z" />
      </marker>
    </defs>
  );
}

function Diagram({
  label,
  viewBox,
  minWidth,
  children,
}: {
  label: string;
  viewBox: string;
  minWidth: number;
  children: ReactNode;
}) {
  return (
    <div className="diagram-wrap">
      <svg
        className="diagram"
        viewBox={viewBox}
        style={{ minWidth }}
        role="img"
        aria-label={label}
      >
        {children}
      </svg>
    </div>
  );
}

/** Today's pipeline: published sources, imported as claims, toward the UIs. */
function TodayDiagram() {
  return (
    <Diagram
      label="Pipeline from published sources through the claim database to the bundled JSON the font chooser reads"
      viewBox="0 0 1060 292"
      minWidth={920}
    >
      <ArrowheadDefs id="about-arrow-today" />

      <Node x={6} y={24} w={190} h={48} title="SIL langtags" sub={["every known writing system"]} />
      <Node
        x={6}
        y={88}
        w={190}
        h={58}
        title="SLDR"
        sub={["alphabets, per-language", "font recommendations"]}
      />
      <Node x={6} y={156} w={190} h={48} title="Google Fonts gflanguages" sub={["sample texts"]} />
      <Node
        x={6}
        y={216}
        w={190}
        h={58}
        title="Language Font Finder"
        sub={["its answer for", "any language tag"]}
      />

      <Arrow from={[196, 48]} to={[262, 138]} marker="about-arrow-today" />
      <Arrow from={[196, 117]} to={[262, 142]} marker="about-arrow-today" />
      <Arrow from={[196, 180]} to={[262, 146]} marker="about-arrow-today" />
      <Arrow from={[196, 245]} to={[262, 150]} marker="about-arrow-today" />

      <Node
        x={262}
        y={112}
        w={120}
        h={64}
        title="Importers"
        sub={["one claim per fact,", "citing its source"]}
      />

      <Arrow from={[382, 144]} to={[470, 144]} marker="about-arrow-today" label={["claims +", "evidence"]} />

      <Node
        x={470}
        y={106}
        w={150}
        h={76}
        title="Claim database"
        sub={["Supabase; every claim", "carries its evidence"]}
      />

      <Arrow
        from={[620, 144]}
        to={[712, 144]}
        marker="about-arrow-today"
        label={["snapshot export", "(planned)"]}
      />

      <Node
        x={712}
        y={106}
        w={150}
        h={76}
        title="Bundled JSON"
        sub={["ships inside", "@ethnolib/font-core"]}
      />

      <Arrow from={[862, 144]} to={[930, 144]} marker="about-arrow-today" label={["read", "offline"]} />

      <Node
        x={930}
        y={106}
        w={124}
        h={76}
        title="Font chooser"
        sub={["and other", "EthnoLib UIs"]}
      />
    </Diagram>
  );
}

/** The future picture: crowd sources feed in, and an evaluation step stands
 * between the gathered claims and anything a user is shown. */
function FutureDiagram() {
  return (
    <Diagram
      label="Future pipeline where BloomLibrary and field experts also file claims, with an evaluation filter before the bundled JSON"
      viewBox="0 0 1100 292"
      minWidth={950}
    >
      <ArrowheadDefs id="about-arrow-future" />

      <Node x={6} y={24} w={190} h={48} title="Published datasets" sub={["SLDR, gflanguages, …"]} />
      <Node x={6} y={88} w={190} h={48} title="BloomLibrary.org" sub={["evidence from real books"]} />
      <Node x={6} y={152} w={190} h={48} title="Field experts" sub={[]} />
      <Node
        x={6}
        y={216}
        w={190}
        h={58}
        title="Bloom and other app users"
        sub={["alphabets used in Bloom's", "Decodable Reader tool"]}
      />

      <Arrow from={[196, 48]} to={[276, 132]} marker="about-arrow-future" />
      <Arrow from={[196, 112]} to={[276, 138]} marker="about-arrow-future" />
      <Arrow from={[196, 176]} to={[276, 148]} marker="about-arrow-future" />
      <Arrow from={[196, 245]} to={[276, 154]} marker="about-arrow-future" />

      <Node
        x={276}
        y={102}
        w={164}
        h={84}
        title="Claim database"
        sub={["every entry names who", "claimed it, and claims", "may disagree"]}
      />

      <Arrow
        from={[440, 144]}
        to={[506, 144]}
        marker="about-arrow-future"
        label={["all gathered", "claims"]}
      />

      <Node
        x={506}
        y={96}
        w={180}
        h={96}
        accent
        title="Filter"
        sub={["Some future rules TBD","E.g. an sil.org contributor","or voucher is enough."]}
      />

      <Arrow
        from={[686, 144]}
        to={[746, 144]}
        marker="about-arrow-future"
        label={["usable", "claims only"]}
      />

      <Node
        x={746}
        y={106}
        w={156}
        h={76}
        title="Bundled JSON"
        sub={["ships inside", "@ethnolib/font-core"]}
      />

      <Arrow from={[902, 144]} to={[956, 144]} marker="about-arrow-future" label={["read", "offline"]} />

      <Node
        x={956}
        y={106}
        w={138}
        h={76}
        title="Font chooser"
        sub={["and other", "EthnoLib UIs"]}
      />
    </Diagram>
  );
}

export function AboutTab() {
  return (
    <section className="about">
      <p className="lede">
        A small, deliberately humble database of gathered information about
        writing systems: what characters a language's alphabet has, a few
        sentences of sample text, and which fonts people say work. EthnoLib's
        user interfaces need these answers to be helpful, and for thousands of
        languages no shipped dataset has them.
      </p>

      <p className="about-body">
        This is not an attempt to say what is true about any language. The
        database stores <strong>claims</strong>: each row records what a
        particular source or person said, together with evidence of who said
        it and where. Claims that contradict each other coexist as siblings.
        Where established references exist (SLDR, CLDR, Ethnologue,
        ScriptSource), they remain the references; this collection fills gaps
        and records what we heard while filling them.
      </p>

      <h2>From published sources to the font chooser</h2>
      <TodayDiagram />
      <p className="about-body">
        Importers read sources we already trust and file what each one says as
        claims, every claim citing the exact file or query it came from. SIL's langtags
        supplies the list of writing systems itself, so coverage has a
        denominator. Fonts have two sources on purpose: the
        recommendations SLDR records per language, and the Language Font
        Finder service's answer for any tag, cached verbatim as its own source
        so that neither is ever presented with the other's weight. The rest of
        this dashboard is baked from the same database. One piece is planned
        rather than built: the snapshot export that merges usable claims into
        the bundled JSON.
      </p>

      <h2>Gathering via crowd sourcing, in the future</h2>
      <FutureDiagram />
      <p className="about-body">
        The same pipeline can accept claims from far more places: alphabets
        mined from BloomLibrary.org books, and contributions from field
        experts who know a writing system firsthand.
      </p>
      <p className="about-body">
        Nothing becomes authoritative by being stored here. A crowd-sourced
        entry is a claim like any other, distinguished only by naming the
        person or book that made it. Before any claim would be used in our UI
        or included in the offline bundle it must pass an evaluation step.
        Today the only rule that
        exists is provenance: an approved source stands behind the claim.
        Crowd-sourced claims are gathered and held; how one should ever earn
        its way through the filter, whether by endorsements, expert review,
        or something else, is a decision this project has deliberately not
        made yet.
      </p>
    </section>
  );
}
