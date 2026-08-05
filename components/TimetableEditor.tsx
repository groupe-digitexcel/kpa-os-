"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTimetablePeriod, deleteTimetablePeriod, getTimetableForClass } from "@/lib/actions/timetable";

const DAYS = [
  { value: 2, label: "Monday" },
  { value: 3, label: "Tuesday" },
  { value: 4, label: "Wednesday" },
  { value: 5, label: "Thursday" },
  { value: 6, label: "Friday" },
];

type Subject = { id: string; name: string };
type Teacher = { id: string; full_name: string };
type ClassOpt = { id: string; name: string };

export default function TimetableEditor({
  classes,
  subjects,
  teachers,
}: {
  classes: ClassOpt[];
  subjects: Subject[];
  teachers: Teacher[];
}) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [periods, setPeriods] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();

  const [dayOfWeek, setDayOfWeek] = useState(2);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [room, setRoom] = useState("");

  useEffect(() => {
    if (classId) getTimetableForClass(classId).then(setPeriods);
  }, [classId]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await createTimetablePeriod({ classId, subjectId, dayOfWeek, startTime, endTime, teacherId: teacherId || undefined, room: room || undefined });
      const updated = await getTimetableForClass(classId);
      setPeriods(updated);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTimetablePeriod(id);
      const updated = await getTimetableForClass(classId);
      setPeriods(updated);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-kpa-navy mb-1">Class</label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-kpa-gold"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleAdd} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-kpa-navy text-sm mb-4">Add a Period</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold">
            {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold">
            <option value="">Teacher (optional)</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
          <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room (optional)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-kpa-gold" />
        </div>
        <button type="submit" disabled={isPending} className="w-full bg-kpa-navy text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-kpa-navy/90 disabled:opacity-50">
          Add Period
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
              <th className="p-3">Day</th>
              <th className="p-3">Time</th>
              <th className="p-3">Subject</th>
              <th className="p-3">Teacher</th>
              <th className="p-3">Room</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id} className="border-b border-gray-50">
                <td className="p-3 text-kpa-navy font-medium">{DAYS.find((d) => d.value === p.day_of_week)?.label}</td>
                <td className="p-3 text-gray-500">{p.start_time}–{p.end_time}</td>
                <td className="p-3 text-gray-500">{p.subject?.name ?? "—"}</td>
                <td className="p-3 text-gray-500">{p.teacher?.full_name ?? "—"}</td>
                <td className="p-3 text-gray-500">{p.room ?? "—"}</td>
                <td className="p-3">
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 text-xs">Remove</button>
                </td>
              </tr>
            ))}
            {periods.length === 0 && (
              <tr><td colSpan={6} className="p-5 text-center text-gray-400">No periods scheduled yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
