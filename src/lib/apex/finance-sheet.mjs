import { financeSummary, invoiceBalance } from "./finance.mjs";

export function financeSheets(
  { invoices, cash, entities, customers },
  currentMonth,
) {
  const name = (rows, id) => rows.find((r) => r.id === id)?.name || "";
  const entity = (id) => name(entities, id) || "İşletme seçilmedi";
  const activeInvoices = invoices
    .filter((r) => !r.void)
    .sort(
      (a, b) =>
        a.issue_date.localeCompare(b.issue_date) || a.id.localeCompare(b.id),
    );
  const activeCash = cash
    .filter((r) => !r.void)
    .sort(
      (a, b) =>
        a.entry_date.localeCompare(b.entry_date) || a.id.localeCompare(b.id),
    );
  const months = [
    ...new Set([
      currentMonth,
      ...activeInvoices.map((r) => r.issue_date.slice(0, 7)),
      ...activeCash.map((r) => r.entry_date.slice(0, 7)),
    ]),
  ]
    .sort()
    .reverse();
  const groups = [...entities.map((r) => r.id)];
  if (
    activeInvoices.some((r) => !r.entity_id) ||
    activeCash.some((r) => !r.entity_id)
  )
    groups.push("");
  const summary = months.flatMap((month) =>
    groups.map((id) => {
      const s = financeSummary(
        invoices.filter((r) => (r.entity_id || "") === id),
        cash.filter((r) => (r.entity_id || "") === id),
        month,
      );
      return [
        month,
        entity(id),
        s.sales,
        s.expenses,
        s.received,
        s.spent,
        s.netCash,
        s.outputVat,
        s.inputVat,
        s.vatContribution,
        s.needsReview,
      ];
    }),
  );
  const serial = (date) =>
    date
      ? (Date.parse(date.slice(0, 10) + "T00:00:00Z") -
          Date.UTC(1899, 11, 30)) /
        86400000
      : "";
  return [
    {
      id: 0,
      title: "Aylık özet",
      note: "Kaynak: Apex paneli. Tutarlar TL. KDV farkı yalnızca kontrol edilmiş Apex kayıtlarıdır; kesin vergi değildir. Kayıtları panelden düzenleyin.",
      headers: [
        "Ay",
        "İşletme",
        "Satış faturaları",
        "Gider faturaları",
        "Tahsilatlar",
        "Ödemeler",
        "Net nakit",
        "Satış KDV",
        "İndirilebilir KDV",
        "KDV farkı",
        "Kontrol bekleyen",
      ],
      rows: summary,
      money: [2, 3, 4, 5, 6, 7, 8, 9],
      dates: [],
    },
    {
      id: 1,
      title: "Faturalar",
      note: "Kaynak: Apex paneli. İade tutarları negatif gösterilir. Kalan tutar pozitif bakiyedir. İptal edilmiş kayıtlar dışarıda bırakılır.",
      headers: [
        "Tarih",
        "İşletme",
        "Tür",
        "Belge no",
        "Karşı taraf",
        "Müşteri",
        "Matrah",
        "KDV",
        "Toplam",
        "Kalan",
        "İade",
        "KDV indirilebilir",
        "Kontrol gerekli",
        "Vade",
        "Açıklama",
        "Kayıt no",
      ],
      rows: activeInvoices.map((i) => [
        serial(i.issue_date),
        entity(i.entity_id),
        i.direction === "sale" ? "Satış" : "Gider",
        i.number || "",
        i.counterparty,
        name(customers, i.customer_id),
        Number(i.net) * (i.refund ? -1 : 1),
        Number(i.vat) * (i.refund ? -1 : 1),
        Number(i.total) * (i.refund ? -1 : 1),
        invoiceBalance(i, cash).remaining,
        i.refund ? "Evet" : "Hayır",
        i.deductible ? "Evet" : "Hayır",
        i.tax_review || !i.entity_id ? "Evet" : "Hayır",
        serial(i.due_date),
        i.description || "",
        i.id,
      ]),
      money: [6, 7, 8, 9],
      dates: [0, 13],
    },
    {
      id: 2,
      title: "Para hareketleri",
      note: "Kaynak: Apex paneli. Gerçekleşmiş tahsilat ve ödemeler; faturalarla birlikte gelir olarak iki kez sayılmaz.",
      headers: [
        "Tarih",
        "İşletme",
        "Müşteri",
        "Yön",
        "Tutar",
        "Açıklama",
        "Fatura no",
        "Kayıt no",
      ],
      rows: activeCash.map((r) => [
        serial(r.entry_date),
        entity(r.entity_id),
        name(customers, r.customer_id),
        r.direction === "in" ? "Tahsilat" : "Ödeme",
        Number(r.amount),
        r.description || "",
        invoices.find((i) => i.id === r.invoice_id)?.number || "",
        r.id,
      ]),
      money: [4],
      dates: [0],
    },
  ];
}

// Strings are literal values, never formulas, including user-entered = / + / @ text.
export function sheetCell(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid finance amount/date");
    return { userEnteredValue: { numberValue: value } };
  }
  return { userEnteredValue: { stringValue: String(value ?? "") } };
}

export function sheetRequests(sheets, previousRows = {}) {
  return sheets.flatMap((s) => {
    const rows = [[s.title], [s.note], s.headers, ...s.rows];
    const rowCount = Math.max(100, rows.length, previousRows[s.id] || 0);
    const colCount = s.headers.length;
    const range = {
      sheetId: s.id,
      startRowIndex: 0,
      endRowIndex: rowCount,
      startColumnIndex: 0,
      endColumnIndex: colCount,
    };
    return [
      { unmergeCells: { range: { ...range, endRowIndex: 2 } } },
      {
        updateSheetProperties: {
          properties: {
            sheetId: s.id,
            gridProperties: {
              rowCount,
              columnCount: colCount,
              frozenRowCount: 3,
              hideGridlines: true,
            },
          },
          fields: "gridProperties",
        },
      },
      {
        updateCells: {
          range,
          rows: rows.map((r) => ({ values: r.map(sheetCell) })),
          fields: "userEnteredValue",
        },
      },
      {
        mergeCells: {
          range: { ...range, endRowIndex: 2 },
          mergeType: "MERGE_ROWS",
        },
      },
      {
        repeatCell: {
          range,
          cell: {
            userEnteredFormat: {
              textFormat: { fontFamily: "Arial", fontSize: 10 },
              verticalAlignment: "MIDDLE",
              wrapStrategy: "CLIP",
            },
          },
          fields: "userEnteredFormat",
        },
      },
      {
        repeatCell: {
          range: { ...range, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.12, green: 0.13, blue: 0.16 },
              textFormat: {
                bold: true,
                fontSize: 17,
                foregroundColor: { red: 1, green: 1, blue: 1 },
              },
            },
          },
          fields: "userEnteredFormat",
        },
      },
      {
        repeatCell: {
          range: { ...range, startRowIndex: 2, endRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.96, green: 0.36, blue: 0.18 },
              textFormat: {
                bold: true,
                foregroundColor: { red: 1, green: 1, blue: 1 },
              },
              wrapStrategy: "WRAP",
            },
          },
          fields: "userEnteredFormat",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: s.id,
            dimension: "COLUMNS",
            startIndex: 0,
            endIndex: colCount,
          },
          properties: { pixelSize: 170 },
          fields: "pixelSize",
        },
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: s.id,
            dimension: "ROWS",
            startIndex: 0,
            endIndex: 3,
          },
          properties: { pixelSize: 38 },
          fields: "pixelSize",
        },
      },
      {
        setBasicFilter: {
          filter: {
            range: {
              ...range,
              startRowIndex: 2,
              endRowIndex: Math.max(4, rows.length),
            },
          },
        },
      },
      {
        repeatCell: {
          range: { ...range, startRowIndex: 1, endRowIndex: 2 },
          cell: {
            userEnteredFormat: {
              wrapStrategy: "WRAP",
              textFormat: {
                fontSize: 10,
                foregroundColor: { red: 0.3, green: 0.3, blue: 0.3 },
              },
            },
          },
          fields: "userEnteredFormat",
        },
      },
      ...s.money.map((col) => ({
        repeatCell: {
          range: {
            sheetId: s.id,
            startRowIndex: 3,
            startColumnIndex: col,
            endColumnIndex: col + 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: {
                type: "NUMBER",
                pattern: '#,##0.00" ₺";[Red](#,##0.00)" ₺";"–"',
              },
            },
          },
          fields: "userEnteredFormat.numberFormat",
        },
      })),
      ...s.dates.map((col) => ({
        repeatCell: {
          range: {
            sheetId: s.id,
            startRowIndex: 3,
            startColumnIndex: col,
            endColumnIndex: col + 1,
          },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: "DATE", pattern: "dd.mm.yyyy" },
            },
          },
          fields: "userEnteredFormat.numberFormat",
        },
      })),
    ];
  });
}
