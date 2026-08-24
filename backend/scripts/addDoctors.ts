import prisma from "../src/prismaClient";
import bcrypt from "bcrypt";

const doctors = [
  { email: "kunalps6266@gmail.com", name: "Kunal Pratap Singh", specialization: "General Medicine" },
  { email: "sophia.chen@example.com", name: "Dr. Sophia Chen", specialization: "Dermatology" },
  { email: "james.wilson@example.com", name: "Dr. James Wilson", specialization: "Pediatrics" },
  { email: "aisha.patel@example.com", name: "Dr. Aisha Patel", specialization: "Neurology" },
  { email: "liam.oconnor@example.com", name: "Dr. Liam O'Connor", specialization: "Orthopedics" },
  { email: "elena.rostova@example.com", name: "Dr. Elena Rostova", specialization: "Psychiatry" },
  { email: "maya.lin@example.com", name: "Dr. Maya Lin", specialization: "General Medicine" },
  { email: "dr.rajesh.sharma@careconnect.in", name: "Dr. Rajesh Sharma", specialization: "Cardiology" },
  { email: "dr.ananya.deshmukh@careconnect.in", name: "Dr. Ananya Deshmukh", specialization: "Neurology" },
  { email: "dr.vikram.rao@careconnect.in", name: "Dr. Vikramaditya Rao", specialization: "Orthopedics" },
  { email: "dr.priya.sundaram@careconnect.in", name: "Dr. Priya Sundaram", specialization: "Pediatrics" },
  { email: "dr.amitav.banerjee@careconnect.in", name: "Dr. Amitav Banerjee", specialization: "Dermatology" },
  { email: "dr.sunita.kapoor@careconnect.in", name: "Dr. Sunita Kapoor", specialization: "General Medicine" },
];

const workingHours = {
  monday: ["09:00", "17:00"],
  tuesday: ["09:00", "17:00"],
  wednesday: ["09:00", "17:00"],
  thursday: ["09:00", "17:00"],
  friday: ["09:00", "17:00"],
};

async function main() {
  const password = await bcrypt.hash("Password123", 10);
  let created = 0;
  let skipped = 0;

  for (const doc of doctors) {
    const existing = await prisma.user.findUnique({ where: { email: doc.email } });
    if (existing) {
      console.log(`SKIP (exists): ${doc.email}`);
      skipped++;
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: doc.email,
        password,
        name: doc.name,
        role: "DOCTOR",
        doctorProfile: {
          create: {
            specialization: doc.specialization,
            slotDuration: 30,
            workingHours,
          },
        },
      },
      include: { doctorProfile: true },
    });
    console.log(`CREATE: ${doc.email} -> ${doc.specialization} (${user.doctorProfile!.id})`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}
main().catch(console.error);
