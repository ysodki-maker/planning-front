// ── Statuts ──────────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  "Demande d'affectation": {
    label:  "Demande d'affectation",
    color:  'var(--orange)',
    bg:     'var(--orange-light)',
    dot:    '#D4680A',
  },
  'En cours': {
    label:  'En cours',
    color:  'var(--blue)',
    bg:     'var(--blue-light)',
    dot:    '#1B5C9E',
  },
  'Terminé': {
    label:  'Terminé',
    color:  'var(--green)',
    bg:     'var(--green-light)',
    dot:    '#1A7A4A',
  },
};

export const STATUS_LIST = Object.keys(STATUS_CONFIG);

// ── Types ────────────────────────────────────────────────────────────────────
export const TYPE_CONFIG = {
  'Relevé': {
    label: 'Relevé',
    color: 'var(--ink)',
    bg:    'var(--bg-panel)',
  },
  'Installation': {
    label: 'Installation',
    color: 'var(--accent)',
    bg:    'var(--accent-light)',
  },
};

export const TYPE_LIST = Object.keys(TYPE_CONFIG);

// ── Pagination ───────────────────────────────────────────────────────────────
export const PAGE_SIZE = 15;

// ── Nav ──────────────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: 'grid' },
  { id: 'projects',  label: 'Projets',          icon: 'folder' },
  { id: 'calendar',  label: 'Calendrier',        icon: 'calendar' },
  { id: 'users',     label: 'Utilisateurs',      icon: 'users' },
];
