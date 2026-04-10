import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { projectsApi } from '../api/projects.api';
import { STATUS_CONFIG } from '../utils/constants';
import { fmtDate, fmtTimeRange } from '../utils/helpers';
import { StatusBadge } from '../components/common/Badge';
import styles from './CalendarPage.module.css';

const HOURS      = Array.from({ length: 24 }, (_, i) => i);
const SLOT_H     = 64;
const DAY_SHORT  = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const MONTH_DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const today      = new Date();

const EVENT_COLORS = ['#1a73e8','#0b8043','#d93025','#f6bf26','#8430ce','#e67c73','#33b679','#039be5','#616161','#f4511e','#7986cb','#0097a7'];
function colorFor(id) { const h=String(id).split('').reduce((a,c)=>a+c.charCodeAt(0),0); return EVENT_COLORS[h%EVENT_COLORS.length]; }
function hexAlpha(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return `rgba(${r},${g},${b},${a})`;}

function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function monday(date){const d=new Date(date),dd=d.getDay();d.setDate(d.getDate()+(dd===0?-6:1-dd));return d;}
function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function parseDate(s){if(!s)return null;const[y,m,d]=s.split('T')[0].split('-').map(Number);return new Date(y,m-1,d);}
function timeMin(t){if(!t)return null;const[h,m]=t.slice(0,5).split(':').map(Number);return h*60+m;}
function daysInMonth(y,m){return new Date(y,m+1,0).getDate();}
function firstWd(y,m){return(new Date(y,m,1).getDay()+6)%7;}

function norm(p){return{...p,start_date:p.start_date?p.start_date.split('T')[0]:null,end_date:p.end_date?p.end_date.split('T')[0]:null,_color:p._color??colorFor(p.id)};}

const MAX_VIS = 2;

function buildMonthLayout(projects, year, month) {
  const first=new Date(year,month,1), last=new Date(year,month+1,0), pad=firstWd(year,month);
  const segs=[];
  for(const p of projects){
    const sd=p.start_date??iso(first),ed=p.end_date??sd;
    const ps=parseDate(sd),pe=parseDate(ed);
    if(!ps||!pe)continue;
    const vs=ps<first?first:ps,ve=pe>last?last:pe;
    if(vs>ve)continue;
    let cur=new Date(vs);
    while(cur<=ve){
      const ci=(cur.getDate()-1+pad),wr=Math.floor(ci/7),col=ci%7;
      const eow=new Date(cur);eow.setDate(cur.getDate()+(6-col));
      const se=ve<eow?ve:eow,span=Math.round((se-cur)/86400000)+1;
      segs.push({p,wr,col,span,isS:iso(cur)===iso(vs),isE:iso(se)===iso(ve),lane:-1});
      cur=new Date(se);cur.setDate(cur.getDate()+1);
    }
  }
  segs.sort((a,b)=>a.wr!==b.wr?a.wr-b.wr:a.col!==b.col?a.col-b.col:b.span-a.span);
  const weekOcc={};
  for(const s of segs){
    if(!weekOcc[s.wr])weekOcc[s.wr]=[];
    const occ=weekOcc[s.wr],ce=s.col+s.span-1;
    let lane=0;
    while(occ.some(o=>o.lane===lane&&o.cs<=ce&&o.ce>=s.col))lane++;
    occ.push({cs:s.col,ce,lane});s.lane=lane;
  }
  const segsByCell={},hiddenByCell={};
  for(const s of segs){
    for(let c=s.col;c<s.col+s.span;c++){
      const k=`${s.wr}-${c}`;
      if(s.lane<MAX_VIS){if(!segsByCell[k])segsByCell[k]={};segsByCell[k][s.lane]=s;}
      else{if(!hiddenByCell[k])hiddenByCell[k]=[];if(!hiddenByCell[k].find(x=>x.id===s.p.id))hiddenByCell[k].push(s.p);}
    }
  }
  return{segsByCell,hiddenByCell};
}

export default function CalendarPage({ currentUser }) {
  const isAdmin = currentUser?.role === 'admin';

  const [view,    setView]    = useState('week');
  const [current, setCurrent] = useState(()=>monday(today));
  const [projects,setProjects]= useState([]);
  const [cache,   setCache]   = useState({});
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState(null);
  const [popover, setPopover] = useState(null);
  const [filters, setFilters] = useState(new Set());
  // Admin : toggle "Mes projets" optionnel. Non-admin : forcé.
  const [myOnly,  setMyOnly]  = useState(!isAdmin);
  const [nowMin,  setNowMin]  = useState(0);

  const gridRef    = useRef(null);
  const tooltipRef = useRef(null);
  const popoverRef = useRef(null);

  const MY=current.getFullYear(), MM=current.getMonth();
  const weekDays=useMemo(()=>view==='week'?Array.from({length:7},(_,i)=>addDays(monday(current),i)):[],[view,current]);

  useEffect(()=>{const upd=()=>{const n=new Date();setNowMin(n.getHours()*60+n.getMinutes())};upd();const id=setInterval(upd,30000);return()=>clearInterval(id);},[]);
  useEffect(()=>{if(view!=='week'||!gridRef.current)return;const top=Math.max(0,nowMin*(SLOT_H/60)-150);setTimeout(()=>gridRef.current?.scrollTo({top,behavior:'smooth'}),150);},[view]); // eslint-disable-line
  useEffect(()=>{
    setLoading(true);
    const s=view==='week'?iso(weekDays[0]??monday(today)):iso(new Date(MY,MM,1));
    const e=view==='week'?iso(weekDays[6]??addDays(monday(today),6)):iso(new Date(MY,MM+1,0));
    const k=`${s}_${e}`;
    if(cache[k]){setProjects(cache[k]);setLoading(false);return;}
    projectsApi.getCalendar({start:s,end:e}).then(({data})=>{const list=(data?.data?.projects||[]).map(norm);setProjects(list);setCache(prev=>({...prev,[k]:list}));}).catch(()=>setProjects([])).finally(()=>setLoading(false));
  },[view,current]); // eslint-disable-line
  useEffect(()=>{const fn=(e)=>{if(tooltipRef.current&&!tooltipRef.current.contains(e.target))setTooltip(null);if(popoverRef.current&&!popoverRef.current.contains(e.target))setPopover(null);};document.addEventListener('mousedown',fn);return()=>document.removeEventListener('mousedown',fn);},[]);

  const prev=()=>{if(view==='week')setCurrent(d=>addDays(d,-7));else setCurrent(new Date(MY,MM-1,1));};
  const next=()=>{if(view==='week')setCurrent(d=>addDays(d,7));else setCurrent(new Date(MY,MM+1,1));};
  const goToday=()=>{if(view==='week')setCurrent(monday(today));else setCurrent(new Date(today.getFullYear(),today.getMonth(),1));};
  const switchView=(v)=>{setView(v);setCurrent(v==='week'?monday(today):new Date(today.getFullYear(),today.getMonth(),1));};

  const label=useMemo(()=>{
    if(view==='week'&&weekDays.length){const s=weekDays[0],e=weekDays[6];if(s.getMonth()===e.getMonth())return`${s.getDate()}–${e.getDate()} ${e.toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}`;return`${s.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${e.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`;}
    const l=new Date(MY,MM,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});return l.charAt(0).toUpperCase()+l.slice(1);
  },[view,weekDays,MY,MM]);

  const toggleF=(k)=>setFilters(s=>{const n=new Set(s);n.has(k)?n.delete(k):n.add(k);return n;});

  // Filtrage selon rôle + statut
  const filtered=useMemo(()=>{
    let list=filters.size===0?projects:projects.filter(p=>filters.has(p.status));
    const applyMyFilter=!isAdmin||myOnly;
    if(applyMyFilter&&currentUser)list=list.filter(p=>p.created_by?.id===currentUser.id||(p.assigned_users||[]).some(u=>u.id===currentUser.id));
    return list;
  },[projects,filters,myOnly,isAdmin,currentUser]);

  const forDay=useCallback((isoDay)=>filtered.filter(p=>{const s=p.start_date??isoDay,e=p.end_date??s;return s<=isoDay&&e>=isoDay;}),[filtered]);

  const totalDays=daysInMonth(MY,MM),padDays=firstWd(MY,MM),totalWeeks=Math.ceil((padDays+totalDays)/7);
  const{segsByCell,hiddenByCell}=useMemo(()=>buildMonthLayout(filtered,MY,MM),[filtered,MY,MM]);

  const openTT=(e,project)=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setTooltip({project,x:Math.min(r.right+10,window.innerWidth-300),y:Math.min(r.top,window.innerHeight-340)});};

  const timedLayout=(events)=>{
    const sorted=[...events].sort((a,b)=>timeMin(a.heure_debut)-timeMin(b.heure_debut));
    const cols=[];
    for(const ev of sorted){const sm=timeMin(ev.heure_debut)??0,em=timeMin(ev.heure_fin)??(sm+60);let placed=false;for(let ci=0;ci<cols.length;ci++){const last=cols[ci][cols[ci].length-1],lm=timeMin(last.heure_fin)??(timeMin(last.heure_debut)||0)+60;if(sm>=lm){cols[ci].push(ev);placed=true;break;}}if(!placed)cols.push([ev]);}
    const total=cols.length,result=[];cols.forEach((col,ci)=>col.forEach(ev=>result.push({ev,ci,total})));return result;
  };

  return (
    <div className={styles.page}>
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
          {/* Toggle "Mes projets" — admin seulement */}
          {isAdmin && (
            <button className={`${styles.myOnlyBtn} ${myOnly?styles.myOnlyActive:''}`} onClick={()=>setMyOnly(v=>!v)}>
              <span>👤</span> Mes projets
            </button>
          )}
          {/* Label fixe — non-admin */}
          {!isAdmin && <span className={styles.myOnlyLabel}><span>👤</span> Mon planning</span>}
          <div className={styles.filterRow}>
            {Object.entries(STATUS_CONFIG).map(([k,cfg])=>(
              <button key={k} className={`${styles.fChip} ${filters.has(k)?styles.fActive:''}`} style={{'--fc':cfg.dot}} onClick={()=>toggleF(k)}>
                <span className={styles.fDot} style={{background:cfg.dot}}/>{k}
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

      {loading?<div className={styles.loader}><div className={styles.spin}/></div>:view==='week'?(
        <div className={styles.weekWrap}>
          <div className={styles.wkHeader}>
            <div className={styles.gutterTop}/>
            {weekDays.map((d,i)=>{
              const isoDay=iso(d),isT=isoDay===iso(today),allDay=forDay(isoDay).filter(p=>!p.heure_debut||!p.heure_fin);
              return(
                <div key={i} className={styles.wkDayHead}>
                  <div className={styles.dayHeadLabel}>
                    <span className={styles.dayAbbr}>{DAY_SHORT[d.getDay()]}</span>
                    <span className={`${styles.dayCircle} ${isT?styles.dayCircleToday:''}`}>{d.getDate()}</span>
                  </div>
                  {allDay.length>0&&<div className={styles.allDayStrip}>{allDay.map(p=><div key={p.id} className={styles.allDayPill} style={{background:hexAlpha(p._color,.15),borderLeft:`3px solid ${p._color}`,color:p._color}} onClick={e=>openTT(e,p)}>{p.name}</div>)}</div>}
                </div>
              );
            })}
          </div>
          <div className={styles.wkGrid} ref={gridRef}>
            <div className={styles.hoursCol}>{HOURS.map(h=><div key={h} className={styles.hourSlot} style={{height:SLOT_H}}>{h>0&&<span className={styles.hourTxt}>{h}:00</span>}</div>)}</div>
            {weekDays.map((d,di)=>{
              const isoDay=iso(d),isT=isoDay===iso(today),timed=forDay(isoDay).filter(p=>p.heure_debut&&p.heure_fin),layout=timedLayout(timed);
              return(
                <div key={di} className={`${styles.dayCol} ${isT?styles.dayColToday:''}`}>
                  {HOURS.map(h=><div key={h} className={styles.hLine} style={{top:h*SLOT_H}}/>)}
                  {HOURS.map(h=><div key={`hh${h}`} className={styles.hhLine} style={{top:h*SLOT_H+SLOT_H/2}}/>)}
                  {isT&&<div className={styles.nowBar} style={{top:nowMin*(SLOT_H/60)}}><div className={styles.nowDot}/></div>}
                  {layout.map(({ev:p,ci,total})=>{
                    const sm=timeMin(p.heure_debut)??0,em=timeMin(p.heure_fin)??(sm+60),top=sm*(SLOT_H/60),h=Math.max((em-sm)*(SLOT_H/60),24);
                    return<div key={p.id} className={styles.timedEv} style={{top,height:h,left:`calc(${ci}*(100%-2px)/${total}+1px)`,width:`calc((100%-2px)/${total})`,background:hexAlpha(p._color,.18),borderLeft:`3px solid ${p._color}`,color:p._color}} onClick={e=>openTT(e,p)}>
                      <div className={styles.evTitle}>{p.name}</div>
                      {h>32&&<div className={styles.evSub}>{p.heure_debut?.slice(0,5)} – {p.heure_fin?.slice(0,5)}</div>}
                      {h>48&&p.ville&&<div className={styles.evSub}>📍 {p.ville}</div>}
                    </div>;
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ):(
        <div className={styles.monthWrap}>
          <div className={styles.mHeader}>{MONTH_DAYS.map(d=><div key={d} className={styles.mDayHd}>{d}</div>)}</div>
          <div className={styles.mGrid}>
            {Array.from({length:totalWeeks}).map((_,wr)=>(
              <div key={wr} className={styles.mWeekRow}>
                {Array.from({length:7}).map((_,col)=>{
                  const ci=wr*7+col,day=ci-padDays+1,isCurrentMonth=day>=1&&day<=totalDays;
                  const isT=isCurrentMonth&&day===today.getDate()&&MM===today.getMonth()&&MY===today.getFullYear();
                  const cellKey=`${wr}-${col}`,hidden=hiddenByCell[cellKey]||[],laneMap=segsByCell[cellKey]||{};
                  return(
                    <div key={col} className={`${styles.mCell} ${!isCurrentMonth?styles.mCellOtherMonth:''}`}>
                      <div className={styles.mCellTop}>
                        <span className={`${styles.mNum} ${isT?styles.mNumToday:''} ${!isCurrentMonth?styles.mNumOther:''}`}>{isCurrentMonth?day:''}</span>
                      </div>
                      <div className={styles.mBarsArea}>
                        {Array.from({length:MAX_VIS}).map((_,lane)=>{
                          const seg=laneMap[lane];
                          if(!seg)return<div key={lane} className={styles.mBarSlot}/>;
                          const isStart=seg.isS&&seg.col===col,spanInRow=Math.min(seg.col+seg.span-col,7-col),isEnd=seg.isE&&(seg.col+seg.span-1)===col+spanInRow-1,c=seg.p._color;
                          return<div key={lane} className={styles.mBarSlot}>
                            <div className={styles.mBar} style={{width:`calc(${spanInRow*100}% + ${(spanInRow-1)*1}px)`,background:hexAlpha(c,.15),borderLeft:isStart?`3px solid ${c}`:'none',color:c,borderRadius:isStart&&isEnd?4:isStart?'4px 0 0 4px':isEnd?'0 4px 4px 0':0,paddingLeft:isStart?5:4,marginLeft:isStart?2:0,marginRight:isEnd?2:0}} onClick={e=>openTT(e,seg.p)}>
                              {isStart&&<span className={styles.mBarTxt}>{seg.p.name}</span>}
                            </div>
                          </div>;
                        })}
                        {hidden.length>0&&<button className={styles.mMore} onClick={e=>{e.stopPropagation();setPopover({projects:hidden,x:e.clientX,y:e.clientY});}}>+{hidden.length} autre{hidden.length>1?'s':''}</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {popover&&<div ref={popoverRef} className={styles.popover} style={{top:Math.min(popover.y+4,window.innerHeight-260),left:Math.min(popover.x+4,window.innerWidth-250)}}>
        <div className={styles.popHd}><span>Projets supplémentaires</span><button onClick={()=>setPopover(null)}>✕</button></div>
        {popover.projects.map(p=><div key={p.id} className={styles.popItem} style={{borderLeft:`3px solid ${p._color}`}} onClick={e=>{openTT(e,p);setPopover(null);}}><div className={styles.popName}>{p.name}</div><div className={styles.popSub}>{fmtDate(p.start_date)} → {fmtDate(p.end_date)}</div></div>)}
      </div>}

      {tooltip&&<div ref={tooltipRef} className={styles.tooltip} style={{top:tooltip.y,left:tooltip.x}}>
        <div className={styles.ttTop} style={{borderTop:`4px solid ${tooltip.project._color}`}}>
          <p className={styles.ttName}>{tooltip.project.name}</p>
          <button className={styles.ttX} onClick={()=>setTooltip(null)}>✕</button>
        </div>
        <div className={styles.ttBody}>
          <StatusBadge status={tooltip.project.status}/>
          <div className={styles.ttRows}>
            {(tooltip.project.start_date||tooltip.project.end_date)&&<div className={styles.ttRow}><span className={styles.ttIco}>📅</span><span>{fmtDate(tooltip.project.start_date)} → {fmtDate(tooltip.project.end_date)}</span></div>}
            {fmtTimeRange(tooltip.project.heure_debut,tooltip.project.heure_fin)&&<div className={styles.ttRow}><span className={styles.ttIco}>🕐</span><span>{fmtTimeRange(tooltip.project.heure_debut,tooltip.project.heure_fin)}</span></div>}
            {tooltip.project.ville&&<div className={styles.ttRow}><span className={styles.ttIco}>📍</span><span>{tooltip.project.ville}</span></div>}
            {tooltip.project.type&&<div className={styles.ttRow}><span className={styles.ttIco}>🏷</span><span>{tooltip.project.type}</span></div>}
            {tooltip.project.localisation&&<div className={styles.ttRow}><span className={styles.ttIco}>🗺</span><span style={{wordBreak:'break-word'}}>{tooltip.project.localisation}</span></div>}
          </div>
          {tooltip.project.assigned_users?.length>0&&<div className={styles.ttTeam}>{tooltip.project.assigned_users.map(u=><span key={u.id} className={styles.ttAvatar} style={{background:u.color||'#6366f1'}} title={u.name}>{(u.avatar||u.name?.slice(0,2)||'?').toUpperCase()}</span>)}</div>}
          {tooltip.project.description&&<p className={styles.ttDesc}>{tooltip.project.description}</p>}
        </div>
      </div>}
    </div>
  );
}
