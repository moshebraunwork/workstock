import 'dotenv/config';
import express from 'express';
import { prisma } from './db.js';
import { jobsRouter } from './jobs.js';
import { employeesRouter } from './employees.js';
import { companiesRouter } from './companies.js';
import { itemsRouter } from './items.js';

const app = express();
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: err.message });
  }
});

app.use('/companies', companiesRouter);
app.use('/employees', employeesRouter);
app.use('/jobs', jobsRouter);
app.use('/items', itemsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const port = Number(process.env.PORT) || 4000;

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env');
  process.exit(1);
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});