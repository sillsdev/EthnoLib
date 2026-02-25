export interface FormattedText {
  text: string;
  isHighlighted: boolean;
}

export function highlightMatches(
  matchWith: string,
  text: string
): FormattedText[] {
  if (text === "") {
    return [];
  }

  if (matchWith === "") {
    return [{ text, isHighlighted: false }];
  }

  // Escape special regex characters and split while capturing the delimiter
  const escapedMatch = matchWith.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedMatch})`, "gi");

  return text
    .split(regex)
    .map((segment, index) => ({
      text: segment,
      isHighlighted: index % 2 === 1, // Odd indices are the captured matches
    }))
    .filter((x) => x.text);
}
