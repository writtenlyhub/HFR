import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PropertyEditorTabs } from "./property-editor-tabs";

export const dynamic = "force-dynamic";

interface PropertyEditorPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default async function PropertyEditorPage(props: PropertyEditorPageProps) {
  const params = await props.params;
  const { id } = params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      inventoryGroups: true,
      listingOptions: {
        orderBy: { sortOrder: "asc" },
      },
      amenities: {
        orderBy: { createdAt: "asc" },
      },
      images: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!property) {
    notFound();
  }

  // Serialize Prisma Decimals for client component boundary
  const serialized = {
    ...property,
    listingOptions: property.listingOptions.map((opt) => ({
      ...opt,
      basePricePerNight: Number(opt.basePricePerNight),
      weekendPricePerNight: opt.weekendPricePerNight
        ? Number(opt.weekendPricePerNight)
        : null,
      cleaningFee: Number(opt.cleaningFee),
      taxPercentage: Number(opt.taxPercentage),
      extraGuestCharge: Number(opt.extraGuestCharge),
    })),
  };

  return <PropertyEditorTabs property={serialized} />;
}
