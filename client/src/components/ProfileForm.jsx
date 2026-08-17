import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChipInput } from './ChipInput';
import { Save, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

// Exact matching Zod schema from backend for validation parity
const ProfileConfigSchema = z.object({
  search: z.object({
    title_keywords_positive: z.array(z.string()).default([]),
    title_keywords_negative: z.array(z.string()).default([]),
    relevant_tech: z.array(z.string()).default([]),
    jsearch_queries: z.array(z.object({
      query: z.string().min(1, "Query is required"),
      country: z.string().optional(),
      date_posted: z.string().optional(),
    })).default([]),
  }),
  scoring: z.object({
    experience_target: z.enum(['fresher', 'junior', 'mid', 'senior', 'any']),
    min_score_to_store: z.coerce.number().int().min(0).max(100),
    weights: z.object({
      title: z.coerce.number(),
      tech: z.coerce.number(),
      experience: z.coerce.number(),
      signal: z.coerce.number(),
    }),
    core_tech: z.array(z.string()).default([]),
  }),
  location: z.object({
    region_positive: z.array(z.string()).default([]),
    region_negative: z.array(z.string()).default([]),
  }),
  outreach: z.object({
    candidate_name: z.string(),
    bio_short: z.string(),
    dm_short_template: z.string(),
    dm_long_template: z.string(),
    recipient_email: z.string().email("Must be a valid email address").or(z.literal('')),
  }),
  email: z.object({
    daily_hour: z.coerce.number().int().min(0).max(23),
    daily_jobs_count: z.coerce.number().int().min(1).max(50),
  }),
});

export function ProfileForm({ initialData, onSave, isSaving }) {
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(ProfileConfigSchema),
    defaultValues: initialData || {}
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "search.jsearch_queries"
  });

  useEffect(() => {
    reset(initialData);
  }, [initialData, reset]);

  const onSubmit = (data) => {
    onSave(data);
  };

  const getError = (path) => {
    const parts = path.split('.');
    let curr = errors;
    for (const p of parts) {
      if (!curr || !curr[p]) return null;
      curr = curr[p];
    }
    return curr?.message;
  };

  const InputField = ({ label, name, type = "text", ...rest }) => {
    const error = getError(name);
    return (
      <div className="form-group flex-col">
        <label className="form-label">{label}</label>
        <input 
          type={type} 
          className={`form-input ${error ? 'error' : ''}`} 
          {...register(name)} 
          {...rest} 
        />
        {error && <span className="error-text"><AlertCircle size={12} />{error}</span>}
      </div>
    );
  };

  const TextAreaField = ({ label, name, ...rest }) => {
    const error = getError(name);
    return (
      <div className="form-group flex-col">
        <label className="form-label">{label}</label>
        <textarea 
          className={`form-textarea ${error ? 'error' : ''}`} 
          style={{ minHeight: '100px', resize: 'vertical' }}
          {...register(name)} 
          {...rest} 
        />
        {error && <span className="error-text"><AlertCircle size={12} />{error}</span>}
      </div>
    );
  };

  const ChipField = ({ label, name, placeholder }) => {
    const error = getError(name);
    return (
      <div className="form-group flex-col">
        <label className="form-label">{label}</label>
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <ChipInput value={field.value} onChange={field.onChange} placeholder={placeholder} />
          )}
        />
        {error && <span className="error-text"><AlertCircle size={12} />{error}</span>}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      
      {/* 1. SEARCH CONFIG */}
      <div className="card">
        <h3 className="page-title" style={{ fontSize: '18px', marginBottom: '16px' }}>Search Config</h3>
        <div className="flex-col gap-4">
          <ChipField name="search.title_keywords_positive" label="Positive Title Keywords" placeholder="Press Enter to add" />
          <ChipField name="search.title_keywords_negative" label="Negative Title Keywords" placeholder="Press Enter to add" />
          <ChipField name="search.relevant_tech" label="Relevant Tech" placeholder="Press Enter to add" />
          
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <label className="form-label mb-0">JSearch Queries</label>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => append({ query: '', country: 'US', date_posted: 'today' })}>
                <Plus size={14} /> Add Query
              </button>
            </div>
            
            <div className="flex-col gap-2">
              {fields.length === 0 && <span className="text-muted text-sm">No queries defined.</span>}
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start" style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
                  <div className="flex-col" style={{ flex: 2 }}>
                    <input className="form-input" placeholder="Query (e.g. node.js backend)" {...register(`search.jsearch_queries.${index}.query`)} />
                    {getError(`search.jsearch_queries.${index}.query`) && <span className="error-text"><AlertCircle size={12} />{getError(`search.jsearch_queries.${index}.query`)}</span>}
                  </div>
                  <input className="form-input" style={{ flex: 1 }} placeholder="Country (e.g. US)" {...register(`search.jsearch_queries.${index}.country`)} />
                  <input className="form-input" style={{ flex: 1 }} placeholder="Date (e.g. today)" {...register(`search.jsearch_queries.${index}.date_posted`)} />
                  <button type="button" className="btn btn-icon btn-secondary" onClick={() => remove(index)}><Trash2 size={16} className="text-danger" /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SCORING */}
      <div className="card">
        <h3 className="page-title" style={{ fontSize: '18px', marginBottom: '16px' }}>Scoring</h3>
        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <div className="form-group flex-col" style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Experience Target</label>
            <select className="form-select" {...register('scoring.experience_target')}>
              <option value="fresher">Fresher</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="any">Any</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <InputField name="scoring.min_score_to_store" label="Min Score to Store" type="number" />
          </div>
        </div>
        
        <label className="form-label mt-4">Weights (Must total 100)</label>
        <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}><InputField name="scoring.weights.title" label="Title Weight" type="number" /></div>
          <div style={{ flex: 1 }}><InputField name="scoring.weights.tech" label="Tech Weight" type="number" /></div>
          <div style={{ flex: 1 }}><InputField name="scoring.weights.experience" label="Experience Weight" type="number" /></div>
          <div style={{ flex: 1 }}><InputField name="scoring.weights.signal" label="Signal Weight" type="number" /></div>
        </div>
        
        <div className="mt-4">
          <ChipField name="scoring.core_tech" label="Core Tech (Scored heavily)" placeholder="Press Enter to add" />
        </div>
      </div>

      {/* 3. LOCATION */}
      <div className="card">
        <h3 className="page-title" style={{ fontSize: '18px', marginBottom: '16px' }}>Location / Region</h3>
        <ChipField name="location.region_positive" label="Region Positive Keywords (e.g. Remote, India)" placeholder="Press Enter to add" />
        <ChipField name="location.region_negative" label="Region Negative Keywords (e.g. US Only)" placeholder="Press Enter to add" />
      </div>

      {/* 4. OUTREACH & EMAIL */}
      <div className="card">
        <h3 className="page-title" style={{ fontSize: '18px', marginBottom: '16px' }}>Outreach & Email</h3>
        <div className="flex gap-4 flex-wrap">
          <div style={{ flex: 1 }}><InputField name="outreach.candidate_name" label="Candidate Name" /></div>
          <div style={{ flex: 1 }}><InputField name="outreach.recipient_email" label="Recipient Email (For Digest)" type="email" /></div>
        </div>
        
        <InputField name="outreach.bio_short" label="Short Bio" />
        
        <TextAreaField name="outreach.dm_short_template" label="Short DM Template (Supports {greeting}, {company}, {title}, etc)" />
        <TextAreaField name="outreach.dm_long_template" label="Long DM Template" />
        
        <div className="flex gap-4 mt-4">
          <div style={{ flex: 1 }}><InputField name="email.daily_hour" label="Daily Email Hour (0-23 IST)" type="number" /></div>
          <div style={{ flex: 1 }}><InputField name="email.daily_jobs_count" label="Daily Jobs Count (Max limit)" type="number" /></div>
        </div>
      </div>

      <div className="flex justify-end mt-4 sticky bottom-4">
        <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ padding: '12px 32px', fontSize: '16px', boxShadow: 'var(--shadow-md)' }}>
          {isSaving ? <Loader2 size={18} className="loader" style={{ borderColor: 'transparent', borderTopColor: 'white' }} /> : <Save size={18} />}
          Save Profile
        </button>
      </div>
    </form>
  );
}
