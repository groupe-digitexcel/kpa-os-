import { createClient } from "@/lib/supabase/server";

export type KpaAiIntent =
  | "dashboard_query"
  | "report_comment"
  | "parent_message"
  | "fee_summary"
  | "attendance_summary";

const ALLOWED_ROLES: Record<KpaAiIntent, string[]> = {
  dashboard_query: ["director", "accountant", "secretary", "teacher", "auditor"],
  report_comment: ["director", "teacher"],
  parent_message: ["director", "secretary", "teacher"],
  fee_summary: ["director", "accountant", "secretary", "auditor"],
  attendance_summary: ["director", "secretary", "teacher", "auditor"],
};

function safeText(value: unknown, max = 4000) {
  return String(value ?? "").trim().slice(0, max);
}

export async function runKpaAssistant(input: {
  intent: KpaAiIntent;
  prompt: string;
  context?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Unauthorized" as const };

  const { data: staff } = await supabase
    .from("staff")
    .select("id, role, full_name")
    .eq("auth_user_id", auth.user.id)
    .eq("active", true)
    .maybeSingle();

  if (!staff || !ALLOWED_ROLES[input.intent].includes(staff.role)) {
    return { error: "Forbidden" as const };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: "AI service is not configured" as const };

  const model = process.env.KPA_AI_MODEL || "openai/gpt-4o-mini";
  const system = [
    "You are KPA-OS Assistant for Kingdom Passion Academy.",
    "Be concise, factual, bilingual when requested, and never invent school data.",
    "Treat student, parent, health, safeguarding and financial data as confidential.",
    "The application has already enforced the user's role; do not request secrets or credentials.",
    "For reports and parent messages, produce professional school-safe language.",
  ].join(" ");

  const body = {
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify({
          intent: input.intent,
          request: safeText(input.prompt),
          context: input.context ?? {},
        }),
      },
    ],
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://kpa-os.vercel.app",
      "X-Title": "KPA-OS Assistant",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    return { error: "AI provider request failed" as const, status: response.status };
  }

  const json = await response.json();
  const answer = safeText(json?.choices?.[0]?.message?.content, 12000);
  if (!answer) return { error: "AI provider returned no answer" as const };

  await supabase.from("audit_log").insert({
    actor_id: staff.id,
    action: "ai_assistant_request",
    entity: "ai_assistant",
    details: { intent: input.intent, model },
  });

  return { answer, model };
}
