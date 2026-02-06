// backend/lib/db.js
import { PrismaClient } from '@prisma/client';

// Prevent multiple Prisma Client instances in development
const globalForPrisma = global;

export const db = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasourceUrl: process.env.DATABASE_URL
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = db;
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await db.$disconnect();
});
