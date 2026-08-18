// The dashboard page: one self-contained HTML file, no scripts and no requests
// at view time. The numbers are baked in at build time (see build.mjs), so the
// page states the moment it was generated rather than pretending to be live.
//
// Colours, mark specs and the meter/stat-tile contract follow the data-viz
// house rules: categorical slots 1–3 for the three claim kinds (validated for
// colour-vision separation as a set, both modes), a single sequential blue
// where the encoding is magnitude, hairline chrome, and every value printed as
// text beside its bar so nothing is carried by colour alone.

const KIND_HUE = {
  1: { light: "#2a78d6", dark: "#3987e5" },
  2: { light: "#eb6834", dark: "#d95926" },
  3: { light: "#1baf7a", dark: "#199e70" },
};

/**
 * Short names for the script subtags a reader is likely to meet here, so the
 * table doesn't ask anyone to know that Mymr is Burmese. Kept inline, and
 * deliberately not read from the `iso-15924` package the language chooser uses:
 * that package is a dependency of a component that is not on every branch of
 * this repo, and this build should need nothing but node. Anything not listed
 * shows its code alone, which is correct if unfriendly. Names are shortened from
 * ISO 15924's, which run to things like "Takri, Ṭākrī, Ṭāṅkrī".
 */
const SCRIPT_NAMES = {
  Latn: "Latin",
  Arab: "Arabic",
  Deva: "Devanagari",
  Cyrl: "Cyrillic",
  Brai: "Braille",
  Tibt: "Tibetan",
  Ethi: "Ethiopic",
  Thai: "Thai",
  Beng: "Bengali",
  Mymr: "Myanmar",
  Hebr: "Hebrew",
  Laoo: "Lao",
  Grek: "Greek",
  Orya: "Odia",
  Hani: "Han",
  Hans: "Han, simplified",
  Hant: "Han, traditional",
  Telu: "Telugu",
  Cans: "Canadian Aboriginal syllabics",
  Tfng: "Tifinagh",
  Mlym: "Malayalam",
  Runr: "Runic",
  Taml: "Tamil",
  Gujr: "Gujarati",
  Syrc: "Syriac",
  Knda: "Kannada",
  Khmr: "Khmer",
  Mong: "Mongolian",
  Takr: "Takri",
  Yiii: "Yi",
  Plrd: "Miao",
  Ital: "Old Italic",
  Brah: "Brahmi",
  Geor: "Georgian",
  Java: "Javanese",
  Ogam: "Ogham",
  Dupl: "Duployan",
  Cyrs: "Old Church Slavonic Cyrillic",
  Kthi: "Kaithi",
  Xsux: "Cuneiform",
  Newa: "Newa",
  Bugi: "Buginese",
};

const escape = (text) =>
  String(text).replace(
    /[&<>"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]
  );

const count = (value) => value.toLocaleString("en-US");

/** A share, spelled with a decimal only where rounding to a whole number would flatter it. */
function percent(part, whole) {
  if (!whole) return "0%";
  const share = (part / whole) * 100;
  if (share === 0) return "0%";
  if (share < 10) return `${share.toFixed(1)}%`;
  return `${Math.round(share)}%`;
}

/** A meter: fill carries the share, the track is the same hue near the surface. */
function meter(part, whole, slot) {
  const share = whole ? Math.min(100, (part / whole) * 100) : 0;
  return `<div class="meter" style="--fill: var(--series-${slot})">
        <div class="meter-fill" style="inline-size: ${share.toFixed(2)}%"></div>
      </div>`;
}

function tile(kind, denominator) {
  return `<section class="tile">
      <h3>${escape(kind.label)}</h3>
      <p class="value">${count(kind.covered)}<span class="of"> of ${count(
        denominator
      )}</span></p>
      <p class="share">${percent(kind.covered, denominator)} of writing systems</p>
      ${meter(kind.covered, denominator, kind.slot)}
      <p class="note">${count(kind.claims)} claim${
        kind.claims === 1 ? "" : "s"
      } gathered${
        kind.rivals
          ? ` · ${count(kind.rivals)} writing system${
              kind.rivals === 1 ? "" : "s"
            } with rival claims`
          : ""
      }</p>
    </section>`;
}

function scriptRow(row, kinds, isOther) {
  const cells = kinds
    .map(
      (kind) => `<td class="num">
          <span class="cell-value">${count(row[kind.key])}</span>
          <span class="cell-share">${percent(
            row[kind.key],
            row.writingSystems
          )}</span>
          ${meter(row[kind.key], row.writingSystems, kind.slot)}
        </td>`
    )
    .join("\n        ");
  const name = SCRIPT_NAMES[row.script];
  const label = isOther
    ? escape(row.script)
    : `${escape(name ?? row.script)}${
        name ? `<span class="script-code">${escape(row.script)}</span>` : ""
      }`;
  return `<tr${isOther ? ' class="other"' : ""}>
        <th scope="row">${label}</th>
        <td class="num"><span class="cell-value">${count(
          row.writingSystems
        )}</span></td>
        ${cells}
      </tr>`;
}

export function renderPage(data, build) {
  const { denominator, kinds, anyCovered, claimTotal, preferredTotal } = data;
  const rows = [
    ...data.scripts.map((row) => scriptRow(row, kinds, false)),
    ...(data.other ? [scriptRow(data.other, kinds, true)] : []),
  ].join("\n      ");

  const hues = Object.entries(KIND_HUE);
  const seriesVars = (mode) =>
    hues.map(([slot, hue]) => `    --series-${slot}: ${hue[mode]};`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EthnoLib supporting data — coverage</title>
<style>
  :root {
    color-scheme: light;
    --plane: #f9f9f7;
    --surface-1: #fcfcfb;
    --text-primary: #0b0b0b;
    --text-secondary: #52514e;
    --text-muted: #898781;
    --hairline: #e1e0d9;
    --border: rgba(11, 11, 11, 0.10);
${seriesVars("light")}
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) {
      color-scheme: dark;
      --plane: #0d0d0d;
      --surface-1: #1a1a19;
      --text-primary: #ffffff;
      --text-secondary: #c3c2b7;
      --text-muted: #898781;
      --hairline: #2c2c2a;
      --border: rgba(255, 255, 255, 0.10);
${seriesVars("dark")}
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --plane: #0d0d0d;
    --surface-1: #1a1a19;
    --text-primary: #ffffff;
    --text-secondary: #c3c2b7;
    --text-muted: #898781;
    --hairline: #2c2c2a;
    --border: rgba(255, 255, 255, 0.10);
${seriesVars("dark")}
  }

  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 3rem) 4rem;
    background: var(--plane);
    color: var(--text-primary);
    font: 400 16px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { max-inline-size: 60rem; margin: 0 auto; }
  h1 {
    font-size: clamp(1.35rem, 3vw, 1.75rem);
    font-weight: 600;
    letter-spacing: -0.01em;
    margin: 0 0 0.4rem;
  }
  .lede {
    margin: 0 0 2.5rem;
    max-inline-size: 46rem;
    color: var(--text-secondary);
  }
  .lede strong { font-weight: 600; color: var(--text-primary); }

  .hero {
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.5rem 1.5rem 1.75rem;
    margin-bottom: 1rem;
  }
  .hero .label {
    margin: 0;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }
  .hero .figure {
    margin: 0.35rem 0 0;
    font-size: clamp(2.75rem, 9vw, 3.75rem);
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .hero .figure-detail {
    margin: 0.35rem 0 0;
    font-size: 1rem;
    color: var(--text-secondary);
  }
  .hero p.sub {
    margin: 0.75rem 0 0;
    max-inline-size: 42rem;
    color: var(--text-secondary);
  }

  .callout {
    display: flex;
    gap: 0.75rem;
    align-items: baseline;
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-inline-start: 3px solid var(--text-muted);
    border-radius: 10px;
    padding: 0.9rem 1.15rem;
    margin-bottom: 2.5rem;
    color: var(--text-secondary);
    font-size: 0.9375rem;
  }
  .callout strong { color: var(--text-primary); font-weight: 600; }

  h2 {
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin: 0 0 0.9rem;
  }
  .tiles {
    display: grid;
    gap: 0.875rem;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    margin-bottom: 2.5rem;
  }
  .tile {
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1.15rem 1.25rem 1.25rem;
  }
  .tile h3 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
  }
  .tile .value {
    margin: 0.5rem 0 0;
    font-size: 1.875rem;
    font-weight: 600;
    line-height: 1.1;
    letter-spacing: -0.015em;
  }
  .tile .value .of {
    font-size: 0.875rem;
    font-weight: 400;
    letter-spacing: 0;
    color: var(--text-secondary);
  }
  .tile .share { margin: 0.2rem 0 0.75rem; font-size: 0.875rem; color: var(--text-secondary); }
  .tile .note { margin: 0.7rem 0 0; font-size: 0.8125rem; color: var(--text-muted); }

  /* Fill grows from a single baseline, square where it starts and rounded at the
     data end; the track is the fill's own hue pulled most of the way to the
     surface, so an empty meter still reads as the same measure. */
  .meter {
    block-size: 8px;
    border-radius: 4px;
    background: color-mix(in oklab, var(--fill) 14%, var(--surface-1));
    overflow: hidden;
  }
  .meter-fill {
    block-size: 100%;
    min-inline-size: 0;
    border-radius: 0 4px 4px 0;
    background: var(--fill);
  }

  .table-wrap { overflow-x: auto; }
  table {
    inline-size: 100%;
    border-collapse: collapse;
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: 10px;
    font-size: 0.9375rem;
  }
  caption {
    caption-side: top;
    text-align: start;
    padding: 0 0 0.9rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
  }
  th, td { padding: 0.7rem 0.9rem; text-align: start; vertical-align: top; }
  thead th {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-secondary);
    border-block-end: 1px solid var(--hairline);
    white-space: nowrap;
  }
  thead th .swatch {
    display: inline-block;
    inline-size: 8px;
    block-size: 8px;
    border-radius: 2px;
    margin-inline-end: 0.4rem;
    vertical-align: 0.05em;
  }
  tbody th { font-weight: 500; white-space: nowrap; }
  .script-code {
    color: var(--text-muted);
    font-weight: 400;
    font-size: 0.8125rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    margin-inline-start: 0.45rem;
  }
  tbody tr + tr th, tbody tr + tr td { border-block-start: 1px solid var(--hairline); }
  tbody tr.other th, tbody tr.other td { color: var(--text-secondary); }
  td.num { font-variant-numeric: tabular-nums; min-inline-size: 6.5rem; }
  .cell-value { font-weight: 500; }
  .cell-share { color: var(--text-muted); font-size: 0.8125rem; margin-inline-start: 0.35rem; }
  td.num .meter { margin-block-start: 0.4rem; max-inline-size: 6rem; }

  footer {
    margin-block-start: 3rem;
    padding-block-start: 1.25rem;
    border-block-start: 1px solid var(--hairline);
    color: var(--text-muted);
    font-size: 0.8125rem;
  }
  footer p { margin: 0 0 0.4rem; }
  footer code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.95em;
  }
  footer a { color: inherit; }
</style>
</head>
<body>
<main>
  <h1>EthnoLib supporting data</h1>
  <p class="lede">
    What we have gathered about writing systems: the characters of an alphabet,
    a few sentences of sample text, which fonts people say work.
    <strong>This is not a claim about what is true of any language.</strong>
    It is a record of what sources and people have told us, kept so that our
    interfaces can offer something useful and say where it came from.
  </p>

  <section class="hero">
    <p class="label">Writing systems with anything at all</p>
    <p class="figure">${percent(anyCovered, denominator.writingSystems)}</p>
    <p class="figure-detail">${count(anyCovered)} of ${count(
      denominator.writingSystems
    )} writing systems</p>
    <p class="sub">
      At least one claim of any kind. The denominator is every writing system in
      SIL's langtags, imported as bare rows precisely so this fraction has an
      honest bottom half.
    </p>
  </section>

  <div class="callout">
    <span>
      <strong>${count(preferredTotal)} of ${count(
        claimTotal
      )} claims are marked preferred.</strong>
      Only preferred claims are served to users, and how a claim ever becomes
      preferred is a decision this project has not made. So far this is gathered
      data and nothing more.
    </span>
  </div>

  <h2>By kind of claim</h2>
  <div class="tiles">
    ${kinds.map((kind) => tile(kind, denominator.writingSystems)).join("\n    ")}
  </div>

  <h2>By script</h2>
  <div class="table-wrap">
    <table>
      <caption>
        Writing systems in langtags, and how many of them we have each kind of
        claim for. Shares are of that script's own writing systems.
      </caption>
      <thead>
        <tr>
          <th scope="col">Script</th>
          <th scope="col">Writing systems</th>
          ${kinds
            .map(
              (kind) =>
                `<th scope="col"><span class="swatch" style="background: var(--series-${
                  kind.slot
                })"></span>${escape(kind.label)}</th>`
            )
            .join("\n          ")}
        </tr>
      </thead>
      <tbody>
      ${rows}
      </tbody>
    </table>
  </div>

  <footer>
    <p>
      Generated ${escape(build.generatedAt)} from the Ethnolib-Support database.
      The numbers are baked into this page at build time, so they are as fresh as
      the last push, not live.
    </p>
    <p>
      Built from <code>${escape(build.ref)}</code> at
      <code>${escape(build.commit)}</code>.
    </p>
    <p>
      ${count(denominator.nonScript)} of the ${count(
        denominator.total
      )} imported langtags rows name no script
      (<code>Zxxx</code>, <code>Zyyy</code>, <code>Zzzz</code>) and are left out
      of every denominator above: an unwritten language having no alphabet is not
      a gap we could fill.
    </p>
  </footer>
</main>
</body>
</html>
`;
}
