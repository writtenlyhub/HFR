import { prisma } from "@/lib/prisma";
import { PropertyListView, SerializedProperty } from "./property-list-view";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage() {
  const properties = await prisma.property.findMany({
    include: {
      listingOptions: {
        select: {
          id: true,
          basePricePerNight: true,
        },
      },
      inventoryGroups: {
        select: {
          code: true,
        },
      },
      images: {
        where: { isCover: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized: SerializedProperty[] = properties.map((p) => {
    const startingPrice =
      p.listingOptions.length > 0
        ? p.listingOptions.reduce(
            (min, opt) => Math.min(min, Number(opt.basePricePerNight)),
            Infinity
          )
        : 0;

    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      headline: p.headline,
      address: p.address,
      city: p.city,
      state: p.state,
      country: p.country,
      postalCode: p.postalCode,
      isActive: p.isActive,
      isArchived: p.isArchived,
      archivedReason: p.archivedReason,
      createdAt: p.createdAt.toISOString(),
      inventoryGroupCode: p.inventoryGroups[0]?.code,
      configurationsCount: p.listingOptions.length,
      startingPrice: startingPrice === Infinity ? 0 : startingPrice,
      coverImage:
        p.images[0]?.url ||
        "/images/living-room/imgi_491_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
    };
  });

  return <PropertyListView properties={serialized} />;
}
