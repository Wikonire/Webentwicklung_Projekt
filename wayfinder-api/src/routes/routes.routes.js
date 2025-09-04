import express from 'express';
import repo from '../repos/routes.repo.js';
import { validateCreateRoute } from '../validators/routes.validators.js';

const router = express.Router();

router.post('/', (req, res) => {
    const err = validateCreateRoute(req.body || {});
    if (err) return res.status(400).json({ error: err });
    const row = repo.insert(req.body);
    res.status(201).json(row);
});

router.get('/', (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ error: 'userId erforderlich' });
    res.json(repo.listByUser(userId));
});

router.get('/:id', (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ error: 'userId erforderlich' });
    const row = repo.getOne(req.params.id, userId);
    if (!row) return res.sendStatus(404);
    res.json(row);
});

router.delete('/:id', (req, res) => {
    const userId = String(req.query.userId || '');
    if (!userId) return res.status(400).json({ error: 'userId erforderlich' });
    const ok = repo.remove(req.params.id, userId);
    if (!ok) return res.sendStatus(404);
    res.sendStatus(204);
});

export default router;
