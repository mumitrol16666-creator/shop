import fs from "node:fs";
import path from "node:path";
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

    writeLocalCourses(list);
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
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return Response.json({ error: "Не указан ID курса для удаления" }, { status: 400 });
    }

    const list = readLocalCourses();
    const filtered = list.filter((c) => c.id !== id);
    writeLocalCourses(filtered);
    return Response.json({ success: true, count: filtered.length });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Ошибка при удалении курса" },
      { status: 500 },
    );
  }
}
