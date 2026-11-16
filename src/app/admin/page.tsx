import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminRootPage() {
  const session = await auth();

  if (
    session?.user &&
    (session.user.role === Role.ADMIN ||
      session.user.role === Role.PROPERTY_MANAGER)
  ) {
    redirect("/admin/dashboard");
  }

  redirect("/admin/login");
}
