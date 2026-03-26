import styles from './Button.module.css';

export default function Button({
  children, variant = 'primary', size = 'md',
  icon, iconRight, loading, disabled, onClick, type = 'button', style,
}) {
  return (
    <button
      type={type}
      className={`${styles.btn} ${styles[variant]} ${styles[size]}`}
      onClick={onClick}
      disabled={disabled || loading}
      style={style}
    >
      {loading ? (
        <span className={styles.spinner} />
      ) : icon ? (
        <span className={styles.icon}>{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className={styles.icon}>{iconRight}</span>
      )}
    </button>
  );
}
