import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3001';

// Matches the Industry design system's garment palette.
const COLORS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Ash', hex: '#D4D4D7' },
  { name: 'Steel', hex: '#5980A6' },
  { name: 'Slate', hex: '#424244' },
  { name: 'Ink', hex: '#1D1F20' },
];

async function main() {
  const product = await prisma.product.upsert({
    where: { id: 'seed-classic-tee' },
    update: {},
    create: {
      id: 'seed-classic-tee',
      name: 'Classic Tee',
      basePrice: 1200,
    },
  });

  for (const c of COLORS) {
    await prisma.productColor.upsert({
      where: { productId_colorName: { productId: product.id, colorName: c.name } },
      update: {
        hexCode: c.hex,
        frontImageUrl: `${FRONTEND_URL}/tshirt.jpg`,
        backImageUrl: `${FRONTEND_URL}/tshirt.jpg`,
      },
      create: {
        productId: product.id,
        colorName: c.name,
        hexCode: c.hex,
        frontImageUrl: `${FRONTEND_URL}/tshirt.jpg`,
        backImageUrl: `${FRONTEND_URL}/tshirt.jpg`,
      },
    });
  }

  console.log('Seeded product:', product.name, '| colors:', COLORS.map((c) => c.name).join(', '));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
