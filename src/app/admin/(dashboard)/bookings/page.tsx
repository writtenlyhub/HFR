import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const dynamic = "force-dynamic";

export default function AdminBookingsPage() {
  return (
    <AdminModulePlaceholder
      title="Reservations & Guest Management"
      phase="Phase 7"
      description="Central reservation hub for direct web bookings, guest check-in workflows, customer contact details, and audited manual payments."
      features={[
        "Instant guest search & status filters",
        "Guest details drawer & contact cards",
        "Payment verification & settlement status",
        "Staff reservation notes & internal tags",
        "Verified manual payment recording workflow",
        "Safe cancellation & refund management",
      ]}
    />
  );
}
