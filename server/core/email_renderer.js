/**
 * Renders the HTML digest email given a list of outreach-ready jobs.
 */
export function renderEmailDigest(outreachJobs) {
  if (!outreachJobs || outreachJobs.length === 0) {
    return `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>AntiGravity Daily Digest</h2>
        <p>No strong matches found today. The collector ran successfully, but no jobs met the minimum threshold for your active profile.</p>
      </div>
    `;
  }

  let html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 800px; margin: 0 auto;">
      <h2 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">AntiGravity Daily Digest</h2>
      <p>Here are the top ${outreachJobs.length} outreach-ready jobs from today's collection.</p>
  `;

  outreachJobs.forEach((record, index) => {
    const job = record.job || {}; // expecting { ...record, job: { title, company, ... } } shape
    const urls = typeof record.linkedin_urls === 'string' ? JSON.parse(record.linkedin_urls) : (record.linkedin_urls || {});
    
    html += `
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px; background-color: #fafafa;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <h3 style="margin-top: 0; margin-bottom: 5px;">#${index + 1} - ${job.title || 'Unknown Title'} @ ${job.company || 'Unknown Company'}</h3>
          <span style="background-color: #28a745; color: white; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 12px;">Score: ${job.relevance_score || 0}</span>
        </div>
        <p style="margin: 5px 0; color: #555; font-size: 14px;">
          📍 ${job.location || 'Remote'} 
          | 💰 ${job.salary || 'Unspecified'}
          | 🛠️ ${job.tech_stack || 'Unspecified'}
        </p>
        <p style="margin: 5px 0;"><a href="${job.url}" style="color: #0066cc; text-decoration: none;">View Original Posting &rarr;</a></p>
        
        <div style="margin-top: 15px; background: #fff; padding: 10px; border: 1px solid #eee; border-left: 4px solid #0073b1;">
          <p style="margin-top: 0; margin-bottom: 8px; font-size: 13px; font-weight: bold; color: #555;">LinkedIn Outreach Searches</p>
    `;

    // Render LinkedIn URL buttons
    ['Engineering', 'Executive', 'HR'].forEach(category => {
      if (urls[category] && urls[category].length > 0) {
        html += `<div style="margin-bottom: 8px;"><span style="font-size: 12px; color: #777; display: inline-block; width: 80px;">${category}:</span>`;
        urls[category].forEach(link => {
          html += `<a href="${link.url}" style="display: inline-block; margin-right: 6px; padding: 3px 8px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; text-decoration: none; color: #333; font-size: 11px;">${link.role}</a>`;
        });
        html += `</div>`;
      }
    });

    html += `
        </div>
        <div style="margin-top: 15px;">
          <p style="margin: 0 0 5px 0; font-size: 13px; font-weight: bold; color: #555;">Short DM (Copy/Paste)</p>
          <div style="background-color: #fff; border: 1px solid #ddd; padding: 10px; font-size: 13px; white-space: pre-wrap; font-family: monospace;">${record.dm_short || ''}</div>
        </div>
      </div>
    `;
  });

  html += `
      <div style="margin-top: 30px; font-size: 11px; color: #999; text-align: center;">
        Sent automatically by the AntiGravity Pipeline
      </div>
    </div>
  `;

  return html;
}
