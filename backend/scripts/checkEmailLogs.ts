import prisma from "../src/prismaClient";

async function main() {
  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("=== RECENT EMAIL LOGS ===");
  logs.forEach((log) => {
    console.log(`[${log.createdAt.toISOString()}] to=${log.to} subject="${log.subject}" success=${log.success}`);
    if (log.error) console.log(`  Error: ${log.error}`);
  });

  const total = await prisma.emailLog.count();
  const successful = await prisma.emailLog.count({ where: { success: true } });
  const failed = await prisma.emailLog.count({ where: { success: false } });
  console.log(`\nTotal: ${total}, Success: ${successful}, Failed: ${failed}`);

  await prisma.$disconnect();
}
main().catch(console.error);
