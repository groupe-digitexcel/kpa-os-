"use client";

import { useState } from "react";
import { payFeesOnline, confirmCampayPayment } from "@/lib/actions/campayPayments";
import BilingualText from "@/components/BilingualText";

export function PayFeesButton({ studentId, feeBalance }: { studentId: string; feeBalance: number }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(feeBalance);
  const [status, setStatus] = useState<"idle" | "requesting" | "waiting" | "successful" | "failed" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handlePay() {
    setStatus("requesting"); setErrorMsg("");
    const result = await payFeesOnline(studentId, amount);
    if ("error" in result && result.error) { setStatus("error"); setErrorMsg(result.error); return; }
    setStatus("waiting");
    const reference = result.reference!;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const check = await confirmCampayPayment(reference);
      if (check.status === "successful") { setStatus("successful"); return; }
      if (check.status === "failed") { setStatus("failed"); return; }
    }
    setStatus("error"); setErrorMsg("Payment is taking longer than expected. Check back shortly — it may still complete.");
  }

  if (feeBalance <= 0) return null;

  return (
    <div className="mt-2">
      {!open && <button onClick={() => setOpen(true)} className="w-full py-2 rounded-lg bg-kpa-navy text-white text-sm font-semibold"><BilingualText fr="Payer maintenant (MoMo / Orange Money)" en="Pay Now (MoMo / Orange Money)" /></button>}
      {open && status === "idle" && (
        <div className="flex gap-2 items-center">
          <input type="number" value={amount} max={feeBalance} min={1} onChange={(e) => setAmount(Math.min(feeBalance, Number(e.target.value)))} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <button onClick={handlePay} className="px-4 py-2 rounded-lg bg-kpa-gold text-kpa-navy text-sm font-semibold"><BilingualText fr={`Payer ${amount.toLocaleString()} XAF`} en={`Pay ${amount.toLocaleString()} XAF`} /></button>
        </div>
      )}
      {status === "requesting" && <p className="text-sm text-gray-500 mt-2"><BilingualText fr="Envoi de la demande de paiement…" en="Sending payment request…" /></p>}
      {status === "waiting" && <p className="text-sm text-kpa-navy mt-2">📱 <BilingualText fr="Vérifiez votre téléphone et approuvez le paiement avec votre PIN MoMo/Orange Money…" en="Check your phone and approve the payment with your MoMo/Orange Money PIN…" /></p>}
      {status === "successful" && <p className="text-sm text-green-600 mt-2">✅ <BilingualText fr="Paiement reçu. Merci !" en="Payment received. Thank you!" /></p>}
      {status === "failed" && <p className="text-sm text-red-600 mt-2">❌ <BilingualText fr="Le paiement n’a pas été effectué. Veuillez réessayer." en="Payment was not completed. Please try again." /></p>}
      {status === "error" && <p className="text-sm text-red-600 mt-2">{errorMsg}</p>}
    </div>
  );
}
