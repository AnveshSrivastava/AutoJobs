import { AlertCircle } from 'lucide-react';

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty-state" style={{ borderColor: 'var(--danger)', background: 'var(--danger-bg)' }}>
      <AlertCircle size={32} style={{ color: 'var(--danger)', marginBottom: '16px', opacity: 1 }} />
      <h3 style={{ color: 'var(--danger)', marginBottom: '8px', fontWeight: 600 }}>Failed to load data</h3>
      <p style={{ color: 'var(--danger)', opacity: 0.8, marginBottom: '16px' }}>{error?.message || 'An unexpected error occurred.'}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, icon: Icon }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={48} />}
      <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 600 }}>{title}</h3>
      <p style={{ maxWidth: '400px' }}>{message}</p>
    </div>
  );
}
