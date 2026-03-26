import { useState, useEffect, useRef, useCallback } from 'react';
import { projectsApi } from '../api/projects.api';
import { StatusBadge }  from '../components/common/Badge';
import PageHeader        from '../components/layout/PageHeader';
import Button            from '../components/common/Button';
import Icon              from '../components/common/Icon';
import { fmtDate, fmtTimeRange } from '../utils/helpers';
import { STATUS_CONFIG } from '../utils/constants';
import styles from './CalendarPage.module.css';

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const today     = new Date();

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function firstWeekday(year, month) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

// ✅ Fix timezone : utilise l'heure locale au lieu de UTC
function isoStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CalendarPage() {
  const [current,       setCurrent]       = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [projects,      setProjects]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tooltip,       setTooltip]       = useState(null);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [dragProject,   setDragProject]   = useState(null);
  const [dragOverDay,   setDragOverDay]   = useState(null);
  const tooltipRef = useRef(null);

  const year  = current.getFullYear();
  const month = current.getMonth();

  useEffect(() => {
    setLoading(true);
    const start = isoStr(new Date(year, month, 1));
    const end   = isoStr(new Date(year, month + 1, 0));
    projectsApi.getCalendar({ start, end })
      .then(({ data }) => {
        // Normalise les dates : supprime la partie heure/timezone si présente
        // ex: "2026-03-26T00:00:00.000Z" → "2026-03-26"
        const projects = data.data.projects.map(p => ({
          ...p,
          start_date: p.start_date ? p.start_date.split('T')[0] : p.start_date,
          end_date:   p.end_date   ? p.end_date.split('T')[0]   : p.end_date,
        }));
        setProjects(projects);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));
  const goToday   = () => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1));

  const totalDays   = daysInMonth(year, month);
  const paddingDays = firstWeekday(year, month);
  const monthLabel  = current.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const toggleFilter = (key) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filteredProjects = activeFilters.size === 0
    ? projects
    : projects.filter(p => activeFilters.has(p.status));

  const projectsForDay = (day) => {
    const d = isoStr(new Date(year, month, day));
    return filteredProjects.filter(p => p.start_date <= d && p.end_date >= d);
  };

  // Dismiss tooltip on outside click
  useEffect(() => {
    const fn = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) {
        setTooltip(null);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // --- Drag & drop handlers ---
  const handleDragStart = useCallback((e, project) => {
    setDragProject(project);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e, day) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(day);
  }, []);

  const handleDrop = useCallback((e, day) => {
    e.preventDefault();
    if (!dragProject) return;

    // ✅ Fix timezone pour le drag & drop aussi
    const startDate = new Date(dragProject.start_date + 'T00:00:00');
    const endDate   = new Date(dragProject.end_date   + 'T00:00:00');
    const durationDays = Math.round((endDate - startDate) / 86400000);

    const newStart = isoStr(new Date(year, month, day));
    const newEnd   = isoStr(new Date(year, month, day + durationDays));

    // Snapshot for rollback
    const previous = dragProject;

    // Optimistic update
    setProjects(prev =>
      prev.map(p =>
        p.id === dragProject.id
          ? { ...p, start_date: newStart, end_date: newEnd }
          : p
      )
    );

    setDragProject(null);
    setDragOverDay(null);

    // Persist to API — rollback on failure
    projectsApi
      .update(previous.id, { start_date: newStart, end_date: newEnd })
      .catch(() => {
        setProjects(prev =>
          prev.map(p =>
            p.id === previous.id
              ? { ...p, start_date: previous.start_date, end_date: previous.end_date }
              : p
          )
        );
      });
  }, [dragProject, year, month]);

  const handleDragEnd = useCallback(() => {
    setDragProject(null);
    setDragOverDay(null);
  }, []);

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Calendrier</h1>
          <p className={styles.subtitle}>Visualisez vos projets par date</p>
        </div>
        <div className={styles.headerControls}>
          <button className={styles.todayBtn} onClick={goToday}>Aujourd'hui</button>
          <div className={styles.navGroup}>
            <button className={styles.navBtn} onClick={prevMonth} aria-label="Mois précédent">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className={styles.monthLabel}>
              {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            </span>
            <button className={styles.navBtn} onClick={nextMonth} aria-label="Mois suivant">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>Filtrer :</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const active = activeFilters.has(key);
          return (
            <button
              key={key}
              className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
              style={{ '--chip-color': cfg.dot }}
              onClick={() => toggleFilter(key)}
            >
              <span className={styles.chipDot} style={{ background: cfg.dot }} />
              {key}
              {active && (
                <svg className={styles.chipCheck} width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          );
        })}
        {activeFilters.size > 0 && (
          <button className={styles.clearBtn} onClick={() => setActiveFilters(new Set())}>
            Tout afficher
          </button>
        )}
      </div>

      {/* ── Calendar ── */}
      <div className={styles.calendarWrap}>
        {loading ? (
          <div className={styles.loader}>
            <div className={styles.spinnerRing} />
          </div>
        ) : (
          <div className={styles.grid}>
            {/* Day headers */}
            {DAY_NAMES.map(d => (
              <div key={d} className={styles.dayHeader}>{d}</div>
            ))}

            {/* Padding */}
            {Array.from({ length: paddingDays }).map((_, i) => (
              <div key={`pad-${i}`} className={styles.cellEmpty} />
            ))}

            {/* Day cells */}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
              const projs   = projectsForDay(day);
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isDragOver = dragOverDay === day;

              return (
                <div
                  key={day}
                  className={[
                    styles.cell,
                    isToday    ? styles.cellToday    : '',
                    isDragOver ? styles.cellDragOver : '',
                  ].join(' ')}
                  onDragOver={e => handleDragOver(e, day)}
                  onDrop={e => handleDrop(e, day)}
                >
                  <div className={`${styles.dayNum} ${isToday ? styles.dayNumToday : ''}`}>
                    {day}
                  </div>

                  <div className={styles.events}>
                    {projs.slice(0, 3).map(p => {
                      const cfg = STATUS_CONFIG[p.status] || {};
                      return (
                        <div
                          key={p.id}
                          className={`${styles.event} ${dragProject?.id === p.id ? styles.eventDragging : ''}`}

                          draggable
                          onDragStart={e => handleDragStart(e, p)}
                          onDragEnd={handleDragEnd}
                          onClick={e => {
                            e.stopPropagation();
                            setTooltip({ project: p, x: e.clientX, y: e.clientY });
                          }}
                          title={p.name}
                        >
                          <span className={styles.eventName}>{p.name}</span>
                          <div className={styles.eventBottom}>
                            {p.type && (
                              <span className={styles.eventType}>{p.type}</span>
                            )}
                            {p.assigned_users?.length > 0 && (
                              <div className={styles.eventAvatars}>
                                {p.assigned_users.slice(0, 3).map(u => (
                                  <span
                                    key={u.id}
                                    className={styles.eventAvatar}
                                    style={{ background: u.color || '#6366f1' }}
                                    title={u.name}
                                  >
                                    {u.avatar}
                                  </span>
                                ))}
                                {p.assigned_users.length > 3 && (
                                  <span className={styles.eventAvatarMore}>
                                    +{p.assigned_users.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {projs.length > 3 && (
                      <div className={styles.more}>+{projs.length - 3} de plus</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tooltip ── */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className={styles.tooltip}
          style={{
            top:  Math.min(tooltip.y + 14, window.innerHeight - 260),
            left: Math.min(tooltip.x + 14, window.innerWidth  - 300),
          }}
          onClick={e => e.stopPropagation()}
        >
          <button className={styles.tooltipClose} onClick={() => setTooltip(null)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>

          <div className={styles.tooltipTop}>
            <div className={styles.tooltipName}>{tooltip.project.name}</div>
            <div className={styles.tooltipRef}>{tooltip.project.reference}</div>
          </div>

          <div className={styles.tooltipBody}>
            <div className={styles.tooltipRow}>
              <StatusBadge status={tooltip.project.status} />
            </div>

            <div className={styles.tooltipMeta}>
              <div className={styles.tooltipMetaItem}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <rect x="1" y="2" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M1 5h11M4 1v2M9 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {fmtDate(tooltip.project.start_date)} → {fmtDate(tooltip.project.end_date)}
              </div>

              {fmtTimeRange(tooltip.project.heure_debut, tooltip.project.heure_fin) && (
                <div className={styles.tooltipMetaItem}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M6.5 3.5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  {fmtTimeRange(tooltip.project.heure_debut, tooltip.project.heure_fin)}
                </div>
              )}

              {tooltip.project.ville && (
                <div className={styles.tooltipMetaItem}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1C4.57 1 3 2.57 3 4.5c0 2.63 3.5 7.5 3.5 7.5S10 7.13 10 4.5C10 2.57 8.43 1 6.5 1z" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="6.5" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/>
                  </svg>
                  {tooltip.project.ville}
                </div>
              )}
            </div>

            {tooltip.project.description && (
              <p className={styles.tooltipDesc}>{tooltip.project.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}