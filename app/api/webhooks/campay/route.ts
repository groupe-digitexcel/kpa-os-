import { NextResponse } from "next/server";
import { confirmCampayPayment } from "@/lib/actions/campayPayments";

// CamPay calls this URL when a collect request resolves. We don't trust the
// POST body's status field on its own — confirmCampayPayment() re-checks
// with CamPay's status API server-side before crediting anything.
// Set this URL in your CamPay app config: https://your-domain/api/webhooks/campay
export async function POST(request: Request) {
  let body: { reference?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.reference) {
    return NextResponse.json({ error: "Missing reference" }, { status: 400 });
  }

  await confirmCampayPayment(body.reference);

  return NextResponse.json({ received: true });
}
