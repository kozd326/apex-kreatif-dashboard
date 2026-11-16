export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production" &&
    process.env.APEX_SCHEDULER_ENABLED !== "false"
  ) {
    const { tick } = await import("./lib/apex/scheduler");
    const timer = setInterval(tick, 5 * 60 * 1000);
    timer.unref();
    setTimeout(tick, 15000).unref();
  }
}
