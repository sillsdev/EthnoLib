// The actual data: a row per writing system we hold any claim about, with the
// claims summarised in place and every one of them, with its evidence, one click
// away. The grid describes what our sources said. It never marks an answer
// correct, and columns that are empty are empty because nobody has told us yet.

import { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ExpandedState,
  type Row,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Chip } from "../components/Chip";
import { DetailPanel } from "../components/DetailPanel";
import { RangeTokens } from "../components/RangeTokens";
import { featureText } from "../components/featureText";
import { count, plural } from "../lib/format";
import {
  SOURCE_LABELS,
  SOURCE_ORDER,
  sourceKeysOf,
  type SourceKey,
} from "../lib/claimSources";
import { characterList, compressCharacters, type Compressed } from "../lib/ranges";
import { useDataset, type Language } from "../data";
import "./DataTab.css";

/** Characters shown in an alphabet chip before it gives up and says "…". */
const CHIP_CHARACTERS = 12;
/** Range tokens shown in a cell; the rest hide behind "+N more". */
const CELL_RANGES = 4;
/** Words of a sample text shown in its chip. */
const CHIP_WORDS = 6;

/** A language plus everything derived from it that we would otherwise recompute
 * on every keystroke: the search haystack and the compressed character sets. */
type GridRow = {
  lang: Language;
  haystack: string;
  /** One entry per alphabet claim, in claim order. */
  ranges: Compressed[];
  /** Feature settings are per-font; fonts with identical settings share a line. */
  features: { families: string[]; text: string }[];
};

const buildRows = (languages: Language[]): GridRow[] =>
  languages.map((lang) => ({
    lang,
    haystack: `${lang.name ?? ""} ${lang.bcp47}`.toLowerCase(),
    ranges: lang.alphabets.map((claim) => compressCharacters(claim.charactersKey)),
    features: groupFeatures(lang.fonts),
  }));

/** One line per distinct feature setting, listing every font that shares it,
 * both in claim order: "Charis, Andika, Gentium cv46=1". */
function groupFeatures(fonts: Language["fonts"]) {
  const groups = new Map<string, string[]>();
  for (const claim of fonts) {
    const text = featureText(claim.opentypeFeatures);
    if (text === null) continue;
    const families = groups.get(text);
    const family = claim.familyName ?? "unnamed family";
    if (families) families.push(family);
    else groups.set(text, [family]);
  }
  return [...groups].map(([text, families]) => ({ families, text }));
}

const firstWords = (text: string) => {
  const words = text.trim().split(/\s+/);
  const head = words.slice(0, CHIP_WORDS).join(" ");
  return words.length > CHIP_WORDS ? `${head}…` : head;
};

const Empty = () => <span className="empty">—</span>;

/** The columns whose header doubles as a filter: click it and the grid keeps
 * only the rows that have something in that column. They combine with each
 * other and with the search box (every active one has to be satisfied). */
const FILTERS: { id: string; noun: string; has: (row: GridRow) => boolean }[] = [
  {
    id: "alphabets",
    noun: "an alphabet",
    has: (row) => row.lang.alphabets.length > 0,
  },
  {
    id: "ranges",
    noun: "character ranges",
    has: (row) => row.ranges.some((set) => set.ranges.length || set.clusters.length),
  },
  {
    id: "sampleTexts",
    noun: "a sample text",
    has: (row) => row.lang.sampleTexts.length > 0,
  },
  {
    id: "features",
    noun: "OpenType features",
    has: (row) => row.features.length > 0,
  },
  {
    id: "fonts",
    noun: "a suggested font",
    has: (row) => row.lang.fonts.length > 0,
  },
];

function useColumns(): ColumnDef<GridRow>[] {
  return useMemo(
    () => [
      {
        id: "expander",
        header: () => <span className="sr-only">Details</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            className="expander"
            aria-expanded={row.getIsExpanded()}
            aria-label={`${row.getIsExpanded() ? "Hide" : "Show"} every claim for ${
              row.original.lang.name ?? row.original.lang.bcp47
            }`}
            onClick={(event) => {
              // The whole row toggles too; without this the click counts twice.
              event.stopPropagation();
              row.toggleExpanded();
            }}
          >
            <span aria-hidden="true">{row.getIsExpanded() ? "▾" : "▸"}</span>
          </button>
        ),
      },
      {
        id: "name",
        header: "Language",
        accessorFn: (row) => row.lang.name,
        // Some rows have no name (58 of them, historic-script variants); they
        // sort after the named ones rather than crashing localeCompare.
        sortingFn: (a, b) => {
          const left = a.original.lang.name;
          const right = b.original.lang.name;
          if (left === null) return right === null ? 0 : 1;
          if (right === null) return -1;
          return left.localeCompare(right, "en");
        },
        cell: ({ row }) =>
          row.original.lang.name === null ? (
            <Empty />
          ) : (
            <span className="name">{row.original.lang.name}</span>
          ),
      },
      {
        id: "bcp47",
        header: "BCP-47",
        accessorFn: (row) => row.lang.bcp47,
        cell: ({ row }) => <code className="tag">{row.original.lang.bcp47}</code>,
      },
      {
        id: "alphabets",
        header: "Alphabets",
        enableSorting: false,
        cell: ({ row }) => {
          const claims = row.original.lang.alphabets;
          if (!claims.length) return <Empty />;
          return (
            <span className="chips">
              {claims.map((claim) => {
                const characters = characterList(claim.characters);
                const head = characters.slice(0, CHIP_CHARACTERS).join(" ");
                return (
                  <Chip
                    key={claim.id}
                    sources={sourceKeysOf(claim.evidence)}
                    badge={claim.orthographyLabel}
                    evidenceCount={claim.evidence.length}
                    title={`${count(characters.length)} ${plural(
                      characters.length,
                      "character"
                    )}`}
                  >
                    {characters.length > CHIP_CHARACTERS ? `${head} …` : head}
                  </Chip>
                );
              })}
            </span>
          );
        },
      },
      {
        id: "ranges",
        header: "Character ranges",
        enableSorting: false,
        cell: ({ row }) => {
          const { ranges } = row.original;
          if (!ranges.some((set) => set.ranges.length || set.clusters.length))
            return <Empty />;
          return (
            <span className="range-sets">
              {ranges.map((set, i) => (
                <RangeTokens key={i} compressed={set} limit={CELL_RANGES} />
              ))}
            </span>
          );
        },
      },
      {
        id: "sampleTexts",
        header: "Sample texts",
        enableSorting: false,
        cell: ({ row }) => {
          const claims = row.original.lang.sampleTexts;
          if (!claims.length) return <Empty />;
          return (
            <span className="chips">
              {claims.map((claim) => (
                <Chip
                  key={claim.id}
                  sources={sourceKeysOf(claim.evidence)}
                  evidenceCount={claim.evidence.length}
                  title={`${count(claim.textLength)} ${plural(
                    claim.textLength,
                    "character"
                  )}`}
                >
                  {firstWords(claim.textPreview)}
                </Chip>
              ))}
            </span>
          );
        },
      },
      {
        id: "features",
        header: "OpenType features",
        enableSorting: false,
        cell: ({ row }) => {
          const { features } = row.original;
          if (!features.length) return <Empty />;
          return (
            <span className="features">
              {features.map((entry, i) => (
                <span key={i} className="feature-line">
                  <span className="feature-font">{entry.families.join(", ")}</span>{" "}
                  <code>{entry.text}</code>
                </span>
              ))}
            </span>
          );
        },
      },
      {
        id: "fonts",
        header: "Suggested fonts",
        enableSorting: false,
        cell: ({ row }) => {
          const claims = row.original.lang.fonts;
          if (!claims.length) return <Empty />;
          return (
            <span className="chips">
              {claims.map((claim) => (
                <Chip
                  key={claim.id}
                  sources={sourceKeysOf(claim.evidence)}
                  evidenceCount={claim.evidence.length}
                >
                  {claim.familyName ?? "unnamed family"}
                </Chip>
              ))}
            </span>
          );
        },
      },
    ],
    []
  );
}

/** What the virtualizer scrolls over: a language row, or the detail panel of an
 * open one. The panel is its own item so its (much larger, measured) height
 * doesn't have to be guessed as part of the row above it. */
type DisplayRow = { kind: "main" | "detail"; row: Row<GridRow> };

/** Row heights the virtualizer assumes until it has measured the real element.
 * Only the error of the guess matters (it shows as a scrollbar twitch). */
const ESTIMATED_ROW = 52;
const ESTIMATED_DETAIL = 420;

export function DataTab() {
  const languages = useDataset("languages");
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  // Column ids whose header filter is on, in no particular order.
  const [filters, setFilters] = useState<string[]>([]);

  const toggleFilter = (id: string) =>
    setFilters((current) =>
      current.includes(id)
        ? current.filter((other) => other !== id)
        : [...current, id]
    );

  const rows = useMemo(
    () => (languages.state === "ready" ? buildRows(languages.data) : []),
    [languages]
  );

  // Re-listing 2,300 rows on every keystroke would make the box feel gummy, so
  // the input updates immediately and the grid catches up behind it.
  const needle = useDeferredValue(query).trim().toLowerCase();
  const filtered = useMemo(() => {
    const active = FILTERS.filter((filter) => filters.includes(filter.id));
    if (!needle && !active.length) return rows;
    return rows.filter(
      (row) =>
        (!needle || row.haystack.includes(needle)) &&
        active.every((filter) => filter.has(row))
    );
  }, [rows, needle, filters]);

  // The named sources always appear in the legend, so a reader learns the
  // colour scheme before every source has data; only the catch-all "other"
  // waits until something actually uses it.
  const presentSources = useMemo(() => {
    const seen = new Set<SourceKey>();
    for (const row of rows)
      for (const claims of [
        row.lang.alphabets,
        row.lang.sampleTexts,
        row.lang.fonts,
      ])
        for (const claim of claims)
          for (const key of sourceKeysOf(claim.evidence)) seen.add(key);
    return SOURCE_ORDER.filter((key) => key !== "other" || seen.has(key));
  }, [rows]);

  const columns = useColumns();

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, expanded },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getRowId: (row) => String(row.lang.id),
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  // 2,300 rows of chips is far more DOM than a browser scrolls happily, so only
  // the slice in (and near) view exists; spacer rows stand in for the rest.
  const bodyRows = table.getRowModel().rows;
  const displayRows = useMemo(() => {
    const list: DisplayRow[] = [];
    for (const row of bodyRows) {
      list.push({ kind: "main", row });
      if (row.getIsExpanded()) list.push({ kind: "detail", row });
    }
    return list;
    // The row model's reference doesn't change when a row opens; `expanded` is
    // what actually moves detail rows in and out of this list.
  }, [bodyRows, expanded]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: displayRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      displayRows[index].kind === "detail" ? ESTIMATED_DETAIL : ESTIMATED_ROW,
    overscan: 10,
    getItemKey: (index) =>
      `${displayRows[index].kind}-${displayRows[index].row.id}`,
  });

  if (languages.state === "error")
    return (
      <section>
        <p className="status error">
          Could not load languages.json: {languages.error.message}
        </p>
      </section>
    );
  if (languages.state === "loading")
    return (
      <section>
        <p className="status">Loading the claims…</p>
      </section>
    );

  const columnCount = columns.length;
  const items = virtualizer.getVirtualItems();
  const padTop = items.length ? items[0].start : 0;
  const padBottom = items.length
    ? virtualizer.getTotalSize() - items[items.length - 1].end
    : 0;

  return (
    <section className="data-tab">
      <div className="data-controls">
        <label className="search">
          <span className="sr-only">Search by name or BCP-47 tag</span>
          <input
            type="search"
            value={query}
            placeholder="Search name or BCP-47 tag…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <p className="result-count" role="status">
          {count(filtered.length)} of {count(rows.length)} writing systems
        </p>
        <p className="source-legend">
          Source legend:
          {presentSources.map((key) => (
            <span key={key} className={`legend-item src-${key}`}>
              <span className="legend-swatch" aria-hidden="true" />
              {SOURCE_LABELS[key]}
            </span>
          ))}
        </p>
      </div>

      <div className="data-wide grid-scroll" ref={scrollRef}>
        <table className="grid">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const direction = header.column.getIsSorted();
                  const filter = FILTERS.find(
                    (entry) => entry.id === header.column.id
                  );
                  const filtering = filters.includes(header.column.id);
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={`col-${header.column.id}`}
                      aria-sort={
                        direction === "asc"
                          ? "ascending"
                          : direction === "desc"
                            ? "descending"
                            : undefined
                      }
                    >
                      {sortable ? (
                        <button
                          type="button"
                          className="sort"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <span className="sort-mark" aria-hidden="true">
                            {direction === "asc"
                              ? "▲"
                              : direction === "desc"
                                ? "▼"
                                : "↕"}
                          </span>
                        </button>
                      ) : filter ? (
                        <button
                          type="button"
                          className="filter"
                          aria-pressed={filtering}
                          title={
                            filtering
                              ? "Show every row again"
                              : `Show only rows that have ${filter.noun}`
                          }
                          onClick={() => toggleFilter(filter.id)}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          <span className="filter-mark" aria-hidden="true">
                            {filtering ? "◉" : "○"}
                          </span>
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {padTop > 0 && (
              <tr aria-hidden="true" className="spacer">
                <td colSpan={columnCount} style={{ blockSize: padTop }} />
              </tr>
            )}
            {items.map((item) => {
              const entry = displayRows[item.index];
              if (entry.kind === "detail")
                return (
                  <tr
                    key={item.key}
                    ref={virtualizer.measureElement}
                    data-index={item.index}
                    className="detail-row"
                  >
                    <td colSpan={columnCount}>
                      <DetailPanel
                        lang={entry.row.original.lang}
                        ranges={entry.row.original.ranges}
                      />
                    </td>
                  </tr>
                );
              return (
                <tr
                  key={item.key}
                  ref={virtualizer.measureElement}
                  data-index={item.index}
                  className={entry.row.getIsExpanded() ? "open" : undefined}
                  onClick={() => entry.row.toggleExpanded()}
                >
                  {entry.row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={`col-${cell.column.id}`}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {padBottom > 0 && (
              <tr aria-hidden="true" className="spacer">
                <td colSpan={columnCount} style={{ blockSize: padBottom }} />
              </tr>
            )}
            {!displayRows.length && (
              <tr>
                <td colSpan={columnCount} className="no-rows">
                  {filters.length
                    ? "No writing system has all of those at once."
                    : `Nothing matches “${query}”. The search looks at the language name and the BCP-47 tag.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
