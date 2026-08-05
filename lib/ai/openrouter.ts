"use server";

// Central AI gateway. Standing rule: ALWAYS route AI calls through OpenRouter
// (OPENROUTER_API_KEY). NEVER expose provider names, model names, or raw
// errors to end users in any client-facing UI — callers should catch errors
// from these functions and show a generic message.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Pick per-task: cheap/fast model for short copy, stronger model for nuanced
// report-card comments. Swap model strings here only — never in UI code.
const MODELS = {
  reportCardComment: "openai/gpt-4o-mini",
  smsCopy: "openai/gpt-4o-mini",
  flyerCopy: "anthropic/claude-3-5-sonnet",
};

async function callOpenRouter(model: string, systemPrompt: string, userPrompt: string) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("AI_NOT_CONFIGURED");
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    throw new Error("AI_REQUEST_FAILED");
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

// Generates a bilingual (FR/EN) report card comment from a teacher's short notes.
export async function generateReportCardComment(input: {
  studentName: string;
  level: string;
  strengths: string;
  areasToImprove: string;
  termLabel: string;
}) {
  const system = `You are an experienced Cameroonian primary/nursery school teacher writing an
official report card comment. Write warmly but professionally, in BOTH French and English
(French first, then English), 2-3 sentences each, appropriate for a child aged 3-12. Never
invent facts not given by the teacher.`;

  const user = `Student: ${input.studentName}
Level: ${input.level}
Term: ${input.termLabel}
Strengths noted by teacher: ${input.strengths}
Areas to improve: ${input.areasToImprove}`;

  try {
    return await callOpenRouter(MODELS.reportCardComment, system, user);
  } catch {
    return null;
  }
}

// Generates a short SMS (under 160 chars per language) for parents.
export async function generateSmsCopy(input: {
  purpose: "fee_reminder" | "event_notice" | "appreciation";
  context: string;
  language: "fr" | "en";
}) {
  const system = `You write short SMS messages (max 160 characters) from a Cameroonian primary
school to parents. Tone: warm, respectful, clear, never threatening. Language: ${
    input.language === "fr" ? "French" : "English"
  } only. Sign off with "- Kingdom Passion Academy".`;

  const user = `Purpose: ${input.purpose}. Context: ${input.context}`;

  try {
    return await callOpenRouter(MODELS.smsCopy, system, user);
  } catch {
    return null;
  }
}

// Generates promotional flyer copy (headline + body) for enrollment/events.
export async function generateFlyerCopy(input: { occasion: string; details: string }) {
  const system = `You write short, energetic bilingual (French then English) flyer copy for a
Cameroonian primary/nursery school. Output a punchy headline line, then a 2-3 sentence body.
Keep it warm and community-oriented, never salesy or exaggerated.`;

  const user = `Occasion: ${input.occasion}. Details: ${input.details}`;

  try {
    return await callOpenRouter(MODELS.flyerCopy, system, user);
  } catch {
    return null;
  }
}
