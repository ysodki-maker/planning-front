import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Field, Input } from '../components/common/Field';
import Button from '../components/common/Button';
import Icon from '../components/common/Icon';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { login }   = useAuth();
  const toast       = useToast();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Tous les champs sont requis.'); return; }
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Connexion réussie !');
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Left panel */}
      <div className={styles.left}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>PN</div>
          <span className={styles.brandName}>Planning</span>
        </div>
        <div className={styles.leftContent}>
          <h2 className={styles.tagline}>Gérez vos projets avec clarté.</h2>
          <p className={styles.taglineSub}>
            Planification, affectation et suivi de vos projets en un seul endroit.
          </p>
          <div className={styles.stats}>
            {[
              { value: '100%', label: 'Projets centralisés' },
              { value: 'RT',   label: 'Notifications temps réel' },
              { value: '↑',    label: 'Suivi de statut' },
            ].map((s) => (
              <div key={s.label} className={styles.stat}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className={styles.right}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.formHeader}>
            <h1 className={styles.formTitle}>Connexion</h1>
            <p className={styles.formSub}>Accédez à votre espace de gestion.</p>
          </div>

          {error && (
            <div className={styles.errorBox}>
              <Icon name="alertCircle" size={14} color="var(--accent)" />
              {error}
            </div>
          )}

          <Field label="Adresse email" required>
            <Input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="vous@entreprise.com"
              autoComplete="email"
              autoFocus
            />
          </Field>

          <Field label="Mot de passe" required>
            <div className={styles.passwordWrap}>
              <Input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPwd((v) => !v)}
                tabIndex={-1}
              >
                <Icon name={showPwd ? 'eyeOff' : 'eye'} size={15} />
              </button>
            </div>
          </Field>

          <Button type="submit" variant="primary" loading={loading} style={{ width: '100%', height: 40 }}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>

          <p className={styles.hint} hidden>
            Compte de démo :{' '}
            <button type="button" className={styles.hintBtn}
              onClick={() => setForm({ email: 'karim@planflow.com', password: 'Admin@1234' })}>
              Admin
            </button>
            {' '}ou{' '}
            <button type="button" className={styles.hintBtn}
              onClick={() => setForm({ email: 'sara@planflow.com', password: 'User@1234' })}>
              Utilisateur
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
