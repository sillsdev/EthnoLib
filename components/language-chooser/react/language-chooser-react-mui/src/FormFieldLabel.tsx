/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { InputLabel, InputLabelProps, Typography } from "@mui/material";
import { COLORS } from "./colors";

export const FormFieldLabel: React.FunctionComponent<
  {
    label: string;
    required?: boolean;
  } & InputLabelProps
> = ({ label, required, ...inputLabelProps }) => {
  return (
    <InputLabel {...inputLabelProps}>
      <Typography
        css={css`
          color: ${COLORS.greys[3]};
          font-weight: bold;
          margin-bottom: 3px;
        `}
      >
        {label}
        {required && (
          <sup
            css={css`
              font-weight: normal;
              color: ${COLORS.error};
            `}
          >
            (required)
          </sup>
        )}
      </Typography>
    </InputLabel>
  );
};
