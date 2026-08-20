import { isAdminRequest } from "../../../../lib/admin-auth-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ authenticated: false }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
}
