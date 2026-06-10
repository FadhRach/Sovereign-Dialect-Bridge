"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

export default function AuthBackLink() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-blue font-medium transition-colors group"
      >
        <span className="w-7 h-7 rounded-full border border-slate-200 group-hover:border-brand-blue group-hover:bg-brand-blue group-hover:text-white flex items-center justify-center transition-all group-hover:-translate-x-0.5">
          <ArrowLeft className="w-3.5 h-3.5" />
        </span>
        Kembali ke beranda
      </Link>
    </motion.div>
  );
}
