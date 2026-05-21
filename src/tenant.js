import { prisma } from './db.js';

export async function requireCompany(req, res, next) {
  const email = req.header('x-user-email');
  if (!email) {
    return res.status(401).json({ error: 'Missing x-user-email header' });
  }
  try {
    const employee = await prisma.employee.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { company: true },
    });
    if (!employee) {
      return res.status(401).json({
        error: 'Email not found — register this email with a company first',
      });
    }
    req.company = employee.company;
    req.employee = employee;
    next();
  } catch (err) {
    next(err);
  }
}
