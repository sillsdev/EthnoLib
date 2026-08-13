import { css } from "@emotion/react";

/**
 * The one colour the chooser's scrollbars are drawn in — the font list and the
 * details pane beside it — covering the draggable thumb and the little arrow at
 * each end. Change this to recolour all of them.
 */
export const FONT_LIST_SCROLLBAR_COLOR = "#c0c5c6b4";

/** Width of that scrollbar, and the box each arrow is drawn in. */
const SCROLLBAR_SIZE = 14;

const arrowMask = (degrees: number) =>
  `url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M5 3.2 L8.4 6.8 L1.6 6.8 Z" transform="rotate(${degrees} 5 5)" fill="black"/></svg>`
  )}")`;

/**
 * Chromium hands the arrows a colour of its own choosing unless we draw them
 * ourselves, so each button gets the thumb colour behind an arrow-shaped mask.
 * Firefox has no arrows and takes `scrollbar-color` instead.
 */
export const scrollbarCss = css`
  scrollbar-color: ${FONT_LIST_SCROLLBAR_COLOR} transparent;

  &::-webkit-scrollbar {
    width: ${SCROLLBAR_SIZE}px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${FONT_LIST_SCROLLBAR_COLOR};
    border-radius: ${SCROLLBAR_SIZE / 2}px;
    /* An inset thumb, so it doesn't sit hard against the pane's edge. */
    border: 3px solid transparent;
    background-clip: content-box;
  }
  &::-webkit-scrollbar-button:single-button {
    height: ${SCROLLBAR_SIZE}px;
    background-color: ${FONT_LIST_SCROLLBAR_COLOR};
    -webkit-mask-size: 10px 10px;
    mask-size: 10px 10px;
    -webkit-mask-position: center;
    mask-position: center;
    -webkit-mask-repeat: no-repeat;
    mask-repeat: no-repeat;
  }
  &::-webkit-scrollbar-button:single-button:vertical:decrement {
    -webkit-mask-image: ${arrowMask(0)};
    mask-image: ${arrowMask(0)};
  }
  &::-webkit-scrollbar-button:single-button:vertical:increment {
    -webkit-mask-image: ${arrowMask(180)};
    mask-image: ${arrowMask(180)};
  }
`;
