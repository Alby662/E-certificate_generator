import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPhaseC() {
    console.log("🧪 Testing Phase C: Participant & Event Management APIs");

    try {
        // 1. Setup: Get a user
        const user = await prisma.user.findFirst();
        if (!user) {
            console.error("❌ No user found. Cannot test.");
            console.error("❌ No user found. Cannot test.");
            process.exit(1);
        }
        console.log(`👤 Using user: ${user.email} (ID: ${user.id})`);

        // 2. Test Create Participant (Direct DB call to simulate Controller logic)
        // Ideally we'd call the API via fetch, but let's test the DB logic first.

        const testEmail = `test_${Date.now()}@example.com`;
        console.log(`\n1️⃣ Creating Participant: ${testEmail}`);

        const p = await prisma.participant.create({
            data: {
                userId: user.id,
                participantId: `TEST-${Date.now()}`,
                name: "Test User",
                email: testEmail,
                organization: "Test Org"
            }
        });
        console.log(`   ✅ Created Participant ID: ${p.id}`);

        // 3. Test Get Participants
        console.log(`\n2️⃣ Listing Participants for User...`);
        const parts = await prisma.participant.findMany({
            where: { userId: user.id },
            take: 5
        });
        console.log(`   ✅ Found ${parts.length} participants.`);

        // 4. Test Update Participant
        console.log(`\n3️⃣ Updating Participant...`);
        const updated = await prisma.participant.update({
            where: { id: p.id },
            data: { jobTitle: "Tester" }
        });
        console.log(`   ✅ Updated Job Title: ${updated.jobTitle}`);

        // 5. Test Event Listing (New API logic)
        console.log(`\n4️⃣ Listing Events for User...`);
        const events = await prisma.event.findMany({
            where: { userId: user.id },
            include: { _count: { select: { participations: true } } }
        });
        console.log(`   ✅ Found ${events.length} events.`);
        events.slice(0, 3).forEach(e => {
            console.log(`      - ${e.name}: ${e._count.participations} participants`);
        });

        // 6. Test Delete Participant
        console.log(`\n5️⃣ Deleting Test Participant...`);
        await prisma.participant.delete({ where: { id: p.id } });
        console.log(`   ✅ Deleted.`);

        console.log("\n✅ Phase C Logic Verified (DB Layer)");

    } catch (error) {
        process.exitCode = 1;
        console.error("❌ Test Failed:", error);
    } finally {
        await prisma.$disconnect();
        process.exit(process.exitCode || 0);
    }
}

testPhaseC()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
