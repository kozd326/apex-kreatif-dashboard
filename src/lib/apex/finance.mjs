export const cents = (value) => Math.round((Number(value) || 0) * 100);
export function invoiceBalance(invoice, cash) {
  const expectedDirection =
    (invoice.direction === "sale") !== !!invoice.refund ? "in" : "out";
  const paid = cash
    .filter((p) => p.invoice_id === invoice.id && !p.void)
    .reduce(
      (sum, p) =>
        sum + (p.direction === expectedDirection ? 1 : -1) * cents(p.amount),
      0,
    );
  return {
    paid: paid / 100,
    remaining: Math.max(0, cents(invoice.total) - paid) / 100,
    overpaid: Math.max(0, paid - cents(invoice.total)) / 100,
  };
}
export function financeSummary(invoices, cash, month, entityId = "") {
  const inv = invoices.filter(
    (i) =>
      !i.void &&
      i.issue_date?.startsWith(month) &&
      (!entityId || i.entity_id === entityId),
  );
  const movements = cash.filter(
    (p) =>
      !p.void &&
      p.entry_date?.startsWith(month) &&
      (!entityId || p.entity_id === entityId),
  );
  const sum = (xs, key) =>
    xs.reduce((s, x) => s + (x.refund ? -1 : 1) * cents(x[key]), 0) / 100;
  const sales = inv.filter((i) => i.direction === "sale");
  const expenses = inv.filter((i) => i.direction === "expense");
  const approved = inv.filter((i) => !i.tax_review && i.entity_id);
  const outputVat = sum(
    approved.filter((i) => i.direction === "sale"),
    "vat",
  );
  const inputVat = sum(
    approved.filter((i) => i.direction === "expense" && i.deductible),
    "vat",
  );
  const received =
    movements
      .filter((p) => p.direction === "in")
      .reduce((s, p) => s + cents(p.amount), 0) / 100;
  const spent =
    movements
      .filter((p) => p.direction === "out")
      .reduce((s, p) => s + cents(p.amount), 0) / 100;
  return {
    sales: sum(sales, "total"),
    expenses: sum(expenses, "total"),
    received,
    spent,
    netCash: received - spent,
    outputVat,
    inputVat,
    vatContribution: outputVat - inputVat,
    needsReview: inv.filter((i) => i.tax_review || !i.entity_id).length,
  };
}
export function validateInvoiceTotals(net, vat, total) {
  return (
    [net, vat, total].every(
      (n) =>
        n !== null &&
        n !== undefined &&
        n !== "" &&
        Number.isFinite(Number(n)) &&
        Number(n) >= 0,
    ) && cents(net) + cents(vat) === cents(total)
  );
}
export function documentDuplicate(records, entry) {
  return records.some(
    (r) =>
      !r.void &&
      entry.number &&
      r.entity_id === entry.entity_id &&
      r.direction === entry.direction &&
      r.counterparty.trim().toLocaleLowerCase("tr") ===
        entry.counterparty.trim().toLocaleLowerCase("tr") &&
      r.number.trim().toLocaleLowerCase("tr") ===
        entry.number.trim().toLocaleLowerCase("tr"),
  );
}
