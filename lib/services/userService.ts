import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DashboardOverview } from "@/types/dashboard";

export const userService = {
  async getUserProfile(userId: string) {
    const supabase = createSupabaseAdminClient();
    const [{ data: profile, error: profileError }, { data: authUser, error: authError }] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          `
            display_name,
            username,
            birth_date,
            created_at,
            updated_at,
            user_roles (
              roles (
                code
              )
            )
          `
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase.auth.admin.getUserById(userId),
    ]);

    if (profileError || !profile || authError || !authUser.user) {
      throw new Error("User not found");
    }

    const rolesValue = (profile.user_roles?.[0] as { roles?: { code?: string } | Array<{ code?: string }> } | undefined)?.roles;
    const roleCode = Array.isArray(rolesValue) ? rolesValue[0]?.code : rolesValue?.code;

    return {
      name: profile.display_name,
      username: profile.username,
      birthDate: profile.birth_date,
      email: authUser.user.email,
      role: roleCode === "admin" ? "ADMIN" : roleCode === "teacher" ? "TEACHER" : "STUDENT",
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  },

  async getUserStats(userId: string) {
    const supabase = createSupabaseAdminClient();
    const [{ count: testsTaken, error: countError }, { data: bestAttempt, error: bestError }] = await Promise.all([
      supabase.from("test_attempts").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase
        .from("test_attempts")
        .select("score")
        .eq("user_id", userId)
        .eq("mode", "full")
        .not("score", "is", null)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (countError || bestError) {
      throw new Error("User not found");
    }

    return {
      testsTaken: testsTaken ?? 0,
      highestScore: bestAttempt?.score ?? 0,
    };
  },

  async getDashboardOverview(userId: string) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("get_user_dashboard_overview", {
      target_user_id: userId,
    });

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to load dashboard overview");
    }

    return data as DashboardOverview;
  },
};
