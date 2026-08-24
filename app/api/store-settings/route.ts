import { isAdminRequest } from "../../../lib/admin-auth-server";
import { readStoreSettings, saveStoreSettings } from "../../../lib/store-settings-server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    return Response.json({ settings: await readStoreSettings() }, { headers });
  } catch {
    return Response.json({ error: "Не удалось загрузить настройки магазина" }, { status: 500, headers });
  }
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Требуется вход администратора" }, { status: 401, headers });
  }
  try {
    return Response.json({ settings: await saveStoreSettings(await request.json()) }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Настройки не сохранены" }, { status: 500, headers });
  }
}
