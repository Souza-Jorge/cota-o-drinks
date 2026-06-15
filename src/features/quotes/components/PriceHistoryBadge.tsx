import { Stack, Typography } from "@mui/material";
import { formatBRL } from "../calc";
import type { PriceComparison } from "../types";

export function PriceHistoryBadge({ comparison }: { comparison: PriceComparison }) {
  return (
    <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
      <HistoryItem label="Última" value={comparison.last} />
      <HistoryItem label="Penúltima" value={comparison.previous} />
      <HistoryItem label="Média" value={comparison.average} bold />
    </Stack>
  );
}

function HistoryItem({ label, value, bold }: { label: string; value: number | null; bold?: boolean }) {
  return (
    <Stack>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 700 : 500 }}>
        {formatBRL(value)}
      </Typography>
    </Stack>
  );
}
