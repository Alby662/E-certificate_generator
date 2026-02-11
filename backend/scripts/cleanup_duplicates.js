import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning up database...');
    try {
        await prisma.participant.deleteMany({});
        await prisma.project.deleteMany({});
        console.log('Deleted all projects and participants.');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
