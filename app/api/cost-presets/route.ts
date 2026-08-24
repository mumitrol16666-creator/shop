import { isAdminRequest } from "../../../lib/admin-auth-server";
import { readCostPresets, saveCostPresets } from "../../../lib/store-settings-server";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Требуется вход администратора" }, { status: 401, headers });
  }
  return Response.json({ presets: await readCostPresets() }, { headers });
}

export async function PUT(request: Request) {
  if (!(await isAdminRequest(request))) {
    return Response.json({ error: "Требуется вход администратора" }, { status: 401, headers });
  }
  try {
    const payload = await request.json();
    return Response.json({ presets: await saveCostPresets(payload.presets) }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Шаблоны не сохранились" }, { status: 500, headers });
  }
}
