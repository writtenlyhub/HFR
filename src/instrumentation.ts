export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only launch background workers automatically if enabled (default true)
    if (process.env.ENABLE_BACKGROUND_WORKERS !== "false") {
      const { startBackgroundWorkers } = await import("@/workers/index");
      await startBackgroundWorkers();
    }
  }
}

