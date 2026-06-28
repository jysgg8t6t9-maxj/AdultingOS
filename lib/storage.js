import { createClient } from "./supabaseClient";

export const storage = {
  async get(key) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("user_data")
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) return null;
    return { key, value: JSON.stringify(data.data) };
  },
  async set(key, value) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { error } = await supabase
      .from("user_data")
      .upsert({ user_id: user.id, data: JSON.parse(value), updated_at: new Date().toISOString() });
    if (error) return null;
    return { key, value };
  },
};