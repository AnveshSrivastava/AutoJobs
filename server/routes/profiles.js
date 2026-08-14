import { Router } from 'express';
import {
  listProfiles,
  getProfile,
  getActiveProfile,
  createProfile,
  updateProfile,
  activateProfile,
  duplicateProfile,
  deleteProfile,
  exportProfileToYaml,
  importProfileFromYamlFile,
  listAvailablePresets,
} from '../core/profile.js';

const router = Router();

// ─── GET /api/profiles ───────────────────────────────────
// Returns all profiles + available preset slugs
router.get('/', (req, res) => {
  try {
    const profiles = listProfiles();
    const presets = listAvailablePresets();
    res.json({ profiles, presets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/profiles/active ────────────────────────────
// Must be defined BEFORE /:id to avoid "active" being treated as an id
router.get('/active', (req, res) => {
  try {
    const profile = getActiveProfile();
    if (!profile) {
      return res.status(404).json({ error: 'No active profile. Activate one via POST /api/profiles/:id/activate' });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/profiles/import ───────────────────────────
// Must be defined BEFORE /:id to avoid "import" being treated as an id
router.post('/import', (req, res) => {
  try {
    const { preset_slug, activate = false } = req.body;
    if (!preset_slug) {
      return res.status(400).json({ error: 'preset_slug is required' });
    }
    const profile = importProfileFromYamlFile(preset_slug, { activate });
    res.status(201).json(profile);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── GET /api/profiles/:id ───────────────────────────────
router.get('/:id', (req, res) => {
  try {
    const profile = getProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: `Profile ${req.params.id} not found` });
    }
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/profiles ──────────────────────────────────
router.post('/', (req, res) => {
  try {
    const { name, config } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }
    const profile = createProfile({ name, config });
    res.status(201).json(profile);
  } catch (err) {
    if (err.status === 400 && err.validationError) {
      return res.status(400).json({ error: 'Validation failed', details: err.validationError });
    }
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── PUT /api/profiles/:id ───────────────────────────────
router.put('/:id', (req, res) => {
  try {
    const { name, config } = req.body;
    const profile = updateProfile(req.params.id, { name, config });
    if (!profile) {
      return res.status(404).json({ error: `Profile ${req.params.id} not found` });
    }
    res.json(profile);
  } catch (err) {
    if (err.status === 400 && err.validationError) {
      return res.status(400).json({ error: 'Validation failed', details: err.validationError });
    }
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /api/profiles/:id/activate ────────────────────
router.post('/:id/activate', (req, res) => {
  try {
    const profile = activateProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: `Profile ${req.params.id} not found` });
    }
    res.json(profile);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── POST /api/profiles/:id/duplicate ───────────────────
router.post('/:id/duplicate', (req, res) => {
  try {
    const profile = duplicateProfile(req.params.id);
    if (!profile) {
      return res.status(404).json({ error: `Profile ${req.params.id} not found` });
    }
    res.status(201).json(profile);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── DELETE /api/profiles/:id ────────────────────────────
router.delete('/:id', (req, res) => {
  try {
    const result = deleteProfile(req.params.id);
    if (!result) {
      return res.status(404).json({ error: `Profile ${req.params.id} not found` });
    }
    res.json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ─── GET /api/profiles/:id/export ───────────────────────
router.get('/:id/export', (req, res) => {
  try {
    const yamlStr = exportProfileToYaml(req.params.id);
    if (!yamlStr) {
      return res.status(404).json({ error: `Profile ${req.params.id} not found` });
    }
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Content-Disposition', `attachment; filename="profile-${req.params.id}.yaml"`);
    res.send(yamlStr);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

export default router;
