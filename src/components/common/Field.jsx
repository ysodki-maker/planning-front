import styles from './Field.module.css';

export function Field({ label, error, required, children, hint }) {
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {children}
      {hint  && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

export function Input({ error, ...props }) {
  return (
    <input
      className={`${styles.input} ${error ? styles.inputError : ''}`}
      {...props}
    />
  );
}

export function Select({ error, children, ...props }) {
  return (
    <select
      className={`${styles.input} ${styles.select} ${error ? styles.inputError : ''}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ error, ...props }) {
  return (
    <textarea
      className={`${styles.input} ${styles.textarea} ${error ? styles.inputError : ''}`}
      {...props}
    />
  );
}
