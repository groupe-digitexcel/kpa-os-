import DashboardShell from "@/components/DashboardShell";
import ExpenseForm from "@/components/ExpenseForm";
import ExportCsvButton from "@/components/ExportCsvButton";
import { getRecentExpenses, getMonthlyFinancialSummary } from "@/lib/actions/expenses";

export default async function ExpensesPage() {
  const [expenses, summary] = await Promise.all([getRecentExpenses(), getMonthlyFinancialSummary()]);
  const net = summary.income - summary.expenses;

  async function exportExpensesCsv() {
    "use server";
    const rows = expenses.map((e: any) => ({
      Date: e.expense_date,
      Category: e.category,
      Description: e.description,
      "Amount (XAF)": e.amount,
      "Recorded By": e.staff?.full_name ?? "",
    }));
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]);
    return [headers.join(","), ...rows.map((r: any) => headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(","))].join("\n");
  }

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Expenses</h1>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">This month's financial picture</p>
        <ExportCsvButton label="Export CSV" fetchCsv={exportExpensesCsv} filename="expenses.csv" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase">Income (Fees)</p>
          <p className="text-xl font-bold text-green-600 mt-1">{summary.income.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase">Expenses</p>
          <p className="text-xl font-bold text-red-600 mt-1">{summary.expenses.toLocaleString()}</p>
        </div>
        <div className="bg-kpa-navy rounded-xl p-4">
          <p className="text-xs text-white/60 uppercase">Net</p>
          <p className={`text-xl font-bold mt-1 ${net >= 0 ? "text-kpa-gold" : "text-red-400"}`}>{net.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseForm />

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y max-h-[520px] overflow-y-auto">
          {(expenses as any[]).map((e) => (
            <div key={e.id} className="p-3 text-sm">
              <div className="flex justify-between">
                <p className="text-kpa-navy font-medium capitalize">{e.category}</p>
                <span className="font-semibold text-red-600">{Number(e.amount).toLocaleString()} XAF</span>
              </div>
              <p className="text-xs text-gray-500">{e.description}</p>
              <p className="text-xs text-gray-400">{e.expense_date} · {e.staff?.full_name}</p>
            </div>
          ))}
          {expenses.length === 0 && <p className="p-5 text-sm text-gray-400">No expenses recorded yet.</p>}
        </div>
      </div>
    </DashboardShell>
  );
}
