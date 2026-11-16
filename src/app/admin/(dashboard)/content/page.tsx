import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const dynamic = "force-dynamic";

export default function AdminContentPage() {
  return (
    <AdminModulePlaceholder
      title="Website Content Management"
      phase="Phase 8"
      description="Update homepage hero copy, sanctuary story text, guest reviews, FAQs, contact details, and social channels without developer intervention or code deployments."
      features={[
        "Homepage Hero title, subtitle, and badge",
        "Villa sanctuary highlights & story paragraphs",
        "Frequently Asked Questions (FAQ) editor",
        "Contact phone numbers, address, and email",
        "Social media URLs & Instagram profile links",
        "Safe preview mode before saving live",
      ]}
    />
  );
}
