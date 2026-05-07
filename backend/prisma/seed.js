const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const seedUsers = async () => {
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = [
    {
      name: "Owner Glam House",
      username: "owner",
      role: "OWNER",
    },
    {
      name: "Admin Glam House",
      username: "admin",
      role: "ADMIN_STAFF",
    },
    {
      name: "Staff Gudang Glam House",
      username: "gudang",
      role: "STAFF_GUDANG",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: {
        username: user.username,
      },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        status: "ACTIVE",
      },
      create: {
        name: user.name,
        username: user.username,
        passwordHash,
        role: user.role,
        status: "ACTIVE",
      },
    });

    console.log(`User ready: ${user.username}`);
  }
};

seedUsers()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });