import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Loader2, Filter, Copy, Check, ExternalLink } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { EmptyState, ErrorState } from '../components/States';

export default function OutreachPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: '',
    batch: '',
    search: '',
  });
  
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const queryKey = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (key === 'search') {
        if (debouncedSearch) params.append(key, debouncedSearch);
      } else if (val !== '') {
        params.append(key, val);
      }
    });
    return params.toString();
  }, [filters, debouncedSearch]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['outreach', queryKey],
    queryFn: () => fetchApi(`/outreach?${queryKey}`),
    keepPreviousData: true,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => fetchApi(`/outreach/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach'] });
    }
  });

  const updateNotes = useMutation({
    mutationFn: ({ id, notes }) => fetchApi(`/outreach/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach'] });
    }
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'search') {
      setFilters(prev => ({ ...prev, [name]: value }));
      setTimeout(() => setDebouncedSearch(value), 300);
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Outreach</h1>
        <p className="page-subtitle">Manage generated outreach messages and networking progress.</p>
      </div>

      <div className="card mb-6" style={{ padding: '16px' }}>
        <div className="flex items-center gap-4">
          <div className="flex-col" style={{ flex: '1', minWidth: '200px' }}>
            <label className="form-label text-muted" style={{ fontSize: '12px' }}>Search Company/Title</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                name="search"
                className="form-input"
                style={{ paddingLeft: '34px' }}
                placeholder="Search..."
                value={filters.search}
                onChange={handleFilterChange}
              />
            </div>
          </div>
          
          <div className="flex-col" style={{ width: '160px' }}>
            <label className="form-label text-muted" style={{ fontSize: '12px' }}>Status</label>
            <select name="status" className="form-select" value={filters.status} onChange={handleFilterChange}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="messaged">Messaged</option>
              <option value="replied">Replied</option>
              <option value="followed_up">Followed Up</option>
            </select>
          </div>

          <div className="flex-col" style={{ width: '160px' }}>
            <label className="form-label text-muted" style={{ fontSize: '12px' }}>Batch</label>
            <select name="batch" className="form-select" value={filters.batch} onChange={handleFilterChange}>
              <option value="">All Time</option>
              <option value="new">Last 24 hours</option>
              <option value="old">Older</option>
            </select>
          </div>
        </div>
      </div>

      {isError && <ErrorState error={error} onRetry={refetch} />}

      {isLoading && (
        <div className="flex items-center justify-center py-12" style={{ padding: '64px 0' }}>
          <Loader2 size={32} className="loader" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {!isLoading && !isError && data?.records?.length === 0 && (
        <EmptyState 
          icon={Filter} 
          title="No outreach items found" 
          message="No records match your filters, or no outreach has been generated yet."
        />
      )}

      {!isLoading && !isError && data?.records?.length > 0 && (
        <div className="flex-col gap-4">
          {data.records.map(record => (
            <div key={record.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{record.company}</h3>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{record.title} (Score: {record.relevance_score})</div>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    className="form-select" 
                    style={{ width: '150px', background: 'var(--bg-primary)' }}
                    value={record.status}
                    onChange={(e) => updateStatus.mutate({ id: record.id, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="messaged">Messaged</option>
                    <option value="replied">Replied</option>
                    <option value="followed_up">Followed Up</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>MESSAGE TEMPLATE</span>
                    <button 
                      className="btn btn-sm btn-secondary" 
                      onClick={() => copyToClipboard(record.dm_short, record.id)}
                    >
                      {copiedId === record.id ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      {copiedId === record.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div style={{ 
                    background: 'var(--bg-primary)', 
                    padding: '12px', 
                    borderRadius: 'var(--radius-md)', 
                    fontFamily: 'monospace', 
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {record.dm_short}
                  </div>
                </div>

                <div className="flex-col gap-4">
                  <div className="flex-col gap-2">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>LINKEDIN SEARCHES</span>
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                      {record.linkedin_urls && Object.entries(record.linkedin_urls).flatMap(([category, links]) => 
                        links.map((link, idx) => (
                          <a 
                            key={`${category}-${idx}`}
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-secondary flex items-center gap-2"
                          >
                            <ExternalLink size={12} />
                            {link.role}
                          </a>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex-col gap-2">
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>NOTES</span>
                    <textarea 
                      className="form-textarea"
                      style={{ resize: 'vertical', minHeight: '80px', fontSize: '13px' }}
                      placeholder="Add conversation notes here..."
                      defaultValue={record.notes || ''}
                      onBlur={(e) => {
                        if (e.target.value !== record.notes) {
                          updateNotes.mutate({ id: record.id, notes: e.target.value });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
