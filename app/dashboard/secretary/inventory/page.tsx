import DashboardShell from "@/components/DashboardShell";
import InventoryManager from "@/components/InventoryManager";
import { listInventory, getRecentInventoryTransactions } from "@/lib/actions/inventory";

export default async function InventoryPage() {
  const [items, transactions] = await Promise.all([
    listInventory(),
    getRecentInventoryTransactions(),
  ]);

  return (
    <DashboardShell>
      <h1 className="text-2xl font-bold text-kpa-navy mb-1">Inventory</h1>
      <p className="text-sm text-gray-500 mb-6">Uniforms, sportswear, stationery, equipment</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3 content-start">
          {items.map((i: any) => (
            <div
              key={i.id}
              className={`bg-white rounded-xl p-4 shadow-sm border ${
                i.quantity_on_hand <= i.reorder_threshold
                  ? "border-red-200"
                  : "border-gray-100"
              }`}
            >
              <p className="text-xs text-gray-400 uppercase">{i.category}</p>
              <p className="font-medium text-kpa-navy text-sm">{i.name}</p>
              <p
                className={`text-2xl font-bold mt-1 ${
                  i.quantity_on_hand <= i.reorder_threshold ? "text-red-600" : "text-kpa-navy"
                }`}
              >
                {i.quantity_on_hand}
              </p>
              {i.quantity_on_hand <= i.reorder_threshold && (
                <p className="text-xs text-red-500">Reorder soon</p>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-gray-400 col-span-full">No inventory items yet.</p>
          )}
        </div>

        <InventoryManager items={items} />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y mt-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-kpa-navy text-sm">Recent Transactions</h2>
        </div>
        {transactions.map((t: any) => (
          <div key={t.id} className="p-3 flex justify-between text-sm">
            <div>
              <p className="text-kpa-navy font-medium">
                {t.item?.name} × {t.quantity}
                {t.flagged_resale && (
                  <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    Flagged
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {t.transaction_type.replace("_", " ")}
                {t.student && ` · ${t.student.full_name}`} · by {t.staff?.full_name}
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {new Date(t.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
        {transactions.length === 0 && (
          <p className="p-5 text-sm text-gray-400">No transactions yet.</p>
        )}
      </div>
    </DashboardShell>
  );
}
