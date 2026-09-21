import { NextRequest, NextResponse } from "next/server";
import { runKpaAssistant, type KpaAiIntent } from "@/lib/ai/kpa-assistant";

const intents = new Set<KpaAiIntent>([
  "dashboard_query",
  "report_comment",
  "parent_message",
  "fee_summary",
  "attendance_summary",
]);

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());

    if (!intents.has(body?.intent as KpaAiIntent) || typeof body?.prompt !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await runKpaAssistant({
      intent: body.intent as KpaAiIntent,
      prompt: body.prompt,
      context: typeof body.context === "object" && body.context !== null ? body.context as Record<string, unknown> : undefined,
    });

    if (result.error === "Unauthorized") return NextResponse.json(result, { status: 401 });
    if (result.error === "Forbidden") return NextResponse.json(result, { status: 403 });
    if (result.error) return NextResponse.json(result, { status: 502 });

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid request or server error" }, { status: 400 });
  }
}
