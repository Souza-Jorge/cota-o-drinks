import { TextField, type TextFieldProps, InputAdornment } from "@mui/material";
import { useEffect, useRef, useState } from "react";

type Props = {
  value: number;
  onChange: (n: number) => void;
  decimals?: number;
  min?: number;
  max?: number;
  width?: number | string;
  endAdornment?: React.ReactNode;
  size?: TextFieldProps["size"];
  fullWidth?: boolean;
  sx?: TextFieldProps["sx"];
};

const formatter = (decimals: number) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

const format = (n: number, decimals: number) =>
  Number.isFinite(n) ? formatter(decimals).format(n) : formatter(decimals).format(0);

const parse = (s: string): number => {
  if (!s) return 0;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

export function DecimalField({
  value,
  onChange,
  decimals = 2,
  min = 0,
  max,
  width,
  endAdornment,
  size = "small",
  fullWidth,
  sx,
}: Props) {
  const [draft, setDraft] = useState<string>(() => format(value, decimals));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(format(value, decimals));
  }, [value, decimals]);

  const commit = () => {
    let n = draft.trim() === "" ? 0 : parse(draft);
    if (typeof max === "number") n = Math.min(max, n);
    n = Math.max(min, n);
    onChange(n);
    setDraft(format(n, decimals));
  };

  return (
    <TextField
      size={size}
      fullWidth={fullWidth}
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        setDraft("");
        requestAnimationFrame(() => e.target.select?.());
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^\d.,]/g, "");
        setDraft(v);
      }}
      onBlur={() => {
        focused.current = false;
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      slotProps={{
        htmlInput: {
          inputMode: "decimal",
          style: { textAlign: "right" },
        },
        input: endAdornment
          ? { endAdornment: <InputAdornment position="end">{endAdornment}</InputAdornment> }
          : undefined,
      }}
      sx={{ width, ...sx }}
    />
  );
}