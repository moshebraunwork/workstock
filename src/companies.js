import { Router } from 'express';
import { prisma } from './db.js';

export const companiesRouter = Router();

// GET /companies - list all
// (No tenant scoping here yet; real auth will restrict this later.)
companiesRouter.get('/', async (req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(companies);
  } catch (err) {
    next(err);
  }
});

// GET /companies/:id
companiesRouter.get('/:id', async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    next(err);
  }
});

// POST /companies - create
// Body: { name }
companiesRouter.post('/', async (req, res, next) => {
  try {
    const { name } = req.body ?? {};
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const company = await prisma.company.create({
      data: { name: name.trim() },
    });
    res.status(201).json(company);
  } catch (err) {
    next(err);
  }
});

// PATCH /companies/:id
companiesRouter.patch('/:id', async (req, res, next) => {
  try {
    const { name } = req.body ?? {};
    const data = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
      data.name = name.trim();
    }
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data,
    });
    res.json(company);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Company not found' });
    next(err);
  }
});

// DELETE /companies/:id
companiesRouter.delete('/:id', async (req, res, next) => {
  try {
    await prisma.company.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Company not found' });
    next(err);
  }
});