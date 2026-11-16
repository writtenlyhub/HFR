import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <AdminModulePlaceholder
      title="Staff Roles & Audit Logs"
      phase="Phase 9"
      description="Internal enterprise administration: manage staff user accounts (ADMIN and PROPERTY_MANAGER), review immutable audit trails, and inspect system synchronization health."
      features={[
        "Staff account creation & role assignment",
        "Strict non-public registration policy",
        "Granular permission verification",
        "System-wide immutable AuditLog viewer",
        "iCal synchronization diagnostics & health",
        "Redis worker & queue monitoring",
      ]}
    />
  );
}
