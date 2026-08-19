"use client";

import { useEffect, useState } from "react";
import { money } from "../lib/catalog-data";
import { type Course, type CourseLesson, COURSES } from "../lib/courses-data";

type CourseEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  onSavedNotice?: (msg: string) => void;
};

export function CourseEditorModal({
  isOpen,
  onClose,
  courses,
  setCourses,
  onSavedNotice,
}: CourseEditorModalProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || "");
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const activeCourse = isCreatingNew
    ? null
    : courses.find((c) => c.id === selectedCourseId) || courses[0];

  // Form states
  const [title, setTitle] = useState(activeCourse?.title || "");
  const [subtitle, setSubtitle] = useState(activeCourse?.subtitle || "");
  const [badge, setBadge] = useState(activeCourse?.badge || "");
  const [courseUrl, setCourseUrl] = useState(activeCourse?.courseUrl || "");
  const [instrument, setInstrument] = useState<"acoustic" | "electric" | "ukulele" | "all">(
    activeCourse?.instrument || "acoustic"
  );
  const [level, setLevel] = useState<"Начинающий" | "Средний" | "Продвинутый">(
    activeCourse?.level || "Начинающий"
  );
  const [price, setPrice] = useState<number>(activeCourse?.price || 9900);
  const [originalPrice, setOriginalPrice] = useState<number>(activeCourse?.originalPrice || 19900);
  const [description, setDescription] = useState(activeCourse?.description || "");
  const [highlightsText, setHighlightsText] = useState((activeCourse?.highlights || []).join("\n"));

  // Instructor
  const [instructorName, setInstructorName] = useState(activeCourse?.instructor?.name || "");
  const [instructorRole, setInstructorRole] = useState(activeCourse?.instructor?.role || "");
  const [instructorExp, setInstructorExp] = useState(activeCourse?.instructor?.experience || "");
  const [instructorAvatar, setInstructorAvatar] = useState(activeCourse?.instructor?.avatar || "🎸");

  // Lessons
  const [lessons, setLessons] = useState<CourseLesson[]>(activeCourse?.lessons || []);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (isOpen && (!courses || courses.length === 0)) {
      fetch("/api/courses")
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
        .then((data: { courses?: Course[] }) => {
          if (Array.isArray(data.courses) && data.courses.length > 0) {
            setCourses(data.courses);
            if (!selectedCourseId) {
              handleSelectCourse(data.courses[0].id, data.courses);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectCourse = (courseId: string, sourceList = courses) => {
    setIsCreatingNew(false);
    setSelectedCourseId(courseId);
    const found = sourceList.find((c) => c.id === courseId);
    if (found) {
      setTitle(found.title);
      setSubtitle(found.subtitle);
      setBadge(found.badge);
      setCourseUrl(found.courseUrl || "");
      setInstrument(found.instrument);
      setLevel(found.level);
      setPrice(found.price);
      setOriginalPrice(found.originalPrice);
      setDescription(found.description);
      setHighlightsText((found.highlights || []).join("\n"));
      setInstructorName(found.instructor?.name || "");
      setInstructorRole(found.instructor?.role || "");
      setInstructorExp(found.instructor?.experience || "");
      setInstructorAvatar(found.instructor?.avatar || "🎸");
      setLessons(found.lessons || []);
      setStatusMsg(`Выбран курс: ${found.title}`);
    }
  };

  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedCourseId("");
    setTitle("Новый онлайн-курс");
    setSubtitle("Пошаговая программа обучения с нуля");
    setBadge("НОВИНКА");
    setCourseUrl("https://app.maestro.com.kz");
    setInstrument("acoustic");
    setLevel("Начинающий");
    setPrice(9900);
    setOriginalPrice(19900);
    setDescription("Практический курс обучения игре на инструменте.");
    setHighlightsText("10 видеоуроков в HD качестве\nРазбор базовых аккордов и ритмов\nДоступ в личный кабинет ученика");
    setInstructorName("Руслан Сагитов");
    setInstructorRole("Преподаватель Maestro Academy");
    setInstructorExp("Опыт преподавания 8+ лет");
    setInstructorAvatar("🎸");
    setLessons([
      {
        id: `l-${Date.now()}-1`,
        title: "Урок 1: Введение и правильная постановка рук",
        duration: "12 мин",
        description: "Основы посадки, правильное звукоизвлечение и настройка инструмента.",
        isFreePreview: true,
        chords: ["Настройка струн"],
      },
    ]);
    setStatusMsg("✨ Создание нового курса. Заполните данные и нажмите «Сохранить».");
  };

  const handleAddLesson = () => {
    const nextNum = lessons.length + 1;
    const newLesson: CourseLesson = {
      id: `lesson-${Date.now()}-${nextNum}`,
      title: `Урок ${nextNum}: Название урока`,
      duration: "15 мин",
      description: "Краткое описание темы и практического упражнения.",
      isFreePreview: false,
      chords: ["Am", "Dm", "E"],
    };
    setLessons([...lessons, newLesson]);
  };

  const handleUpdateLesson = (index: number, patch: Partial<CourseLesson>) => {
    setLessons((current) => {
      const copy = [...current];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleRemoveLesson = (index: number) => {
    setLessons((current) => current.filter((_, idx) => idx !== index));
  };

  const handleSaveCourse = async () => {
    if (!title.trim() || !description.trim()) {
      setStatusMsg("⚠️ Заполните название и описание курса.");
      return;
    }

    setIsSaving(true);
    setStatusMsg("Сохраняем курс на сервере...");

    try {
      const highlights = highlightsText
        .split("\n")
        .map((h) => h.trim())
        .filter(Boolean);

      const targetId = isCreatingNew || !activeCourse ? `course-${Date.now()}` : activeCourse.id;
      const targetSlug = isCreatingNew || !activeCourse ? `course-${Date.now()}` : activeCourse.slug;

      const payload: Course = {
        id: targetId,
        slug: targetSlug,
        title: title.trim(),
        subtitle: subtitle.trim(),
        badge: badge.trim(),
        courseUrl: courseUrl.trim() || undefined,
        instrument,
        level,
        price,
        originalPrice,
        description: description.trim(),
        highlights,
        lessonsCount: lessons.length || 1,
        durationHours: activeCourse?.durationHours || Math.max(1, Math.round(lessons.length * 0.5)),
        image: activeCourse?.image || "/products/04_41_acoustic.png",
        instructor: {
          name: instructorName.trim() || "Преподаватель Maestro",
          role: instructorRole.trim() || "Преподаватель",
          experience: instructorExp.trim() || "Опыт преподавания",
          avatar: instructorAvatar.trim() || "🎸",
        },
        lessons,
      };

      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as { success?: boolean; course?: Course; error?: string };
      if (!res.ok || !data.course) {
        throw new Error(data.error || "Не удалось сохранить курс");
      }

      setCourses((current) => {
        const withoutSaved = current.filter((c) => c.id !== data.course!.id);
        return [...withoutSaved, data.course!];
      });

      setIsCreatingNew(false);
      setSelectedCourseId(data.course.id);
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setStatusMsg(`✅ Курс «${data.course.title}» успешно сохранён в ${timeStr}!`);
      onSavedNotice?.(`Курс «${title}» сохранён (${money(price)} ₸)`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (isCreatingNew || !activeCourse) {
      setIsCreatingNew(false);
      if (courses.length > 0) handleSelectCourse(courses[0].id);
      return;
    }

    if (!window.confirm(`Вы уверены, что хотите удалить курс «${activeCourse.title}»?`)) {
      return;
    }

    setIsDeleting(true);
    setStatusMsg("Удаляем курс...");

    try {
      const res = await fetch(`/api/courses?id=${activeCourse.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка при удалении на сервере");

      const remaining = courses.filter((c) => c.id !== activeCourse.id);
      setCourses(remaining);
      if (remaining.length > 0) {
        handleSelectCourse(remaining[0].id, remaining);
      } else {
        handleStartCreateNew();
      }
      setStatusMsg(`🗑 Курс «${activeCourse.title}» удалён.`);
      onSavedNotice?.(`Курс «${activeCourse.title}» удалён`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : "Ошибка при удалении");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div
        className="course-editor-modal-content"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>🎓 Настройка и добавление онлайн-курсов</h2>
            <p>Управление программами обучения, ссылками на платформу, ценами, уроками и преподавателями Maestro Academy</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">×</button>
        </div>

        {/* Course Selector Tabs + New Course Button */}
        <div className="course-picker-tabs">
          {courses.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`course-tab-pill ${!isCreatingNew && c.id === selectedCourseId ? "active" : ""}`}
              onClick={() => handleSelectCourse(c.id)}
            >
              <span>{c.instructor?.avatar || "🎓"}</span>
              <strong>{c.title}</strong>
              <small>{money(c.price)} ₸</small>
            </button>
          ))}
          <button
            type="button"
            className={`course-tab-pill add-new ${isCreatingNew ? "active" : ""}`}
            onClick={handleStartCreateNew}
            title="Создать новый курс"
          >
            <span>➕</span>
            <strong>+ Добавить новый курс</strong>
            <small>Создать с нуля</small>
          </button>
        </div>

        {/* Editor Form */}
        <div className="course-form-grid">
          <label className="full-width">
            Название курса
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например: Акустическая гитара с нуля" />
          </label>

          <label className="full-width">
            Подзаголовок (краткое УТП)
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Пошаговый курс для абсолютных новичков" />
          </label>

          <label className="full-width highlight-field">
            🔗 Ссылка на курс / платформу обучения (URL)
            <input
              value={courseUrl}
              onChange={(e) => setCourseUrl(e.target.value)}
              placeholder="https://app.maestro.com.kz/courses/... или https://t.me/..."
            />
          </label>

          <label>
            Бейдж / плашка
            <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="ХИТ · В ПОДАРОК" />
          </label>

          <label>
            Тип инструмента
            <select value={instrument} onChange={(e) => setInstrument(e.target.value as typeof instrument)}>
              <option value="acoustic">Акустическая гитара</option>
              <option value="electric">Электрогитара</option>
              <option value="ukulele">Укулеле</option>
              <option value="all">Все инструменты</option>
            </select>
          </label>

          <label>
            Уровень
            <select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}>
              <option value="Начинающий">Начинающий</option>
              <option value="Средний">Средний</option>
              <option value="Продвинутый">Продвинутый</option>
            </select>
          </label>

          <label>
            Цена курса, ₸
            <input
              type="number"
              placeholder="0"
              value={price === 0 ? "" : price}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPrice(+e.target.value)}
            />
          </label>

          <label>
            Старая цена, ₸ (зачёркнутая)
            <input
              type="number"
              placeholder="0"
              value={originalPrice === 0 ? "" : originalPrice}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setOriginalPrice(+e.target.value)}
            />
          </label>

          <label className="full-width">
            Подробное описание курса
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажите, для кого этот курс и какой результат получит ученик..."
            />
          </label>

          <label className="full-width">
            Ключевые пункты программы (по одному на строку)
            <textarea
              rows={4}
              value={highlightsText}
              onChange={(e) => setHighlightsText(e.target.value)}
              placeholder="12 видеоуроков в 4K&#10;Схемы 7 базовых аккордов&#10;Разборы песен Кино и Басты"
            />
          </label>

          {/* Instructor Block */}
          <div className="instructor-edit-card full-width">
            <strong>👨‍🏫 Преподаватель курса</strong>
            <div className="instructor-inputs-grid">
              <label>
                Имя преподавателя
                <input value={instructorName} onChange={(e) => setInstructorName(e.target.value)} placeholder="Руслан Сагитов" />
              </label>
              <label>
                Должность / Специализация
                <input value={instructorRole} onChange={(e) => setInstructorRole(e.target.value)} placeholder="Преподаватель гитары" />
              </label>
              <label>
                Опыт и регалии
                <input value={instructorExp} onChange={(e) => setInstructorExp(e.target.value)} placeholder="Опыт преподавания 10+ лет" />
              </label>
              <label>
                Иконка / Эмодзи
                <input value={instructorAvatar} onChange={(e) => setInstructorAvatar(e.target.value)} maxLength={4} placeholder="🎸" />
              </label>
            </div>
          </div>

          {/* Lessons List Editor */}
          <div className="lessons-edit-card full-width">
            <div className="card-subhead between">
              <strong>📚 Модули и видеоуроки курса ({lessons.length})</strong>
              <button type="button" className="primary-button small" onClick={handleAddLesson}>
                + Добавить урок
              </button>
            </div>

            <div className="lessons-edit-table">
              {lessons.map((lesson, idx) => (
                <div className="lesson-edit-row" key={lesson.id || idx}>
                  <span className="lesson-idx">#{idx + 1}</span>
                  <label className="lesson-title-field">
                    Название
                    <input
                      value={lesson.title}
                      onChange={(e) => handleUpdateLesson(idx, { title: e.target.value })}
                    />
                  </label>
                  <label className="lesson-dur-field">
                    Длительность
                    <input
                      value={lesson.duration}
                      onChange={(e) => handleUpdateLesson(idx, { duration: e.target.value })}
                    />
                  </label>
                  <label className="lesson-url-field">
                    Ссылка на видео / урок
                    <input
                      value={lesson.videoUrl || ""}
                      onChange={(e) => handleUpdateLesson(idx, { videoUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </label>
                  <label className="lesson-demo-field">
                    <input
                      type="checkbox"
                      checked={Boolean(lesson.isFreePreview)}
                      onChange={(e) => handleUpdateLesson(idx, { isFreePreview: e.target.checked })}
                    />
                    Бесплатное демо
                  </label>
                  <button
                    type="button"
                    className="action-icon-btn delete"
                    onClick={() => handleRemoveLesson(idx)}
                    title="Удалить урок"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer-bar">
          <span className="editor-status-text">{statusMsg}</span>
          <div className="footer-actions">
            {!isCreatingNew && activeCourse && (
              <button
                type="button"
                className="outline-button delete-btn"
                disabled={isDeleting || isSaving}
                onClick={handleDeleteCourse}
                title="Удалить выбранный курс"
              >
                {isDeleting ? "Удаляем..." : "🗑 Удалить курс"}
              </button>
            )}
            <button type="button" className="outline-button" onClick={onClose}>
              Закрыть
            </button>
            <button
              type="button"
              className="primary-button"
              disabled={isSaving}
              onClick={handleSaveCourse}
            >
              {isSaving ? "Сохраняем..." : isCreatingNew ? "➕ Создать и сохранить курс" : "💾 Сохранить изменения курса"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
