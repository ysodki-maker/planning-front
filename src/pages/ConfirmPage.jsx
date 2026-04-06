import { useState, useEffect } from 'react';
import styles from './ConfirmPage.module.css';

export default function ConfirmPage() {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');
  const token  = params.get('token');
  const name   = decodeURIComponent(params.get('name') || 'le projet');

  const [users,    setUsers]    = useState([]);
  const [selUsers, setSelUsers] = useState([]);
  const [form,     setForm]     = useState({ start_date: '', end_date: '', heure_debut: '', heure_fin: '' });
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Charger la liste des utilisateurs
  useEffect(() => {
    fetch(`${apiUrl}/users?limit=100`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}` },
    })
      .then(r => r.json())
      .then(d => setUsers(d.data || []))
      .catch(() => {});
  }, []); // eslint-disable-line

  if (!id || !token) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.cardHeader}><div className={styles.logo}>Magicwalls</div></div>
          <div className={styles.cardBody}>
            <div className={`${styles.icon} ${styles.iconError}`}>✕</div>
            <h1 className={styles.title}>Lien invalide</h1>
            <p className={styles.sub}>Ce lien est invalide ou a déjà été utilisé.</p>
          </div>
        </div>
      </div>
    );
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleUser = (uid) => setSelUsers(s =>
    s.includes(uid) ? s.filter(x => x !== uid) : [...s, uid]
  );

  const inputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 6,
    border: '1px solid #E0DDD8', background: '#FAFAF8',
    fontSize: 14, fontFamily: 'inherit', outline: 'none', height: 38,
    boxSizing: 'border-box', transition: 'border-color .15s',
  };
  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#888',
    letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 6,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('La date de fin doit être après la date de début.'); return;
    }
    if (form.heure_debut && form.heure_fin && form.heure_fin <= form.heure_debut) {
      setError("L'heure de fin doit être après l'heure de début."); return;
    }
    setLoading(true);
    try {
      const body = new URLSearchParams();
      if (form.start_date)  body.append('start_date',  form.start_date);
      if (form.end_date)    body.append('end_date',    form.end_date);
      if (form.heure_debut) body.append('heure_debut', form.heure_debut);
      if (form.heure_fin)   body.append('heure_fin',   form.heure_fin);
      selUsers.forEach(uid => body.append('user_ids', uid));

      const res = await fetch(`${apiUrl}/projects/confirm?id=${id}&token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (res.redirected || res.ok) {
        window.location.href = `/confirm-success?name=${encodeURIComponent(name)}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Une erreur est survenue.');
    } catch {
      setError('Impossible de contacter le serveur.');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.logo}>Magicwalls</div>
          <div className={styles.logoSub}>Gestion de planning</div>
        </div>

        <div className={styles.cardBody}>
          <span className={styles.badge}>Confirmation requise</span>
          <h1 className={styles.title}>{name}</h1>
          <p className={styles.subtitle}>
            Renseignez les informations ci-dessous pour confirmer le projet.
            Le projet passera en <strong>En cours</strong> et l'équipe sera notifiée.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>

            {/* Dates */}
            <div className={styles.sectionTitle}>Dates <span className={styles.opt}>(optionnel)</span></div>
            <div className={styles.row2}>
              <div>
                <label style={labelStyle}>Date de début</label>
                <input type="date" style={inputStyle} value={form.start_date} onChange={set('start_date')} />
              </div>
              <div>
                <label style={labelStyle}>Date de fin</label>
                <input type="date" style={inputStyle} value={form.end_date}
                  min={form.start_date || undefined} onChange={set('end_date')} />
              </div>
            </div>

            {/* Heures */}
            <div className={styles.sectionTitle}>Horaires <span className={styles.opt}>(optionnel)</span></div>
            <div className={styles.row2}>
              <div>
                <label style={labelStyle}>Heure de début</label>
                <input type="time" style={inputStyle} value={form.heure_debut} onChange={set('heure_debut')} />
              </div>
              <div>
                <label style={labelStyle}>Heure de fin</label>
                <input type="time" style={inputStyle} value={form.heure_fin}
                  min={form.heure_debut || undefined} onChange={set('heure_fin')} />
              </div>
            </div>

            {/* Équipe */}
            {users.length > 0 && (
              <>
                <div className={styles.sectionTitle}>Équipe assignée <span className={styles.opt}>(optionnel)</span></div>
                <div className={styles.userGrid}>
                  {users.map(u => {
                    const sel = selUsers.includes(u.id);
                    return (
                      <button key={u.id} type="button"
                        onClick={() => toggleUser(u.id)}
                        className={`${styles.userChip} ${sel ? styles.userChipActive : ''}`}
                      >
                        <span className={styles.userAvatar}
                          style={{ background: u.color || '#6366f1' }}>
                          {(u.avatar || u.name?.slice(0,2) || '?').toUpperCase()}
                        </span>
                        {u.name}
                        {sel && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {error && <div className={styles.errorBox}>⚠ {error}</div>}

            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? <span className={styles.spinner} /> : '✓ Confirmer le projet — passer En cours'}
            </button>
          </form>

          <p className={styles.note}>Ce lien est à usage unique · Les champs sont facultatifs</p>
        </div>
      </div>
    </div>
  );
}
