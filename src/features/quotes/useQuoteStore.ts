import { create } from "zustand";
import { effectiveUnits, effectiveWinner, lineNetUnit, lineTotalGross, lineTotalNet } from "./calc";
import type {
  DiscountType,
  QuoteHeaderState,
  QuoteItem,
  SupplierLine,
  SupplierTerms,
} from "./types";

export type ProductSnapshot = {
  codigo: number;
  name: string;
  packageLabel: string;
  pack: number;
  stock: number;
};

type State = {
  header: QuoteHeaderState;
  items: QuoteItem[];
};

type Actions = {
  setHeader: (patch: Partial<Omit<QuoteHeaderState, "supplierCodigos" | "terms" | "supplierNames">>) => void;
  addSupplier: (supplierCodigo: number, name: string) => void;
  removeSupplier: (supplierCodigo: number) => void;
  setSupplierTerms: (supplierCodigo: number, patch: Partial<Omit<SupplierTerms, "supplierCodigo">>) => void;
  addItem: (product: ProductSnapshot) => void;
  updateItemQuantityBoxes: (id: string, quantityBoxes: number) => void;
  updateItemQuantityUnits: (id: string, quantityUnits: number) => void;
  updateLine: (itemId: string, supplierCodigo: number, patch: Partial<Omit<SupplierLine, "supplierCodigo">>) => void;
  setItemWinner: (itemId: string, supplierCodigo: number | null) => void;
  setGlobalWinner: (supplierCodigo: number | null) => void;
  removeItem: (id: string) => void;
  resetQuote: () => void;
  validate: () => string[];
  markClosed: () => void;
};

const initialHeader = (): QuoteHeaderState => ({
  quoteId: null,
  supplierCodigos: [],
  supplierNames: {},
  date: new Date().toISOString(),
  status: "draft",
  notes: "",
  paymentTerms: "",
  deliveryDate: null,
  terms: [],
});

const newLine = (supplierCodigo: number): SupplierLine => ({
  supplierCodigo,
  grossUnit: 0,
  discountType: "BRL" as DiscountType,
  discount: 0,
});

const newTerms = (supplierCodigo: number): SupplierTerms => ({
  supplierCodigo,
  freight: 0,
  orderDiscount: 0,
});

export const useQuoteStore = create<State & Actions>((set, get) => ({
  header: initialHeader(),
  items: [],

  setHeader: (patch) => set((s) => ({ header: { ...s.header, ...patch } })),

  addSupplier: (supplierCodigo, name) =>
    set((s) => {
      if (s.header.supplierCodigos.includes(supplierCodigo)) return s;
      return {
        header: {
          ...s.header,
          supplierCodigos: [...s.header.supplierCodigos, supplierCodigo],
          supplierNames: { ...s.header.supplierNames, [supplierCodigo]: name },
          terms: [...s.header.terms, newTerms(supplierCodigo)],
        },
        items: s.items.map((it) => ({
          ...it,
          lines: [...it.lines, newLine(supplierCodigo)],
        })),
      };
    }),

  removeSupplier: (supplierCodigo) =>
    set((s) => {
      const { [supplierCodigo]: _omit, ...rest } = s.header.supplierNames;
      return {
        header: {
          ...s.header,
          supplierCodigos: s.header.supplierCodigos.filter((id) => id !== supplierCodigo),
          supplierNames: rest,
          terms: s.header.terms.filter((t) => t.supplierCodigo !== supplierCodigo),
        },
        items: s.items.map((it) => ({
          ...it,
          lines: it.lines.filter((l) => l.supplierCodigo !== supplierCodigo),
          winnerSupplierCodigo:
            it.winnerSupplierCodigo === supplierCodigo ? null : it.winnerSupplierCodigo,
        })),
      };
    }),

  setSupplierTerms: (supplierCodigo, patch) =>
    set((s) => ({
      header: {
        ...s.header,
        terms: s.header.terms.map((t) =>
          t.supplierCodigo === supplierCodigo ? { ...t, ...patch } : t,
        ),
      },
    })),

  addItem: (product) =>
    set((s) => {
      if (s.items.some((i) => i.produtoCodigo === product.codigo)) return s;
      const item: QuoteItem = {
        id: crypto.randomUUID(),
        produtoCodigo: product.codigo,
        productName: product.name,
        packageLabel: product.packageLabel,
        pack: product.pack,
        stock: product.stock,
        quantityBoxes: 1,
        quantityUnits: 0,
        lines: s.header.supplierCodigos.map((sid) => newLine(sid)),
        winnerSupplierCodigo: null,
      };
      return { items: [...s.items, item] };
    }),

  updateItemQuantityBoxes: (id, quantityBoxes) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, quantityBoxes } : i)),
    })),

  updateItemQuantityUnits: (id, quantityUnits) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, quantityUnits } : i)),
    })),

  updateLine: (itemId, supplierCodigo, patch) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id !== itemId
          ? i
          : {
              ...i,
              lines: i.lines.map((l) =>
                l.supplierCodigo === supplierCodigo ? { ...l, ...patch } : l,
              ),
            },
      ),
    })),

  setItemWinner: (itemId, supplierCodigo) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === itemId ? { ...i, winnerSupplierCodigo: supplierCodigo } : i,
      ),
    })),

  setGlobalWinner: (supplierCodigo) =>
    set((s) => ({
      items: s.items.map((i) => ({ ...i, winnerSupplierCodigo: supplierCodigo })),
    })),

  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

  resetQuote: () => set({ header: initialHeader(), items: [] }),

  validate: () => {
    const { header, items } = get();
    const errors: string[] = [];
    if (header.supplierCodigos.length === 0) errors.push("Adicione ao menos um fornecedor.");
    if (items.length === 0) errors.push("Adicione ao menos um item.");
    items.forEach((it, idx) => {
      if (effectiveUnits(it) <= 0) errors.push(`Item ${idx + 1}: quantidade deve ser maior que zero.`);
      const winner = effectiveWinner(it);
      if (!winner) {
        errors.push(`Item ${idx + 1}: nenhum fornecedor com preço informado.`);
      } else if (lineNetUnit(winner) < 0) {
        errors.push(`Item ${idx + 1}: desconto deixa preço líquido negativo no vencedor.`);
      }
    });
    return errors;
  },

  markClosed: () => set((s) => ({ header: { ...s.header, status: "closed" } })),
}));

export type SupplierTotals = {
  supplierCodigo: number;
  subtotalGross: number;
  subtotalNet: number;
  itemsDiscount: number;
  orderDiscountValue: number;
  freight: number;
  totalDiscount: number;
  grandTotal: number;
  missingItems: number;
};

export function selectSupplierTotals(state: State, supplierCodigo: number): SupplierTotals {
  const terms = state.header.terms.find((t) => t.supplierCodigo === supplierCodigo);
  const freight = terms?.freight ?? 0;
  const orderDiscountPct = Math.min(100, Math.max(0, terms?.orderDiscount ?? 0));

  let subtotalGross = 0;
  let subtotalNet = 0;
  let missing = 0;

  state.items.forEach((it) => {
    const line = it.lines.find((l) => l.supplierCodigo === supplierCodigo);
    if (!line || line.grossUnit <= 0) {
      missing++;
      return;
    }
    const qty = effectiveUnits(it);
    subtotalGross += lineTotalGross(qty, line);
    subtotalNet += lineTotalNet(qty, line);
  });

  const itemsDiscount = subtotalGross - subtotalNet;
  const orderDiscountValue = (subtotalNet * orderDiscountPct) / 100;
  const totalDiscount = itemsDiscount + orderDiscountValue;
  const grandTotal = subtotalNet - orderDiscountValue + freight;

  return {
    supplierCodigo,
    subtotalGross,
    subtotalNet,
    itemsDiscount,
    orderDiscountValue,
    freight,
    totalDiscount,
    grandTotal,
    missingItems: missing,
  };
}

export function selectSelectedTotal(state: State): {
  grandTotal: number;
  itemsCount: number;
  unresolvedItems: number;
} {
  let grandTotal = 0;
  let itemsCount = 0;
  let unresolved = 0;

  const winningSupplierTotals = new Map<number, { net: number; itemsCount: number }>();

  state.items.forEach((it) => {
    const winner = effectiveWinner(it);
    if (!winner) {
      unresolved++;
      return;
    }
    const qty = effectiveUnits(it);
    itemsCount += qty;
    const net = lineTotalNet(qty, winner);
    const cur = winningSupplierTotals.get(winner.supplierCodigo) ?? { net: 0, itemsCount: 0 };
    cur.net += net;
    cur.itemsCount += qty;
    winningSupplierTotals.set(winner.supplierCodigo, cur);
  });

  winningSupplierTotals.forEach((v, supplierCodigo) => {
    const terms = state.header.terms.find((t) => t.supplierCodigo === supplierCodigo);
    const freight = terms?.freight ?? 0;
    const orderDiscountPct = Math.min(100, Math.max(0, terms?.orderDiscount ?? 0));
    const orderDiscountValue = (v.net * orderDiscountPct) / 100;
    grandTotal += v.net - orderDiscountValue + freight;
  });

  return { grandTotal, itemsCount, unresolvedItems: unresolved };
}

/** Snapshot dos vencedores p/ enviar ao backend ao fechar a cotação. */
export function selectWinners(state: State) {
  const winners: Array<{
    produtoCodigo: number;
    fornecedorCodigo: number;
    quantidade: number;
    precoLiquidoUnit: number;
  }> = [];
  state.items.forEach((it) => {
    const w = effectiveWinner(it);
    if (!w) return;
    winners.push({
      produtoCodigo: it.produtoCodigo,
      fornecedorCodigo: w.supplierCodigo,
      quantidade: effectiveUnits(it),
      precoLiquidoUnit: lineNetUnit(w),
    });
  });
  return winners;
}