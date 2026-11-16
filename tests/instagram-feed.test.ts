import { getInstagramFeed, getInstagramConfig } from "@/lib/instagram/provider";
import { MOCK_INSTAGRAM_MEDIA } from "@/lib/instagram/mock-data";
import { fetchLiveInstagramFeed } from "@/lib/instagram/instagram-api";

async function runTests() {
  console.log("=== RUNNING INSTAGRAM INTEGRATION TESTS ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  // Test 1: Mock Provider Feed Retrieval
  console.log("1. Testing Mock Provider Feed:");
  const feed = await getInstagramFeed({ limit: 8, forceRefresh: true });
  assert(feed.success === true, "Feed response indicates success");
  assert(feed.isMock === true, "Feed is correctly identified as mock data");
  assert(feed.data.length === 8, `Feed returns requested limit of 8 items (got ${feed.data.length})`);
  assert(feed.profileUrl.includes("instagram.com"), "Canonical profile URL is present");
  assert(feed.username === "devstays.jaipur", "Username matches expected @devstays.jaipur");

  // Test 2: Diverse Media Types and Reel Badging
  console.log("\n2. Testing Media Types & Badging in Dataset:");
  const videoReels = feed.data.filter((item) => item.mediaType === "VIDEO" && item.isReel);
  const carousels = feed.data.filter((item) => item.mediaType === "CAROUSEL_ALBUM");
  const standardImages = feed.data.filter((item) => item.mediaType === "IMAGE");

  assert(videoReels.length >= 2, `Contains at least 2 Reels/Videos (found ${videoReels.length})`);
  assert(carousels.length >= 2, `Contains at least 2 Carousel albums (found ${carousels.length})`);
  assert(standardImages.length >= 2, `Contains at least 2 standard Images (found ${standardImages.length})`);

  // Test 3: Data Integrity
  console.log("\n3. Testing Media Item Attributes:");
  feed.data.forEach((item, idx) => {
    const hasVisual = Boolean(item.thumbnailUrl || item.mediaUrl);
    const hasValidPermalink = item.permalink.startsWith("https://www.instagram.com/");
    const hasValidDate = !isNaN(new Date(item.timestamp).getTime());
    assert(hasVisual, `Item ${idx + 1} (${item.id}) has a valid media/thumbnail URL`);
    assert(hasValidPermalink, `Item ${idx + 1} (${item.id}) has a secure Instagram permalink`);
    assert(hasValidDate, `Item ${idx + 1} (${item.id}) has a valid ISO timestamp`);
  });

  // Test 4: Provider Switching and Safe Fallback when Live Credentials Missing
  console.log("\n4. Testing Provider Switching (Live Mode with Missing Credentials):");
  const originalUseMock = process.env.INSTAGRAM_USE_MOCK;
  const originalToken = process.env.INSTAGRAM_ACCESS_TOKEN;

  try {
    process.env.INSTAGRAM_USE_MOCK = "false";
    delete process.env.INSTAGRAM_ACCESS_TOKEN;

    const liveWithoutCreds = await getInstagramFeed({ forceRefresh: true });
    assert(liveWithoutCreds.success === false, "Returns success: false when live credentials are absent");
    assert(
      typeof liveWithoutCreds.error === "string" && liveWithoutCreds.error.includes("INSTAGRAM_ACCESS_TOKEN"),
      "Returns clear, descriptive error without crashing"
    );
    assert(Array.isArray(liveWithoutCreds.data) && liveWithoutCreds.data.length === 0, "Returns safe empty array");
  } finally {
    process.env.INSTAGRAM_USE_MOCK = originalUseMock;
    if (originalToken) process.env.INSTAGRAM_ACCESS_TOKEN = originalToken;
  }

  // Test 5: Live API Call with Invalid Token (Testing Token Sanitization)
  console.log("\n5. Testing Live API Error Handling & Token Redaction:");
  try {
    const dummyToken = "IGQWRdummy_fake_token_1234567890";
    await fetchLiveInstagramFeed({
      accessToken: dummyToken,
      userId: "1234567890",
    });
    assert(false, "Should have thrown an error for invalid token");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert(!msg.includes("dummy_fake_token_1234567890"), "Error message never leaks the actual access token");
    assert(msg.includes("Instagram API Error") || msg.includes("Meta Graph API"), "Properly caught and labeled API error");
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
