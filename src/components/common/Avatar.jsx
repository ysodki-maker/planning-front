import { initials } from '../../utils/helpers';
import styles from './Avatar.module.css';

const COLORS = [
  '#C8341B','#1B5C9E','#1A7A4A','#D4680A',
  '#7B3FA0','#1A6B6B','#8B4A2F','#2D5A8E',
];

function colorForName(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

export default function Avatar({ user, size = 28, overlap = false }) {
  const bg    = user?.color || colorForName(user?.name);
  const label = initials(user?.name || '?');

  return (
    <div
      className={`${styles.avatar} ${overlap ? styles.overlap : ''}`}
      style={{
        width: size, height: size,
        fontSize: size * 0.36,
        background: bg,
      }}
      title={user?.name}
    >
      {label}
    </div>
  );
}

export function AvatarGroup({ users = [], max = 4, size = 26 }) {
  const visible = users.slice(0, max);
  const rest    = users.length - max;
  return (
    <div className={styles.group}>
      {visible.map((u) => (
        <Avatar key={u.id} user={u} size={size} overlap />
      ))}
      {rest > 0 && (
        <div
          className={`${styles.avatar} ${styles.overlap} ${styles.rest}`}
          style={{ width: size, height: size, fontSize: size * 0.36 }}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
