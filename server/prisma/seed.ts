import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { name: "Eduard", email: "eduard@home.local", color: "#3b82f6" },
    { name: "Christine", email: "christine@home.local", color: "#ec4899" },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`Skip ${u.name} — already exists`);
      continue;
    }
    const passwordHash = await bcrypt.hash("unused", 10);
    const user = await prisma.user.create({
      data: { email: u.email, name: u.name, passwordHash, color: u.color },
    });
    await prisma.userSettings.create({ data: { userId: user.id } });
    console.log(`Created ${u.name} (${user.id})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
