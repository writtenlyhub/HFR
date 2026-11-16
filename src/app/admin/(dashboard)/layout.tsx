import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import Link from "next/link";
import React from "react";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";

export const dynamic = "force-dynamic";

export default async function ProtectedDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 1. Unauthenticated -> Redirect to dedicated staff login
  if (!session || !session.user) {
    redirect("/admin/login?callbackUrl=/admin/dashboard");
  }

  // 2. Customer or unauthorized role -> 403 Forbidden
  if (
    session.user.role !== Role.ADMIN &&
    session.user.role !== Role.PROPERTY_MANAGER
  ) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 text-center text-white font-sans">
        <div className="max-w-md p-8 border border-red-800/60 bg-red-950/20 rounded-2xl space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-700/60 flex items-center justify-center mx-auto text-red-400 font-bold text-xl">
            !
          </div>
          <h1 className="text-2xl font-serif text-red-400 font-bold tracking-tight">
            403 — Unauthorized Role
          </h1>
          <p className="text-sm text-neutral-300 leading-relaxed">
            Access to this administrative portal is restricted strictly to verified DevStay staff accounts.
          </p>
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-400">
            Current Account:{" "}
            <span className="text-neutral-200">{session.user.email}</span> (
            <span className="text-amber-400">{session.user.role}</span>)
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              href="/"
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition"
            >
              Return to Website
            </Link>
            <Link
              href="/admin/login"
              className="px-4 py-2 bg-red-800/80 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition"
            >
              Sign in with Staff Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized staff member -> Render Admin Layout Shell
  return (
    <AdminLayoutShell user={session.user}>
      {children}
    </AdminLayoutShell>
  );
}
