import { Chip, Stack, Typography } from "@mui/material";
import { formatBRL, formatPct } from "../calc";
import type { PriceComparison } from "../types";

const COLOR: Record<PriceComparison["status"], "success" | "warning" | "error" | "default" | "info"> = {
  good: "success",
  average: "info",
  warning: "warning",
  expensive: "error",
  none: "default",
};

export function PriceComparisonBadge({ comparison }: { comparison: PriceComparison }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Chip
        size="small"
        label={comparison.label}
        color={COLOR[comparison.status]}
        variant={comparison.status === "none" ? "outlined" : "filled"}
      />
      {comparison.diffBRL != null && (
        <Typography variant="caption" color="text.secondary">
          {formatBRL(comparison.diffBRL)} ({formatPct(comparison.diffPct)})
        </Typography>
      )}
    </Stack>
  );
}
