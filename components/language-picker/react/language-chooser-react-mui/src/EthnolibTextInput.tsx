import { TextField, Typography } from "@mui/material";
import { css } from "@emotion/react";
import { COLORS } from "./Colors";

export const EthnolibTextInput: React.FunctionComponent<{
  id: string;
  label: string;
}> = ({ id, label, ...otherInputProps }) => {
  return (
    <div>
      <label htmlFor={id}>
        <Typography
          css={css`
            color: ${COLORS.greys[3]};
            font-weight: bold;
            margin-bottom: 5px;
          `}
        >
          {label}
        </Typography>
      </label>
      <TextField
        type="text"
        css={css`
          background-color: white;
          margin-right: 0;
          margin-bottom: 10px;
        `}
        id={id}
        {...otherInputProps}
      />
    </div>
  );
};
