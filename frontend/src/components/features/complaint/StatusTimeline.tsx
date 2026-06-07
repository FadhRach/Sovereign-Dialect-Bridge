import { Sparkles } from "lucide-react";
import type { StatusHistoryEntry, AdminNote, ComplaintStatus } from "@/types";
import { STATUS_LABEL, STATUS_ICON } from "@/components/ui/StatusBadge";

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 60) return "baru saja";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.round(hr / 24);
  if (day === 1) return "kemarin";
  if (day < 7) return `${day} hari lalu`;
  const wk = Math.round(day / 7);
  if (wk < 5) return `${wk} minggu lalu`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

interface TimelineEvent {
  id: string;
  status: ComplaintStatus | "system";
  actor: string;
  note: string | null;
  at: string;
}

interface Props {
  history: StatusHistoryEntry[];
  notes: AdminNote[];
  createdAt: string;
}

export default function StatusTimeline({ history, notes, createdAt }: Props) {
  const events: TimelineEvent[] = [];

  events.push({
    id: "created",
    status: "system",
    actor: "Sistem",
    note: "Aduan diterima & sedang dianalisis AI",
    at: createdAt,
  });

  history.forEach((h) => {
    events.push({
      id: `h-${h.id}`,
      status: h.new_status,
      actor: h.changed_by?.full_name ?? "Admin",
      note: h.note ?? null,
      at: h.changed_at,
    });
  });

  notes.forEach((n) => {
    if (!n.status_change) {
      events.push({
        id: `n-${n.id}`,
        status: "system",
        actor: n.admin?.full_name ?? "Admin",
        note: n.note,
        at: n.created_at,
      });
    }
  });

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <ol className="relative space-y-5">
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent" />
      {events.map((e, idx) => {
        const Icon = e.status === "system" ? Sparkles : STATUS_ICON[e.status];
        const isLatest = idx === 0;
        return (
          <li key={e.id} className="relative pl-10">
            <div
              className={`absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-white ${
                isLatest ? "bg-[#2563EB] text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#1E2A4A]">
                  {e.status === "system" ? "Catatan Sistem" : STATUS_LABEL[e.status]}
                </p>
                <span className="text-[10px] text-gray-400 font-medium">{relativeTime(e.at)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">oleh {e.actor}</p>
              {e.note && <p className="text-sm text-gray-700 mt-2 leading-relaxed">{e.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
