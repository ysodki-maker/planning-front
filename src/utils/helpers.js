// ── Dates ────────────────────────────────────────────────────────────────────
export const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export const fmtDateShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short',
  });
};

export const isoDate = (d) => {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
};

export const daysLeft = (endDate) => {
  const diff = new Date(endDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ── Strings ──────────────────────────────────────────────────────────────────
export const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export const truncate = (str, n = 40) =>
  str && str.length > n ? str.slice(0, n) + '…' : str;

// ── Numbers ──────────────────────────────────────────────────────────────────
export const pct = (val, total) =>
  total === 0 ? 0 : Math.round((val / total) * 100);

// ── Heures ───────────────────────────────────────────────────────────────────
export const fmtTime = (t) => {
  if (!t) return null;
  // MySQL renvoie parfois "HH:MM:SS", on garde HH:MM
  return t.slice(0, 5);
};

export const fmtTimeRange = (debut, fin) => {
  const d = fmtTime(debut);
  const f = fmtTime(fin);
  if (!d && !f) return null;
  if (d && f)   return `${d} – ${f}`;
  return d || f;
};