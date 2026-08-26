/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  IOrthography,
  defaultDisplayName,
  defaultRegionForLangTag,
  defaultSearchResultModifier,
} from "@ethnolib/find-language";
import { Button } from "@mui/material";
import React from "react";
import { LanguageChooser } from "../LanguageChooser";

// What a host application actually receives from the chooser.
//
// Each of the other demos answers a different question: DialogDemo shows the modal use case and
// reopening with a prior selection, PageDemo shows how the chooser responds to the space it is
// given, ThemeDemo shows theming. None of them shows the host side of the contract -- ThemeDemo
// happens to render the same props arrangement Bloom uses, but passes no onSelectionChange at all,
// and PageDemo keeps only the language tag.
//
// So this demo puts the callback on screen. The panel deliberately covers everything our main
// client consumes: Bloom's getLanguageData maps a selection onto exactly five things -- the
// language tag, a default name, the name to actually use, the script's reading direction, and a
// country -- so all five are here, next to the raw fields they are derived from.
export const HostIntegrationDemo: React.FunctionComponent<{
  uiLanguage?: string;
  initialLanguageTag?: string;
  initialSearchString?: string;
  initialCustomDisplayName?: string;
}> = ({
  uiLanguage,
  initialLanguageTag,
  initialSearchString,
  initialCustomDisplayName,
}) => {
  const [reportedSelection, setReportedSelection] = React.useState<
    IOrthography | undefined
  >(undefined);
  const [reportedLanguageTag, setReportedLanguageTag] = React.useState<
    string | undefined
  >(undefined);
  // Lets a reader -- and the tests -- tell "never reported" apart from "reported as cleared", since
  // both leave the fields below empty.
  const [reportCount, setReportCount] = React.useState(0);
  const [submitted, setSubmitted] = React.useState<string | undefined>(
    undefined
  );

  function onSelectionChange(
    orthographyInfo: IOrthography | undefined,
    languageTag: string | undefined
  ) {
    setReportedSelection(orthographyInfo);
    setReportedLanguageTag(languageTag);
    setReportCount((count) => count + 1);
  }

  const language = reportedSelection?.language;
  const script = reportedSelection?.script;

  // The chooser leaves customDisplayName empty until the user edits the name field, so a host that
  // reads only that gets nothing for an ordinary selection and has to fall back to
  // defaultDisplayName. Showing both, and the combination, makes that visible rather than looking
  // like a missing value.
  const customDisplayName = reportedSelection?.customDetails?.customDisplayName;
  const defaultName = language
    ? defaultDisplayName(language, script)
    : undefined;
  const nameAHostWouldUse = customDisplayName || defaultName;

  // Three states, not two: a script can say right-to-left, say left-to-right, or say nothing at
  // all. Bloom keeps that distinction (its IsRtl is a bool?), and conflating "false" with "unknown"
  // is what BL-13982 was about, so spell it out rather than showing a blank.
  const scriptDirection = !script
    ? undefined
    : script.isRtl === undefined
      ? "not stated"
      : `${script.isRtl}`;

  const country = reportedLanguageTag
    ? defaultRegionForLangTag(reportedLanguageTag, language)?.name
    : undefined;

  // Supplied by the host rather than by the chooser, and enabled off the reported selection --
  // the same condition Bloom uses for its own OK button. Clicking it commits, the way a host
  // would; the chooser itself has no notion of "OK".
  const hostActionButtons = (
    <div
      id="host-integration-action-buttons-container"
      css={css`
        width: 100%;
        display: flex;
        justify-content: flex-end;
        padding-top: 15px;
      `}
    >
      <Button
        data-testid="host-integration-ok-button"
        variant="contained"
        color="primary"
        disabled={language === undefined}
        onClick={() =>
          setSubmitted(
            `${reportedLanguageTag || ""} / ${nameAHostWouldUse || ""}`
          )
        }
      >
        OK
      </Button>
    </div>
  );

  const groups: {
    heading: string;
    rows: { testId: string; label: string; value: string | undefined }[];
  }[] = [
    {
      heading: "As reported",
      rows: [
        {
          testId: "report-count",
          label: "times reported",
          value: `${reportCount}`,
        },
        {
          testId: "reported-tag",
          label: "tag",
          value: reportedLanguageTag,
        },
        {
          testId: "reported-language",
          label: "subtag",
          value: language?.languageSubtag,
        },
        { testId: "reported-script", label: "script", value: script?.code },
        {
          testId: "script-is-rtl",
          label: "right-to-left",
          value: scriptDirection,
        },
        {
          testId: "reported-display-name",
          label: "custom name",
          value: customDisplayName,
        },
      ],
    },
    {
      heading: "What a host does with it",
      rows: [
        {
          testId: "default-display-name",
          label: "default name",
          value: defaultName,
        },
        {
          testId: "name-a-host-would-use",
          label: "name to use",
          value: nameAHostWouldUse,
        },
        { testId: "country", label: "country", value: country },
        { testId: "submitted", label: "committed", value: submitted },
      ],
    },
  ];

  return (
    <div
      css={css`
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 12px;
        padding: 8px;
      `}
    >
      {/*
        The selection as reported to the host: readable for a person, assertable for the tests.
        Values are rendered exactly as reported, so an empty one really is empty in the DOM (the
        tests assert on that); the dash a reader sees for an empty value comes from CSS, so it does
        not pollute the text content.
      */}
      <div
        css={css`
          /* border-box so the basis is the real outer width: this page has no CSS reset, and
             padding+border pushing the panel wider is what made the row wrap (which added a
             scrollbar, which narrowed the row, which kept it wrapped). */
          box-sizing: border-box;
          flex: 0 0 220px;
          border: 1px solid #cccccc;
          background-color: #f6f6f6;
          padding: 10px 12px;
          font-family: system-ui, sans-serif;
          font-size: 0.82rem;

          dl {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 3px 10px;
            margin: 0 0 12px;
          }
          dl:last-of-type {
            margin-bottom: 0;
          }
          dt {
            color: #555555;
          }
          dd {
            margin: 0;
            font-family: monospace;
            font-weight: 600;
            overflow-wrap: anywhere;
          }
          dd:empty::after {
            content: "—";
            color: #aaaaaa;
            font-weight: 400;
          }
          h3 {
            font-size: 0.72rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #777777;
            margin: 0 0 6px;
          }
          h3 + dl {
            margin-bottom: 14px;
          }
          /* breathing room before each group heading after the first */
          & > div + div {
            margin-top: 16px;
          }
        `}
      >
        {groups.map((group) => (
          <div key={group.heading}>
            <h3>{group.heading}</h3>
            <dl>
              {group.rows.map((row) => (
                <React.Fragment key={row.testId}>
                  <dt>{row.label}</dt>
                  <dd data-testid={`host-integration-${row.testId}`}>
                    {row.value || ""}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        ))}
      </div>
      {/*
        Bloom hosts the chooser in a WinForms dialog sized 1000x580 -- see the SetScaledSize call in
        CollectionSettingsDialog.ChangeLanguage -- so give it a box that size here. LanguageChooser
        is height:100%, so it needs a parent with a definite height; letting it fill the viewport
        instead both misrepresents what users see and pushes this page into a scrollbar. The row
        wraps rather than shrinking the box, so a narrow window stacks the panel above it instead of
        scrolling sideways.
        Note: no rightPanelComponent, matching Bloom.
      */}
      <div
        css={css`
          flex: 0 0 auto;
          width: 1000px;
          height: 580px;
          border: 1px solid #888888;
        `}
      >
        <LanguageChooser
          uiLanguage={uiLanguage}
          searchResultModifier={defaultSearchResultModifier}
          initialSearchString={initialSearchString}
          initialSelectionLanguageTag={initialLanguageTag}
          initialCustomDisplayName={initialCustomDisplayName}
          onSelectionChange={onSelectionChange}
          actionButtons={hostActionButtons}
        />
      </div>
    </div>
  );
};

export default HostIntegrationDemo;
