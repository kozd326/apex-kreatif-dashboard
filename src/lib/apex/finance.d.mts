export function cents(value: unknown): number;
export function invoiceBalance(
  invoice: any,
  cash: any[],
): { paid: number; remaining: number; overpaid: number };
export function financeSummary(
  invoices: any[],
  cash: any[],
  month: string,
  entityId?: string,
): {
  sales: number;
  expenses: number;
  received: number;
  spent: number;
  netCash: number;
  outputVat: number;
  inputVat: number;
  vatContribution: number;
  needsReview: number;
};
export function validateInvoiceTotals(
  net: unknown,
  vat: unknown,
  total: unknown,
): boolean;
export function documentDuplicate(records: any[], entry: any): boolean;
