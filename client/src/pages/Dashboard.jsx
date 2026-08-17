import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Loader2, Check, X, ExternalLink } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { EmptyState, ErrorState } from '../components/States';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    source: '',
    status: '',
    india_friendly: '',
    min_score: '',
    tech: '',
    search: '',
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Create a query string from filters
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
    queryKey: ['jobs', queryKey],
    queryFn: () => fetchApi(`/jobs?${queryKey}`),
    keepPreviousData: true,
  });

  const { data: sourcesData } = useQuery({
    queryKey: ['sources'],
    queryFn: () => fetchApi('/sources'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => fetchApi(`/jobs/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  });

  const toggleEmailFlag = useMutation({
    mutationFn: ({ id, mark_for_email }) => fetchApi(`/jobs/${id}/mark-for-email`, {
      method: 'PATCH',
      body: JSON.stringify({ mark_for_email })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    if (name === 'search') {
      setFilters(prev => ({ ...prev, [name]: value }));
      // simple debounce inline for simplicity, usually we'd use a hook
      setTimeout(() => setDebouncedSearch(value), 300);
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'new': return 'badge-accent';
      case 'reviewed': return 'badge-warning';
      case 'applied': return 'badge-success';
      case 'stale': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Browse and manage scraped jobs.</p>
      </div>

      <div className="card mb-6" style={{ padding: '16px' }}>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="flex-col" style={{ flex: '1', minWidth: '200px' }}>
            <label className="form-label text-muted" style={{ fontSize: '12px' }}>Search Title/Company</label>
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
          
          <div className="flex-col" style={{ width: '140px' }}>
            <label className="form-label text-muted" style={{ fontSize: '12px' }}>Source</label>
            <select name="source" className="form-select" value={filters.source} onChange={handleFilterChange}>
              <option value="">All Sources</option>
              {sourcesData?.sources?.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex-col" style={{ width: '120px' }}>
            <label className="form-label text-muted" style={{ fontSize: '12px' }}>Status</label>
            <select name="status" className="form-select" value={filters.status} onChange={handleFilterChange}>
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="applied">Applied</option>
              <option value="stale">Stale</option>
            </select>
          </div>

          <div className="flex-col" style={{ width: '120px' }}>
            <label className="form-label text-muted" style={{ fontSize: '12px' }}>Min Score</label>
            <input
              type="number"
              name="min_score"
              className="form-input"
              placeholder="e.g. 50"
              value={filters.min_score}
              onChange={handleFilterChange}
            />
          </div>

          <div className="flex-col" style={{ width: '140px' }}>
            <label className="form-label text-muted" style={{ fontSize: '12px' }}>Tech Keyword</label>
            <input
              type="text"
              name="tech"
              className="form-input"
              placeholder="e.g. node"
              value={filters.tech}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="flex-col" style={{ width: '120px' }}>
            <label className="form-label text-muted" style={{ fontSize: '12px' }}>Region</label>
            <select name="india_friendly" className="form-select" value={filters.india_friendly} onChange={handleFilterChange}>
              <option value="">Any</option>
              <option value="yes">Friendly</option>
              <option value="no">Not Friendly</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      {isError && (
        <ErrorState error={error} onRetry={refetch} />
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12" style={{ padding: '64px 0' }}>
          <Loader2 size={32} className="loader" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {!isLoading && !isError && data?.jobs?.length === 0 && (
        <EmptyState 
          icon={Filter} 
          title="No jobs found" 
          message="No jobs match the current filter criteria. Try broadening your search or lowering the minimum score."
        />
      )}

      {!isLoading && !isError && data?.jobs?.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Score</th>
                <th>Region</th>
                <th>Tech Stack</th>
                <th>Status</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map(job => (
                <tr key={job.id}>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        {job.title}
                        <ExternalLink size={14} />
                      </a>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {job.company} • {job.location || 'Unknown location'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {job.source}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${job.relevance_score >= 80 ? 'badge-success' : job.relevance_score >= 50 ? 'badge-warning' : 'badge-neutral'}`}>
                      {job.relevance_score}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${job.india_friendly === 'yes' ? 'badge-success' : job.india_friendly === 'no' ? 'badge-danger' : 'badge-neutral'}`}>
                      {job.india_friendly}
                    </span>
                  </td>
                  <td style={{ maxWidth: '200px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {job.tech_stack ? job.tech_stack.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                        <span key={t} style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          {t}
                        </span>
                      )) : <span className="text-muted text-sm">None</span>}
                    </div>
                  </td>
                  <td>
                    <select 
                      className="form-select" 
                      style={{ width: '120px', padding: '6px 28px 6px 10px', fontSize: '13px', borderColor: 'transparent', background: 'var(--bg-tertiary)' }}
                      value={job.status}
                      onChange={(e) => updateStatus.mutate({ id: job.id, status: e.target.value })}
                      disabled={updateStatus.isLoading}
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="applied">Applied</option>
                      <option value="stale">Stale</option>
                    </select>
                  </td>
                  <td>
                    <button 
                      className={`btn btn-sm ${job.mark_for_email ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px' }}
                      onClick={() => toggleEmailFlag.mutate({ id: job.id, mark_for_email: !job.mark_for_email })}
                      disabled={toggleEmailFlag.isLoading}
                    >
                      {job.mark_for_email ? <Check size={16} /> : <X size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Showing {data.jobs.length} of {data.total} jobs
          </div>
        </div>
      )}
    </div>
  );
}
