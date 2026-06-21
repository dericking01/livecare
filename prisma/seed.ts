import { PrismaClient, Role, Gender, AgeGroup, NotificationEventType, NotificationRecipient } from "@prisma/client";
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

  // ─── Notification Templates ───────────────────────────────────────────────
  type TplSeed = {
    eventType: NotificationEventType;
    name: string;
    description: string;
    messageTemplate: string;
    recipientType: NotificationRecipient;
  };

  const notificationTemplates: TplSeed[] = [
    {
      eventType: NotificationEventType.PATIENT_JOINED_QUEUE,
      name: "Patient Joined Queue",
      description: "Sent to all doctors when a new patient enters the waiting queue.",
      messageTemplate:
        "AfyaCall Alert: {{patientName}} has joined the queue (No. {{queueNumber}}). Please log in to attend them. meet.afyacall.co.tz",
      recipientType: NotificationRecipient.ALL_DOCTORS,
    },
    {
      eventType: NotificationEventType.CONSULTATION_STARTED,
      name: "Consultation Started",
      description: "Sent to the patient when their doctor starts the video consultation.",
      messageTemplate:
        "Dear {{patientName}}, Dr. {{doctorName}} is ready for your consultation at AfyaCall. Please stay on the screen. Thank you!",
      recipientType: NotificationRecipient.PATIENT,
    },
    {
      eventType: NotificationEventType.CONSULTATION_ENDED_PATIENT,
      name: "Session Ended — Thank You (Patient)",
      description: "Thank-you SMS sent to the patient when their consultation is completed.",
      messageTemplate:
        "Asante {{patientName}}! Thank you for your consultation at AfyaCall, Saba Saba 2026. We wish you good health. For follow-up, please visit your nearest health facility. - AfyaCall",
      recipientType: NotificationRecipient.PATIENT,
    },
    {
      eventType: NotificationEventType.CONSULTATION_ENDED_DOCTOR,
      name: "Session Ended — Summary (Doctor)",
      description: "Session summary sent to the doctor after a consultation is completed.",
      messageTemplate:
        "AfyaCall: Your consultation with {{patientName}} is complete. Duration: {{duration}} mins. Thank you for your service! - AfyaCall",
      recipientType: NotificationRecipient.ASSIGNED_DOCTOR,
    },
    {
      eventType: NotificationEventType.HIGH_RISK_ASSESSMENT,
      name: "High Risk Assessment Alert",
      description: "Sent to all admins when a visitor's health assessment returns HIGH risk.",
      messageTemplate:
        "AfyaCall HIGH RISK ALERT: {{patientName}} scored {{riskScore}} pts (HIGH risk) on their health assessment. Please recommend immediate doctor consultation. Date: {{date}}",
      recipientType: NotificationRecipient.ALL_ADMINS,
    },
    {
      eventType: NotificationEventType.NEW_STAFF_ACCOUNT,
      name: "New Staff Account Welcome",
      description: "Welcome SMS sent to a new staff member when their account is created.",
      messageTemplate:
        "Welcome to AfyaCall, {{staffName}}! Your {{staffRole}} account is ready. Login at: meet.afyacall.co.tz/login — Your credentials will be shared privately. - AfyaCall Admin",
      recipientType: NotificationRecipient.CUSTOM_PHONE,
    },
    {
      eventType: NotificationEventType.LONG_WAIT_ALERT,
      name: "Long Wait Time Alert",
      description: "Sent to all staff when a patient has been waiting more than 15 minutes. Rate-limited to once per patient per 60 minutes.",
      messageTemplate:
        "AfyaCall WAIT ALERT: {{patientName}} (Queue #{{queueNumber}}) has been waiting {{waitMinutes}} mins. Please attend to them urgently. - AfyaCall",
      recipientType: NotificationRecipient.ALL_STAFF,
    },
  ];

  for (const tpl of notificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where:  { eventType: tpl.eventType },
      update: { name: tpl.name, description: tpl.description },
      create: tpl,
    });
    console.log(`✅ Notification template: ${tpl.name}`);
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
