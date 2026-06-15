export type DiscountType = "BRL" | "PCT";

export type SupplierLine = {
  supplierCodigo: number;
  grossUnit: number;
  discountType: DiscountType;
  discount: number;
};

export type QuoteItem = {
  id: string;
  produtoCodigo: number;
  productName: string;
  packageLabel: string;
  pack: number;
  stock: number;
  quantityBoxes: number;
  quantityUnits: number;
  lines: SupplierLine[];
  /** null = automático (escolhe o menor preço líquido com grossUnit > 0) */
  winnerSupplierCodigo: number | null;
};

export type QuoteStatus = "draft" | "closed";

export type SupplierTerms = {
  supplierCodigo: number;
  freight: number;
  orderDiscount: number; // %
};

export type QuoteHeaderState = {
  quoteId: string | null;
  supplierCodigos: number[];
  supplierNames: Record<number, string>;
  date: string; // ISO
  status: QuoteStatus;
  notes: string;
  paymentTerms: string;
  deliveryDate: string | null;
  terms: SupplierTerms[];
};

export type PriceComparison = {
  last: number | null;
  previous: number | null;
  average: number | null;
  diffBRL: number | null;
  diffPct: number | null;
  status: "good" | "average" | "warning" | "expensive" | "none";
  label: string;
};