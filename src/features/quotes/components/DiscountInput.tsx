import { Stack, ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { DiscountType } from "../types";
import { DecimalField } from "./DecimalField";

type Props = {
  type: DiscountType;
  value: number;
  onChangeType: (t: DiscountType) => void;
  onChangeValue: (v: number) => void;
  size?: "small" | "medium";
};

export function DiscountInput({ type, value, onChangeType, onChangeValue, size = "small" }: Props) {
  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "stretch" }}>
      <ToggleButtonGroup exclusive size={size} value={type} onChange={(_, v) => v && onChangeType(v)}>
        <ToggleButton value="BRL" sx={{ px: 1 }}>R$</ToggleButton>
        <ToggleButton value="PCT" sx={{ px: 1 }}>%</ToggleButton>
      </ToggleButtonGroup>
      <DecimalField
        size={size}
        value={value}
        onChange={onChangeValue}
        min={0}
        max={type === "PCT" ? 100 : undefined}
        width={90}
      />
    </Stack>
  );
}
