import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { projectsApi } from '../api/projects.api';
import { StatusBadge }  from '../components/common/Badge';
import { fmtDate, fmtTimeRange } from '../utils/helpers';
import { STATUS_CONFIG } from '../utils/constants';
import styles from './CalendarPage.module.css';

const DAY_NAMES      = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_NAMES_LONG = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const today          = new Date();

// ── Palette couleurs projets ──────────────────────────────────────────────────
const PROJECT_COLORS = [
  '#6366f1','#0ea5e9','#10b981','#f59e0b',
  '#ef4444','#8b5cf6','#06b6d4','#f97316',
  '#84cc16','#ec4899','#14b8a6','#a855f7',
];
function projectColor(id) {
  const hash = String(id).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
}

// ── Helpers dates ─────────────────────────────────────────────────────────────
function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function firstWeekday(year, month) { return (new Date(year, month, 1).getDay() + 6) % 7; }
function isoStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function getMonday(date) {
  const d = new Date(date);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  return d;
}
function parseIso(str) {
  if (!str) return null;
  const [y, m, d] = str.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  // Minuit heure locale — evite tout decalage UTC
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// ── Normalisation projet ──────────────────────────────────────────────────────
function normalizeProject(p) {
  // On tronque systematiquement au format YYYY-MM-DD (avant le T)
  // pour eviter tout decalage UTC -> heure locale qui ferait glisser la date d'un jour.
  const trimDate = (v) => {
    if (!v) return null;
    // Si le format contient un T suivi d'une heure UTC, on ne prend que la partie date
    return v.split('T')[0];
  };
  return {
    ...p,
    start_date: trimDate(p.start_date),
    end_date:   trimDate(p.end_date),
    _color:     p._color ?? projectColor(p.id),
  };
}

// ── Dates effectives (fallback si manquantes) ─────────────────────────────────
function getEffectiveDates(p, fallbackYear, fallbackMonth) {
  const start = p.start_date;
  const end   = p.end_date;
  if (!start && !end) {
    const d = isoStr(new Date(fallbackYear, fallbackMonth, 1));
    return { start: d, end: d, noDate: true };
  }
  if (!start) return { start: end,   end: end,   noDate: false };
  if (!end)   return { start: start, end: start, noDate: false };
  return { start, end, noDate: false };
}

// ── Fetch helper (réutilisé pour prefetch) ────────────────────────────────────
function fetchCalendar(year, month) {
  const start = isoStr(new Date(year, month, 1));
  const end   = isoStr(new Date(year, month + 1, 0));
  return projectsApi.getCalendar({ start, end })
    .then(({ data }) => (data?.data?.projects || []).map(normalizeProject));
}

// ── Segments barres vue mois ──────────────────────────────────────────────────
function buildMonthSegments(projects, year, month, maxLanes) {
  // firstDay et lastDay en minuit local pour comparaison cohérente avec parseIso
  const firstDay = new Date(year, month, 1, 0, 0, 0, 0);
  const lastDay  = new Date(year, month + 1, 0, 0, 0, 0, 0);
  const padding  = firstWeekday(year, month);
  const segments = [];

  for (const p of projects) {
    const { start, end } = getEffectiveDates(p, year, month);
    const pStart   = parseIso(start);
    const pEnd     = parseIso(end);

    if (!pStart || !pEnd) continue;

    // On compare les timestamps entiers pour éviter toute ambiguité
    const visStart = pStart.getTime() < firstDay.getTime() ? firstDay : pStart;
    const visEnd   = pEnd.getTime()   > lastDay.getTime()  ? lastDay  : pEnd;
    if (visStart.getTime() > visEnd.getTime()) continue;

    let cursor = new Date(visStart.getTime());
    while (cursor.getTime() <= visEnd.getTime()) {
      const dayOfMonth = cursor.getDate();
      const cellIndex  = dayOfMonth - 1 + padding;
      const weekRow    = Math.floor(cellIndex / 7);
      const colStart   = cellIndex % 7;
      const endOfWeek  = new Date(cursor);
      endOfWeek.setDate(cursor.getDate() + (6 - colStart));
      const segEnd  = visEnd.getTime() < endOfWeek.getTime() ? visEnd : endOfWeek;
      const colSpan = Math.round((segEnd - cursor) / 86400000) + 1;
      const isStart = isoStr(cursor) === isoStr(visStart);
      const isEnd   = isoStr(segEnd) === isoStr(visEnd);

      segments.push({ project: p, weekRow, colStart, colSpan, isStart, isEnd });
      cursor = new Date(segEnd);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  segments.sort((a, b) =>
    a.weekRow !== b.weekRow ? a.weekRow - b.weekRow : a.colStart - b.colStart
  );

  const dayProjectMap = {};
  const weekLaneMap   = {};

  for (const seg of segments) {
    if (!weekLaneMap[seg.weekRow]) weekLaneMap[seg.weekRow] = [];
    const occupied = weekLaneMap[seg.weekRow];
    const colEnd   = seg.colStart + seg.colSpan - 1;
    let lane = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const conflict = occupied.some(
        o => o.lane === lane && o.colStart <= colEnd && o.colEnd >= seg.colStart
      );
      if (!conflict) break;
      lane++;
    }
    occupied.push({ colStart: seg.colStart, colEnd, lane });
    seg.lane = lane;

    for (let col = seg.colStart; col <= colEnd; col++) {
      const key = `${seg.weekRow}-${col}`;
      if (!dayProjectMap[key]) dayProjectMap[key] = [];
      if (!dayProjectMap[key].find(x => x.id === seg.project.id))
        dayProjectMap[key].push(seg.project);
    }
  }

  return {
    visible:       segments.filter(s => s.lane < maxLanes),
    hidden:        segments.filter(s => s.lane >= maxLanes),
    dayProjectMap,
  };
}

// ── Composant principal ───────────────────────────────────────────────────────
export default function CalendarPage() {
  const [view,          setView]          = useState('month');
  const [current,       setCurrent]       = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [projects,      setProjects]      = useState([]);
  const [cache,         setCache]         = useState({});        // prefetch : "year-month" → projects[]
  const [loading,       setLoading]       = useState(true);
  const [tooltip,       setTooltip]       = useState(null);
  const [popover,       setPopover]       = useState(null);      // { projects, x, y }
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [dragProject,   setDragProject]   = useState(null);
  const [dragOverDay,   setDragOverDay]   = useState(null);
  const [hoveredWeek,   setHoveredWeek]   = useState(null);      // weekRow surbrillé

  const tooltipRef  = useRef(null);
  const popoverRef  = useRef(null);
  const gridRef     = useRef(null);
  const [headerH,   setHeaderH] = useState(37); // hauteur réelle du header des jours

  const year       = current.getFullYear();
  const month      = current.getMonth();
  const densityCfg = { cellH: 110, barH: 22, dayNumH: 32, maxLanes: 3 };

  const weekDays = view === 'week'
    ? Array.from({ length: 7 }, (_, i) => {
        const mon = getMonday(current);
        return new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
      })
    : [];

  const cacheKey = (y, m) => `${y}-${m}`;

  // Mesure la hauteur réelle du header des colonnes (Lun, Mar, ...)
  useEffect(() => {
    if (!gridRef.current) return;
    const header = gridRef.current.querySelector('div:first-child');
    if (header) setHeaderH(header.getBoundingClientRect().height);
  });

  // ── Fetch principal ───────────────────────────────────────────────────────
  useEffect(() => {
    if (view === 'week') {
      setLoading(true);
      const mon = getMonday(current);
      const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
      projectsApi.getCalendar({ start: isoStr(mon), end: isoStr(sun) })
        .then(({ data }) => setProjects((data?.data?.projects || []).map(normalizeProject)))
        .catch(() => setProjects([]))
        .finally(() => setLoading(false));
      return;
    }

    const key = cacheKey(year, month);
    if (cache[key]) {
      setProjects(cache[key]);
      setLoading(false);
    } else {
      setLoading(true);
      fetchCalendar(year, month)
        .then(list => {
          setProjects(list);
          setCache(prev => ({ ...prev, [key]: list }));
        })
        .catch(() => setProjects([]))
        .finally(() => setLoading(false));
    }
  }, [year, month, view, current]); // eslint-disable-line

  // ── Prefetch mois voisins ─────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'month') return;
    [
      { y: month === 0  ? year - 1 : year, m: month === 0  ? 11 : month - 1 },
      { y: month === 11 ? year + 1 : year, m: month === 11 ? 0  : month + 1 },
    ].forEach(({ y, m }) => {
      const key = cacheKey(y, m);
      if (cache[key]) return;
      fetchCalendar(y, m)
        .then(list => setCache(prev => ({ ...prev, [key]: list })))
        .catch(() => {});
    });
  }, [year, month, view]); // eslint-disable-line

  // ── Navigation ───────────────────────────────────────────────────────────
  const prevPeriod = () => {
    if (view === 'week') setCurrent(p => new Date(p.getFullYear(), p.getMonth(), p.getDate() - 7));
    else setCurrent(new Date(year, month - 1, 1));
  };
  const nextPeriod = () => {
    if (view === 'week') setCurrent(p => new Date(p.getFullYear(), p.getMonth(), p.getDate() + 7));
    else setCurrent(new Date(year, month + 1, 1));
  };
  const goToday = () => {
    if (view === 'week') setCurrent(getMonday(today));
    else setCurrent(new Date(today.getFullYear(), today.getMonth(), 1));
  };
  const handleSetView = (v) => {
    setView(v);
    setCurrent(v === 'week' ? getMonday(today) : new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // ── Labels ───────────────────────────────────────────────────────────────
  const monthLabel  = current.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const periodLabel = view === 'week' && weekDays.length
    ? (() => {
        const s = weekDays[0], e = weekDays[6];
        return s.getMonth() === e.getMonth()
          ? `${s.getDate()} – ${e.getDate()} ${e.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
          : `${s.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      })()
    : monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const totalDays   = daysInMonth(year, month);
  const paddingDays = firstWeekday(year, month);
  const totalWeeks  = Math.ceil((paddingDays + totalDays) / 7);

  // ── Filtres ───────────────────────────────────────────────────────────────
  const toggleFilter = (key) => setActiveFilters(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });
  const filteredProjects = activeFilters.size === 0
    ? projects
    : projects.filter(p => activeFilters.has(p.status));

  // ── Segments vue mois ─────────────────────────────────────────────────────
  const { visible: visibleSegs, dayProjectMap } = useMemo(
    () => buildMonthSegments(filteredProjects, year, month, densityCfg.maxLanes),
    [filteredProjects, year, month, densityCfg.maxLanes]
  );

  // Compteur +N : projets cachés (lane >= maxLanes) sur une cellule
  const hiddenCountForDay = (weekRow, col) => {
    const key      = `${weekRow}-${col}`;
    const allProjs = dayProjectMap[key] || [];
    const visIds   = new Set(
      visibleSegs
        .filter(s => s.weekRow === weekRow && s.colStart <= col && s.colStart + s.colSpan - 1 >= col)
        .map(s => s.project.id)
    );
    return allProjs.filter(p => !visIds.has(p.id));
  };

  // Vue semaine
  const projectsForDate = (iso) =>
    filteredProjects.filter(p => {
      const { start, end } = getEffectiveDates(p, year, month);
      if (!start || !end) return false;
      return start <= iso && end >= iso;
    });

  // ── Dismiss overlays ──────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) setTooltip(null);
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setPopover(null);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e, project) => {
    if (!project.start_date) return;
    setDragProject(project);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  const handleDragOver = useCallback((e, day) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverDay(day);
  }, []);
  const handleDrop = useCallback((e, day) => {
    e.preventDefault();
    if (!dragProject?.start_date) return;
    const endStr   = dragProject.end_date || dragProject.start_date;
    const dur      = Math.round((parseIso(endStr) - parseIso(dragProject.start_date)) / 86400000);
    const newStart = isoStr(new Date(year, month, day));
    const newEnd   = isoStr(new Date(year, month, day + dur));
    const previous = dragProject;
    setProjects(prev => prev.map(p =>
      p.id === dragProject.id ? { ...p, start_date: newStart, end_date: newEnd } : p
    ));
    setCache(prev => { const next = { ...prev }; delete next[cacheKey(year, month)]; return next; });
    setDragProject(null); setDragOverDay(null);
    projectsApi.update(previous.id, { start_date: newStart, end_date: newEnd })
      .catch(() => setProjects(prev => prev.map(p =>
        p.id === previous.id ? { ...p, start_date: previous.start_date, end_date: previous.end_date } : p
      )));
  }, [dragProject, year, month]); // eslint-disable-line
  const handleDragEnd = useCallback(() => { setDragProject(null); setDragOverDay(null); }, []);

  const cellWeekRow = (day) => Math.floor((day - 1 + paddingDays) / 7);

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

          {/* Vue mois / semaine */}
          <div className={styles.viewToggle}>
            <button className={`${styles.viewBtn} ${view === 'month' ? styles.viewBtnActive : ''}`} onClick={() => handleSetView('month')}>Mois</button>
            <button className={`${styles.viewBtn} ${view === 'week'  ? styles.viewBtnActive : ''}`} onClick={() => handleSetView('week')}>Semaine</button>
          </div>

          <div className={styles.navGroup}>
            <button className={styles.navBtn} onClick={prevPeriod}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <span className={styles.monthLabel}>{periodLabel}</span>
            <button className={styles.navBtn} onClick={nextPeriod}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
            <button key={key}
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
          <button className={styles.clearBtn} onClick={() => setActiveFilters(new Set())}>Tout afficher</button>
        )}
      </div>

      {/* ── Calendrier ── */}
      <div className={styles.calendarWrap}>
        {loading ? (
          <div className={styles.loader}><div className={styles.spinnerRing} /></div>
        ) : view === 'week' ? (

          /* ════ VUE SEMAINE ════ */
          <div className={styles.weekWrap}>
            {weekDays.map((day, i) => {
              const iso     = isoStr(day);
              const isToday = iso === isoStr(today);
              const projs   = projectsForDate(iso);
              return (
                <div key={i}
                  className={[styles.weekRow, isToday ? styles.weekRowToday : '', dragOverDay === day.getDate() ? styles.cellDragOver : ''].join(' ')}
                  onDragOver={e => handleDragOver(e, day.getDate())}
                  onDrop={e => handleDrop(e, day.getDate())}
                >
                  <div className={styles.weekDayMeta}>
                    <span className={styles.weekDayName}>{DAY_NAMES_LONG[i]}</span>
                    <span className={`${styles.weekDayNum} ${isToday ? styles.dayNumToday : ''}`}>{day.getDate()}</span>
                    <span className={styles.weekDayMonth}>{day.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className={styles.weekEvents}>
                    {projs.length === 0 && <span className={styles.weekEmpty}>Aucun projet</span>}
                    {projs.map(p => {
                      const color = p._color ?? STATUS_CONFIG[p.status]?.dot ?? '#6366f1';
                      return (
                        <div key={p.id}
                          className={`${styles.weekEvent} ${dragProject?.id === p.id ? styles.eventDragging : ''}`}
                          style={{ '--ev-color': color }}
                          draggable={!!p.start_date}
                          onDragStart={e => handleDragStart(e, p)}
                          onDragEnd={handleDragEnd}
                          onClick={e => { e.stopPropagation(); setTooltip({ project: p, x: e.clientX, y: e.clientY }); }}
                        >
                          <div className={styles.weekEvLeft}>
                            <span className={styles.weekEvName}>{p.name}</span>
                            {fmtTimeRange(p.heure_debut, p.heure_fin) && (
                              <span className={styles.weekEvTime}>{fmtTimeRange(p.heure_debut, p.heure_fin)}</span>
                            )}
                            {p.ville && <span className={styles.weekEvVille}>📍 {p.ville}</span>}
                          </div>
                          <div className={styles.weekEvRight}>
                            {p.type && <span className={styles.weekEvBadge}>{p.type}</span>}
                            {p.assigned_users?.length > 0 && (
                              <div className={styles.eventAvatars}>
                                {p.assigned_users.slice(0, 3).map(u => (
                                  <span key={u.id} className={styles.eventAvatar}
                                    style={{ background: u.color || '#6366f1' }} title={u.name}>
                                    {(u.avatar || u.name?.slice(0,2) || '?').toUpperCase()}
                                  </span>
                                ))}
                                {p.assigned_users.length > 3 && <span className={styles.eventAvatarMore}>+{p.assigned_users.length - 3}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ════ VUE MOIS ════ */
          <div className={styles.monthWrap}>

            {/* Grille des cellules (sans événements dedans) */}
            <div ref={gridRef} className={styles.grid} style={{
              '--total-weeks': totalWeeks,
              '--cell-h':      `${densityCfg.cellH}px`,
              '--bar-h':       `${densityCfg.barH}px`,
              '--day-num-h':   `${densityCfg.dayNumH}px`,
            }}>
              {DAY_NAMES.map(d => <div key={d} className={styles.dayHeader}>{d}</div>)}

              {Array.from({ length: paddingDays }).map((_, i) => (
                <div key={`pad-${i}`}
                  className={[styles.cellEmpty, hoveredWeek === Math.floor(i / 7) ? styles.cellWeekHover : ''].join(' ')}
                />
              ))}

              {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
                const wr          = cellWeekRow(day);
                const isToday     = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const col         = (day - 1 + paddingDays) % 7;
                const hiddenProjs = hiddenCountForDay(wr, col);

                return (
                  <div key={day}
                    className={[
                      styles.cell,
                      isToday          ? styles.cellToday    : '',
                      dragOverDay === day ? styles.cellDragOver : '',
                      hoveredWeek === wr  ? styles.cellWeekHover : '',
                    ].join(' ')}
                    onDragOver={e => handleDragOver(e, day)}
                    onDrop={e => handleDrop(e, day)}
                  >
                    <div className={`${styles.dayNum} ${isToday ? styles.dayNumToday : ''}`}>{day}</div>

                    {/* ── Compteur +N cliquable ── */}
                    {hiddenProjs.length > 0 && (
                      <button className={styles.moreBtn}
                        onClick={e => { e.stopPropagation(); setPopover({ projects: hiddenProjs, x: e.clientX, y: e.clientY }); }}>
                        +{hiddenProjs.length} de plus
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Overlay barres continues ── */}
            <div className={styles.barsOverlay} style={{
              '--total-weeks':    totalWeeks,
              '--cell-h':         `${densityCfg.cellH}px`,
              '--bar-h':          `${densityCfg.barH}px`,
              '--day-num-h':      `${densityCfg.dayNumH}px`,
              '--header-row-h':   `${headerH}px`,
            }}>
              {visibleSegs.map((seg, idx) => {
                const { project: p, weekRow, colStart, colSpan, isStart, isEnd, lane } = seg;
                const color = p._color ?? '#6366f1';
                return (
                  <div key={`${p.id}-${idx}`}
                    className={`${styles.bar} ${dragProject?.id === p.id ? styles.eventDragging : ''}`}
                    style={{
                      '--bar-color': color,
                      '--col-start': colStart,
                      '--col-span':  colSpan,
                      '--week-row':  weekRow,
                      '--lane':      lane,
                      borderRadius: isStart && isEnd ? '5px' : isStart ? '5px 0 0 5px' : isEnd ? '0 5px 5px 0' : '0',
                    }}
                    draggable
                    onDragStart={e => handleDragStart(e, p)}
                    onDragEnd={handleDragEnd}
                    onMouseEnter={() => setHoveredWeek(weekRow)}
                    onMouseLeave={() => setHoveredWeek(null)}
                    onClick={e => { e.stopPropagation(); setTooltip({ project: p, x: e.clientX, y: e.clientY }); }}
                    title={p.name}
                  >
                    <span className={styles.barName}>{p.name}</span>
                    {p.ville && <span className={styles.barVille}>📍 {p.ville}</span>}
                    {p.assigned_users?.length > 0 && (
                      <div className={styles.barAvatars}>
                        {p.assigned_users.slice(0, 2).map(u => (
                          <span key={u.id} className={styles.eventAvatar}
                            style={{ background: u.color || '#6366f1' }} title={u.name}>
                            {(u.avatar || u.name?.slice(0,2) || '?').toUpperCase()}
                          </span>
                        ))}
                        {p.assigned_users.length > 2 && <span className={styles.eventAvatarMore}>+{p.assigned_users.length - 2}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Popover +N ── */}
      {popover && (
        <div ref={popoverRef} className={styles.popover}
          style={{
            top:  Math.min(popover.y + 10, window.innerHeight - 300),
            left: Math.min(popover.x + 10, window.innerWidth  - 260),
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.popoverHeader}>
            <span className={styles.popoverTitle}>Projets supplémentaires</span>
            <button className={styles.tooltipClose} onClick={() => setPopover(null)}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
            </button>
          </div>
          <div className={styles.popoverList}>
            {popover.projects.map(p => (
              <div key={p.id} className={styles.popoverItem}
                style={{ '--item-color': p._color ?? '#6366f1' }}
                onClick={() => { setTooltip({ project: p, x: popover.x + 270, y: popover.y }); setPopover(null); }}
              >
                <span className={styles.popoverDot} />
                <span className={styles.popoverItemName}>{p.name}</span>
                <span className={styles.popoverItemDates}>
                  {p.start_date ? fmtDate(p.start_date) : '—'} → {p.end_date ? fmtDate(p.end_date) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tooltip détail ── */}
      {tooltip && (
        <div ref={tooltipRef} className={styles.tooltip}
          style={{
            top:  Math.min(tooltip.y + 14, window.innerHeight - 280),
            left: Math.min(tooltip.x + 14, window.innerWidth  - 300),
          }}
          onClick={e => e.stopPropagation()}
        >
          <button className={styles.tooltipClose} onClick={() => setTooltip(null)}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/></svg>
          </button>
          <div className={styles.tooltipTop}>
            <div className={styles.tooltipName}>{tooltip.project.name}</div>
            {tooltip.project.ville && <div className={styles.tooltipVilleTop}>📍 {tooltip.project.ville}</div>}
          </div>
          <div className={styles.tooltipBody}>
            <div className={styles.tooltipRow}><StatusBadge status={tooltip.project.status} /></div>
            <div className={styles.tooltipMeta}>
              {(tooltip.project.start_date || tooltip.project.end_date) && (
                <div className={styles.tooltipMetaItem}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="1" y="2" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M1 5h11M4 1v2M9 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  {tooltip.project.start_date ? fmtDate(tooltip.project.start_date) : '—'}
                  {' → '}
                  {tooltip.project.end_date ? fmtDate(tooltip.project.end_date) : '—'}
                </div>
              )}
              {fmtTimeRange(tooltip.project.heure_debut, tooltip.project.heure_fin) && (
                <div className={styles.tooltipMetaItem}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M6.5 3.5v3l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                  {fmtTimeRange(tooltip.project.heure_debut, tooltip.project.heure_fin)}
                </div>
              )}
              {tooltip.project.type && (
                <div className={styles.tooltipMetaItem}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 10L6.5 2 11 10H2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  </svg>
                  {tooltip.project.type}
                </div>
              )}
              {tooltip.project.localisation && (
                <div className={styles.tooltipMetaItem}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1C4.57 1 3 2.57 3 4.5c0 2.63 3.5 7.5 3.5 7.5S10 7.13 10 4.5C10 2.57 8.43 1 6.5 1z" stroke="currentColor" strokeWidth="1.3"/>
                    <circle cx="6.5" cy="4.5" r="1.2" stroke="currentColor" strokeWidth="1.1"/>
                  </svg>
                  <span className={styles.tooltipLocText}>{tooltip.project.localisation}</span>
                </div>
              )}
            </div>
            {tooltip.project.assigned_users?.length > 0 && (
              <div className={styles.tooltipTeam}>
                {tooltip.project.assigned_users.map(u => (
                  <span key={u.id} className={styles.tooltipAvatar}
                    style={{ background: u.color || '#6366f1' }} title={u.name}>
                    {(u.avatar || u.name?.slice(0,2) || '?').toUpperCase()}
                  </span>
                ))}
              </div>
            )}
            {tooltip.project.description && (
              <p className={styles.tooltipDesc}>{tooltip.project.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
