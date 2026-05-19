import { prisma } from './db.js';

export async function requireCompany(req, res, next) {
  const companyId = req.header('x-company-id');
  if (!companyId) {
    return res.status(401).json({
      error: 'Missing x-company-id header',
    });
  }
  try {
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    req.company = company;
    next();
  } catch (err) {
    next(err);
  }
}