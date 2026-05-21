import { Router } from 'express';
import { prisma } from './db.js';

async function nextEmployeeId(companyId) {
  const row = await prisma.employeeIdCounter.upsert({
    where: { companyId },
    update: { lastSeq: { increment: 1 } },
    create: { companyId, lastSeq: 1 },
  });
  return `EMP-${String(row.lastSeq).padStart(4, '0')}`;
}

export const companiesRouter = Router();

// POST /companies/bootstrap - create a brand-new company with its first admin employee
// No auth required — this is the only way to get started on an empty database.
// Body: { companyName, adminEmail, adminName, adminPhone }
companiesRouter.post('/bootstrap', async (req, res, next) => {
  try {
    const { companyName, adminEmail, adminName, adminPhone } = req.body ?? {};
    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'companyName is required' });
    }
    if (!adminEmail || !adminEmail.trim()) {
      return res.status(400).json({ error: 'adminEmail is required' });
    }
    if (!adminName || !adminName.trim()) {
      return res.status(400).json({ error: 'adminName is required' });
    }
    const phoneDigits = adminPhone ? String(adminPhone).replace(/\D/g, '') : '';
    if (!phoneDigits) {
      return res.status(400).json({ error: 'adminPhone is required (digits)' });
    }
    const normalizedEmail = adminEmail.trim().toLowerCase();

    const existing = await prisma.employee.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ error: 'That email is already registered to a company' });
    }

    const company = await prisma.company.create({ data: { name: companyName.trim() } });
    const empId = await nextEmployeeId(company.id);
    const employee = await prisma.employee.create({
      data: {
        id: empId,
        companyId: company.id,
        name: adminName.trim(),
        email: normalizedEmail,
        phone: phoneDigits,
        status: 'active',
      },
    });

    res.status(201).json({ company, employee });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That email is already registered to a company' });
    }
    next(err);
  }
});

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