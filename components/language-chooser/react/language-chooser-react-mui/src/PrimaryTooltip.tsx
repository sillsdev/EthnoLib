import { styled, TooltipProps, Tooltip, tooltipClasses } from "@mui/material";

// A tooltip with the primary color as the background color and an "arrow" (speech bubble shape)
// Styling method based on https://mui.com/material-ui/react-tooltip/#customization
export const PrimaryTooltip = styled(
  ({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} arrow classes={{ popper: className }} />
  )
)(({ theme }) => {
  const primaryColor = theme.palette.primary.dark;
  return {
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: primaryColor,
      fontSize: "0.75rem",
    },
    [`& .${tooltipClasses.arrow}`]: {
      color: primaryColor,
    },
  };
});
