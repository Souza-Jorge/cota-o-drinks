import { createTheme } from "@mui/material/styles";

// MUI theme alinhado à nova identidade (teal profundo + âmbar quente).
export const muiTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#1f4d52", contrastText: "#fdf8ef" },
    secondary: { main: "#d98b3d", contrastText: "#2a1d10" },
    success: { main: "#2f9d4f" },
    warning: { main: "#e0a13a" },
    error: { main: "#c5462f" },
    background: { default: "#faf6ec", paper: "#ffffff" },
    text: { primary: "#1f2d33", secondary: "#5b6b73" },
    divider: "#e1d9c6",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily:
      "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiPaper: { defaultProps: { elevation: 0 } },
  },
});