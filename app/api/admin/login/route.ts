import {
  adminSessionCookie,
  createAdminSession,
  verifyAdminPassword,
} from "../../../../lib/admin-auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { password?: string };
  if (!payload.password || !(await verifyAdminPassword(payload.password))) {
    return Response.json({ error: "Неверный пароль администратора" }, { status: 401 });
  }
  const token = await createAdminSession();
  return Response.json(
    { success: true },
    { headers: { "Set-Cookie": adminSessionCookie(request, token), "Cache-Control": "no-store" } },
  );
}
