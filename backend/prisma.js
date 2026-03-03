/**
 * Prisma client bootstrap.
 * Prisma v7 requires a database adapter (or Accelerate URL), so this module
 * creates a single shared client instance with the PostgreSQL adapter.
 */
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

let PrismaClient;
let PrismaPg;

try {
  ({ PrismaClient } = require("@prisma/client"));
  ({ PrismaPg } = require("@prisma/adapter-pg"));
} catch (error) {
  throw new Error(
    "Prisma client dependencies are missing. Run `npm install` and `npm run prisma:generate` in the backend."
  );
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to initialize Prisma");
}

// Reuse one Prisma client across the process.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
