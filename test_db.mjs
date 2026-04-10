import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const units = await prisma.sportsUnit.findMany();
  console.log(units.map(u => ({ id: u.id, name: u.name, scheduleConfig: u.scheduleConfig })));
}
run().catch(console.error).finally(() => prisma.$disconnect());
