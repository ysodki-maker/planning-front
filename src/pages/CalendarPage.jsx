import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { projectsApi } from '../api/projects.api';
import { STATUS_CONFIG } from '../utils/constants';
import { fmtDate, fmtTimeRange } from '../utils/helpers';
import { StatusBadge } from '../components/common/Badge';
import styles from './CalendarPage.module.css';

// ── Constantes ────────────────────────────────────────────────────────────────
const HOURS      = Array.from({ length: 24 }, (_, i) => i);
const SLOT_H     = 64; // px par heure
const DAY_SHORT  = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const DAY_LONG   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MONTH_DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const today      = new Date();

const EVENT_COLORS = [
  '#1a73e8','#0b8043','#d93025','#f6bf26',
  '#8430ce','#e67c73','#33b679','#039be5',
  '#616161','#f4511e','#7986cb','#0097a7',
];
function colorFor(id) {
  const h = String(id).split('').reduce((a,c) => a+c.charCodeAt(0), 0);
  return EVENT_COLORS[h % EVENT_COLORS.length];
}
function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── Helpers date ──────────────────────────────────────────────────────────────
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function monday(date) {
  const d = new Date(date);
  const dd = d.getDay(); // 0=Sun
  d.setDate(d.getDate() + (dd === 0 ? -6 : 1 - dd));
  return d;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function parseDate(s) {
  if (!s) return null;
  const [y,m,d] = s.split('T')[0].split('-').map(Number);
  return new Date(y, m-1, d);
}
function timeMin(t) {
  if (!t) return null;
  const [h,m] = t.slice(0,5).split(':').map(Number);
  return h*60+m;
}
function daysInMonth(y,m) { return new Date(y,m+1,0).getDate(); }
function firstWd(y,m) { return (new Date(y,m,1).getDay()+6)%7; } // 0=Mon

// ── Normalisation projet ──────────────────────────────────────────────────────
function norm(p) {
  return {
    ...p,
    start_date: p.start_date ? p.start_date.split('T')[0] : null,
    end_date:   p.end_date   ? p.end_date.split('T')[0]   : null,
    _color:     p._color ?? colorFor(p.id),
  };
}

// ── Vue mois : segments avec lanes ───────────────────────────────────────────
const MAX_VIS = 3; // barres visibles max par cellule

// Retourne { segsByCell, hiddenByCell }
// segsByCell[`${wr}-${col}`] = [{ p, col, span, lane, isS, isE }, ...]
// hiddenByCell[`${wr}-${col}`] = [project, ...]  (ceux au-delà de MAX_VIS)
function buildMonthLayout(projects, year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const pad   = firstWd(year, month);

  // 1. Construire tous les segments (1 par semaine traversée)
  const segs = [];
  for (const p of projects) {
    const sd = p.start_date ?? iso(first);
    const ed = p.end_date   ?? sd;
    const ps = parseDate(sd), pe = parseDate(ed);
    if (!ps || !pe) continue;
    const vs = ps < first ? first : ps;
    const ve = pe > last  ? last  : pe;
    if (vs > ve) continue;

    let cur = new Date(vs);
    while (cur <= ve) {
      const ci  = (cur.getDate() - 1 + pad);
      const wr  = Math.floor(ci / 7);
      const col = ci % 7;
      const eow = new Date(cur); eow.setDate(cur.getDate() + (6 - col));
      const se  = ve < eow ? ve : eow;
      const span = Math.round((se - cur) / 86400000) + 1;
      segs.push({ p, wr, col, span, isS: iso(cur) === iso(vs), isE: iso(se) === iso(ve), lane: -1 });
      cur = new Date(se); cur.setDate(cur.getDate() + 1);
    }
  }

  // 2. Assigner les lanes par semaine (même algo que Google Cal)
  // On trie par début de segment puis par durée décroissante pour stabilité
  segs.sort((a, b) => a.wr !== b.wr ? a.wr - b.wr : a.col !== b.col ? a.col - b.col : b.span - a.span);

  const weekOcc = {}; // wr -> [{cs, ce, lane}]
  for (const s of segs) {
    if (!weekOcc[s.wr]) weekOcc[s.wr] = [];
    const occ = weekOcc[s.wr];
    const ce  = s.col + s.span - 1;
    let lane  = 0;
    while (occ.some(o => o.lane === lane && o.cs <= ce && o.ce >= s.col)) lane++;
    occ.push({ cs: s.col, ce, lane });
    s.lane = lane;
  }

  // 3. Indexer par cellule
  const segsByCell  = {};
  const hiddenByCell = {};

  for (const s of segs) {
    for (let c = s.col; c < s.col + s.span; c++) {
      const k = `${s.wr}-${c}`;
      if (!segsByCell[k]) segsByCell[k] = [];
      // On ne stocke le segment que pour la cellule de départ (col)
      // mais on track les projets visibles pour hidden
    }
    // Stocker le segment complet (référencé depuis col de départ)
    const startKey = `${s.wr}-${s.col}`;
    if (!segsByCell[startKey]) segsByCell[startKey] = [];
    segsByCell[startKey].push(s);
  }

  // 4. Calculer les projets cachés par cellule (lane >= MAX_VIS)
  // Pour chaque cellule, lister les projets qui la couvrent avec lane >= MAX_VIS
  for (const s of segs) {
    if (s.lane >= MAX_VIS) {
      for (let c = s.col; c < s.col + s.span; c++) {
        const k = `${s.wr}-${c}`;
        if (!hiddenByCell[k]) hiddenByCell[k] = [];
        if (!hiddenByCell[k].find(x => x.id === s.p.id)) hiddenByCell[k].push(s.p);
      }
    }
  }

  return { segsByCell, hiddenByCell };
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [view,     setView]     = useState('week');
  const [current,  setCurrent]  = useState(() => monday(today));
  const [projects, setProjects] = useState([]);
  const [cache,    setCache]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [tooltip,  setTooltip]  = useState(null);
  const [popover,  setPopover]  = useState(null);
  const [filters,  setFilters]  = useState(new Set());
  const [nowMin,   setNowMin]   = useState(0);

  const gridRef    = useRef(null);
  const tooltipRef = useRef(null);
  const popoverRef = useRef(null);

  const MY = current.getFullYear();
  const MM = current.getMonth();

  const weekDays = useMemo(() =>
    view==='week' ? Array.from({length:7},(_,i)=>addDays(monday(current),i)) : [],
  [view,current]);

  // Horloge "maintenant"
  useEffect(()=>{
    const upd = ()=>{ const n=new Date(); setNowMin(n.getHours()*60+n.getMinutes()); };
    upd(); const id=setInterval(upd,30000); return ()=>clearInterval(id);
  },[]);

  // Scroll vers heure actuelle
  useEffect(()=>{
    if(view!=='week'||!gridRef.current) return;
    const top = Math.max(0, nowMin*(SLOT_H/60)-150);
    setTimeout(()=>gridRef.current?.scrollTo({top,behavior:'smooth'}),150);
  },[view]); // eslint-disable-line

  // Fetch
  useEffect(()=>{
    setLoading(true);
    const s = view==='week' ? iso(weekDays[0]??monday(today)) : iso(new Date(MY,MM,1));
    const e = view==='week' ? iso(weekDays[6]??addDays(monday(today),6)) : iso(new Date(MY,MM+1,0));
    const k = `${s}_${e}`;
    if(cache[k]){ setProjects(cache[k]); setLoading(false); return; }
    projectsApi.getCalendar({start:s,end:e})
      .then(({data})=>{
        const list=(data?.data?.projects||[]).map(norm);
        setProjects(list);
        setCache(prev=>({...prev,[k]:list}));
      })
      .catch(()=>setProjects([]))
      .finally(()=>setLoading(false));
  },[view,current]); // eslint-disable-line

  // Dismiss
  useEffect(()=>{
    const fn=(e)=>{
      if(tooltipRef.current&&!tooltipRef.current.contains(e.target)) setTooltip(null);
      if(popoverRef.current&&!popoverRef.current.contains(e.target)) setPopover(null);
    };
    document.addEventListener('mousedown',fn);
    return ()=>document.removeEventListener('mousedown',fn);
  },[]);

  // Navigation
  const prev=()=>{
    if(view==='week') setCurrent(d=>addDays(d,-7));
    else setCurrent(new Date(MY,MM-1,1));
  };
  const next=()=>{
    if(view==='week') setCurrent(d=>addDays(d,7));
    else setCurrent(new Date(MY,MM+1,1));
  };
  const goToday=()=>{
    if(view==='week') setCurrent(monday(today));
    else setCurrent(new Date(today.getFullYear(),today.getMonth(),1));
  };
  const switchView=(v)=>{
    setView(v);
    setCurrent(v==='week' ? monday(today) : new Date(today.getFullYear(),today.getMonth(),1));
  };

  // Label période
  const label = useMemo(()=>{
    if(view==='week'&&weekDays.length){
      const s=weekDays[0],e=weekDays[6];
      if(s.getMonth()===e.getMonth())
        return `${s.getDate()}–${e.getDate()} ${e.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}`;
      return `${s.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${e.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`;
    }
    const l=new Date(MY,MM,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
    return l.charAt(0).toUpperCase()+l.slice(1);
  },[view,weekDays,MY,MM]);

  // Filtres
  const toggleF=(k)=>setFilters(s=>{const n=new Set(s);n.has(k)?n.delete(k):n.add(k);return n;});
  const filtered = filters.size===0 ? projects : projects.filter(p=>filters.has(p.status));

  // Projets par jour (semaine)
  const forDay = useCallback((isoDay)=>{
    return filtered.filter(p=>{
      const s=p.start_date??isoDay, e=p.end_date??s;
      return s<=isoDay&&e>=isoDay;
    });
  },[filtered]);

  // Vue mois
  const totalDays = daysInMonth(MY,MM);
  const padDays   = firstWd(MY,MM);
  const totalWeeks= Math.ceil((padDays+totalDays)/7);
  const {segsByCell, hiddenByCell} = useMemo(()=>buildMonthLayout(filtered,MY,MM),[filtered,MY,MM]);

  // Tooltip
  const openTT=(e,project)=>{
    e.stopPropagation();
    const r=e.currentTarget.getBoundingClientRect();
    const x=r.right+10, y=r.top;
    setTooltip({project,
      x: Math.min(x, window.innerWidth-300),
      y: Math.min(y, window.innerHeight-340),
    });
  };

  // Overlap detection pour vue semaine (colonne par projet)
  const timedLayout=(events)=>{
    // Trier par heure de début
    const sorted=[...events].sort((a,b)=>timeMin(a.heure_debut)-timeMin(b.heure_debut));
    const cols=[];
    for(const ev of sorted){
      const sm=timeMin(ev.heure_debut)??0;
      const em=timeMin(ev.heure_fin)??(sm+60);
      let placed=false;
      for(let ci=0;ci<cols.length;ci++){
        const last=cols[ci][cols[ci].length-1];
        const lm=timeMin(last.heure_fin)??(timeMin(last.heure_debut)||0)+60;
        if(sm>=lm){cols[ci].push(ev);placed=true;break;}
      }
      if(!placed) cols.push([ev]);
    }
    const total=cols.length;
    const result=[];
    cols.forEach((col,ci)=>col.forEach(ev=>{result.push({ev,ci,total});}));
    return result;
  };

  return (
    <div className={styles.page}>

      {/* ══ HEADER GOOGLE STYLE ══ */}
      <div className={styles.header}>
        <div className={styles.hLeft}>
          <div className={styles.logoMark}>
            <span style={{color:'#4285f4'}}>P</span><span style={{color:'#ea4335'}}>l</span><span style={{color:'#fbbc05'}}>a</span><span style={{color:'#34a853'}}>n</span>
          </div>
          <button className={styles.todayBtn} onClick={goToday}>Aujourd'hui</button>
          <div className={styles.navGroup}>
            <button className={styles.navBtn} onClick={prev}>&#8249;</button>
            <button className={styles.navBtn} onClick={next}>&#8250;</button>
          </div>
          <span className={styles.periodLabel}>{label}</span>
        </div>
        <div className={styles.hRight}>
          <div className={styles.filterRow}>
            {Object.entries(STATUS_CONFIG).map(([k,cfg])=>(
              <button key={k}
                className={`${styles.fChip} ${filters.has(k)?styles.fActive:''}`}
                style={{'--fc':cfg.dot}}
                onClick={()=>toggleF(k)}
              >
                <span className={styles.fDot} style={{background:cfg.dot}}/>
                {k}
              </button>
            ))}
            {filters.size>0&&<button className={styles.fClear} onClick={()=>setFilters(new Set())}>✕</button>}
          </div>
          <div className={styles.viewSel}>
            {[['week','Semaine'],['month','Mois']].map(([v,l])=>(
              <button key={v} className={`${styles.vBtn} ${view===v?styles.vActive:''}`} onClick={()=>switchView(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loader}><div className={styles.spin}/></div>
      ) : view==='week' ? (

        /* ══════════════════════════════════════════
           VUE SEMAINE — Google Calendar exact
           ══════════════════════════════════════════ */
        <div className={styles.weekWrap}>

          {/* Ligne des jours */}
          <div className={styles.wkHeader}>
            <div className={styles.gutterTop}/>
            {weekDays.map((d,i)=>{
              const isoDay=iso(d);
              const isT=isoDay===iso(today);
              const allDay=forDay(isoDay).filter(p=>!p.heure_debut||!p.heure_fin);
              return (
                <div key={i} className={styles.wkDayHead}>
                  <div className={styles.dayHeadLabel}>
                    <span className={styles.dayAbbr}>{DAY_SHORT[d.getDay()]}</span>
                    <span className={`${styles.dayCircle} ${isT?styles.dayCircleToday:''}`}>{d.getDate()}</span>
                  </div>
                  {/* All-day events */}
                  {allDay.length>0&&(
                    <div className={styles.allDayStrip}>
                      {allDay.map(p=>(
                        <div key={p.id}
                          className={styles.allDayPill}
                          style={{background:hexAlpha(p._color,.15),borderLeft:`3px solid ${p._color}`,color:p._color}}
                          onClick={e=>openTT(e,p)}
                        >{p.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Corps grille horaire */}
          <div className={styles.wkGrid} ref={gridRef}>

            {/* Colonne heures */}
            <div className={styles.hoursCol}>
              {HOURS.map(h=>(
                <div key={h} className={styles.hourSlot} style={{height:SLOT_H}}>
                  {h>0&&<span className={styles.hourTxt}>{h}:00</span>}
                </div>
              ))}
            </div>

            {/* Colonnes jours */}
            {weekDays.map((d,di)=>{
              const isoDay=iso(d);
              const isT=isoDay===iso(today);
              const timed=forDay(isoDay).filter(p=>p.heure_debut&&p.heure_fin);
              const layout=timedLayout(timed);

              return (
                <div key={di} className={`${styles.dayCol} ${isT?styles.dayColToday:''}`}>
                  {/* Lignes heures */}
                  {HOURS.map(h=>(
                    <div key={h} className={styles.hLine} style={{top:h*SLOT_H}}/>
                  ))}
                  {/* Demi-heures */}
                  {HOURS.map(h=>(
                    <div key={`hh${h}`} className={styles.hhLine} style={{top:h*SLOT_H+SLOT_H/2}}/>
                  ))}

                  {/* Ligne "maintenant" */}
                  {isT&&(
                    <div className={styles.nowBar} style={{top:nowMin*(SLOT_H/60)}}>
                      <div className={styles.nowDot}/>
                    </div>
                  )}

                  {/* Événements positionnés */}
                  {layout.map(({ev:p,ci,total})=>{
                    const sm=timeMin(p.heure_debut)??0;
                    const em=timeMin(p.heure_fin)??(sm+60);
                    const top=sm*(SLOT_H/60);
                    const h=Math.max((em-sm)*(SLOT_H/60),24);
                    const w=`calc((100% - 2px) / ${total})`;
                    const left=`calc(${ci} * (100% - 2px) / ${total} + 1px)`;
                    return (
                      <div key={p.id}
                        className={styles.timedEv}
                        style={{
                          top,height:h,left,width:w,
                          background:hexAlpha(p._color,.18),
                          borderLeft:`3px solid ${p._color}`,
                          color:p._color,
                        }}
                        onClick={e=>openTT(e,p)}
                      >
                        <div className={styles.evTitle}>{p.name}</div>
                        {h>32&&<div className={styles.evSub}>{p.heure_debut?.slice(0,5)} – {p.heure_fin?.slice(0,5)}</div>}
                        {h>48&&p.ville&&<div className={styles.evSub}>📍 {p.ville}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

      ) : (

        /* ══════════════════════════════════════════
           VUE MOIS — Google Calendar exact
           ══════════════════════════════════════════ */
        <div className={styles.monthWrap}>
          {/* Jours semaine header */}
          <div className={styles.mHeader}>
            {MONTH_DAYS.map(d=><div key={d} className={styles.mDayHd}>{d}</div>)}
          </div>

          {/* Grille semaines */}
          <div className={styles.mGrid}>
            {Array.from({length:totalWeeks}).map((_,wr)=>(
              <div key={wr} className={styles.mWeekRow}>
                {Array.from({length:7}).map((_,col)=>{
                  const ci = wr*7+col;
                  const day = ci - padDays + 1;
                  const isCurrentMonth = day >= 1 && day <= totalDays;
                  const isT = isCurrentMonth && day===today.getDate()&&MM===today.getMonth()&&MY===today.getFullYear();
                  const hidden = hiddenByCell[`${wr}-${col}`]||[];

                  // Barres qui DÉMARRENT dans cette cellule
                  const startingSegs = (segsByCell[`${wr}-${col}`]||[]).filter(s=>s.lane<MAX_VIS);

                  // Construire tableau de slots lanes 0..MAX_VIS-1
                  // Pour savoir si une lane est occupée (par un seg qui démarre avant)
                  // on cherche aussi les segs venant de la gauche (col > s.col)
                  const occupiedLanes = new Set(startingSegs.map(s=>s.lane));

                  return (
                    <div key={col} className={`${styles.mCell} ${!isCurrentMonth?styles.mCellOtherMonth:''}`}>
                      {/* Numéro du jour */}
                      <div className={styles.mCellTop}>
                        <span className={`${styles.mNum} ${isT?styles.mNumToday:''} ${!isCurrentMonth?styles.mNumOther:''}`}>
                          {isCurrentMonth ? day : ''}
                        </span>
                      </div>

                      {/* Zone barres : MAX_VIS slots */}
                      <div className={styles.mBarsArea}>
                        {Array.from({length:MAX_VIS}).map((_,lane)=>{
                          // Chercher si un seg de cette lane démarre dans cette col ou vient de la gauche
                          const seg = startingSegs.find(s=>s.lane===lane);
                          if (seg) {
                            // Calculer la largeur : combien de colonnes restantes dans la semaine
                            const spanInRow = Math.min(seg.span, 7-col);
                            const c = seg.p._color;
                            const isStart = seg.isS;
                            const isEnd   = seg.col + seg.span - 1 === col + spanInRow - 1 ? seg.isE : false;
                            return (
                              <div key={lane} className={styles.mBarSlot}>
                                <div
                                  className={styles.mBar}
                                  style={{
                                    width: `calc(${spanInRow * 100}% + ${spanInRow-1}px)`,
                                    background: hexAlpha(c, .15),
                                    borderLeft: isStart ? `3px solid ${c}` : 'none',
                                    borderRight: isEnd ? 'none' : 'none',
                                    color: c,
                                    borderRadius: isStart && isEnd ? 4 : isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : 0,
                                    paddingLeft: isStart ? 4 : 6,
                                    marginLeft: isStart ? 0 : -1,
                                    marginRight: isEnd || col+spanInRow-1===6 ? 0 : -1,
                                  }}
                                  onClick={e=>openTT(e,seg.p)}
                                >
                                  {isStart && <span className={styles.mBarTxt}>{seg.p.name}</span>}
                                </div>
                              </div>
                            );
                          }
                          // Lane vide — placeholder pour maintenir la hauteur
                          return <div key={lane} className={styles.mBarSlot}/>;
                        })}

                        {/* "+N autres" */}
                        {hidden.length>0&&(
                          <button className={styles.mMore}
                            onClick={e=>{e.stopPropagation();setPopover({projects:hidden,x:e.clientX,y:e.clientY});}}>
                            +{hidden.length} autre{hidden.length>1?'s':''}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ POPOVER ══ */}
      {popover&&(
        <div ref={popoverRef} className={styles.popover}
          style={{top:Math.min(popover.y+4,window.innerHeight-260),left:Math.min(popover.x+4,window.innerWidth-250)}}>
          <div className={styles.popHd}>
            <span>Projets supplémentaires</span>
            <button onClick={()=>setPopover(null)}>✕</button>
          </div>
          {popover.projects.map(p=>(
            <div key={p.id} className={styles.popItem}
              style={{borderLeft:`3px solid ${p._color}`}}
              onClick={e=>{openTT(e,p);setPopover(null);}}>
              <div className={styles.popName}>{p.name}</div>
              <div className={styles.popSub}>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</div>
            </div>
          ))}
        </div>
      )}

      {/* ══ TOOLTIP ══ */}
      {tooltip&&(
        <div ref={tooltipRef} className={styles.tooltip}
          style={{top:tooltip.y,left:tooltip.x}}>
          <div className={styles.ttTop} style={{borderTop:`4px solid ${tooltip.project._color}`}}>
            <p className={styles.ttName}>{tooltip.project.name}</p>
            <button className={styles.ttX} onClick={()=>setTooltip(null)}>✕</button>
          </div>
          <div className={styles.ttBody}>
            <StatusBadge status={tooltip.project.status}/>
            <div className={styles.ttRows}>
              {(tooltip.project.start_date||tooltip.project.end_date)&&(
                <div className={styles.ttRow}>
                  <span className={styles.ttIco}>📅</span>
                  <span>{fmtDate(tooltip.project.start_date)} → {fmtDate(tooltip.project.end_date)}</span>
                </div>
              )}
              {fmtTimeRange(tooltip.project.heure_debut,tooltip.project.heure_fin)&&(
                <div className={styles.ttRow}>
                  <span className={styles.ttIco}>🕐</span>
                  <span>{fmtTimeRange(tooltip.project.heure_debut,tooltip.project.heure_fin)}</span>
                </div>
              )}
              {tooltip.project.ville&&(
                <div className={styles.ttRow}>
                  <span className={styles.ttIco}>📍</span>
                  <span>{tooltip.project.ville}</span>
                </div>
              )}
              {tooltip.project.type&&(
                <div className={styles.ttRow}>
                  <span className={styles.ttIco}>🏷</span>
                  <span>{tooltip.project.type}</span>
                </div>
              )}
              {tooltip.project.localisation&&(
                <div className={styles.ttRow}>
                  <span className={styles.ttIco}>🗺</span>
                  <span style={{wordBreak:'break-word'}}>{tooltip.project.localisation}</span>
                </div>
              )}
            </div>
            {tooltip.project.assigned_users?.length>0&&(
              <div className={styles.ttTeam}>
                {tooltip.project.assigned_users.map(u=>(
                  <span key={u.id} className={styles.ttAvatar}
                    style={{background:u.color||'#6366f1'}} title={u.name}>
                    {(u.avatar||u.name?.slice(0,2)||'?').toUpperCase()}
                  </span>
                ))}
              </div>
            )}
            {tooltip.project.description&&(
              <p className={styles.ttDesc}>{tooltip.project.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
