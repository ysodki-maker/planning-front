import { createContext, useContext, useState, useCallback } from 'react';
import Icon from '../components/common/Icon';

const ToastContext = createContext(null);

let id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info', duration = 3500) => {
    const key = ++id;
    setToasts((t) => [...t, { key, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.key !== key)), duration);
  }, []);

  const toast = {
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    info:    (msg) => add(msg, 'info'),
  };

  const iconMap = { success: 'check', error: 'alertCircle', info: 'clock' };
  const colorMap = {
    success: { bg: '#EAF5EE', color: '#1A7A4A', border: '#B8DEC8' },
    error:   { bg: '#FBF0ED', color: '#C8341B', border: '#F0C4BB' },
    info:    { bg: '#EBF2FB', color: '#1B5C9E', border: '#B8D0EC' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 8,
        zIndex: 9999, pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          const c = colorMap[t.type];
          return (
            <div key={t.key} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px',
              background: c.bg, color: c.color,
              border: `1px solid ${c.border}`,
              borderRadius: 6,
              fontSize: 13, fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,.08)',
              fontFamily: 'var(--font-body)',
              animation: 'fadeIn 200ms ease forwards',
              maxWidth: 320,
            }}>
              <Icon name={iconMap[t.type]} size={15} color={c.color} />
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
