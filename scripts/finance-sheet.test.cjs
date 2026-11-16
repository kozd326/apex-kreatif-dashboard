const test = require("node:test");
const assert = require("node:assert/strict");
const modulePromise = import("../src/lib/apex/finance-sheet.mjs");
const invoice = {
  id: "a",
  entity_id: "e1",
  customer_id: "c",
  direction: "sale",
  issue_date: "2026-11-16",
  due_date: "2026-11-30",
  net: 100,
  vat: 20,
  total: 120,
  number: '=IMPORTXML("evil")',
  counterparty: "Müşteri",
  tax_review: false,
};
test("finance report separates entities, cash and invoices, preserves refunds and review exclusions", async () => {
  const { financeSheets } = await modulePromise;
  const data = {
    invoices: [
      invoice,
      { ...invoice, id: "refund", refund: true, net: 10, vat: 2, total: 12 },
      { ...invoice, id: "void", void: true },
      { ...invoice, id: "unassigned", entity_id: null },
      {
        ...invoice,
        id: "expense",
        direction: "expense",
        deductible: true,
        net: 40,
        vat: 8,
        total: 48,
      },
    ],
    cash: [
      {
        id: "p",
        entity_id: "e1",
        invoice_id: "a",
        direction: "in",
        entry_date: "2026-11-16",
        amount: 60,
      },
    ],
    entities: [
      { id: "e1", name: "İşletme 1" },
      { id: "e2", name: "İşletme 2" },
    ],
    customers: [{ id: "c", name: "Müşteri" }],
  };
  const sheets = financeSheets(data, "2026-11");
  assert.deepEqual(
    sheets[0].rows.find((r) => r[1] === "İşletme 1"),
    ["2026-11", "İşletme 1", 108, 48, 60, 0, 60, 18, 8, 10, 0],
  );
  assert.equal(sheets[0].rows.find((r) => r[1] === "İşletme seçilmedi")[10], 1);
  assert.equal(sheets[1].rows.length, 4);
  const sale = sheets[1].rows.find((r) => r.at(-1) === "a");
  assert.equal(sale[9], 60);
  assert.equal(typeof sale[0], "number");
  assert.equal(sheets[1].rows.find((r) => r.at(-1) === "refund")[8], -12);
});
test("strings remain literal cells, invalid financial values fail visibly", async () => {
  const { sheetCell } = await modulePromise;
  for (const value of ['=IMPORTXML("evil")', "+1", "@SUM(A1)"])
    assert.deepEqual(sheetCell(value), {
      userEnteredValue: { stringValue: value },
    });
  assert.throws(() => sheetCell(NaN));
  assert.throws(() => sheetCell(Infinity));
});
test("refresh clears removed rows atomically and never deletes worksheets", async () => {
  const { financeSheets, sheetRequests } = await modulePromise;
  const sheets = financeSheets(
    { invoices: [], cash: [], entities: [], customers: [] },
    "2026-11",
  );
  const req = sheetRequests(sheets, { 0: 500 });
  const update = req.find(
    (r) => r.updateCells?.range.sheetId === 0,
  ).updateCells;
  assert.equal(update.range.endRowIndex, 500);
  assert.equal(update.rows.length, 3);
  assert.equal(update.fields, "userEnteredValue");
  assert.ok(req.every((r) => !r.deleteSheet));
  assert.ok(
    req
      .filter((r) => r.setBasicFilter)
      .every((r) => r.setBasicFilter.filter.range.startRowIndex === 2),
  );
});
