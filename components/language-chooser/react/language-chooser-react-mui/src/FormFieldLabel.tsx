/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import {
  InputLabel,
  InputLabelProps,
  Typography,
  useTheme,
} from "@mui/material";
import { Trans } from "@lingui/react/macro";

export const FormFieldLabel: React.FunctionComponent<
  {
    label: string;
    required?: boolean;
  } & InputLabelProps
> = ({ label, required, ...inputLabelProps }) => {
  const theme = useTheme();
  return (
    <InputLabel
      {...inputLabelProps}
      css={css`
        // Otherwise it is nowrap and the labels get in the way of horizontal shrinking on narrow screens
        text-wrap: wrap;
      `}
    >
      <Typography
        css={css`
          color: ${theme.palette.grey[700]};
          font-weight: bold;
          margin-bottom: 3px;
        `}
      >
        {label}
      </Typography>

      {required && (
        <span
          css={css`
            font-weight: normal;
            color: ${theme.palette.error.main};
            // align with right edge of parent
            position: absolute;
            right: 0;
            bottom: 0;
            top: 0;
            font-size: 0.75rem;
          `}
        >
          <Trans>required</Trans>
        </span>
      )}
    </InputLabel>
  );
};
