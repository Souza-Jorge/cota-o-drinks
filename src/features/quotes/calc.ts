import type { DiscountType, PriceComparison, QuoteItem, SupplierLine } from "./types";

export function effectiveUnits(item: Pick<QuoteItem, "quantityBoxes" | "quantityUnits" | "pack">) {
  return (item.quantityBoxes || 0) * (item.pack || 0) + (item.quantityUnits || 0);
}

export function lineNetUnit(line: { grossUnit: number; discount: number; discountType: DiscountType }) {
  const { grossUnit, discount, discountType } = line;
  if (discountType === "PCT") return grossUnit - (grossUnit * discount) / 100;
  return grossUnit - discount;
}

export function lineTotalGross(quantity: number, line: { grossUnit: number }) {
  return quantity * line.grossUnit;
}

export function lineTotalNet(
  quantity: number,
  line: { grossUnit: number; discount: number; discountType: DiscountType },
) {
  return quantity * lineNetUnit(line);
}

export function effectiveWinner(item: QuoteItem): SupplierLine | null {
  if (item.winnerSupplierCodigo != null) {
    const manual = item.lines.find((l) => l.supplierCodigo === item.winnerSupplierCodigo);
    if (manual && manual.grossUnit > 0) return manual;
  }
  const priced = item.lines.filter((l) => l.grossUnit > 0);
  if (priced.length === 0) return null;
  return priced.reduce((best, l) => (lineNetUnit(l) < lineNetUnit(best) ? l : best));
}

export function cheapestLine(item: QuoteItem): SupplierLine | null {
  const priced = item.lines.filter((l) => l.grossUnit > 0);
  if (priced.length === 0) return null;
  return priced.reduce((best, l) => (lineNetUnit(l) < lineNetUnit(best) ? l : best));
}

export function comparePriceFromHistory(
  currentNet: number,
  last: number | null,
  previous: number | null,
): PriceComparison {
  if (last == null || previous == null) {
    return {
      last,
      previous,
      average: null,
      diffBRL: null,
      diffPct: null,
      status: "none",
      label: "Sem histórico",
    };
  }
  const average = (last + previous) / 2;
  const diffBRL = currentNet - average;
  const diffPct = (diffBRL / average) * 100;

  let status: PriceComparison["status"] = "good";
  let label = "Bom preço";
  if (diffPct > 10) {
    status = "expensive";
    label = "Caro";
  } else if (diffPct > 3) {
    status = "warning";
    label = "Atenção";
  } else if (diffPct >= 0) {
    status = "average";
    label = "Dentro da média";
  }

  return { last, previous, average, diffBRL, diffPct, status, label };
}

export const formatBRL = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatPct = (v: number | null | undefined) =>
  v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;