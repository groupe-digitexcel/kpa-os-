"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { draftSmsMessage, sendBulkSms, type Audience } from "@/lib/actions/sms";

export default function SmsComposer({ classes }: { classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [purpose, setPurpose] = useState<"fee_reminder" | "event_notice" | "appreciation">(
    "event_notice"
  );
  const [context, setContext] = useState("");
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [message, setMessage] = useState("");
  const [audienceType, setAudienceType] = useState<"all" | "class" | "fee_owing">("all");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [isDrafting, startDraft] = useTransition();
  const [isSending, startSend] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function handleDraft() {
    setError(null);
    if (!context.trim()) {
      setError("Describe what the message is about first.");
      return;
    }
    startDraft(async () => {
      const res = await draftSmsMessage({ purpose, context, language });
      if (res.error) return setError(res.error);
      setMessage(res.message ?? "");
    });
  }

  function handleSend() {
    setError(null);
    setResult(null);
    if (!message.trim()) {
      setError("Message is empty.");
      return;
    }
    const audience: Audience =
      audienceType === "class" ? { type: "class", classId } : { type: audienceType };

    startSend(async () => {
      const res = await sendBulkSms({
        audience,
        message,
        messageType: purpose,
        language,
      });
      if (res.error) return setError(res.error);
      setResult(
        `Sent to ${res.data!.recipientCount} parent(s).${
          res.data!.simulated ? " (Simulated — no SMS gateway configured yet.)" : ""
        }`
      );
      setMessage("");
      setContext("");
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <h2 className="font-semibold text-kpa-navy text-sm mb-4">SMS to Parents</h2>

      {error && <div className="bg-red-50 text-red-600 text-sm p-2 rounded mb-4">{error}</div>}
      {result && (
        <div className="bg-green-50 text-green-700 text-sm p-2 rounded mb-4">{result}</div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Purpose</label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          >
            <option value="fee_reminder">Fee Reminder</option>
            <option value="event_notice">Event Notice</option>
            <option value="appreciation">Appreciation</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          >
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1">
        What's this about?
      </label>
      <div className="flex gap-2 mb-4">
        <input
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. Xmas party is Dec 15, contribution 2000 XAF"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        />
        <button
          type="button"
          onClick={handleDraft}
          disabled={isDrafting}
          className="bg-kpa-gold text-kpa-navy text-sm font-semibold px-4 rounded-lg hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
        >
          {isDrafting ? "Drafting..." : "AI Draft"}
        </button>
      </div>

      <label className="block text-sm font-medium text-kpa-navy mb-1">Message</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={320}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-1 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
      />
      <p className="text-xs text-gray-400 mb-4">{message.length}/320 characters</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-kpa-navy mb-1">Audience</label>
          <select
            value={audienceType}
            onChange={(e) => setAudienceType(e.target.value as any)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
          >
            <option value="all">All Parents</option>
            <option value="class">One Class</option>
            <option value="fee_owing">Parents With Fees Owing</option>
          </select>
        </div>
        {audienceType === "class" && (
          <div>
            <label className="block text-sm font-medium text-kpa-navy mb-1">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button
        onClick={handleSend}
        disabled={isSending}
        className="w-full bg-kpa-navy text-white font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
      >
        {isSending ? "Sending..." : "Send SMS"}
      </button>
    </div>
  );
}
