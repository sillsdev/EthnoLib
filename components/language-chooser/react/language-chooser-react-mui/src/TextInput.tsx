/** @jsxImportSource @emotion/react */
import { css } from "@emotion/react";
import { TextField, TextFieldProps } from "@mui/material";
import { FormFieldLabel } from "./FormFieldLabel";

export const TextInput: React.FunctionComponent<
  {
    id: string;
    label: string;
    required?: boolean;
  } & TextFieldProps
> = ({ id, label, required, ...textFieldProps }) => {
  return (
    <div>
      <FormFieldLabel htmlFor={id} label={label} required={required} />
      <TextField
        type="text"
        css={css`
          background-color: white;
          margin-right: 0;
          margin-bottom: 10px;
        `}
        id={id}
        required={required}
        {...textFieldProps}
      />
    </div>
  );
};
