import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const workingHours = {
  monday: ["09:00", "17:00"],
  tuesday: ["09:00", "17:00"],
  wednesday: ["09:00", "17:00"],
  thursday: ["09:00", "17:00"],
  friday: ["09:00", "16:00"],
};

async function main() {
  const password = await bcrypt.hash("Password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@healthcare.local" },
    update: {},
    create: { email: "admin@healthcare.local", password, name: "Clinic Admin", role: "ADMIN" },
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: "doctor@healthcare.local" },
    update: {},
    create: {
      email: "doctor@healthcare.local",
      password,
      name: "Amara Okonkwo",
      role: "DOCTOR",
      doctorProfile: {
        create: {
          specialization: "Internal Medicine",
          slotDuration: 30,
          workingHours,
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "patient@healthcare.local" },
    update: {},
    create: { email: "patient@healthcare.local", password, name: "Jordan Hale", role: "PATIENT" },
  });

  console.log("Seeded", { admin: admin.email, doctor: doctorUser.email, password: "Password123" });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
