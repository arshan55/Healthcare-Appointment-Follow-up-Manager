import prisma from "../src/prismaClient";

async function main() {
  const admin = await prisma.user.update({
    where: { email: "khanarshan0003@gmail.com" },
    data: { role: "ADMIN" },
  });
  console.log("Admin:", admin.email, admin.role);

  const doc1 = await prisma.user.update({
    where: { email: "akrocks7776@gmail.com" },
    data: { role: "DOCTOR" },
  });
  console.log("Doctor:", doc1.email, doc1.role);

  const doc2 = await prisma.user.update({
    where: { email: "arshan.23bce10800@vitbhopal.ac.in" },
    data: { role: "DOCTOR" },
  });
  console.log("Doctor:", doc2.email, doc2.role);

  const pat1 = await prisma.user.findUnique({
    where: { email: "arshanak59@gmail.com" },
  });
  console.log("Patient:", pat1?.email, pat1?.role);

  // List all users
  const all = await prisma.user.findMany({ select: { email: true, name: true, role: true } });
  console.log("\nAll users:");
  all.forEach((u: { email: string; name: string; role: string }) => console.log(`  ${u.email} -> ${u.role}`));

  await prisma.$disconnect();
}
main().catch(console.error);
