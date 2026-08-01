const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: 'Addiee', mode: 'insensitive' } },
        { displayName: { contains: 'Addiee', mode: 'insensitive' } }
      ]
    }
  });
  console.log("Found users matching 'Addiee':", JSON.stringify(users, null, 2));
  
  const total = await prisma.user.count();
  console.log("Total users in PostgreSQL:", total);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
