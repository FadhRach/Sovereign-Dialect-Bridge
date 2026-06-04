import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Sovereign Dialect-Bridge</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-lg">
        Platform pengaduan publik berbasis AI yang memahami bahasa daerah kamu.
      </p>
      <div className="flex gap-4">
        <Link href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Masuk
        </Link>
        <Link href="/register" className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition">
          Daftar
        </Link>
      </div>
    </main>
  );
}
