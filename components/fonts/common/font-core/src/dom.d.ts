// TypeScript's lib.dom (as of 5.7) declares FontFaceSet without its mutation
// methods, which tofuFont.ts needs in order to register the face that draws a
// box for every character. The same three lines are in each react package's
// vite-env.d.ts, for the same reason.
interface FontFaceSet {
  add(font: FontFace): FontFaceSet;
  delete(font: FontFace): boolean;
}
