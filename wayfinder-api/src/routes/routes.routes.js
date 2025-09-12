import express from 'express';
import repo from '../repos/routes.repo.js';
import { validateCreateRoute } from '../validators/routes.validators.js';

const router = express.Router();

// Favorit hinzufügen
router.post('/', (req, res) => {
    const err = validateCreateRoute(req.body || {});
    if (err) {
        return res.status(400).json({ error: err });
    }

    const userId = 'u1';
    const row = repo.insert({ ...req.body, userId });
    res.status(201).json(row);
});

// alle Routen von u1 auflisten
router.get('/', (req, res) => {
    const userId = 'u1';
    res.json(repo.listByUser(userId));
});

// einzelne Route von u1 abrufen
router.get('/:id', (req, res) => {
    const userId = 'u1';
    const row = repo.getOne(req.params.id, userId);
    if (!row) {
        return res.sendStatus(404);
    }
    res.json(row);
});

// Route von u1 löschen
router.delete('/:id', (req, res) => {
    const userId = 'u1';
    const ok = repo.remove(req.params.id, userId);
    if (!ok) {
        return res.sendStatus(404);
    }
    res.sendStatus(204);
});

export default router;
