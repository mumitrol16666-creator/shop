"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { COURSES, type Course, type CourseLesson } from "../lib/courses-data";
import { installment, money } from "../lib/catalog-data";

type AcademyViewProps = {
  onBackToStore: () => void;
};

export function AcademyView({ onBackToStore }: AcademyViewProps) {
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [selectedCourse, setSelectedCourse] = useState<Course>(COURSES[0]);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(COURSES[0].lessons[0] || null);
  const [isCabinetUnlocked, setIsCabinetUnlocked] = useState(false);
  const [pinCode, setPinCode] = useState("");
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set(["l-1"]));
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/courses")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed"))))
      .then((data: { courses?: Course[] }) => {
        if (active && Array.isArray(data.courses) && data.courses.length > 0) {
          setCourses(data.courses);
          setSelectedCourse(data.courses[0]);
          if (data.courses[0].lessons?.[0]) {
            setActiveLesson(data.courses[0].lessons[0]);
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.trim() === "123456" || pinCode.trim().length >= 4) {
      setIsCabinetUnlocked(true);
      setAuthError("");
    } else {
      setAuthError("Введите верный 6-значный PIN-код (например, 123456)");
    }
  };

  const toggleLessonComplete = (id: string) => {
    setCompletedLessonIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOrderCourseInWhatsApp = (course: Course) => {
    const text = encodeURIComponent(
      `Здравствуйте! Хочу получить доступ к онлайн-курсу «${course.title}» (${money(course.price)} ₸). Подскажите, как оплатить и получить доступ?`
    );
    window.open(`https://wa.me/77775055788?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="academy-page">
      {/* Academy Top Header */}
      <div className="academy-hero">
        <div className="academy-hero-copy">
          <div className="academy-tag-group">
            <span className="academy-hero-tag">MAESTRO ACADEMY</span>
            <span className="gift-tag">🎁 В подарок к каждому инструменту</span>
          </div>
          <h1>Научитесь играть любимые песни на гитаре за 3 дня</h1>
          <p>
            Пошаговые видеоуроки в 4K, интерактивные схемы аккордов, разборы популярных песен и поддержка
            преподавателя. Доступ навсегда с любого телефона или компьютера.
          </p>
          <div className="academy-hero-buttons">
            <a href="#courses-catalog" className="primary-button">
              Выбрать курс
            </a>
            <button
              type="button"
              className="outline-button"
              onClick={() => {
                document.getElementById("student-cabinet")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              🔑 Войти в кабинет ученика
            </button>
          </div>
        </div>

        <div className="academy-hero-stats">
          <div className="academy-stat-card">
            <strong>1 400+</strong>
            <span>учеников научились играть</span>
          </div>
          <div className="academy-stat-card">
            <strong>100%</strong>
            <span>практики с первого урока</span>
          </div>
          <div className="academy-stat-card">
            <strong>0 ₸</strong>
            <span>первый взнос в Kaspi 0-0-12</span>
          </div>
        </div>
      </div>

      {/* Courses Catalog Section */}
      <section className="courses-catalog-section" id="courses-catalog">
        <div className="section-head">
          <div>
            <p className="eyebrow">ОБУЧАЮЩИЕ ПРОГРАММЫ</p>
            <h2>Каталог онлайн-курсов Maestro ({courses.length})</h2>
          </div>
        </div>

        <div className="courses-grid">
          {courses.map((course) => {
            const isSelected = selectedCourse.id === course.id;
            const monthly = installment(course.price, 12);
            return (
              <article
                className={`course-card ${isSelected ? "selected" : ""}`}
                key={course.id}
                onClick={() => {
                  setSelectedCourse(course);
                  if (course.lessons?.[0]) setActiveLesson(course.lessons[0]);
                }}
              >
                <div className="course-card-top">
                  <span className="course-badge">{course.badge}</span>
                  <div className="course-image-thumb">
                    <Image src={course.image} alt={course.title} fill unoptimized sizes="120px" />
                  </div>
                </div>

                <div className="course-card-body">
                  <div className="course-meta-pills">
                    <span>{course.level}</span>
                    <span>•</span>
                    <span>{course.lessonsCount} уроков ({course.durationHours} ч.)</span>
                  </div>
                  <h3>{course.title}</h3>
                  <p className="course-subtitle">{course.subtitle}</p>

                  <ul className="course-highlights-list">
                    {course.highlights.slice(0, 3).map((h) => (
                      <li key={h}>✓ {h}</li>
                    ))}
                  </ul>

                  <div className="instructor-snippet">
                    <span className="instructor-avatar">{course.instructor.avatar}</span>
                    <div>
                      <strong>{course.instructor.name}</strong>
                      <small>{course.instructor.role}</small>
                    </div>
                  </div>
                </div>

                <div className="course-card-footer">
                  <div className="course-price-block">
                    <div className="price-row">
                      <strong className="course-price">{money(course.price)} ₸</strong>
                      <span className="course-old-price">{money(course.originalPrice)} ₸</span>
                    </div>
                    <div className="kaspi-installment-mini">
                      <span className="kaspi-badge">0-0-12</span>
                      <span>от {money(monthly)} ₸/мес</span>
                    </div>
                  </div>

                  <div className="course-actions">
                    {course.courseUrl && (
                      <a
                        href={course.courseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="outline-button small course-link-btn"
                        onClick={(e) => e.stopPropagation()}
                        title="Перейти к платформе курса"
                      >
                        🔗 Перейти к курсу
                      </a>
                    )}
                    <button
                      type="button"
                      className="primary-button small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOrderCourseInWhatsApp(course);
                      }}
                    >
                      Получить курс
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Interactive Student Cabinet & Lesson Player */}
      <section className="student-cabinet-section" id="student-cabinet">
        <div className="cabinet-card">
          <div className="cabinet-header">
            <div>
              <p className="eyebrow">ИНТЕРАКТИВНЫЙ КАБИНЕТ УЧЕНИКА</p>
              <h2>{selectedCourse.title}</h2>
            </div>
            <div className="cabinet-auth-status">
              {selectedCourse.courseUrl && (
                <a
                  href={selectedCourse.courseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="course-platform-link"
                  title="Открыть курс на платформе обучения"
                >
                  🔗 Ссылка на платформу курса ↗
                </a>
              )}
              {isCabinetUnlocked ? (
                <span className="unlocked-badge">🟢 Доступ активирован (Ученик Maestro)</span>
              ) : (
                <span className="locked-badge">🔒 Режим предпросмотра (Демо-доступ)</span>
              )}
            </div>
          </div>

          {!isCabinetUnlocked && (
            <div className="cabinet-pin-box">
              <div className="pin-prompt">
                <strong>Есть промокод или PIN-код из чека?</strong>
                <span>Введите 6-значный код для открытия всех уроков курса (демо-код: <code>123456</code>).</span>
              </div>
              <form onSubmit={handlePinSubmit} className="pin-form">
                <input
                  type="text"
                  placeholder="PIN-код (123456)"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  maxLength={10}
                />
                <button type="submit" className="primary-button small">
                  Активировать доступ
                </button>
              </form>
              {authError && <p className="auth-error-msg">{authError}</p>}
            </div>
          )}

          {/* Lesson Player & Curriculum */}
          <div className="cabinet-grid">
            {/* Left: Video Player & Tabs */}
            <div className="lesson-player-panel">
              {activeLesson ? (
                <div className="active-lesson-view">
                  <div className="video-player-mock">
                    <div className="video-overlay">
                      {activeLesson.videoUrl ? (
                        <a
                          href={activeLesson.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="play-big-btn"
                          title="Смотреть видео урока"
                        >
                          ▶
                        </a>
                      ) : (
                        <div className="play-big-btn">▶</div>
                      )}
                      <span className="video-title-overlay">{activeLesson.title}</span>
                      <span className="video-duration-badge">{activeLesson.duration} · 4K UltraHD</span>
                    </div>
                  </div>

                  <div className="lesson-info-bar">
                    <div>
                      <h3>{activeLesson.title}</h3>
                      <p>{activeLesson.description}</p>
                      {activeLesson.videoUrl && (
                        <a
                          href={activeLesson.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="lesson-video-link"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            marginTop: "8px",
                            fontSize: "12px",
                            color: "var(--amber-dark)",
                            fontWeight: 700,
                            textDecoration: "none",
                          }}
                        >
                          📺 Смотреть видео урока ↗
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`complete-lesson-btn ${completedLessonIds.has(activeLesson.id) ? "done" : ""}`}
                      onClick={() => toggleLessonComplete(activeLesson.id)}
                    >
                      {completedLessonIds.has(activeLesson.id) ? "✓ Урок пройден" : "Отметить пройденным"}
                    </button>
                  </div>

                  {/* Chord diagrams box */}
                  {activeLesson.chords && activeLesson.chords.length > 0 && (
                    <div className="interactive-chords-box">
                      <strong>🎸 Аккорды и аппликатуры урока:</strong>
                      <div className="chords-buttons-row">
                        {activeLesson.chords.map((chord) => (
                          <div key={chord} className="chord-sound-pill">
                            <span>🎼</span>
                            <strong>{chord}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeLesson.tabSnippet && (
                    <div className="tab-snippet-box">
                      <span>Табулатура / Аппликатура:</span>
                      <code>{activeLesson.tabSnippet}</code>
                    </div>
                  )}
                </div>
              ) : (
                <div className="no-lesson-placeholder">
                  <p>В этом курсе доступно индивидуальное расписание с наставником.</p>
                </div>
              )}
            </div>

            {/* Right: Lessons List */}
            <div className="lessons-sidebar">
              <div className="lessons-sidebar-head">
                <strong>Программа курса ({selectedCourse.lessons.length} уроков)</strong>
                <small>Пройдено: {completedLessonIds.size} из {selectedCourse.lessons.length}</small>
              </div>

              <div className="lessons-list">
                {selectedCourse.lessons.map((lesson, idx) => {
                  const isActive = activeLesson?.id === lesson.id;
                  const isDone = completedLessonIds.has(lesson.id);
                  const isLocked = !isCabinetUnlocked && !lesson.isFreePreview;

                  return (
                    <div
                      key={lesson.id}
                      className={`lesson-list-item ${isActive ? "active" : ""} ${isLocked ? "locked" : ""}`}
                      onClick={() => {
                        if (!isLocked) setActiveLesson(lesson);
                      }}
                    >
                      <span className="lesson-num">{idx + 1}</span>
                      <div className="lesson-item-text">
                        <strong>{lesson.title}</strong>
                        <small>{lesson.duration} {lesson.isFreePreview && <span className="free-tag">Бесплатное демо</span>}</small>
                      </div>
                      <span className="lesson-status-icon">
                        {isDone ? "✅" : isLocked ? "🔒" : "▶"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Back to store banner */}
      <div className="academy-footer-banner">
        <div>
          <strong>Хотите получить курс бесплатно?</strong>
          <p>Выберите любую гитару или укулеле в каталоге Maestro — доступ к курсу активируется автоматически!</p>
        </div>
        <button type="button" className="primary-button" onClick={onBackToStore}>
          ← Перейти к выбору гитары
        </button>
      </div>
    </div>
  );
}
