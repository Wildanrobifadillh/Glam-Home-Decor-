const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const seedOwner = async () => {
  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: {
      username: "owner",
    },
    update: {
      name: "Owner Glam House",
      passwordHash,
      role: "OWNER",
      status: "ACTIVE",
    },
    create: {
      name: "Owner Glam House",
      username: "owner",
      passwordHash,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  console.log(`Owner user ready: ${owner.username}`);
};

seedOwner()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });