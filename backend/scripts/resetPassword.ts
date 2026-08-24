import prisma from "../src/prismaClient";
import bcrypt from "bcrypt";

async function main() {
  const hashed = await bcrypt.hash("Password123", 10);
  const user = await prisma.user.update({
    where: { email: "akrocks7776@gmail.com" },
    data: { password: hashed },
  });
  console.log("Password reset for:", user.email);
  await prisma.$disconnect();
}
main().catch(console.error);
