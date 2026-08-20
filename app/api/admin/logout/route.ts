import { clearAdminSessionCookie } from "../../../../lib/admin-auth-server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return Response.json(
    { success: true },
    { headers: { "Set-Cookie": clearAdminSessionCookie(request), "Cache-Control": "no-store" } },
  );
}
