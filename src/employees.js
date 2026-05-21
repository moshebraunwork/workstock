import { Router } from 'express';
import { prisma } from './db.js';
import { requireCompany } from './tenant.js';

export const employeesRouter = Router();

employeesRouter.use(requireCompany); // every route is tenant-scoped

// --- helpers ---

function stripPhone(input) {
  if (input == null) return null;
  const digits = String(input).replace(/\D/g, '');
  return digits.length ? digits : null;
}

function parseDateOrNull(input, fieldName) {
  if (input == null || input === '') return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    const err = new Error(`Invalid date for ${fieldName}`);
    err.status = 400;
    throw err;
  }
  return d;
}

async function nextEmployeeId(companyId) {
  const row = await prisma.employeeIdCounter.upsert({
    where: { companyId },
    update: { lastSeq: { increment: 1 } },
    create: { companyId, lastSeq: 1 },
  });
  return `EMP-${String(row.lastSeq).padStart(4, '0')}`;
}

const VALID_STATUSES = ['active', 'inactive'];

// --- routes ---

// GET /employees - list employees in the caller's company
employeesRouter.get('/', async (req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { companyId: req.company.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(employees);
  } catch (err) {
    next(err);
  }
});

// GET /employees/:id
employeesRouter.get('/:id', async (req, res, next) => {
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

// POST /employees
// Body: { name, email, phone, status?, hireDate?, notes? }
employeesRouter.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, status, hireDate, notes } = req.body ?? {};

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }
    const phoneDigits = stripPhone(phone);
    if (!phoneDigits) {
      return res.status(400).json({ error: 'phone is required (digits)' });
    }
    const finalStatus = status ?? 'active';
    if (!VALID_STATUSES.includes(finalStatus)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    const hireDateParsed = parseDateOrNull(hireDate, 'hireDate');

    const id = await nextEmployeeId(req.company.id);

    const employee = await prisma.employee.create({
      data: {
        id,
        companyId: req.company.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phoneDigits,
        status: finalStatus,
        hireDate: hireDateParsed,
        notes: notes ?? null,
      },
    });
    res.status(201).json(employee);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That email is already registered to a company' });
    }
    next(err);
  }
});

// PATCH /employees/:id
employeesRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    const { name, email, phone, status, hireDate, notes } = req.body ?? {};
    const data = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'name cannot be empty' });
      data.name = name.trim();
    }
    if (email !== undefined) {
      if (!email.trim()) return res.status(400).json({ error: 'email cannot be empty' });
      data.email = email.trim().toLowerCase();
    }
    if (phone !== undefined) {
      const digits = stripPhone(phone);
      if (!digits) return res.status(400).json({ error: 'phone cannot be empty' });
      data.phone = digits;
    }
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      data.status = status;
    }
    if (hireDate !== undefined) {
      data.hireDate = parseDateOrNull(hireDate, 'hireDate');
    }
    if (notes !== undefined) data.notes = notes;

    const employee = await prisma.employee.update({
      where: { id: existing.id },
      data,
    });
    res.json(employee);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'That email is already registered to a company' });
    }
    next(err);
  }
});

// DELETE /employees/:id
employeesRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.employee.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return res.status(404).json({ error: 'Employee not found' });

    await prisma.employee.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});