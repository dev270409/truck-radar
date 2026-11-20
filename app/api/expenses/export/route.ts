import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/api-guard";
import { listExpenses } from "@/lib/expenses";
import { expenseCategoryLabel, expensePaymentLabel } from "@/lib/expense-catalog";
import { toCsv } from "@/lib/csv";

function csvResponse(filename: string, csv: string) {
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  const guard = await requireFeature("expenses");
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  const items = await listExpenses(guard.session.user.companyId, {
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    category: url.searchParams.get("category"),
    q: url.searchParams.get("q"),
  });

  const csv = toCsv(
    [
      "data",
      "categoria",
      "fornitore",
      "descrizione",
      "imponibile",
      "aliquotaIva",
      "iva",
      "totale",
      "pagamento",
      "ricevuta",
      "note",
    ],
    items.map((item) => [
      new Date(item.date).toISOString().slice(0, 10),
      expenseCategoryLabel(item.category),
      item.supplier ?? "",
      item.description,
      Number(item.netAmount).toFixed(2),
      Number(item.vatRate).toFixed(2),
      Number(item.vatAmount).toFixed(2),
      Number(item.amount).toFixed(2),
      expensePaymentLabel(item.paymentMethod),
      item.receiptUrl ?? "",
      item.notes ?? "",
    ])
  );

  return csvResponse("spese.csv", csv);
}
