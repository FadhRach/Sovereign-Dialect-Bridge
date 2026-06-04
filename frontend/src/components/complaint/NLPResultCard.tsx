import type { Complaint } from "@/lib/types";

interface NLPResultCardProps {
  complaint: Complaint;
}

// Tampilkan hasil NLP pipeline: summary, dialect, entities, keywords, urgency
export default function NLPResultCard({ complaint }: NLPResultCardProps) {
  if (!complaint.summary) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        Aduan sedang diproses oleh AI...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h3 className="font-semibold text-gray-800">Hasil Analisis AI</h3>

      <div>
        <span className="text-xs font-medium text-gray-500 uppercase">Ringkasan</span>
        <p className="text-sm text-gray-700 mt-1">{complaint.summary}</p>
      </div>

      {complaint.named_entities.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase">Entitas Terdeteksi</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {complaint.named_entities.map((entity, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                {entity.text} ({entity.label})
              </span>
            ))}
          </div>
        </div>
      )}

      {complaint.keywords.length > 0 && (
        <div>
          <span className="text-xs font-medium text-gray-500 uppercase">Kata Kunci</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {complaint.keywords.map((kw, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{kw}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
