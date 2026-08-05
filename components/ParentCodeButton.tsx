"use client";

import { useState, useTransition } from "react";
import { generateParentAccessCode } from "@/lib/actions/parentPortal";

export default function ParentCodeButton({ parentId }: { parentId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateParentAccessCode(parentId);
      if (result.code) setCode(result.code);
    });
  }

  if (code) {
    return (
      <span className="text-xs bg-kpa-gold/20 text-kpa-navy px-2 py-1 rounded-full font-mono font-semibold">
        Code: {code}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isPending}
      className="text-xs text-kpa-navy underline whitespace-nowrap"
    >
      {isPending ? "..." : "Give parent portal access"}
    </button>
  );
}
