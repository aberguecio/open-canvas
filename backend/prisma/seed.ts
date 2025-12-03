import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      uploadLimitPerDay: 1,
      rotationIntervalHours: 100,
      defaultImageDurationHours: 24,
      autoBanEnabled: false,
    },
  });
  console.log('✅ Settings seeded successfully');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
