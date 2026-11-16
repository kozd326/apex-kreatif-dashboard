import { createAdminClient } from "@/lib/supabase/admin";
import { monthNow } from "./domain";
import { syncGoogle } from "./google";
import { syncSheets } from "./sheets";
let running = false;
export async function tick() {
  if (running) return;
  running = true;
  try {
    const admin = createAdminClient();
    if (!admin) return;
    const { error } = await admin.rpc("apex_generate_month", {
      p_month: monthNow() + "-01",
    });
    if (error) console.error("Apex monthly generation failed", error.code);
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      const { data } = await admin
        .from("apex_settings")
        .select("key")
        .eq("key", "google")
        .maybeSingle();
      if (data) {
        try {
          const result = await syncGoogle(admin);
          if (result.failed)
            console.error("Apex calendar records pending", result.failed);
        } catch (e) {
          console.error(
            "Apex calendar sync failed",
            e instanceof Error ? e.name : "unknown",
          );
        }
      }
      await syncSheets(admin);
    }
  } catch (e) {
    console.error(
      "Apex scheduled job failed",
      e instanceof Error ? e.name : "unknown",
    );
  } finally {
    running = false;
  }
}
