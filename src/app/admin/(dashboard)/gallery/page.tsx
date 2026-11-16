import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";

export const dynamic = "force-dynamic";

export default function AdminGalleryPage() {
  return (
    <AdminModulePlaceholder
      title="Media Gallery & Image Storage"
      phase="Phase 8"
      description="Multi-file media management with persistent volume storage, cover photo selection, drag-and-drop reordering, and room configuration tagging."
      features={[
        "Multi-file drag-and-drop batch upload",
        "Persistent Docker volume / external storage adapter",
        "MIME type & 8 MB size validation",
        "Set primary cover photo for homepage & rooms",
        "Order photos for the 5-slot asymmetric grid",
        "Room configuration image assignment",
      ]}
    />
  );
}
