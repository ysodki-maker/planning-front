import { STATUS_CONFIG, TYPE_CONFIG } from '../../utils/constants';
import styles from './Badge.module.css';

export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  return (
    <span
      className={styles.badge}
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span className={styles.dot} style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

export function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type];
  if (!cfg) return null;
  return (
    <span
      className={styles.badge}
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}
