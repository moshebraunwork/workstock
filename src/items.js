import { Router } from 'express';
import { prisma } from './db.js';
import { requireCompany } from './tenant.js';

export const itemsRouter = Router();

itemsRouter.use(requireCompany);

// --- helpers ---

async function nextItemId(companyId) {
  const row = await prisma.itemIdCounter.upsert({
    where: { companyId },
    update: { lastSeq: { increment: 1 } },
    create: { companyId, lastSeq: 1 },
  });
  return `ITM-${String(row.lastSeq).padStart(4, '0')}`;
}

function validateSize(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 100) {
    return { ok: false, error: 'size must be an integer from 1 to 100' };
  }
  return { ok: true, value: n };
}

function validateCost(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false, error: 'cost must be a non-negative number' };
  }
  return { ok: true, value: n };
}

// --- routes ---

// GET /items - list this company's items
itemsRouter.get('/', async (req, res, next) => {
  try {
    const items = await prisma.item.findMany({
      where: { companyId: req.company.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// GET /items/:id
itemsRouter.get('/:id', async (req, res, next) => {
  try {
    const item = await prisma.item.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// POST /items
// Body: { name, cost, size, description? }
itemsRouter.post('/', async (req, res, next) => {
  try {
    const { name, description, cost, size } = req.body ?? {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    const costCheck = validateCost(cost);
    if (!costCheck.ok) return res.status(400).json({ error: costCheck.error });

    const sizeCheck = validateSize(size);
    if (!sizeCheck.ok) return res.status(400).json({ error: sizeCheck.error });

    const id = await nextItemId(req.company.id);

    const item = await prisma.item.create({
      data: {
        id,
        companyId: req.company.id,
        name: name.trim(),
        description: description ?? null,
        cost: costCheck.value,
        size: sizeCheck.value,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// PATCH /items/:id
itemsRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.item.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    const { name, description, cost, size } = req.body ?? {};
    const data = {};

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
      data.name = name.trim();
    }
    if (description !== undefined) data.description = description;
    if (cost !== undefined) {
      const c = validateCost(cost);
      if (!c.ok) return res.status(400).json({ error: c.error });
      data.cost = c.value;
    }
    if (size !== undefined) {
      const s = validateSize(size);
      if (!s.ok) return res.status(400).json({ error: s.error });
      data.size = s.value;
    }

    const item = await prisma.item.update({
      where: { id: existing.id },
      data,
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /items/:id
itemsRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.item.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    await prisma.item.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});