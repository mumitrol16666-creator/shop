import fs from "node:fs";
import path from "node:path";
import { getD1Binding } from "../../../db";
import { isAdminRequest } from "../../../lib/admin-auth-server";
import { COURSES, type Course } from "../../../lib/courses-data";

export const dynamic = "force-dynamic";

function getDataFilePath(): string {
  const candidates = [
    path.join(process.cwd(), "site", "data", "courses.json"),
    path.join(process.cwd(), "data", "courses.json"),
    "/Users/vladislav/Documents/Maestro/site/data/courses.json",
    "/Users/vladislav/Documents/Maestro/data/courses.json",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

function readLocalCourses(): Course[] {
  try {
    const targetFile = getDataFilePath();
    if (fs.existsSync(targetFile)) {
      const data = fs.readFileSync(targetFile, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error("Failed to read local courses.json:", err);
  }
  return COURSES;
}

function writeLocalCourses(items: Course[]) {
  try {
    const targetFile = getDataFilePath();
    fs.mkdirSync(path.dirname(targetFile), { recursive: true });
    fs.writeFileSync(targetFile, JSON.stringify(items, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Failed to write local courses.json:", err);
    return false;
  }
}

export async function GET() {
  try {
    const d1 = getD1Binding();
    if (d1) {
      const result = await d1.prepare("SELECT data_json FROM course_records ORDER BY updated_at DESC").all();
      const stored = (result.results || [])
        .map((row: { data_json?: string }) => {
          try {
            return row.data_json ? (JSON.parse(row.data_json) as Course) : null;
          } catch {
            return null;
          }
        })
        .filter((course: Course | null): course is Course => Boolean(course));
      if (stored.length > 0) return Response.json({ courses: stored, count: stored.length });
    }
    const list = readLocalCourses();
    return Response.json({ courses: list, count: list.length });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Не удалось загрузить курсы" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return Response.json({ error: "Требуется вход администратора" }, { status: 401 });
    }
    const payload = (await request.json()) as Course;
    if (!payload.title || !payload.title.trim()) {
      return Response.json({ error: "Укажите название курса" }, { status: 400 });
    }

    const list = readLocalCourses();
    const courseId = payload.id || `course-${Date.now()}`;
    const slug = payload.slug || payload.title.toLowerCase().replace(/[^a-z0-9а-яё]+/gi, "-").replace(/^-|-$/g, "");

    const finalCourse: Course = {
      ...payload,
      id: courseId,
      slug: slug || courseId,
      title: payload.title.trim(),
      subtitle: payload.subtitle?.trim() || "",
      badge: payload.badge?.trim() || "",
      instrument: payload.instrument || "acoustic",
      level: payload.level || "Начинающий",
      price: Number(payload.price) || 0,
      originalPrice: Number(payload.originalPrice) || 0,
      image: payload.image || "/products/04_41_acoustic.png",
      description: payload.description?.trim() || "",
      highlights: Array.isArray(payload.highlights) ? payload.highlights : [],
      courseUrl: payload.courseUrl?.trim() || undefined,
      lessonsCount: payload.lessons?.length || payload.lessonsCount || 1,
      durationHours: Number(payload.durationHours) || 6,
      instructor: payload.instructor || {
        name: "Преподаватель Maestro",
        role: "Преподаватель гитары",
        experience: "Опыт преподавания",
        avatar: "🎸",
      },
      lessons: Array.isArray(payload.lessons) ? payload.lessons : [],
    };

    const existingIndex = list.findIndex((c) => c.id === courseId || (c.slug && c.slug === slug));
    if (existingIndex >= 0) {
      list[existingIndex] = finalCourse;
    } else {
      list.push(finalCourse);
    }

    const d1 = getD1Binding();
    if (d1) {
      const now = new Date().toISOString();
      await d1.batch([
        d1.prepare(`INSERT INTO course_records (id, slug, data_json, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            slug=excluded.slug, data_json=excluded.data_json, updated_at=excluded.updated_at`)
          .bind(finalCourse.id, finalCourse.slug, JSON.stringify(finalCourse), now),
      ]);
    } else if (!writeLocalCourses(list)) {
      throw new Error("Не удалось сохранить курс");
    }
    return Response.json({ success: true, course: finalCourse }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Ошибка при сохранении курса" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await isAdminRequest(request))) {
      return Response.json({ error: "Требуется вход администратора" }, { status: 401 });
    }
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return Response.json({ error: "Не указан ID курса для удаления" }, { status: 400 });
    }

    const d1 = getD1Binding();
    if (d1) {
      await d1.batch([d1.prepare("DELETE FROM course_records WHERE id = ?").bind(id)]);
      const countResult = await d1.prepare("SELECT COUNT(*) AS count FROM course_records").first<{ count: number }>();
      return Response.json({ success: true, count: Number(countResult?.count || 0) });
    }
    const list = readLocalCourses();
    const filtered = list.filter((c) => c.id !== id);
    if (!writeLocalCourses(filtered)) throw new Error("Не удалось удалить курс");
    return Response.json({ success: true, count: filtered.length });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Ошибка при удалении курса" },
      { status: 500 },
    );
  }
}
