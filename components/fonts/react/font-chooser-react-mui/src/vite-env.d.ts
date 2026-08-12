/// <reference types="vite/client" />

// TypeScript's lib.dom (as of 5.7) declares FontFaceSet without its mutation
// methods, which the demo needs in order to register a font the user opened.
interface FontFaceSet {
  add(font: FontFace): FontFaceSet;
  delete(font: FontFace): boolean;
}
