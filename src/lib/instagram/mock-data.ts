import { InstagramMediaItem } from "./types";

/**
 * High-fidelity mock Instagram dataset for Dev Stays Jaipur (@devstays.jaipur).
 * Used during local development, staging, or before the client completes Meta OAuth authorization.
 *
 * NOTE: These mock items utilize authentic local villa photographs to showcase
 * accurate aspect ratios, Reels indicators, carousels, and hover captions.
 */
export const MOCK_INSTAGRAM_MEDIA: InstagramMediaItem[] = [
  {
    id: "mock-ig-001",
    mediaType: "VIDEO",
    isReel: true,
    mediaUrl: "/images/hero video full.mp4",
    thumbnailUrl: "/images/living-room/imgi_373_9b8ea86b-c2d1-4327-a5dc-0204663820d1.jpg",
    permalink: "https://www.instagram.com/devstays.jaipur/",
    caption:
      "Golden hour walkthrough at Dev Stays Villa 🌿✨ Your private 3BHK sanctuary in Raja Park, Jaipur. No shared spaces, just pure heritage comfort.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hrs ago
    likeCount: 384,
    commentsCount: 29,
    locationName: "Raja Park, Jaipur",
  },
  {
    id: "mock-ig-002",
    mediaType: "CAROUSEL_ALBUM",
    isReel: false,
    mediaUrl: "/images/patio/2544fbd9-3035-4426-878d-3498cd2963ef.avif",
    thumbnailUrl: "/images/patio/2544fbd9-3035-4426-878d-3498cd2963ef.avif",
    permalink: "https://www.instagram.com/devstays.jaipur/",
    caption:
      "Sunlit mornings in the front verandah with freshly brewed masala chai ☕ Swipe through to see our favorite quiet corners of the estate.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), // 1.5 days ago
    likeCount: 512,
    commentsCount: 41,
    locationName: "Dev Stays Jaipur",
  },
  {
    id: "mock-ig-003",
    mediaType: "IMAGE",
    isReel: false,
    mediaUrl: "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
    thumbnailUrl: "/images/bedroom-1/imgi_415_8378c683-e395-419a-87b9-e764d4d7a670.jpg",
    permalink: "https://www.instagram.com/devstays.jaipur/",
    caption:
      "Handcrafted Rajasthani textiles, block print quilts, and quiet reading nooks in the Master Suite 🪡 Rest deeply in the Pink City.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    likeCount: 428,
    commentsCount: 19,
    locationName: "Raja Park, Jaipur",
  },
  {
    id: "mock-ig-004",
    mediaType: "VIDEO",
    isReel: true,
    mediaUrl: "/images/hero video full.mp4",
    thumbnailUrl: "/images/living-room/imgi_401_63a23a48-54a0-4289-801b-f75310f03104.jpg",
    permalink: "https://www.instagram.com/devstays.jaipur/",
    caption:
      "Reel: Evening ambience at Dev Stays 🕯️ Warm brass lamps, handcrafted archways, and evening calmness after exploring Jaipur’s bazaars.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // 5 days ago
    likeCount: 695,
    commentsCount: 54,
    locationName: "Dev Stays Jaipur",
  },
  {
    id: "mock-ig-005",
    mediaType: "CAROUSEL_ALBUM",
    isReel: false,
    mediaUrl: "/images/dining/imgi_67_1ea5b444-ee63-4a50-aff9-d7dbe31eceb2.jpg",
    thumbnailUrl: "/images/dining/imgi_67_1ea5b444-ee63-4a50-aff9-d7dbe31eceb2.jpg",
    permalink: "https://www.instagram.com/devstays.jaipur/",
    caption:
      "From family breakfasts to private dinners — the heritage dining hall is where Jaipur memories are shared 🍽️🏰",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(), // 7 days ago
    likeCount: 391,
    commentsCount: 23,
    locationName: "Dev Stays Jaipur",
  },
  {
    id: "mock-ig-006",
    mediaType: "IMAGE",
    isReel: false,
    mediaUrl: "/images/back-garden/ba272bee-9e0a-4d02-bb05-47345b79cd04.avif",
    thumbnailUrl: "/images/back-garden/ba272bee-9e0a-4d02-bb05-47345b79cd04.avif",
    permalink: "https://www.instagram.com/devstays.jaipur/",
    caption:
      "Crisp morning breeze in the private back garden retreat 🌿 A rare secluded green haven in central Raja Park.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 216).toISOString(), // 9 days ago
    likeCount: 275,
    commentsCount: 15,
    locationName: "Raja Park, Jaipur",
  },
  {
    id: "mock-ig-007",
    mediaType: "VIDEO",
    isReel: true,
    mediaUrl: "/images/hero video full.mp4",
    thumbnailUrl: "/images/veranda/5c7bdbda-6788-4786-9ce3-fe19b0b8e7bc.avif",
    permalink: "https://www.instagram.com/devstays.jaipur/",
    caption:
      "Reel: 5 things to do in Raja Park within 5 minutes of Dev Stays 🚶‍♂️☕ Gulab Ji Chai, authentic Rajasthani sweet shops, and boutique cafes.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 280).toISOString(), // ~11 days ago
    likeCount: 914,
    commentsCount: 82,
    locationName: "Raja Park, Jaipur",
  },
  {
    id: "mock-ig-008",
    mediaType: "IMAGE",
    isReel: false,
    mediaUrl: "/images/bedroom-2/imgi_424_fc799dd9-6c32-4c61-8684-e80b626f9ebc.jpg",
    thumbnailUrl: "/images/bedroom-2/imgi_424_fc799dd9-6c32-4c61-8684-e80b626f9ebc.jpg",
    permalink: "https://www.instagram.com/devstays.jaipur/",
    caption:
      "Every corner has a story. Handcrafted ceramic wall plates & custom teak woodwork at Dev Stays Jaipur 🏺🌸",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 350).toISOString(), // ~14 days ago
    likeCount: 341,
    commentsCount: 18,
    locationName: "Dev Stays Jaipur",
  },
];
