import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, ShieldCheck, Sparkles } from "lucide-react";

interface AdminModulePlaceholderProps {
  title: string;
  phase: string;
  description: string;
  features: string[];
}

export function AdminModulePlaceholder({
  title,
  phase,
  description,
  features,
}: AdminModulePlaceholderProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <Link
        href="/admin/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="p-8 rounded-3xl bg-white border border-neutral-200/80 shadow-2xs space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Scheduled for {phase}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-extrabold tracking-tight text-neutral-900">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed font-normal">
            {description}
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t border-neutral-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
            Planned Capabilities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-700 flex items-center gap-2.5"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 text-white text-xs flex items-center justify-between">
          <span className="text-neutral-300">
            The foundation in Phase 2 is active. Return to properties management.
          </span>
          <Link
            href="/admin/properties"
            className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-neutral-900 font-bold hover:bg-amber-300 transition text-[11px]"
          >
            Manage Properties
          </Link>
        </div>
      </div>
    </div>
  );
}
