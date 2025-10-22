import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create test catalogs
  const personalDocs = await prisma.catalog.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Personal Documents',
      code: 'personal',
    },
  });

  const businessDocs = await prisma.catalog.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Business Documents',
      code: 'business',
    },
  });

  const passports = await prisma.catalog.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'Passports',
      code: 'passports',
      parentId: personalDocs.id,
    },
  });

  const licenses = await prisma.catalog.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: 'Driver Licenses',
      code: 'licenses',
      parentId: personalDocs.id,
    },
  });

  console.log('Seed data created:');
  console.log('- Personal Documents catalog (code: personal)');
  console.log('- Business Documents catalog (code: business)');
  console.log('- Passports catalog (code: passports)');
  console.log('- Driver Licenses catalog (code: licenses)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
