import { Router } from 'express';
import { prisma } from './db.js';
import { requireCompany } from './tenant.js';

export const jobsRouter = Router();

jobsRouter.use(requireCompany); // every route is tenant-scoped

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

function currentMonthKey(now = new Date()) {
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear() % 100).padStart(2, '0');
  return `${mm}${yy}`;
}

async function nextJobId() {
  const monthKey = currentMonthKey();
  const row = await prisma.jobIdCounter.upsert({
    where: { monthKey },
    update: { lastSeq: { increment: 1 } },
    create: { monthKey, lastSeq: 1 },
  });
  const seq = String(row.lastSeq).padStart(4, '0');
  return `${monthKey}${seq}`;
}

// --- routes ---

// GET /jobs - list this company's jobs with latest estimate inlined
jobsRouter.get('/', async (req, res, next) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { companyId: req.company.id },
      orderBy: { createdAt: 'desc' },
      include: { estimates: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const shaped = jobs.map((j) => {
      const { estimates, ...rest } = j;
      return { ...rest, currentEstimate: estimates[0] ?? null };
    });
    res.json(shaped);
  } catch (err) {
    next(err);
  }
});

// GET /jobs/:id - one job (with full estimate history)
jobsRouter.get('/:id', async (req, res, next) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: { estimates: { orderBy: { createdAt: 'desc' } } },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (err) {
    next(err);
  }
});

// POST /jobs
jobsRouter.post('/', async (req, res, next) => {
  try {
    const {
      ownerName,
      phone,
      homeAddress,
      notes,
      scheduledStart,
      scheduledEnd,
      estimate,
    } = req.body ?? {};

    if (!ownerName || !homeAddress) {
      return res.status(400).json({ error: 'ownerName and homeAddress are required' });
    }

    const phoneDigits = stripPhone(phone);
    if (!phoneDigits) {
      return res.status(400).json({ error: 'phone is required (digits)' });
    }

    const start = parseDateOrNull(scheduledStart, 'scheduledStart');
    const end = parseDateOrNull(scheduledEnd, 'scheduledEnd');
    if (start && end && end < start) {
      return res.status(400).json({ error: 'scheduledEnd must be after scheduledStart' });
    }

    let estimateAmount = null;
    if (estimate !== undefined && estimate !== null && estimate !== '') {
      const n = Number(estimate);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: 'estimate must be a non-negative number' });
      }
      estimateAmount = n;
    }

    const id = await nextJobId();

    const job = await prisma.job.create({
      data: {
        id,
        companyId: req.company.id,
        ownerName,
        phone: phoneDigits,
        homeAddress,
        notes: notes ?? null,
        scheduledStart: start,
        scheduledEnd: end,
        ...(estimateAmount !== null && {
          estimates: { create: { amount: estimateAmount } },
        }),
      },
      include: { estimates: { orderBy: { createdAt: 'desc' } } },
    });

    res.status(201).json(job);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// PATCH /jobs/:id
jobsRouter.patch('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.job.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    const { ownerName, phone, homeAddress, notes, scheduledStart, scheduledEnd } = req.body ?? {};

    const data = {};
    if (ownerName !== undefined) data.ownerName = ownerName;
    if (homeAddress !== undefined) data.homeAddress = homeAddress;
    if (notes !== undefined) data.notes = notes;
    if (phone !== undefined) {
      const digits = stripPhone(phone);
      if (!digits) return res.status(400).json({ error: 'phone cannot be empty' });
      data.phone = digits;
    }
    if (scheduledStart !== undefined) {
      data.scheduledStart = parseDateOrNull(scheduledStart, 'scheduledStart');
    }
    if (scheduledEnd !== undefined) {
      data.scheduledEnd = parseDateOrNull(scheduledEnd, 'scheduledEnd');
    }

    const job = await prisma.job.update({
      where: { id: existing.id },
      data,
      include: { estimates: { orderBy: { createdAt: 'desc' } } },
    });
    res.json(job);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// DELETE /jobs/:id
jobsRouter.delete('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.job.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    await prisma.job.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// --- estimates sub-routes ---

// GET /jobs/:id/estimates
jobsRouter.get('/:id/estimates', async (req, res, next) => {
  try {
    const job = await prisma.job.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const estimates = await prisma.estimate.findMany({
      where: { jobId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(estimates);
  } catch (err) {
    next(err);
  }
});

// POST /jobs/:id/estimates
jobsRouter.post('/:id/estimates', async (req, res, next) => {
  try {
    const { amount, note } = req.body ?? {};
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) {
      return res.status(400).json({ error: 'amount must be a non-negative number' });
    }

    const job = await prisma.job.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const estimate = await prisma.estimate.create({
      data: {
        jobId: req.params.id,
        amount: n,
        note: note ?? null,
      },
    });
    res.status(201).json(estimate);
  } catch (err) {
    next(err);
  }
});