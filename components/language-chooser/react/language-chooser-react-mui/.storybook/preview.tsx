/** @jsxImportSource @emotion/react */
import type { Preview } from "@storybook/react";
import React from "react";
import { FormControl, Select, MenuItem } from "@mui/material";
import { css } from "@emotion/react";
import availableLocales from "../../../../../available-locales.json" with { type: "json" };

const preview: Preview = {
  parameters: {
    uiLanguage: "en",
  },
  decorators: [
    (Story, context) => {
      const [uiLanguage, setUiLanguage] = React.useState(
        context.parameters.uiLanguage
      );

      return (
        <div>
          <div
            css={css`
              display: flex;
              align-items: center;
              gap: 8px;
            `}
          >
            UI language:
            <LanguageSelector
              locale={uiLanguage}
              onChange={(newLanguage) => {
                setUiLanguage(newLanguage);
                context.parameters.uiLanguage = newLanguage;
              }}
            />
          </div>
          <hr />
          <Story
            {...context}
            parameters={{ ...context.parameters, uiLanguage }}
          />
        </div>
      );
    },
  ],
};

const LanguageSelector: React.FC<{
  locale: string;
  onChange: (value: string) => void;
}> = ({ locale, onChange }) => (
  <FormControl>
    <Select
      value={locale}
      onChange={(e) => onChange(e.target.value)}
      size="small"
    >
      {availableLocales.map((code) => (
        <MenuItem key={code} value={code}>
          {code}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

export default preview;
