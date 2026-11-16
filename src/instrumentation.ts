export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only launch background workers automatically if explicitly enabled or in production with configured Redis
    if (process.env.ENABLE_BACKGROUND_WORKERS === "true") {
      const { startBackgroundWorkers } = await import("@/workers/index");
      await startBackgroundWorkers();
    }
  }
}

