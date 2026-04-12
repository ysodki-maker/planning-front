import { useState } from 'react';
import { StatusBadge, TypeBadge } from '../common/Badge';
import { AvatarGroup } from '../common/Avatar';
import Icon from '../common/Icon';
import { fmtDate, fmtTimeRange, daysLeft } from '../../utils/helpers';
import { STATUS_CONFIG } from '../../utils/constants';
import styles from './ProjectsTable.module.css';

function DaysChip({ endDate, status }) {
  if (status === 'Terminé') return null;
  const d = daysLeft(endDate);
  if (d < 0)  return <span className={`${styles.urgency} ${styles.urgencyRed}`}>En retard</span>;
  if (d <= 7) return <span className={`${styles.urgency} ${styles.urgencyOrange}`}>{d}j</span>;
  return null;
}

function ProjectCard({ p, onEdit, onDelete, onConfirm, onTerminate, isAdmin, currentUserId }) {
  const isDemande  = p.status === "Demande de planification";
  const isEnCours  = p.status === "En cours";
  const cfg        = STATUS_CONFIG[p.status] || {};
  const timeRange  = fmtTimeRange(p.heure_debut, p.heure_fin);
  const canEdit    = isAdmin || p.created_by?.id === currentUserId;
  const canDelete  = isAdmin;

  return (
    <div className={styles.card} style={{ '--status-color': cfg.dot }}>
      <div className={styles.cardStatusBar} style={{ background: cfg.dot }}/>

      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleRow}>
            <h3 className={styles.cardName}>{p.name}</h3>
            <div className={styles.cardActions}>
              {/* Confirmer — Demande de planification, admin uniquement */}
              {isAdmin && isDemande && onConfirm && (
                <button className={`${styles.cardBtn} ${styles.cardBtnConfirm}`}
                  onClick={() => onConfirm(p)} title="Confirmer — passer En cours">
                  <Icon name="check" size={13} />
                </button>
              )}
              {/* Terminer — En cours, admin uniquement */}
              {isAdmin && isEnCours && onTerminate && (
                <button className={`${styles.cardBtn} ${styles.cardBtnTerminate}`}
                  onClick={() => onTerminate(p)} title="Marquer comme Terminé">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1.5,7 5,10.5 11.5,2.5"/>
                  </svg>
                </button>
              )}
              {/* Modifier */}
              {canEdit && (
                <button className={styles.cardBtn} onClick={() => onEdit(p)} title="Modifier">
                  <Icon name="edit" size={13} />
                </button>
              )}
              {/* Supprimer */}
              {canDelete && (
                <button className={`${styles.cardBtn} ${styles.cardBtnDanger}`}
                  onClick={() => onDelete(p)} title="Supprimer">
                  <Icon name="trash" size={13} />
                </button>
              )}
            </div>
          </div>

          <div className={styles.cardBadges}>
            <StatusBadge status={p.status} />
            <TypeBadge type={p.type} />
            <DaysChip endDate={p.end_date} status={p.status} />
          </div>
        </div>

        {p.description && (
          <p className={styles.cardDesc}>{p.description}</p>
        )}

        <div className={styles.cardMeta}>
          {p.ville && (
            <div className={styles.metaItem}>
              <Icon name="mapPin" size={12} color="var(--ink-muted)" />
              <span>{p.ville}</span>
            </div>
          )}
          {(p.start_date || p.end_date) && (
            <div className={styles.metaItem}>
              <Icon name="calendar" size={12} color="var(--ink-muted)" />
              <span>{fmtDate(p.start_date) || '—'}{' → '}{fmtDate(p.end_date) || '—'}</span>
            </div>
          )}
          {timeRange && (
            <div className={styles.metaItem}>
              <Icon name="clock" size={12} color="var(--ink-muted)" />
              <span>{timeRange}</span>
            </div>
          )}
          {p.localisation && (
            <div className={styles.metaItem}>
              <Icon name="eye" size={12} color="var(--ink-muted)" />
              <span className={styles.metaLoc}>{p.localisation}</span>
            </div>
          )}
        </div>

        {p.assigned_users?.length > 0 && (
          <div className={styles.cardFooter}>
            <AvatarGroup users={p.assigned_users} max={5} size={26} />
            <span className={styles.teamCount}>
              {p.assigned_users.length} membre{p.assigned_users.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProjectsTable({
  projects, onEdit, onDelete, onConfirm, onTerminate,
  isAdmin, loading, viewMode = 'grid', currentUserId,
}) {
  if (loading) return (
    <div className={styles.empty}>
      <div className={styles.spinner} />
      <p>Chargement…</p>
    </div>
  );

  if (!projects.length) return (
    <div className={styles.empty}>
      <Icon name="folder" size={40} color="var(--ink-ghost)" />
      <p>Aucun projet trouvé.</p>
    </div>
  );

  if (viewMode === 'list') {
    return (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {['Projet','Ville','Type','Statut','Période','Horaires','Équipe',''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map(p => {
              const isDemande = p.status === "Demande de planification";
              const isEnCours = p.status === "En cours";
              const timeRange = fmtTimeRange(p.heure_debut, p.heure_fin);
              const canEdit   = isAdmin || p.created_by?.id === currentUserId;
              return (
                <tr key={p.id} className={styles.tableRow}>
                  <td>
                    <div className={styles.tableName}>{p.name}</div>
                    {p.description && <div className={styles.tableDesc}>{p.description}</div>}
                  </td>
                  <td>
                    <div className={styles.metaItem}>
                      <Icon name="mapPin" size={11} color="var(--ink-muted)"/>
                      {p.ville||'—'}
                    </div>
                  </td>
                  <td><TypeBadge type={p.type} /></td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <div className={styles.period}>
                      <span>{fmtDate(p.start_date)||'—'}</span>
                      <span className={styles.arrow}>→</span>
                      <span>{fmtDate(p.end_date)||'—'}</span>
                      <DaysChip endDate={p.end_date} status={p.status}/>
                    </div>
                  </td>
                  <td>
                    {timeRange
                      ? <span className={styles.timeTag}>{timeRange}</span>
                      : <span className={styles.muted}>—</span>}
                  </td>
                  <td><AvatarGroup users={p.assigned_users||[]} max={3} size={24}/></td>
                  <td>
                    <div className={styles.tableActions}>
                      {/* Confirmer */}
                      {isAdmin && isDemande && onConfirm && (
                        <button className={`${styles.actionBtn} ${styles.actionBtnConfirm}`}
                          onClick={() => onConfirm(p)} title="Confirmer">
                          <Icon name="check" size={13}/>
                        </button>
                      )}
                      {/* Terminer */}
                      {isAdmin && isEnCours && onTerminate && (
                        <button className={`${styles.actionBtn} ${styles.actionBtnTerminate}`}
                          onClick={() => onTerminate(p)} title="Marquer comme Terminé">
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1.5,7 5,10.5 11.5,2.5"/>
                          </svg>
                        </button>
                      )}
                      {/* Modifier */}
                      {canEdit && (
                        <button className={styles.actionBtn} onClick={() => onEdit(p)} title="Modifier">
                          <Icon name="edit" size={13}/>
                        </button>
                      )}
                      {/* Supprimer */}
                      {isAdmin && (
                        <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          onClick={() => onDelete(p)} title="Supprimer">
                          <Icon name="trash" size={13}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {projects.map(p => (
        <ProjectCard key={p.id} p={p}
          onEdit={onEdit} onDelete={onDelete}
          onConfirm={onConfirm} onTerminate={onTerminate}
          isAdmin={isAdmin} currentUserId={currentUserId} />
      ))}
    </div>
  );
}
