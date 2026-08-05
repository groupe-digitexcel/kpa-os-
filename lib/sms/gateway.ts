"use server";

// Pluggable SMS gateway. Cameroon MTN/Orange delivery usually needs a local
// aggregator (not Twilio) — plug the real one in here once chosen. Until
// SMS_GATEWAY_API_KEY is set, sends are simulated and logged as "pending" so
// the rest of the app (and demos) work without crashing.

export async function sendSms(phone: string, message: string): Promise<{ ok: boolean; simulated: boolean }> {
  const apiKey = process.env.SMS_GATEWAY_API_KEY;
  const senderId = process.env.SMS_GATEWAY_SENDER_ID ?? "KPA";

  if (!apiKey) {
    // Simulated send — no gateway configured yet.
    return { ok: true, simulated: true };
  }

  try {
    // Example shape for a generic REST SMS aggregator — replace URL/body with
    // the real provider's spec once chosen (e.g. Nsimi, MessageBird Cameroon route).
    const res = await fetch("https://api.your-sms-provider.cm/v1/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: phone, from: senderId, text: message }),
    });
    return { ok: res.ok, simulated: false };
  } catch {
    return { ok: false, simulated: false };
  }
}
