// Prisma seed script for tools data. This is idempotent and uses upsert.
// Usage: set DATABASE_URL and run `node prisma/seed.js` or `npm run seed` from packages/backend

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.resolve(__dirname, '../../data/ai_tools.json');
  let raw;
  try {
    raw = fs.readFileSync(dataPath, 'utf8');
  } catch (err) {
    console.error('Could not read ai_tools.json:', err);
    process.exit(1);
  }

  let tools;
  try {
    tools = JSON.parse(raw);
    if (!Array.isArray(tools)) throw new Error('ai_tools.json root not array');
  } catch (err) {
    console.error('Invalid JSON in ai_tools.json:', err);
    process.exit(1);
  }

  for (const t of tools) {
    const id = t.id || undefined; // let Prisma handle id if not present
    const tags = (t.tags || []).map((x) => String(x).toLowerCase());
    try {
      await prisma.tool.upsert({
        where: { id: id || t.name },
        update: {
          name: t.name,
          category: t.category || null,
          short_description: t.short_description || null,
          website: t.website || null,
          tags: tags,
          example_use: t.example_use || null,
          published_at: t.published_at ? new Date(t.published_at) : new Date(),
        },
        create: {
          id: id,
          name: t.name,
          category: t.category || null,
          short_description: t.short_description || null,
          website: t.website || null,
          tags: tags,
          example_use: t.example_use || null,
          published_at: t.published_at ? new Date(t.published_at) : new Date(),
          created_at: new Date(),
        }
      });
      console.log('Upserted tool', t.name);
    } catch (err) {
      console.error('Failed to upsert', t.name, err.message || err);
    }
  }

}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); process.exit(0); });
