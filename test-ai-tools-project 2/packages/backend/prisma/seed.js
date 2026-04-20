// Minimal seed runner that imports data/ai_tools.json into the `tools` table.
// This file assumes a working Prisma setup with a `Tool` model in schema.prisma.
// If Prisma is not configured yet, run `npm --prefix packages/backend install` and
// create prisma/schema.prisma first.

const fs = require('fs');
const path = require('path');

async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  // data/ai_tools.json lives at the repository root `data/ai_tools.json`.
  const seedPath = path.resolve(__dirname, '../../../data/ai_tools.json');
  if (!fs.existsSync(seedPath)) {
    console.error('Seed file not found:', seedPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(seedPath, 'utf8');
  let items;
  try {
    items = JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse seed file:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(items)) {
    console.error('Expected an array of tools in seed file');
    process.exit(1);
  }

  console.log(`Seeding ${items.length} tools...`);

  for (const it of items) {
    try {
      // Map incoming JSON fields to the Prisma Tool model fields.
      const record = {
        id: it.id,
        name: it.name,
        category: it.category || null,
        short_description: it.short_description || it.shortDescription || null,
        website: it.website || null,
        tags: it.tags || null,
        example_use: it.example_use || it.exampleUse || null,
      };

      // Upsert by id (schema uses string id that matches data/ai_tools.json)
      await prisma.tool.upsert({
        where: { id: record.id },
        update: {
          name: record.name,
          category: record.category,
          shortDescription: record.short_description,
          website: record.website,
          tags: record.tags,
          exampleUse: record.example_use,
        },
        create: {
          id: record.id,
          name: record.name,
          category: record.category,
          shortDescription: record.short_description,
          website: record.website,
          tags: record.tags,
          exampleUse: record.example_use,
        },
      });
    } catch (err) {
      console.error('Failed to upsert item', it, err.message);
    }
  }

  console.log('Seeding complete.');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seeding failed:', e);
  process.exit(1);
});
