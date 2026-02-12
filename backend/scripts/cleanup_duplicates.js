import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning up database...');
    try {
        await prisma.participant.deleteMany({});
        await prisma.event.deleteMany({});
        console.log('Deleted all events and participants.');
    } catch (e) {
        console.error("Error during cleanup:", e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
