import { PrismaClient, Role, Gender, AgeGroup } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Admin User ───────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin@2024!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@afyacall.co.tz" },
    update: {},
    create: {
      email: "admin@afyacall.co.tz",
      name: "System Admin",
      password: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // ─── Doctor Users ─────────────────────────────────────────────────────────
  const doctorPassword = await bcrypt.hash("Doctor@2024!", 12);

  const doctors = [
    { email: "dr.amina@afyacall.co.tz", name: "Dr. Amina Hassan" },
    { email: "dr.john@afyacall.co.tz", name: "Dr. John Mwangi" },
    { email: "dr.fatuma@afyacall.co.tz", name: "Dr. Fatuma Ally" },
  ];

  for (const doc of doctors) {
    const doctor = await prisma.user.upsert({
      where: { email: doc.email },
      update: {},
      create: {
        email: doc.email,
        name: doc.name,
        password: doctorPassword,
        role: Role.DOCTOR,
        isActive: true,
      },
    });
    console.log("✅ Doctor created:", doctor.email);
  }

  // ─── Booth Attendant ──────────────────────────────────────────────────────
  const attendantPassword = await bcrypt.hash("Booth@2024!", 12);
  const attendant = await prisma.user.upsert({
    where: { email: "booth@afyacall.co.tz" },
    update: {},
    create: {
      email: "booth@afyacall.co.tz",
      name: "Booth Attendant",
      password: attendantPassword,
      role: Role.BOOTH_ATTENDANT,
      isActive: true,
    },
  });
  console.log("✅ Booth attendant created:", attendant.email);

  // ─── Sample Visitors ──────────────────────────────────────────────────────
  const sampleVisitors = [
    {
      fullName: "Juma Mwamba",
      phone: "+255712345678",
      gender: Gender.MALE,
      ageGroup: AgeGroup.AGE_35_44,
    },
    {
      fullName: "Asha Kombo",
      phone: "+255723456789",
      gender: Gender.FEMALE,
      ageGroup: AgeGroup.AGE_25_34,
    },
    {
      fullName: "Peter Makundi",
      phone: "+255734567890",
      gender: Gender.MALE,
      ageGroup: AgeGroup.AGE_45_54,
    },
  ];

  for (const v of sampleVisitors) {
    const existing = await prisma.visitor.findFirst({ where: { phone: v.phone } });
    if (!existing) {
      await prisma.visitor.create({ data: v });
      console.log("✅ Sample visitor created:", v.fullName);
    }
  }

  console.log("\n🎉 Database seeded successfully!\n");
  console.log("─── Login Credentials ───────────────────────────────");
  console.log("Admin:    admin@afyacall.co.tz  / Admin@2024!");
  console.log("Doctor:   dr.amina@afyacall.co.tz / Doctor@2024!");
  console.log("Booth:    booth@afyacall.co.tz  / Booth@2024!");
  console.log("─────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
