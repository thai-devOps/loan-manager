/** Env bootstrap credentials — used only to seed the first SUPER_ADMIN user. */
export function getAdminCredentials(): {
  username: string;
  password: string;
} | null {
  const username = (process.env.ADMIN_USERNAME ?? "").trim();
  const password = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!username || !password) return null;
  return { username, password };
}
