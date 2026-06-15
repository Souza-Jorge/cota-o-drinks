import {
  Box, Card, CardContent, Chip, Divider, FormControl, IconButton,
  MenuItem, Select, Stack, Tooltip, Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import StarIcon from "@mui/icons-material/StarRounded";
import EmojiEventsIcon from "@mui/icons-material/EmojiEventsOutlined";
import { useQuery } from "@tanstack/react-query";
import { getPriceComparisonClient } from "@/lib/quotes.api";
import {
  cheapestLine, comparePriceFromHistory, effectiveUnits, effectiveWinner,
  formatBRL, lineNetUnit, lineTotalNet,
} from "../calc";
import type { QuoteItem, SupplierLine } from "../types";
import { useQuoteStore } from "../useQuoteStore";
import { DecimalField } from "./DecimalField";
import { DiscountInput } from "./DiscountInput";
import { PriceComparisonBadge } from "./PriceComparisonBadge";
import { supplierColor } from "./QuoteSuppliersBar";

export function QuoteItemCard({ item }: { item: QuoteItem }) {
  const supplierCodigos = useQuoteStore((s) => s.header.supplierCodigos);
  const supplierNames = useQuoteStore((s) => s.header.supplierNames);
  const updateItemQuantityBoxes = useQuoteStore((s) => s.updateItemQuantityBoxes);
  const updateItemQuantityUnits = useQuoteStore((s) => s.updateItemQuantityUnits);
  const updateLine = useQuoteStore((s) => s.updateLine);
  const setItemWinner = useQuoteStore((s) => s.setItemWinner);
  const removeItem = useQuoteStore((s) => s.removeItem);

  const cheapest = cheapestLine(item);
  const winner = effectiveWinner(item);

  return (
    <Card variant="outlined">
      <CardContent sx={{ px: 1.5, py: 2, "&:last-child": { pb: 2 } }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ alignItems: { md: "flex-start" }, justifyContent: "space-between" }}
        >
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{item.productName}</Typography>
            <Typography variant="caption" color="text.secondary">
              Cód {item.produtoCodigo} • {item.packageLabel || "—"} • Pack {item.pack} • Estoque {item.stock}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-end" }}>
            <Box>
              <Stack direction="row" spacing={1}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Cx</Typography>
                  <DecimalField
                    value={item.quantityBoxes}
                    onChange={(n) => updateItemQuantityBoxes(item.id, n)}
                    width={70}
                    decimals={0}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Un</Typography>
                  <DecimalField
                    value={item.quantityUnits}
                    onChange={(n) => updateItemQuantityUnits(item.id, n)}
                    width={70}
                    decimals={0}
                  />
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
                = {effectiveUnits(item)} un
              </Typography>
            </Box>
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary">Vencedor</Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={item.winnerSupplierCodigo == null ? "__auto__" : String(item.winnerSupplierCodigo)}
                  onChange={(e) =>
                    setItemWinner(item.id, e.target.value === "__auto__" ? null : Number(e.target.value))
                  }
                >
                  <MenuItem value="__auto__"><em>Automático (menor preço)</em></MenuItem>
                  {supplierCodigos.map((sid) => (
                    <MenuItem key={sid} value={String(sid)}>
                      {supplierNames[sid] ?? `Cód ${sid}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Tooltip title="Remover item">
              <IconButton color="error" onClick={() => removeItem(item.id)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {supplierCodigos.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Adicione fornecedores acima para começar a precificar este item.
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto", pb: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ minWidth: "min-content" }}>
              {item.lines.map((line) => (
                <SupplierColumn
                  key={line.supplierCodigo}
                  item={item}
                  line={line}
                  supplierName={supplierNames[line.supplierCodigo] ?? `Cód ${line.supplierCodigo}`}
                  isCheapest={cheapest?.supplierCodigo === line.supplierCodigo && line.grossUnit > 0}
                  isWinner={winner?.supplierCodigo === line.supplierCodigo}
                  color={supplierColor(supplierCodigos, line.supplierCodigo)}
                  onChangeLine={(patch) => updateLine(item.id, line.supplierCodigo, patch)}
                />
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function SupplierColumn({
  item, line, supplierName, isCheapest, isWinner, color, onChangeLine,
}: {
  item: QuoteItem;
  line: SupplierLine;
  supplierName: string;
  isCheapest: boolean;
  isWinner: boolean;
  color: ReturnType<typeof supplierColor>;
  onChangeLine: (patch: Partial<Omit<SupplierLine, "supplierCodigo">>) => void;
}) {
  const net = lineNetUnit(line);
  const { data: history } = useQuery({
    queryKey: ["price-history", item.produtoCodigo, line.supplierCodigo],
    queryFn: () => getPriceComparisonClient(item.produtoCodigo, line.supplierCodigo),
    enabled: line.grossUnit > 0,
    staleTime: 60_000,
  });
  const cmp = comparePriceFromHistory(net, history?.last ?? null, history?.previous ?? null);

  return (
    <Box
      sx={{
        width: 240,
        flexShrink: 0,
        borderRadius: 1.5,
        border: 2,
        borderColor: isWinner ? "success.main" : isCheapest ? "success.light" : "divider",
        bgcolor: isWinner ? "success.50" : "background.paper",
        p: 1.5,
      }}
    >
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Chip size="small" label={supplierName} color={color} variant="outlined" />
        {isWinner && (<Tooltip title="Vencedor"><EmojiEventsIcon fontSize="small" color="success" /></Tooltip>)}
        {!isWinner && isCheapest && (<Tooltip title="Menor preço"><StarIcon fontSize="small" color="success" /></Tooltip>)}
      </Stack>

      <Stack spacing={1}>
        <Box>
          <Typography variant="caption" color="text.secondary">Preço bruto</Typography>
          <DecimalField value={line.grossUnit} onChange={(n) => onChangeLine({ grossUnit: n })} fullWidth />
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Desconto</Typography>
          <DiscountInput
            type={line.discountType}
            value={line.discount}
            onChangeType={(t) => onChangeLine({ discountType: t })}
            onChangeValue={(v) => onChangeLine({ discount: v })}
          />
        </Box>
        <Divider />
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">Líquido un.</Typography>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: net < 0 ? "error.main" : isWinner ? "success.dark" : "text.primary" }}
          >
            {line.grossUnit > 0 ? formatBRL(net) : "—"}
          </Typography>
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">Total</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {line.grossUnit > 0 ? formatBRL(lineTotalNet(effectiveUnits(item), line)) : "—"}
          </Typography>
        </Stack>
        {line.grossUnit > 0 && (<Box sx={{ mt: 0.5 }}><PriceComparisonBadge comparison={cmp} /></Box>)}
      </Stack>
    </Box>
  );
}
