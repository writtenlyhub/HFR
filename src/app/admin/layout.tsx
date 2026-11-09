import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import Link from "next/link";
import React from "react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin/calendar-sync");
  }

  if (session.user.role !== Role.ADMIN) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-center text-white font-sans">
        <div className="max-w-md p-8 border border-red-800/60 bg-red-950/20 rounded-2xl space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-700/60 flex items-center justify-center mx-auto text-red-400 font-bold text-xl">
            !
          </div>
          <h1 className="text-2xl font-serif text-red-400 font-bold tracking-tight">
            403 — Forbidden
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Access to this administrative portal requires verified administrator privileges.
          </p>
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-400">
            Account: <span className="text-neutral-200">{session.user.email}</span> (
            <span className="text-amber-400">{session.user.role}</span>)
          </div>
          <div>
            <Link
              href="/"
              className="inline-block mt-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

