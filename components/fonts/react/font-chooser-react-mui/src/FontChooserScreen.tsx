/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  Alert,
  Button,
  CircularProgress,
  LinearProgress,
  Paper,
  Skeleton,
  Typography,
  useTheme,
} from "@mui/material";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CharacterVariantChoices,
  allVariantGroups,
  effectiveChoicesFor,
  effectiveShapeChoiceFor,
  findSldrEntry,
  rememberShapeChoice,
  type ChoiceSource,
  type ShapeChoice,
  type ShapeMemory,
} from "@ethnolib/character-variants-react-mui";
import {
  FamilyScan,
  LocalFontFamily,
  coversAlphabet,
  fetchFontFileSize,
  mergeCoverageRanges,
  createGflanguagesSampleTextProvider,
  isLocalFontAccessSupported,
  loadLocalFontDataByFamilyWithName,
  parseAlphabet,
  pruneCoverageCache,
  pruneLicenseCache,
  pruneLocalFontListCache,
  queryLocalFontFamilies,
  readCachedCoverages,
  readCachedLicenses,
  readCachedLocalFontList,
  readCoverageRanges,
  scanFamiliesForCharacterVariants,
  scanFamiliesForLicense,
  useFontData,
  writeCachedCoverage,
  writeCachedLicense,
  writeCachedLocalFontList,
  type SampleText,
  type SampleTextProvider,
} from "@ethnolib/font-core";
import { FontDetailsPane } from "./FontDetailsPane";
import { FontList } from "./FontList";
import { featureSettingsFor } from "./featureSettings";
import { findFont, mergeFonts, sectionForMoreFonts } from "./mergeFonts";
import { shouldOfferLocalFontListing } from "./localFontListing";
import { downloadPolicy, useNetworkAvailability } from "./constrainedNetwork";
import { customSampleSurvivesLanguageChange } from "./sampleText";
import { useFontDownloads } from "./useFontDownloads";
import type { FontChooserScreenProps, ReportDiagnostic } from "./types";

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
  alphabetPending,
  fonts,
  getLocalFonts,
  getFontData = loadLocalFontDataByFamilyWithName,
  fetchImpl,
  selectedFont,
  onSelectedFontChange,
  defaultFont = "",
  choices,
  onChoicesChange,
  shapeMemory,
  onShapeMemoryChange,
  fontFeatureDefaults,
  onEffectiveShapesChange,
  onDiagnostic,
  network: hostNetwork,
  recentFonts,
  moreFonts,
  onSearchMoreFonts,
  searchMoreFontsCost,
  searchingMoreFonts,
  moreFontsExplanation,
  onCancel,
  getFullFontUrl,
  onFontSelected,
  sampleSize,
  languageTag,
  languageName,
  languageScript,
  sampleTextProvider: hostSampleTextProvider,
  customSampleText,
  onCustomSampleTextChange,
  loading: hostBusy,
  className,
}) => {
  // The host's ear, through a ref: it is usually an inline arrow, and an effect
  // that took it as a dependency would re-run on every render of the host.
  // Nothing here calls the detail thunk unless somebody is on the other end.
  const diagnosticRef = useRef(onDiagnostic);
  diagnosticRef.current = onDiagnostic;
  const diagnose = useCallback<ReportDiagnostic>((message, detail) => {
    const report = diagnosticRef.current;
    if (!report) return;
    report(message, detail?.());
  }, []);

  // Every font file this component fetches goes through here, so a host can put
  // credentials, a proxy, a timeout or its own local-disk protocol in front of
  // all of them at once. Through a ref, and stable, for the same reason the
  // diagnostic ear is: an inline arrow from the host must not restart the
  // effects that download.
  const fetchImplRef = useRef(fetchImpl);
  fetchImplRef.current = fetchImpl;
  const fetchFile = useCallback<typeof fetch>(
    (input, init) => (fetchImplRef.current ?? fetch)(input, init),
    []
  );

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

  const [ownShapeMemory, setOwnShapeMemory] = useState<ShapeMemory>([]);
  const memory = shapeMemory ?? ownShapeMemory;
  const rememberShape = (choice: ShapeChoice) => {
    const next = rememberShapeChoice(memory, choice);
    if (!shapeMemory) setOwnShapeMemory(next);
    onShapeMemoryChange?.(next);
  };

  // Why each row's current form is in force, keyed by row. Always maintained: it
  // feeds onEffectiveShapesChange, and the chooser cannot say where a setting
  // came from without it. A font switch replaces the whole map; a pick
  // overwrites its own row's entry.
  const [provenance, setProvenance] = useState<Record<string, ChoiceSource>>(
    {}
  );

  // A host that keeps the user's rewritten sample passes it back; one that doesn't
  // still lets them rewrite it, for as long as the chooser is open.
  // ownSample mirrors every change, not just the ones made while the host had
  // nothing: an echoing host goes back to undefined when the user clears the
  // box, and a stale ownSample from the first keystroke would shadow that.
  const [ownSample, setOwnSample] = useState<string | undefined>();
  const sample = customSampleText ?? ownSample;
  const changeSample = (next: string | undefined) => {
    setOwnSample(next);
    onCustomSampleTextChange?.(next);
  };

  // A change of language hands the sample back to whoever supplies it, exactly as
  // emptying the box does — see customSampleSurvivesLanguageChange for why their
  // text cannot be allowed to outlive the language it was written for. The host is
  // told, not merely bypassed: one that keeps the text across sessions would
  // otherwise restore it over the new language on the next visit, and no host
  // should have to work this rule out for itself.
  const languageWas = useRef(languageTag);
  useEffect(() => {
    const before = languageWas.current;
    languageWas.current = languageTag;
    if (customSampleSurvivesLanguageChange(before, languageTag)) return;
    if (sample === undefined) return;
    changeSample(undefined);
    // Only a change of language is grounds for this. changeSample is a fresh
    // closure every render and would restart the effect on all of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageTag]);

  // Real writing in the user's language, fetched here rather than handed in: a
  // host asked for a font chooser, and where the words to draw the fonts over
  // come from is this component's business, not something every host should have
  // to know how to answer. A host that *does* have an answer — one shipping the
  // passages with it, for a machine that may never see the network — says so
  // with `sampleTextProvider` and is asked instead.
  //
  // The default is made once, so the script reaches it through a ref that can
  // change under it. It is made whether or not the host supplied one: a hook
  // cannot be skipped, and building a provider costs an object.
  const scriptRef = useRef(languageScript);
  scriptRef.current = languageScript;
  const defaultSampleTextProvider = useMemo(
    () =>
      createGflanguagesSampleTextProvider({
        scriptFor: () => scriptRef.current,
      }),
    []
  );
  // Through a ref, and not an effect dependency: the host's provider is often an
  // object built in the render that passes it, and an effect that watched it
  // would fetch the passage again on every render of the host — including the
  // renders this component's own answers cause.
  const sampleTextProviderRef = useRef<SampleTextProvider>(
    defaultSampleTextProvider
  );
  sampleTextProviderRef.current =
    hostSampleTextProvider ?? defaultSampleTextProvider;

  // The answer carries the tag it is about, and is only shown while that is
  // still the tag we are on. Two pieces of state — "have we heard" and "what did
  // it say" — go out of step the moment the user picks a second language, and
  // the passage of the language before it would sit under the new one's name.
  const [fetchedSample, setFetchedSample] = useState<{
    tag: string;
    sample?: SampleText;
  }>();
  useEffect(() => {
    const tag = languageTag?.trim();
    if (!tag) return;

    const controller = new AbortController();
    sampleTextProviderRef.current
      .getSampleText(tag, { signal: controller.signal })
      .then((found) => {
        if (!controller.signal.aborted)
          setFetchedSample({ tag, sample: found });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof Error && error.name === "AbortError") return;
        // A language the data set doesn't cover, or a request that didn't land:
        // the sample falls back to text made up out of the alphabet, and says
        // it is made up, which is a complete answer on its own.
        setFetchedSample({ tag, sample: undefined });
      });
    return () => controller.abort();
    // The script isn't read here — the default provider reaches it through the
    // ref — but a change to it is a different file to fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageTag, languageScript]);

  const languageSample =
    fetchedSample && fetchedSample.tag === languageTag?.trim()
      ? fetchedSample.sample
      : undefined;

  const alphabetSet = useMemo(() => parseAlphabet(alphabet), [alphabet]);

  // A change of language pulls the alphabet out from under the selected font.
  // A font the user picked stays put while its coverage is merely unknown or
  // imperfect — see writesTheAlphabet — but that grace is for coverage arriving
  // after their click, not for a selection outliving the language it was made
  // for: once the alphabet itself has changed and the font is known not to
  // write it, keeping it selected shows a font the list would never offer.
  // Deselecting lets the landing effect below pick a font that can.
  const alphabetWas = useRef(alphabet);
  useEffect(() => {
    if (alphabetWas.current === alphabet) return;
    alphabetWas.current = alphabet;
    if (!selection || alphabetSet.size === 0) return;
    const known = coverage[selection];
    if (known && !coversAlphabet(known, alphabetSet)) select("");
    // Only an alphabet change is grounds for this; coverage arriving later for
    // the font the user is on is the case writesTheAlphabet already protects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alphabet]);

  // What each font can write, from wherever we learned it: the background sweep
  // for installed fonts, and — for a font whose bytes we fetched because the user
  // looked at it — what those bytes said. Both count as knowledge, so a
  // downloadable font that turns out to lack the alphabet drops out of the list
  // once the user moves off it.
  const [readOnSelection, setReadOnSelection] = useState<
    Record<string, Uint32Array>
  >({});
  // What an earlier visit read out of the installed fonts' cmaps. Lowest
  // precedence, so a fresh read this visit corrects it — but it is what lets the
  // machine's fonts pass the coverage gate before this visit's sweep has reached
  // them, which is most of a warm start.
  const [cachedCoverage, setCachedCoverage] = useState<
    Record<string, Uint32Array>
  >({});
  const coverage = useMemo(() => {
    const known: Record<string, Uint32Array | undefined> = {
      ...cachedCoverage,
    };
    for (const [family, scan] of Object.entries(scanned)) {
      if (scan.detailsRead) known[family] = scan.coverage;
    }
    return { ...known, ...readOnSelection };
  }, [cachedCoverage, scanned, readOnSelection]);

  // Fetching a font is how the pane learns anything about it, so it happens on
  // selection — unless the connection is one where a megabyte spent unasked is a
  // real cost, in which case the pane offers the download instead and this set
  // remembers which fonts the user said yes to. It doubles as the way back in
  // after a fetch that failed.
  const network = useNetworkAvailability(hostNetwork);
  const { downloaded, bytesFor, extraBytesFor, download } = useFontDownloads(
    diagnose,
    fetchFile
  );
  const [downloadRequested, setDownloadRequested] = useState<
    ReadonlySet<string>
  >(new Set());

  // Fonts chosen on earlier visits count as suggestions of the host's own —
  // ahead of the catalog in the array so that where both name a family, the
  // catalog's fields (its reasons, its urls) win the merge.
  const catalog = useMemo(
    () =>
      recentFonts?.length ? [...recentFonts, ...(fonts ?? [])] : fonts,
    [recentFonts, fonts]
  );

  const merged = useMemo(
    () =>
      mergeFonts({
        local,
        catalog,
        scanned,
        alphabet: alphabetSet,
        alphabetPending,
        coverage,
        alwaysInclude: selection,
        sessionDownloaded: downloaded,
      }),
    [
      local,
      catalog,
      scanned,
      alphabetSet,
      alphabetPending,
      coverage,
      selection,
      downloaded,
    ]
  );
  // The wider search's section, deduplicated against everything above the
  // divider and filtered by the same coverage rules, but never re-sorted: the
  // host ranked these, and the ranking is the section's point.
  const moreSection = useMemo(
    () =>
      moreFonts &&
      sectionForMoreFonts(moreFonts, {
        local,
        catalog,
        alphabet: alphabetSet,
        coverage,
        alwaysInclude: selection,
        sessionDownloaded: downloaded,
      }),
    [moreFonts, local, catalog, alphabetSet, coverage, selection, downloaded]
  );

  // Which fonts are closed decides what the background reads are allowed to touch,
  // and those reads are set off by effects that must not restart every time a
  // result lands. So they ask the ref for the list as it stands rather than taking
  // it as a dependency.
  const mergedNow = useRef(merged);
  mergedNow.current = merged;
  const scannedNow = useRef(scanned);
  scannedNow.current = scanned;

  const selectedInfo =
    findFont(merged, selection) ??
    moreSection?.find(
      (font) => font.family.toLowerCase() === selection.toLowerCase()
    );
  const installed = selectedInfo ? selectedInfo.installed !== false : false;

  // A font we don't have yet still has bytes to read, as long as the catalog says
  // where they live: fetching the file is what lets the pane show the sample, the
  // letter shapes and the coverage — which is to say, everything the user opened
  // the font to see. So a selection is a download, and the browser is handed the
  // face as it arrives.
  //
  // Where the connection says otherwise the fetch waits for a click. Until then
  // this font is one we could read and haven't, which is what the empty url says
  // to everything below.
  //
  // Offline the wait is permanent, and `downloadPolicy` says so: there is no
  // click that can produce the font, so the pane makes no offer and this stays
  // empty however many times the user selects it.
  const policy = selectedInfo ? downloadPolicy(network, selectedInfo) : "none";
  const fileUrl = installed ? undefined : selectedInfo?.fileUrl;
  // "none" is checked rather than implied, so that a font the user agreed to
  // download while the network was up isn't still being fetched after it went
  // away: the agreement is remembered by family, and the connection isn't.
  const downloadUrl =
    policy === "fetch" ||
    (policy === "offer" && downloadRequested.has(selection.toLowerCase()))
      ? fileUrl
      : undefined;

  const loadBytes = (font: string) => {
    // The session cache first, and before anything else: once a fetched font is
    // registered it counts as installed, so `downloadUrl` has gone undefined and
    // Local Font Access — which knows nothing of a face that lives only in this
    // page — would be asked for a font it cannot find.
    const already = bytesFor(font);
    if (already) return Promise.resolve(already);
    if (downloadUrl && selectedInfo) return download(selectedInfo);
    return getFontData(font);
  };

  // Nothing to read for a font that is neither here nor allowed to be fetched;
  // the details pane makes the offer on its own.
  const { fontData, postscriptName, loading, error, retry } = useFontData(
    !installed && !downloadUrl ? "" : selection,
    loadBytes
  );

  const requestDownload = () => {
    setDownloadRequested((previous) =>
      new Set(previous).add(selection.toLowerCase())
    );
    // A first click changes the url as well, which would set off the load on its
    // own; a second one, after a failure, changes nothing, and this is the whole
    // of what makes it happen.
    retry();
  };

  // What we preview with, for a font from a per-subset source, is a slice of
  // the family (fileIsSubset); the file the user should walk away with is the
  // whole font. When the host says where whole fonts live, the selected font's
  // is looked up as soon as it is selected — two small requests — so that
  // "Use this font" can carry the real cost of the click before it is clicked,
  // and the click itself can await the same lookup rather than racing it.
  // Only a font this session fetched needs any of this: one that was on the
  // machine all along is already whole.
  const getFullFontUrlRef = useRef(getFullFontUrl);
  getFullFontUrlRef.current = getFullFontUrl;
  const selectedInfoNow = useRef(selectedInfo);
  selectedInfoNow.current = selectedInfo;
  const fullFontLookup = useRef<
    | {
        family: string;
        promise: Promise<{ url?: string; sizeBytes?: number }>;
      }
    | undefined
  >(undefined);
  const [fullFontSize, setFullFontSize] = useState<number | undefined>();
  const [choosing, setChoosing] = useState(false);
  const [chooseError, setChooseError] = useState<string | undefined>();
  const wantsFullFont =
    !!getFullFontUrl &&
    // Looking the whole font up is two requests over the network, and offline
    // they are two requests that will fail — for a font the user cannot be
    // choosing anyway. A font downloaded earlier in the session is the one that
    // makes this worth checking: it is here, it is selectable, and its whole
    // family is not.
    network !== "offline" &&
    !!selectedInfo?.fileIsSubset &&
    (selectedInfo.installed === false ||
      downloaded.has(selection.toLowerCase()));

  useEffect(() => {
    setChooseError(undefined);
    setFullFontSize(undefined);
    if (!wantsFullFont) {
      fullFontLookup.current = undefined;
      return;
    }
    const info = selectedInfoNow.current;
    const resolve = getFullFontUrlRef.current;
    if (!info || !resolve) return;
    const controller = new AbortController();
    const promise = (async (): Promise<{
      url?: string;
      sizeBytes?: number;
    }> => {
      try {
        const url = await resolve(info, { signal: controller.signal });
        if (!url) {
          diagnose(
            `no full font found for ${info.family}; its subset file will have to do`
          );
          return {};
        }
        const sizeBytes = await fetchFontFileSize(url, {
          fetchImpl: fetchFile,
          signal: controller.signal,
        });
        diagnose(`full font found for ${info.family}`, () => ({
          url,
          sizeBytes,
        }));
        return { url, sizeBytes };
      } catch (error) {
        // A lookup that failed leaves us where we were: handing over the
        // subset file beats failing the whole choice.
        if (!controller.signal.aborted) {
          diagnose(
            `full font lookup failed for ${info.family}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        return {};
      }
    })();
    fullFontLookup.current = { family: info.family, promise };
    void promise.then((full) => {
      if (!controller.signal.aborted && full.url) {
        setFullFontSize(full.sizeBytes);
      }
    });
    return () => controller.abort();
  }, [wantsFullFont, selection, diagnose, fetchFile]);

  const handleUse = async () => {
    // The bytes go with the choice for a font we fetched: the host may want to
    // keep it, and it is already in memory. A font that was on the machine all
    // along has none to hand over.
    const data = bytesFor(selection);
    if (!data || !selectedInfo?.fileUrl) {
      onFontSelected(selection, chosen, undefined);
      return;
    }
    const lookup = fullFontLookup.current;
    if (lookup && lookup.family.toLowerCase() === selection.toLowerCase()) {
      // We previewed with a subset; the user has chosen the font, and this is
      // the moment the whole file is worth its download.
      setChoosing(true);
      setChooseError(undefined);
      try {
        const { url } = await lookup.promise;
        if (url) {
          diagnose(`fetching the full ${selection}`, () => ({ fileUrl: url }));
          const response = await fetchFile(url);
          if (!response.ok) {
            const status =
              `${response.status} ${response.statusText ?? ""}`.trim();
            throw new Error(`Could not fetch the font: ${status}`);
          }
          const whole = await response.arrayBuffer();
          diagnose(`fetched the full ${selection}`, () => ({
            receivedBytes: whole.byteLength,
          }));
          onFontSelected(selection, chosen, {
            data: whole,
            fileUrl: url,
            info: selectedInfo,
          });
          return;
        }
      } catch (error) {
        // The choice didn't take. The dialog stays up wearing the reason, and
        // the button still works: a retry is a fresh fetch.
        setChooseError(
          error instanceof Error ? error.message : String(error)
        );
        return;
      } finally {
        setChoosing(false);
      }
    }
    onFontSelected(selection, chosen, {
      data,
      fileUrl: selectedInfo.fileUrl,
      info: selectedInfo,
    });
  };

  // Every shape row the selected font offers for this alphabet, letters and
  // digits together — the list that shape memory and the language's defaults
  // are matched against. The letters/digits split is the pane's display concern.
  const groups = useMemo(
    () => allVariantGroups(fontData, postscriptName, alphabet),
    [fontData, postscriptName, alphabet]
  );

  // On landing on a font, derive its choices — a remembered fact first, then an
  // SLDR default, then the font's own form — replacing the previous font's raw
  // tags outright. The replacement is the point: a cvNN carried across fonts
  // means something unrelated on the next one, and until now it silently
  // applied there. The ref keeps this to one derivation per font-and-rows, so
  // the user's later picks on it aren't stomped — and rows are part of the key
  // because useFontData keeps the old font's bytes for a grace period on a
  // switch, so the first derivation for a new font can run against the old
  // font's rows and has to be done again when its own arrive.
  const derivedFor = useRef<{ selection: string; groups: unknown }>();
  useEffect(() => {
    if (!groups || !selection) return;
    if (
      derivedFor.current?.selection === selection &&
      derivedFor.current?.groups === groups
    ) {
      return;
    }
    derivedFor.current = { selection, groups };
    const derived = effectiveChoicesFor(
      groups,
      memory,
      selection,
      fontFeatureDefaults
    );
    changeChoices(derived.choices);
    setProvenance(derived.provenance);
    diagnose(`derived shapes for ${selection}`, () => ({
      choices: derived.choices,
      provenance: derived.provenance,
      sldrEntry: findSldrEntry(selection, fontFeatureDefaults ?? []),
      shapeMemory: memory,
    }));
    // Memory and defaults changing for their own reasons must not re-derive
    // and undo the user's in-progress edits; only a new font does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, selection]);

  // The full effective set, told to the host whenever it changes: on the
  // derivation above and on every pick.
  //
  // "Changes" is judged by value, not by the identity of `chosen`. A host is
  // entitled to hand `choices` back as a fresh object every render — one that
  // parses it out of stored JSON does — and anything said here can cause that
  // render: a diagnostic appended to a host's log is a host state change.
  // Repeating the same answer in a new wrapper fed the render that asked for
  // the next repeat, and the page never came back.
  const effectiveSaid = useRef<string>();
  useEffect(() => {
    // Working the set out is only worth it for somebody who is going to read it.
    if (!groups || (!onEffectiveShapesChange && !diagnosticRef.current)) return;
    const effective = groups.map((group) =>
      effectiveShapeChoiceFor(group, chosen, provenance)
    );
    const saying = JSON.stringify(effective);
    if (effectiveSaid.current === saying) return;
    effectiveSaid.current = saying;
    onEffectiveShapesChange?.(effective);
    diagnose(`effective shapes for ${selection}`, () => ({
      effectiveShapes: effective,
      fontFeatureSettings: featureSettingsFor(chosen),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, chosen, provenance]);

  // A pick is both a durable fact to remember and, immediately, its row's
  // provenance: the reported set says "your pick" without waiting for anything.
  const handleShapeChoice = (groupKey: string, choice: ShapeChoice) => {
    rememberShape(choice);
    setProvenance((previous) => ({
      ...previous,
      [groupKey]: { kind: "user" },
    }));
    diagnose(
      `picked ${choice.groupLabel ?? groupKey}: ${
        choice.formLabel ?? "the font's own form"
      }`,
      () => choice
    );
  };

  // Bytes we fetched for the pane answer the coverage question too, and the answer
  // outlives the visit: it is what lets a font the user has looked at drop out of
  // the list if it can't write their alphabet. Installed fonts the sweep has
  // already read are left alone. A font that arrived as several subset files
  // covers the union of them: each file answers for its own letters.
  useEffect(() => {
    if (!fontData || !selection) return;
    if (scannedNow.current[selection]?.detailsRead) return;
    let stale = false;
    const files = [fontData, ...(extraBytesFor(selection) ?? [])];
    Promise.all(
      files.map((file, index) =>
        // The PostScript name picks a face out of a collection, and only the
        // primary bytes can be one; the extra subset files are single fonts.
        readCoverageRanges(new Blob([file]), index === 0 ? postscriptName : undefined)
      )
    )
      .then((all) => {
        if (!stale) {
          setReadOnSelection((previous) => ({
            ...previous,
            [selection]: mergeCoverageRanges(all),
          }));
        }
      })
      .catch(() => {
        // A font whose cmap won't parse stays a font we know nothing about.
      });
    return () => {
      stale = true;
    };
    // extraBytesFor is a stable accessor into the same download that delivered
    // fontData, so fontData arriving is the moment its answer is complete.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Last visit's list first: enumeration costs seconds where the cache costs
    // nothing, and the list barely changes between visits. The real enumeration
    // replaces it below — which is when a font uninstalled since then leaves.
    // This runs only where listing is about to run anyway, so a revoked
    // permission never has old answers shown under it.
    if (local.length === 0) {
      const remembered = readCachedLocalFontList();
      if (remembered) setLocal(remembered);
    }
    try {
      const families = await (getLocalFonts ?? queryLocalFontFamilies)();
      setLocal(families);
      writeCachedLocalFontList(families);
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
    // Coverage an earlier visit read; see `cachedCoverage`. Replaced wholesale,
    // so a change of list drops entries for fonts no longer on it.
    setCachedCoverage(readCachedCoverages(local));
    if (!isLocalFontAccessSupported()) {
      setLicensesFor(local);
      return;
    }
    // What an earlier visit worked out. A font's licence doesn't change under us,
    // so this is the whole answer for anything we have seen before.
    pruneLicenseCache();
    pruneCoverageCache();
    pruneLocalFontListCache();
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
      {/* The placeholder stands in only while there is nothing real to put up.
          The machine's own fonts don't wait for the host's catalog — they are
          already listed by now wherever permission survives from an earlier
          visit — so a busy host hides them only when there are none, and the
          catalog's fonts join the list when it answers. */}
      {hostBusy && nothingToShow ? (
        <ChooserPlaceholder />
      ) : nothingToShow ? (
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
            languageName={languageName}
            selectedFont={selection}
            onSelect={select}
            onClosedFontsOpenChange={(open) => {
              // One way only: having read those fonts, we don't unread them.
              if (open) setClosedRevealed(true);
            }}
            moreFonts={moreSection}
            onSearchMoreFonts={onSearchMoreFonts}
            searchMoreFontsCost={searchMoreFontsCost}
            searchingMoreFonts={searchingMoreFonts}
            moreFontsExplanation={moreFontsExplanation}
            network={network}
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
            <LoadingBar active={listing || loading || !!hostBusy} />
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
                supplementaryFontData={extraBytesFor(selectedInfo.family)}
                postscriptName={postscriptName}
                // Only coverage we have actually read. A font the licence pass has
                // reached but the details pass hasn't is absent from this map
                // rather than present and empty, which would have the pane
                // announce that it can't write a single one of the user's letters.
                scannedCoverage={coverage[selectedInfo.family]}
                alphabet={alphabet}
                languageName={languageName}
                choices={chosen}
                onChoicesChange={changeChoices}
                network={network}
                downloading={!installed && loading}
                downloadError={!installed ? error?.message : undefined}
                onRequestDownload={requestDownload}
                onCancel={onCancel}
                onUse={() => void handleUse()}
                useDownloadSizeBytes={fullFontSize}
                choosing={choosing}
                chooseError={chooseError}
                loading={loading}
                fetchImpl={fetchFile}
                sampleSize={sampleSize}
                languageSample={languageSample}
                customSampleText={sample}
                onCustomSampleTextChange={changeSample}
                onShapeChoiceChange={handleShapeChoice}
              />
            )}
          </div>
        </>
      )}
    </Paper>
  );
};

/**
 * The screen while the host works out what to offer for a language it has just
 * been given.
 *
 * The alternative is what was there before, and that is worse than a blank: the
 * previous language's fonts, sitting under the new language's name, read as this
 * language's answer. Placeholders in the shape of the list and the pane say
 * plainly that the answer is on its way and that this is where it will appear.
 */
const ChooserPlaceholder: React.FunctionComponent = () => {
  const theme = useTheme();
  return (
    <>
      <div
        aria-hidden
        css={css`
          width: 190px;
          flex: none;
          border-right: 1px solid ${theme.palette.divider};
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        `}
      >
        {Array.from({ length: 12 }, (_, index) => index).map((i) => (
          // Ragged, the way a list of font names is; all one length reads as a
          // table rather than as a list still filling in.
          <Skeleton key={i} variant="text" width={`${55 + ((i * 17) % 40)}%`} />
        ))}
      </div>
      <div
        role="status"
        aria-label="Finding fonts"
        css={css`
          flex: 1;
          min-width: 0;
          padding: 22px 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        `}
      >
        <Skeleton variant="rounded" height={54} />
        <div>
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
        </div>
        <div
          css={css`
            display: flex;
            gap: 12px;
          `}
        >
          <Skeleton variant="rounded" width={150} height={76} />
          <Skeleton variant="rounded" width={150} height={76} />
        </div>
      </div>
    </>
  );
};

/**
 * How long a wait has to last before it is worth telling the user about. Below
 * this they have not yet perceived a delay, so a bar saying "wait" is itself the
 * only thing they notice.
 */
const WORTH_REPORTING_MS = 300;

/**
 * The progress bar over the details pane, and the room it takes whether or not it
 * is showing anything.
 *
 * Reading an installed font takes a few milliseconds, so a bar that appeared for
 * every font the user clicked was a blue line flickering on and off at the top of
 * the pane — and, since it took its own height out of the pane, shoving everything
 * below it down four pixels and back. The space is kept whatever happens, and the
 * bar itself waits to see whether this is a real wait.
 */
const LoadingBar: React.FunctionComponent<{ active: boolean }> = ({
  active,
}) => {
  const [showing, setShowing] = useState(false);

  useEffect(() => {
    if (!active) {
      setShowing(false);
      return;
    }
    const timer = setTimeout(() => setShowing(true), WORTH_REPORTING_MS);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <div
      css={css`
        flex: none;
        height: 4px;
      `}
    >
      {showing && (
        <LinearProgress
          css={css`
            height: 4px;
          `}
        />
      )}
    </div>
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
  const byName = new Map(wanted.map((family) => [family.family, family]));
  scanFamiliesForCharacterVariants(
    wanted,
    (family, found) => {
      batch.collect(family, found);
      // Coverage keeps between visits. Empty is what a failed read looks like
      // too, and remembering a failure would hide the font for good.
      if (found.coverage.length > 0) {
        const listed = byName.get(family);
        if (listed) writeCachedCoverage(listed, found.coverage);
      }
    },
    {
      signal: abort.signal,
      readLicense: false,
    }
  ).finally(batch.flush);

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
