// Reading a GitHub tarball without a dependency.
//
// Two of the snapshot generators want thousands of small text files from a
// GitHub repository, and asking the API for them one at a time is thousands of
// requests. `codeload.github.com/.../tar.gz/refs/heads/{branch}` hands the whole
// repository over in one, which is both faster and kinder to GitHub.
//
// Unpacking it needs a gunzip and a tar walk. Node has the gunzip; the tar walk
// is short enough to write out — tar is a sequence of 512-byte records, each
// file a header record followed by its contents rounded up to the next 512 —
// that pulling in a package to do it would be the larger cost. Only the fields
// we need are read: the name (with the GNU/PAX long-name extensions, which the
// SLDR's deeply nested paths do run into) and the size.
import { createGunzip } from "node:zlib";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { buffer } from "node:stream/consumers";

const RECORD = 512;

/**
 * The gzipped bytes of a tarball, from the network or from disk.
 *
 * `--from <path>` on any of the generators points at a file downloaded earlier;
 * the SLDR archive is 20MB and three of the generators read it, so downloading
 * it once and passing the path is the polite way to run them together.
 */
export async function readTarballBytes(url, fromPath) {
  if (fromPath) return readFile(fromPath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** `--from <path>` out of a generator's arguments, if it was given one. */
export function fromArgument(argv = process.argv.slice(2)) {
  const at = argv.indexOf("--from");
  return at >= 0 ? argv[at + 1] : undefined;
}

/**
 * Every regular file in a gzipped tarball, as `{ name, text }`, decoded as UTF-8.
 *
 * The whole archive is unzipped into memory first. That is 20MB for the SLDR and
 * 30MB for gflanguages, which is nothing for a tool run by hand, and it keeps the
 * walk a plain loop over a buffer instead of a stream state machine.
 */
export async function* tarEntries(gzipped) {
  const tar = await buffer(Readable.from(gzipped).pipe(createGunzip()));

  // Set by a preceding GNU `L`/PAX `x` record, and consumed by the entry after it.
  let longName;

  for (let at = 0; at + RECORD <= tar.length; ) {
    const header = tar.subarray(at, at + RECORD);
    // Two zero records end the archive; one is enough to know we are past the
    // last file, since the padding after it is zeroes too.
    if (header[0] === 0) break;

    const name = longName ?? nulTerminated(header, 0, 100);
    const prefix = nulTerminated(header, 345, 155);
    const size = octal(header, 124, 12);
    const type = String.fromCharCode(header[156]);
    at += RECORD;
    const body = tar.subarray(at, at + size);
    at += Math.ceil(size / RECORD) * RECORD;

    if (type === "L" || type === "x") {
      // GNU long name, or a PAX extended header whose `path` we pick out of its
      // `{length} key=value\n` records.
      longName =
        type === "L"
          ? body.toString("utf8").replace(/\0.*$/s, "")
          : paxPath(body.toString("utf8")) ?? longName;
      continue;
    }
    longName = undefined;

    // "0" and "\0" are regular files; directories, links and the rest are not
    // what any caller here wants.
    if (type !== "0" && type !== "\0") continue;
    yield {
      name: prefix && !longName ? `${prefix}/${name}` : name,
      text: body.toString("utf8"),
    };
  }
}

function nulTerminated(header, offset, length) {
  const field = header.subarray(offset, offset + length);
  const end = field.indexOf(0);
  return field.toString("utf8", 0, end === -1 ? field.length : end);
}

/** A tar numeric field: octal digits, space- or NUL-padded. */
function octal(header, offset, length) {
  const text = nulTerminated(header, offset, length).trim();
  const value = parseInt(text, 8);
  return Number.isFinite(value) ? value : 0;
}

/** The `path=` record of a PAX extended header, if it has one. */
function paxPath(text) {
  const match = /\d+ path=([^\n]*)\n/.exec(text);
  return match ? match[1] : undefined;
}
