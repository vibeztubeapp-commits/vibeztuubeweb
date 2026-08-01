const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("Total users in PostgreSQL:", users.length);
  console.log("All usernames in PostgreSQL:", users.map(u => u.username));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
