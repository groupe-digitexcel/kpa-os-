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
    const body = await request.json();
    if (!intents.has(body?.intent) || typeof body?.prompt !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await runKpaAssistant({
      intent: body.intent,
      prompt: body.prompt,
      context: body.context,
    });

    if (result.error === "Unauthorized") return NextResponse.json(result, { status: 401 });
    if (result.error === "Forbidden") return NextResponse.json(result, { status: 403 });
    if (result.error) return NextResponse.json(result, { status: 502 });

    return NextResponse.json(result, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Invalid JSON or server error" }, { status: 400 });
  }
}
