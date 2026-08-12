/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  Alert,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CharacterVariantChoices,
  FamilyScan,
  LocalFontFamily,
  isLocalFontAccessSupported,
  loadLocalFontDataByFamilyWithName,
  parseAlphabet,
  pruneLicenseCache,
  queryLocalFontFamilies,
  readCachedLicenses,
  readCoverageRanges,
  scanFamiliesForCharacterVariants,
  scanFamiliesForLicense,
  useFontData,
  writeCachedLicense,
} from "@ethnolib/character-variants-react-mui";
import { FontDetailsPane } from "./FontDetailsPane";
import { FontList } from "./FontList";
import { findFont, mergeFonts } from "./mergeFonts";
import { shouldOfferLocalFontListing } from "./localFontListing";
import type { FontChooserScreenProps } from "./types";

/**
 * The whole font-choosing screen: the fonts on one side, and on the other what the
 * chosen one can do — whether it writes the user's alphabet, what its licence
 * allows, and which letter shapes they can pick from it.
 *
 * It works from three sources and reconciles them: the fonts installed on the
 * machine, whatever the host app knows about fonts (including ones it can fetch),
 * and what a background sweep reads out of the font files themselves.
 */
export const FontChooserScreen: React.FunctionComponent<
  FontChooserScreenProps
> = ({
  alphabet = "",
  fonts,
  getLocalFonts,
  getFontData = loadLocalFontDataByFamilyWithName,
  selectedFont,
  onSelectedFontChange,
  defaultFont = "",
  choices,
  onChoicesChange,
  onDownloadFont,
  onCancel,
  onFontSelected,
  sampleSize,
  className,
}) => {
  const [local, setLocal] = useState<LocalFontFamily[]>([]);
  const [listing, setListing] = useState(false);
  const [listError, setListError] = useState<string | undefined>();
  const [scanned, setScanned] = useState<Record<string, FamilyScan>>({});

  const [ownSelection, setOwnSelection] = useState(defaultFont);
  const selection = selectedFont ?? ownSelection;
  const select = (font: string) => {
    if (selectedFont === undefined) setOwnSelection(font);
    onSelectedFontChange?.(font);
  };

  const [ownChoices, setOwnChoices] = useState<CharacterVariantChoices>({});
  const chosen = choices ?? ownChoices;
  const changeChoices = (next: CharacterVariantChoices) => {
    if (!choices) setOwnChoices(next);
    onChoicesChange?.(next);
  };

  const alphabetSet = useMemo(() => parseAlphabet(alphabet), [alphabet]);

  // What each font can write, from wherever we learned it: the background sweep
  // for installed fonts, and — for a font whose bytes we fetched because the user
  // looked at it — what those bytes said. Both count as knowledge, so a
  // downloadable font that turns out to lack the alphabet drops out of the list
  // once the user moves off it.
  const [readOnSelection, setReadOnSelection] = useState<
    Record<string, Uint32Array>
  >({});
  const coverage = useMemo(() => {
    const known: Record<string, Uint32Array | undefined> = {};
    for (const [family, scan] of Object.entries(scanned)) {
      if (scan.detailsRead) known[family] = scan.coverage;
    }
    return { ...known, ...readOnSelection };
  }, [scanned, readOnSelection]);

  const merged = useMemo(
    () =>
      mergeFonts({
        local,
        catalog: fonts,
        scanned,
        alphabet: alphabetSet,
        coverage,
        alwaysInclude: selection,
      }),
    [local, fonts, scanned, alphabetSet, coverage, selection]
  );
  // Which fonts are closed decides what the background reads are allowed to touch,
  // and those reads are set off by effects that must not restart every time a
  // result lands. So they ask the ref for the list as it stands rather than taking
  // it as a dependency.
  const mergedNow = useRef(merged);
  mergedNow.current = merged;
  const scannedNow = useRef(scanned);
  scannedNow.current = scanned;

  const selectedInfo = findFont(merged, selection);
  const installed = selectedInfo ? selectedInfo.installed !== false : false;

  // A font we don't have yet still has bytes to read, as long as the catalog says
  // where they live: we fetch the file and read coverage and letter shapes out of
  // it, which is what makes the download offer worth anything.
  const downloadUrl = installed ? undefined : selectedInfo?.fileUrl;
  const downloads = useRef(new Map<string, Promise<ArrayBuffer>>());
  const fetchFontFile = (url: string) => {
    const already = downloads.current.get(url);
    if (already) return already;
    const started = fetch(url).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Could not fetch the font: ${response.status}`);
      }
      return response.arrayBuffer();
    });
    // A failed fetch shouldn't poison the cache for a font the user comes back to.
    started.catch(() => downloads.current.delete(url));
    downloads.current.set(url, started);
    return started;
  };
  const loadBytes = (font: string) =>
    downloadUrl ? fetchFontFile(downloadUrl) : getFontData(font);

  // Nothing to read for a font that is neither here nor fetchable; the details
  // pane shows the download offer on its own.
  const { fontData, postscriptName, loading, retry } = useFontData(
    !installed && !downloadUrl ? "" : selection,
    loadBytes
  );

  // Bytes we fetched for the pane answer the coverage question too, and the answer
  // outlives the visit: it is what lets a font the user has looked at drop out of
  // the list if it can't write their alphabet. Installed fonts the sweep has
  // already read are left alone.
  useEffect(() => {
    if (!fontData || !selection) return;
    if (scannedNow.current[selection]?.detailsRead) return;
    let stale = false;
    readCoverageRanges(new Blob([fontData]), postscriptName)
      .then((ranges) => {
        if (!stale) {
          setReadOnSelection((previous) => ({
            ...previous,
            [selection]: ranges,
          }));
        }
      })
      .catch(() => {
        // A font whose cmap won't parse stays a font we know nothing about.
      });
    return () => {
      stale = true;
    };
  }, [fontData, postscriptName, selection]);

  // `useFontData` reloads when the font's name changes, which is the whole story
  // for installed fonts. A font whose catalog entry arrives late — a remembered
  // choice, say, selected before the catalog answered — changes where its bytes
  // come from without changing its name, so that needs saying out loud.
  const source = useRef<{ font: string; url?: string }>({
    font: selection,
    url: downloadUrl,
  });
  useEffect(() => {
    const same = source.current.font === selection;
    if (same && source.current.url !== downloadUrl) retry();
    source.current = { font: selection, url: downloadUrl };
  }, [selection, downloadUrl, retry]);

  const listFonts = async () => {
    setListing(true);
    setListError(undefined);
    try {
      setLocal(await (getLocalFonts ?? queryLocalFontFamilies)());
      // Listing the fonts is also the moment the page gains permission to read
      // their bytes, so a load that failed before this is worth another try.
      if (!fontData) retry();
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setListing(false);
    }
  };

  // With permission already granted in an earlier session, or with the host
  // supplying its own list, there is nothing to ask the user for.
  useEffect(() => {
    if (getLocalFonts) {
      void listFonts();
      return;
    }
    if (!isLocalFontAccessSupported()) return;
    (async () => {
      try {
        const status = await navigator.permissions.query({
          name: "local-fonts" as PermissionName,
        });
        if (status.state === "granted") await listFonts();
      } catch {
        // Older Chromium doesn't know the "local-fonts" permission name; the
        // button is still there.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getLocalFonts]);

  // Reading the installed fonts happens in two passes, because the two questions
  // cost such different amounts.
  //
  // First, every font's licence: a few KB of `name` and OS/2 tables each, and the
  // answer that decides whether a font belongs in the list proper or behind the
  // closed-fonts disclosure. Then, and only for the fonts the user can actually
  // see, the expensive part — the cmap for coverage, and the whole file for the
  // few fonts that declare letter shapes. A machine's closed fonts are often most
  // of its fonts, and none of that work is worth doing for a list nobody has
  // opened; opening the disclosure is what sets it off.
  //
  // Results are batched: one state update per font would mean hundreds of renders
  // of a list this long.
  //
  // What the passes wait on is the list they were run against, not a flag: a
  // `done` boolean set in a later commit would still read as true in the commit
  // that brought a new list in, and the expensive pass would set off over fonts
  // whose licences nobody had looked at yet — which is to say, over all of them.
  const [licensesFor, setLicensesFor] = useState<LocalFontFamily[]>();
  const licensesDone = local.length === 0 || licensesFor === local;
  const [closedRevealed, setClosedRevealed] = useState(false);
  const detailsAsked = useRef(new Set<string>());

  useEffect(() => {
    detailsAsked.current.clear();
    if (local.length === 0) return;
    if (!isLocalFontAccessSupported()) {
      setLicensesFor(local);
      return;
    }
    // What an earlier visit worked out. A font's licence doesn't change under us,
    // so this is the whole answer for anything we have seen before.
    pruneLicenseCache();
    const cached = readCachedLicenses(local);
    if (Object.keys(cached).length > 0) {
      setScanned((previous) => mergeScans(previous, cached));
    }
    const unread = local.filter((family) => !cached[family.family]);
    if (unread.length === 0) {
      setLicensesFor(local);
      return;
    }

    const abort = new AbortController();
    const batch = batched(setScanned);
    const byName = new Map(unread.map((family) => [family.family, family]));
    scanFamiliesForLicense(
      unread,
      (family, found) => {
        batch.collect(family, found);
        const listed = byName.get(family);
        if (listed) writeCachedLicense(listed, found);
      },
      { signal: abort.signal }
    ).finally(() => {
      batch.flush();
      if (!abort.signal.aborted) setLicensesFor(local);
    });

    return () => {
      abort.abort();
      batch.stop();
    };
  }, [local]);

  // The fonts the user can see: read in full, once their licences are known.
  useEffect(() => {
    if (!licensesDone || !isLocalFontAccessSupported()) return;
    const closed = new Set(mergedNow.current.closed.map((font) => font.family));
    return readDetails(
      local.filter((family) => !closed.has(family.family)),
      detailsAsked,
      setScanned
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licensesDone, local]);

  // And the closed ones, when and only when the user asks to see them.
  useEffect(() => {
    if (!closedRevealed || !licensesDone || !isLocalFontAccessSupported()) {
      return;
    }
    const closed = new Set(mergedNow.current.closed.map((font) => font.family));
    return readDetails(
      local.filter((family) => closed.has(family.family)),
      detailsAsked,
      setScanned
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedRevealed, licensesDone, local]);

  // Land on something as soon as there is something to land on, so the screen
  // never opens on an empty right-hand side — but not before the licences are in,
  // or the first font of the list could turn out to be a closed one a moment later
  // and drag the disclosure open behind it.
  useEffect(() => {
    if (selection || !licensesDone) return;
    const first = merged.main[0] ?? merged.closed[0];
    if (first) select(first.family);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merged, selection, licensesDone]);

  const nothingToShow = merged.main.length === 0 && merged.closed.length === 0;
  const canListLocally = isLocalFontAccessSupported() || !!getLocalFonts;
  const offerListing = shouldOfferLocalFontListing({
    supported: isLocalFontAccessSupported(),
    hostSupplies: !!getLocalFonts,
    localCount: local.length,
    listing,
  });

  return (
    <Paper
      className={className}
      css={css`
        width: 840px;
        max-width: 100%;
        /* Fixed, not just a minimum: a machine with hundreds of fonts would
           otherwise stretch the card down the page and scroll the whole window,
           when what should scroll is the list inside it. */
        height: 540px;
        max-height: 100vh;
        display: flex;
        overflow: hidden;
      `}
    >
      {nothingToShow ? (
        <div
          css={css`
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            padding: 24px;
          `}
        >
          <Typography
            variant="h3"
            css={css`
              font-size: 20px;
              font-weight: 400;
            `}
          >
            Choose a font
          </Typography>
          {canListLocally ? (
            <Button variant="contained" onClick={listFonts} disabled={listing}>
              {listing ? (
                <CircularProgress size={20} />
              ) : (
                "List installed fonts…"
              )}
            </Button>
          ) : (
            <Alert severity="warning">
              This browser cannot list the fonts installed on this machine (the
              Local Font Access API is Chromium-only), and this app has not
              supplied a font list of its own.
            </Alert>
          )}
          {listError && <Alert severity="error">{listError}</Alert>}
        </div>
      ) : (
        <>
          <FontList
            fonts={merged.main}
            closedFonts={merged.closed}
            selectedFont={selection}
            onSelect={select}
            onClosedFontsOpenChange={(open) => {
              // One way only: having read those fonts, we don't unread them.
              if (open) setClosedRevealed(true);
            }}
            header={
              offerListing && (
                <LocalFontsPrompt
                  onList={listFonts}
                  listing={listing}
                  error={listError}
                />
              )
            }
          />
          <div
            css={css`
              flex: 1;
              display: flex;
              flex-direction: column;
              min-width: 0;
              /* Without this the pane's own scrollbar never appears: a flex item
                 defaults to refusing to shrink below its content. */
              min-height: 0;
            `}
          >
            {(listing || loading) && <LinearProgress />}
            {/* When the sidebar is asking for permission it reports its own
                failures; saying it twice would be worse than saying it once. */}
            {listError && !offerListing && (
              <Alert
                severity="error"
                css={css`
                  margin: 12px 24px 0;
                `}
              >
                {listError}
              </Alert>
            )}
            {selectedInfo && (
              <FontDetailsPane
                font={selectedInfo}
                fontData={fontData}
                postscriptName={postscriptName}
                // Only coverage we have actually read. A font the licence pass has
                // reached but the details pass hasn't is absent from this map
                // rather than present and empty, which would have the pane
                // announce that it can't write a single one of the user's letters.
                scannedCoverage={coverage[selectedInfo.family]}
                alphabet={alphabet}
                choices={chosen}
                onChoicesChange={changeChoices}
                onDownloadFont={onDownloadFont}
                onCancel={onCancel}
                onUse={() => onFontSelected(selection, chosen)}
                loading={loading}
                sampleSize={sampleSize}
              />
            )}
          </div>
        </>
      )}
    </Paper>
  );
};

type ScanState = Record<string, FamilyScan>;
type SetScanState = React.Dispatch<React.SetStateAction<ScanState>>;

const NOTHING_READ_YET: FamilyScan = {
  variants: [],
  coverage: new Uint32Array(),
  detailsRead: false,
};

/**
 * Fold what a pass found into what we already knew, field by field. The two passes
 * answer different questions about the same font, so the second must not wipe out
 * the first's answer by arriving with nothing to say about it.
 */
function mergeScans(
  previous: ScanState,
  updates: Record<string, Partial<FamilyScan>>
): ScanState {
  const next = { ...previous };
  for (const [family, found] of Object.entries(updates)) {
    next[family] = { ...NOTHING_READ_YET, ...next[family], ...found };
  }
  return next;
}

/**
 * Collects what a sweep reports and applies it in batches. One state update per
 * font would mean hundreds of renders of a list this long.
 */
function batched(apply: SetScanState) {
  let pending: Record<string, Partial<FamilyScan>> = {};
  const flush = () => {
    if (Object.keys(pending).length === 0) return;
    const batch = pending;
    pending = {};
    apply((previous) => mergeScans(previous, batch));
  };
  const timer = setInterval(flush, 200);

  return {
    flush,
    collect: (family: string, found: Partial<FamilyScan>) => {
      pending[family] = { ...pending[family], ...found };
    },
    stop: () => {
      clearInterval(timer);
      pending = {};
    },
  };
}

/**
 * Start the expensive pass over these families, skipping any we have already
 * asked about, and hand back how to call it off. The licences are not re-read:
 * whoever calls this already has them.
 */
function readDetails(
  families: LocalFontFamily[],
  asked: React.MutableRefObject<Set<string>>,
  apply: SetScanState
): (() => void) | undefined {
  const wanted = families.filter((family) => !asked.current.has(family.family));
  if (wanted.length === 0) return undefined;
  for (const family of wanted) asked.current.add(family.family);

  const abort = new AbortController();
  const batch = batched(apply);
  scanFamiliesForCharacterVariants(wanted, batch.collect, {
    signal: abort.signal,
    readLicense: false,
  }).finally(batch.flush);

  return () => {
    abort.abort();
    batch.stop();
  };
}

/**
 * The nudge at the top of the list while the machine's own fonts are still
 * missing from it. Until the user clicks this, fonts they already have can only
 * appear as entries the host app offers to download, which is worse than saying
 * plainly that we haven't looked yet.
 */
const LocalFontsPrompt: React.FunctionComponent<{
  onList: () => void;
  listing: boolean;
  error?: string;
}> = ({ onList, listing, error }) => {
  const theme = useTheme();
  return (
    <div
      css={css`
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      `}
    >
      <span
        css={css`
          font-size: 12px;
          line-height: 1.35;
          color: ${theme.palette.text.secondary};
        `}
      >
        Your computer&apos;s fonts aren&apos;t shown yet.
      </span>
      <Button
        variant="text"
        size="small"
        onClick={onList}
        disabled={listing}
        css={css`
          font-size: 12px;
          padding: 2px 6px;
          margin-left: -6px;
        `}
      >
        {listing ? <CircularProgress size={14} /> : "List installed fonts…"}
      </Button>
      {error && (
        <span
          css={css`
            font-size: 11.5px;
            line-height: 1.35;
            color: ${theme.palette.error.main};
          `}
        >
          {error}
        </span>
      )}
    </div>
  );
};
