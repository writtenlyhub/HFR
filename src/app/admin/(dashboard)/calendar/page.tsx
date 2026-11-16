import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const dynamic = "force-dynamic";

export default function AdminCalendarPage() {
  return (
    <AdminModulePlaceholder
      title="Availability Calendar & Date Blocks"
      phase="Phase 6"
      description="Multi-month interactive calendar interface to visualize occupancy, manage maintenance blocks, view external channel reservations, and prevent date collisions."
      features={[
        "Multi-month visual availability grid",
        "Drag-to-select manual date blocking",
        "Maintenance & estate private hold reasons",
        "Real-time integration with shared inventory locks",
        "Airbnb & iCal reservation overlays",
        "Overbooking collision prevention",
      ]}
    />
  );
}
