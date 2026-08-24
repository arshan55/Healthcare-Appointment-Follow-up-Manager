import prisma from "../src/prismaClient";
import bcrypt from "bcrypt";

async function main() {
  // Get doctor users
  const doc1 = await prisma.user.findUnique({ where: { email: "akrocks7776@gmail.com" } });
  const doc2 = await prisma.user.findUnique({ where: { email: "arshan.23bce10800@vitbhopal.ac.in" } });

  if (doc1) {
    const existing = await prisma.doctorProfile.findUnique({ where: { userId: doc1.id } });
    if (!existing) {
      const profile = await prisma.doctorProfile.create({
        data: {
          userId: doc1.id,
          specialization: "General Medicine",
          slotDuration: 30,
          workingHours: {
            monday: ["09:00", "17:00"],
            tuesday: ["09:00", "17:00"],
            wednesday: ["09:00", "17:00"],
            thursday: ["09:00", "17:00"],
            friday: ["09:00", "17:00"],
          },
        },
      });
      console.log("Doctor profile for", doc1.email, "->", profile.id, profile.specialization);
    } else {
      console.log("Profile exists for", doc1.email);
    }
  }

  if (doc2) {
    const existing = await prisma.doctorProfile.findUnique({ where: { userId: doc2.id } });
    if (!existing) {
      const profile = await prisma.doctorProfile.create({
        data: {
          userId: doc2.id,
          specialization: "Cardiology",
          slotDuration: 30,
          workingHours: {
            monday: ["09:00", "17:00"],
            tuesday: ["09:00", "17:00"],
            wednesday: ["09:00", "17:00"],
            thursday: ["09:00", "17:00"],
            friday: ["09:00", "17:00"],
          },
        },
      });
      console.log("Doctor profile for", doc2.email, "->", profile.id, profile.specialization);
    } else {
      console.log("Profile exists for", doc2.email);
    }
  }

  // List all doctors with profiles
  const doctors = await prisma.doctorProfile.findMany({
    include: { user: { select: { email: true, name: true, role: true } } },
  });
  console.log("\nAll doctors:");
  doctors.forEach((d) => console.log(`  ${d.user.email} -> ${d.specialization} (${d.user.name})`));

  await prisma.$disconnect();
}
main().catch(console.error);
