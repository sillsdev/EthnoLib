// Writing a snapshot and saying what it costs.
//
// These files are bundled into the package and therefore into every host app
// that ships it, so the number that matters is the gzipped size — what a user
// actually downloads. Printing both on one greppable line means a run of all
// four generators can be summed at a glance.
import { writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { basename } from "node:path";

/**
 * Write `value` as JSON to `path` and print `name raw=N gzip=N`.
 *
 * Unindented on purpose: nobody reads these by hand, and the indentation would
 * be a third of the raw bytes. A trailing newline so the file is well-formed
 * text.
 */
export async function writeJsonAndReport(path, value) {
  const json = JSON.stringify(value) + "\n";
  const raw = Buffer.byteLength(json);
  const gzip = gzipSync(json).length;
  await writeFile(path, json);
  console.log(`${basename(path)} raw=${raw} gzip=${gzip}`);
  return { raw, gzip };
}
