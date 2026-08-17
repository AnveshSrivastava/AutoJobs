import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Download, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { ProfileForm } from '../components/ProfileForm';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [selectedProfileId, setSelectedProfileId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const active = await fetchApi('/profiles/active').catch(() => null);
      const list = await fetchApi('/profiles');
      return { active, ...list };
    }
  });

  // Keep selectedProfileId in sync with active profile initially
  useEffect(() => {
    if (data?.active && !selectedProfileId) {
      setSelectedProfileId(data.active.id);
    }
  }, [data, selectedProfileId]);

  const { data: selectedProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', selectedProfileId],
    queryFn: () => fetchApi(`/profiles/${selectedProfileId}`),
    enabled: !!selectedProfileId,
  });

  const activateMutation = useMutation({
    mutationFn: (id) => fetchApi(`/profiles/${id}/activate`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    }
  });

  const duplicateMutation = useMutation({
    mutationFn: (id) => fetchApi(`/profiles/${id}/duplicate`, { method: 'POST' }),
    onSuccess: (newProfile) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      setSelectedProfileId(newProfile.id);
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: ({ id, config }) => fetchApi(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ config })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile', selectedProfileId] });
      alert("Profile saved successfully");
    },
    onError: (err) => {
      alert(`Failed to save: ${err.message}`);
    }
  });

  const handleExport = (id) => {
    window.open(`/api/profiles/${id}/export`, '_blank');
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 size={32} className="loader" /></div>;
  }

  return (
    <div className="flex gap-6 h-full" style={{ alignItems: 'flex-start' }}>
      
      {/* Sidebar: Profile List */}
      <div className="card" style={{ width: '280px', flexShrink: 0, padding: '16px' }}>
        <h3 className="page-title" style={{ fontSize: '16px', marginBottom: '16px' }}>Profiles</h3>
        
        <div className="flex-col gap-2">
          {data?.profiles?.map(p => {
            const isActive = data?.active?.id === p.id;
            const isSelected = selectedProfileId === p.id;
            return (
              <button 
                key={p.id}
                onClick={() => setSelectedProfileId(p.id)}
                className="btn"
                style={{ 
                  justifyContent: 'flex-start',
                  width: '100%', 
                  textAlign: 'left',
                  background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                  border: isSelected ? '1px solid var(--border-color)' : '1px solid transparent',
                  padding: '12px',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                <div className="flex justify-between items-center w-full">
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  {isActive && <CheckCircle2 size={16} className="text-success" />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content: Profile Editor */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="page-header flex justify-between items-end">
          <div>
            <h1 className="page-title">Profile Editor</h1>
            <p className="page-subtitle">Configure search params, scoring weights, and outreach templates.</p>
          </div>
          
          {selectedProfile && (
            <div className="flex gap-2">
              {data?.active?.id !== selectedProfile.id && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => activateMutation.mutate(selectedProfile.id)}
                  disabled={activateMutation.isLoading}
                >
                  <CheckCircle2 size={14} /> Make Active
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => duplicateMutation.mutate(selectedProfile.id)}>
                <Copy size={14} /> Duplicate
              </button>
              <button className="btn btn-secondary" onClick={() => handleExport(selectedProfile.id)}>
                <Download size={14} /> Export YAML
              </button>
            </div>
          )}
        </div>

        {isProfileLoading ? (
          <div className="flex justify-center py-12"><Loader2 size={32} className="loader" /></div>
        ) : selectedProfile ? (
          <ProfileForm 
            initialData={selectedProfile.config} 
            onSave={(config) => updateMutation.mutate({ id: selectedProfile.id, config })}
            isSaving={updateMutation.isLoading}
          />
        ) : (
          <div className="card">Select a profile to edit.</div>
        )}
      </div>

    </div>
  );
}
