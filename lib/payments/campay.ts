// ── KPA-OS — CamPay Integration ─────────────────────────────────────────────
// Collects school fees from parents via MTN MoMo / Orange Money.
//
// NOTE: Endpoint paths below (/api/collect/, /api/transaction/status/) match
// CamPay's published SDKs (Python/Node/WordPress). Confirm against your app's
// exact docs in the CamPay dashboard before going live — if a path or field
// name differs, only this file needs to change.

const CAMPAY_BASE_URL =
  process.env.CAMPAY_ENV === 'production'
    ? 'https://www.campay.net'
    : 'https://demo.campay.net'

const CAMPAY_TOKEN = process.env.CAMPAY_PERMANENT_TOKEN!

function authHeaders() {
  return {
    Authorization: `Token ${CAMPAY_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// Normalizes a Cameroonian number to CamPay's expected 237XXXXXXXXX format.
export function normalizeCameroonPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('237') && digits.length === 12) return digits
  if (digits.length === 9) return `237${digits}`
  return null
}

interface CollectResult {
  ok: boolean
  reference?: string
  error?: string
}

// Sends a payment request ("collect") to the parent's phone. The parent
// approves it with their MoMo/Orange Money PIN on their handset.
export async function initiateCollect(
  phone: string,
  amountXaf: number,
  description: string,
  externalReference: string
): Promise<CollectResult> {
  if (!CAMPAY_TOKEN) {
    console.error('CAMPAY_PERMANENT_TOKEN is not set')
    return { ok: false, error: 'Online payment is not available right now' }
  }

  const normalizedPhone = normalizeCameroonPhone(phone)
  if (!normalizedPhone) {
    return { ok: false, error: 'Invalid phone number' }
  }
  if (!Number.isInteger(amountXaf) || amountXaf <= 0) {
    return { ok: false, error: 'Invalid amount' }
  }

  try {
    const res = await fetch(`${CAMPAY_BASE_URL}/api/collect/`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        amount: String(amountXaf),
        currency: 'XAF',
        from: normalizedPhone,
        description,
        external_reference: externalReference,
      }),
    })

    const result = await res.json()
    if (!res.ok || !result.reference) {
      console.error('CamPay collect error:', result)
      return { ok: false, error: 'Could not start payment. Please try again.' }
    }

    return { ok: true, reference: result.reference }
  } catch (err) {
    console.error('CamPay collect request failed:', err)
    return { ok: false, error: 'Online payment is not available right now' }
  }
}

export type CampayTransactionStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED'

// Server-to-server status check — the source of truth. Always call this
// before crediting a payment, even if a webhook already reported success.
export async function checkCollectStatus(
  reference: string
): Promise<{ status: CampayTransactionStatus; amount?: number } | null> {
  if (!CAMPAY_TOKEN) return null
  try {
    const res = await fetch(`${CAMPAY_BASE_URL}/api/transaction/status/${reference}/`, {
      headers: authHeaders(),
    })
    if (!res.ok) return null
    const result = await res.json()
    return { status: result.status as CampayTransactionStatus, amount: Number(result.amount) }
  } catch (err) {
    console.error('CamPay status check failed:', err)
    return null
  }
}
