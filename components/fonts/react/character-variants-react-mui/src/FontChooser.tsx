/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  Alert,
  Autocomplete,
  Button,
  CircularProgress,
  TextField,
  useTheme,
} from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  coversAlphabet,
  FamilyScan,
  filterVariantsForAlphabet,
  isLocalFontAccessSupported,
  LocalFontFamily,
  parseAlphabet,
  queryLocalFontFamilies,
  scanFamiliesForCharacterVariants,
} from "@ethnolib/font-core";

export interface FontChooserProps {
  /** The font family currently chosen; "" for none. */
  value: string;
  onChange: (font: string) => void;
  /**
   * Offer exactly these font families instead of the ones installed on the
   * machine. An app that keeps its own font list should pass it here.
   */
  fonts?: string[];
  /**
   * Called once the machine's installed fonts have been listed, which is also the
   * point at which the page has permission to read font bytes.
   */
  onFontsListed?: () => void;
  /**
   * The alphabet the user cares about. Fonts with letter shapes to offer for it are
   * picked out in the list.
   */
  alphabet?: string;
  label?: string;
  className?: string;
}

/**
 * Chooses a font family. Without a `fonts` list of its own to work from, it lists
 * the fonts installed on the machine, which needs the Local Font Access API and
 * so has to be kicked off by a click (it can prompt for permission).
 *
 * Having listed them, it reads each in the background to find out what it has to
 * offer: fonts with letter shapes for this alphabet come out bold and in the
 * theme's primary color, fonts with no letter shapes at all come out grey.
 */
export const FontChooser: React.FunctionComponent<FontChooserProps> = ({
  value,
  onChange,
  fonts,
  onFontsListed,
  alphabet = "",
  label = "Font",
  className,
}) => {
  const theme = useTheme();
  const [installed, setInstalled] = useState<LocalFontFamily[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  /** family -> what the sweep found; absent until the sweep gets to that family. */
  const [scanned, setScanned] = useState<Record<string, FamilyScan>>({});

  const loadInstalled = async () => {
    setLoading(true);
    setError(undefined);
    try {
      setInstalled(await queryLocalFontFamilies());
      onFontsListed?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // If permission was granted in an earlier session we can list fonts without
  // waiting for a click.
  useEffect(() => {
    if (fonts || !isLocalFontAccessSupported()) return;
    (async () => {
      try {
        const status = await navigator.permissions.query({
          name: "local-fonts" as PermissionName,
        });
        if (status.state === "granted") await loadInstalled();
      } catch {
        // Older Chromium doesn't know the "local-fonts" permission name; the
        // button below still works.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fonts]);

  // Look through the installed fonts for cvXX features. Results are batched: one
  // state update per font would mean hundreds of renders of a list this long.
  const pending = useRef<Record<string, FamilyScan>>({});
  useEffect(() => {
    if (installed.length === 0) return;
    const abort = new AbortController();
    const flush = () => {
      if (Object.keys(pending.current).length === 0) return;
      const batch = pending.current;
      pending.current = {};
      setScanned((previous) => ({ ...previous, ...batch }));
    };
    const timer = setInterval(flush, 200);
    scanFamiliesForCharacterVariants(
      installed,
      (family, found) => {
        pending.current[family] = found;
      },
      { signal: abort.signal }
    ).finally(flush);

    return () => {
      abort.abort();
      clearInterval(timer);
      pending.current = {};
    };
  }, [installed]);

  const available = fonts ?? installed.map((f) => f.family);

  // Three states per font, once the scan has reached it: letter shapes to offer for
  // this alphabet, some letter shapes but none for this alphabet, or none at all.
  const relevance = useMemo(() => {
    const alphabetSet = parseAlphabet(alphabet);
    const byFamily: Record<string, "alphabet" | "other" | "none"> = {};
    for (const [family, { variants }] of Object.entries(scanned)) {
      byFamily[family] =
        variants.length === 0
          ? "none"
          : filterVariantsForAlphabet(variants, alphabetSet).length > 0
            ? "alphabet"
            : "other";
    }
    return byFamily;
  }, [scanned, alphabet]);

  // Fonts that can write this alphabet come first, then a line, then the rest. A
  // font the sweep hasn't reached goes below the line until we know better, so the
  // list only ever promotes fonts as it learns about them.
  const alphabetSet = useMemo(() => parseAlphabet(alphabet), [alphabet]);
  const canWriteAlphabet = (font: string) => {
    const found = scanned[font];
    return !!found && coversAlphabet(found.coverage, alphabetSet);
  };

  if (available.length === 0) {
    if (!isLocalFontAccessSupported()) {
      return (
        <Alert severity="warning" className={className}>
          This browser cannot list the fonts installed on this machine (the
          Local Font Access API is Chromium-only).
        </Alert>
      );
    }
    return (
      <div className={className}>
        <Button variant="contained" onClick={loadInstalled} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : "List installed fonts…"}
        </Button>
        {error && (
          <Alert
            severity="error"
            css={css`
              margin-top: 8px;
            `}
          >
            {error}
          </Alert>
        )}
      </div>
    );
  }

  // A remembered font may not be in the list (not installed, or a list that has
  // since changed); show it anyway rather than silently dropping the choice.
  const listed =
    value && !available.includes(value) ? [value, ...available] : available;

  const serving = alphabetSet.size ? listed.filter(canWriteAlphabet) : [];
  const rest = serving.length
    ? listed.filter((font) => !serving.includes(font))
    : listed;
  const options = [...serving, ...rest];
  // Where the line goes: at the top of the fonts that can't write this alphabet.
  const firstOfRest = serving.length ? rest[0] : undefined;

  return (
    <Autocomplete
      className={className}
      options={options}
      // Nothing good comes of clearing the font: there would be nothing to show.
      disableClearable
      value={value as string}
      onChange={(_event, font) => onChange(font ?? "")}
      css={css`
        width: 20em;
      `}
      renderOption={(props, font) => {
        const state = relevance[font];
        return (
          <li
            {...props}
            key={font}
            css={
              font === firstOfRest &&
              css`
                border-top: 1px solid ${theme.palette.divider};
              `
            }
          >
            <span
              css={css`
                font-family: "${font}";
                font-size: 18px;
                font-weight: ${state === "alphabet" ? 700 : 400};
                color: ${state === "alphabet"
                  ? theme.palette.primary.main
                  : state === "none"
                    ? theme.palette.text.disabled
                    : "inherit"};
              `}
            >
              {font}
            </span>
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} size="small" />
      )}
    />
  );
};
