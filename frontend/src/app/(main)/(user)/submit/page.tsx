import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ComplaintForm from "@/components/features/complaint/ComplaintForm";

export default function SubmitPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1E2A4A] mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Dashboard
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1E2A4A]">Buat Aduan Baru</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sampaikan keluhan, saran, atau laporan Anda dalam bahasa apapun.
        </p>
      </div>
      <ComplaintForm />
    </div>
  );
}
