// The LDML files out of an SLDR tarball, keyed by language tag.
//
// The repository files its LDML under `sldr/{first letter}/{tag}.xml`, so the
// interesting files are two directories deep and everything else in the archive
// — the editor, its test data, the build scripts — has to be stepped over. The
// test data is the trap: `editor/test/data/shn_Mymr.xml` is a real LDML file
// with the right sort of name, and it is not the repository's answer for Shan.
import { tarEntries } from "./fetchTarball.mjs";

/** `{owner}-{branch}/sldr/{letter}/{tag}.xml`, and nothing else in the archive. */
const LDML_PATH = /(?:^|\/)sldr\/[a-z]\/([^/]+)\.xml$/i;

/**
 * Every LDML file in the archive as `{ tag, xml }`.
 *
 * The tag is the file's own name with SLDR's underscores turned into the hyphens
 * BCP 47 and the rest of this package use: `sr_Cyrl` is `sr-Cyrl`, `aa_DJ` is
 * `aa-DJ`. Case is left as the repository writes it (language lowercase, script
 * title case, region upper), so a consumer matching a user's tag should compare
 * case-insensitively.
 */
export async function* sldrFiles(gzipped) {
  for await (const entry of tarEntries(gzipped)) {
    const match = LDML_PATH.exec(entry.name);
    if (!match) continue;
    yield { tag: match[1].replace(/_/g, "-"), xml: entry.text };
  }
}

/** The URL the SLDR tarball comes from. */
export const SLDR_TARBALL =
  "https://codeload.github.com/silnrsi/sldr/tar.gz/refs/heads/master";

/** Where a reader should go to see this data for themselves. */
export const SLDR_SOURCE = "https://github.com/silnrsi/sldr";
