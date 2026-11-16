import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const dynamic = "force-dynamic";

export default function AdminPricingPage() {
  return (
    <AdminModulePlaceholder
      title="Dynamic Pricing & Rate Management"
      phase="Phase 5"
      description="Configure date-specific rates, seasonal surges, holiday premiums, and minimum stay rules while guaranteeing historical booking price snapshots remain immutable."
      features={[
        "Base & weekend nightly rate controls",
        "Seasonal rate multipliers & date ranges",
        "Jaipur holiday & festival peak pricing",
        "Length-of-stay discounts & extra guest fees",
        "Taxes & cleaning fee rules",
        "Immutable confirmed booking guarantees",
      ]}
    />
  );
}
