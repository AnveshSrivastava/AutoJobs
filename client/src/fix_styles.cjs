const fs = require('fs');
const file = '/Users/anvesh/Documents/Codes/Job-scraper-Node/client/src/pages/Landing.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/style="([^"]*)"/g, (match, p1) => {
  const parts = p1.split(';').map(p => p.trim()).filter(Boolean);
  const obj = {};
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim().replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const val = part.slice(idx + 1).trim();
    obj[key] = val;
  }
  return `style={${JSON.stringify(obj)}}`;
});

// The prompt says: "Explicitly check and fix color contrast on the Hero section's gradient-orb background"
// The gradient orb is too bright (teal #57f1db, lime #9ddf2e) behind text.
// Change opacity to a lower value (e.g., 20%) to keep text legible on dark background.
content = content.replace(/opacity-80/g, 'opacity-20');

// "Confirm Stats & Footer numbers are proportionally aligned (equal width, baseline-aligned)"
// I'll add tabular-nums to the stats numbers.
content = content.replace(/text-display-lg/g, 'text-display-lg tabular-nums tracking-tight');

fs.writeFileSync(file, content);
