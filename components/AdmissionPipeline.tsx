"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAdmissionStatus, convertAdmissionToStudent, type AdmissionStatus } from "@/lib/actions/admissions";

const STATUS_OPTIONS: { value: AdmissionStatus; label: string }[] = [
  { value: "inquiry", label: "Inquiry" },
  { value: "visit_scheduled", label: "Visit Scheduled" },
  { value: "applied", label: "Applied" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "accepted", label: "Accepted" },
  { value: "enrolled", label: "Enrolled" },
  { value: "declined", label: "Declined" },
];

const STATUS_COLORS: Record<string, string> = {
  inquiry: "bg-gray-100 text-gray-600",
  visit_scheduled: "bg-blue-100 text-blue-700",
  applied: "bg-purple-100 text-purple-700",
  waitlisted: "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  enrolled: "bg-kpa-gold/30 text-kpa-navy",
  declined: "bg-red-100 text-red-600",
};

export default function AdmissionPipeline({ admissions, classes }: { admissions: any[]; classes: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");

  function handleStatusChange(id: string, status: AdmissionStatus) {
    startTransition(async () => {
      await updateAdmissionStatus(id, status);
      router.refresh();
    });
  }

  function handleEnroll(id: string) {
    startTransition(async () => {
      await convertAdmissionToStudent(id, classId);
      setEnrollingId(null);
      router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
      {admissions.map((a) => (
        <div key={a.id} className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium text-kpa-navy">{a.child_full_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status]}`}>
              {STATUS_OPTIONS.find((s) => s.value === a.status)?.label}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {a.desired_level ?? "No level specified"} · {a.parent_name} · {a.parent_phone}
          </p>
          {a.notes && <p className="text-xs text-gray-400 mt-1">{a.notes}</p>}

          <div className="flex items-center gap-2 mt-3">
            {a.status !== "enrolled" && (
              <select
                value={a.status}
                onChange={(e) => handleStatusChange(a.id, e.target.value as AdmissionStatus)}
                disabled={isPending}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
              >
                {STATUS_OPTIONS.filter((s) => s.value !== "enrolled").map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            )}

            {a.status === "accepted" && (
              enrollingId === a.id ? (
                <div className="flex items-center gap-2">
                  <select value={classId} onChange={(e) => setClassId(e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-kpa-gold">
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button onClick={() => handleEnroll(a.id)} disabled={isPending} className="text-xs bg-kpa-navy text-white px-3 py-1 rounded-lg">
                    Confirm
                  </button>
                </div>
              ) : (
                <button onClick={() => setEnrollingId(a.id)} className="text-xs text-kpa-navy underline">
                  Enroll as student
                </button>
              )
            )}
          </div>
        </div>
      ))}
      {admissions.length === 0 && <p className="p-5 text-sm text-gray-400">No inquiries yet.</p>}
    </div>
  );
}
