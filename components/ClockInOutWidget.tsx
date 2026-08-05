"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clockIn, clockOut } from "@/lib/actions/staffAttendance";

export default function ClockInOutWidget({
  clockInTime,
  clockOutTime,
}: {
  clockInTime: string | null;
  clockOutTime: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClockIn() {
    setError(null);
    startTransition(async () => {
      const result = await clockIn();
      if (result.error) return setError(result.error);
      router.refresh();
    });
  }

  function handleClockOut() {
    setError(null);
    startTransition(async () => {
      const result = await clockOut();
      if (result.error) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500 uppercase">Your Attendance Today</p>
        {clockInTime ? (
          <p className="text-sm text-kpa-navy mt-1">
            In: {new Date(clockInTime).toLocaleTimeString()}
            {clockOutTime && ` · Out: ${new Date(clockOutTime).toLocaleTimeString()}`}
          </p>
        ) : (
          <p className="text-sm text-gray-400 mt-1">Not clocked in yet</p>
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      {!clockInTime ? (
        <button
          onClick={handleClockIn}
          disabled={isPending}
          className="bg-kpa-navy text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50"
        >
          Clock In
        </button>
      ) : !clockOutTime ? (
        <button
          onClick={handleClockOut}
          disabled={isPending}
          className="bg-kpa-gold text-kpa-navy text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          Clock Out
        </button>
      ) : (
        <span className="text-xs text-green-600 font-semibold">Day complete ✓</span>
      )}
    </div>
  );
}
