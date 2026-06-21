import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";
import type { NotificationEventType, NotificationRecipient, NotificationStatus } from "@prisma/client";

export type { NotificationEventType };

export interface NotificationContext {
  patientName?: string;
  patientPhone?: string;
  queueNumber?: number | string;
  queueEntryId?: string;
  waitMinutes?: number | string;
  doctorName?: string;
  doctorId?: string;
  consultationId?: string;
  duration?: number | string;
  riskScore?: number | string;
  riskLevel?: string;
  staffName?: string;
  staffRole?: string;
  recipientPhone?: string;
  recipientName?: string;
}

interface Recipient {
  name: string;
  phone: string;
  type: NotificationRecipient;
}

function renderTemplate(template: string, ctx: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = ctx[key];
    return val !== undefined ? String(val) : `{{${key}}}`;
  });
}

function makeOriginatorId(eventType: string): string {
  const short = eventType.replace(/_/g, "").substring(0, 8).toUpperCase();
  const uid = randomUUID().replace(/-/g, "").substring(0, 12);
  return `AFYA-${short}-${uid}`;
}

function buildVars(ctx: NotificationContext): Record<string, string | number | undefined> {
  const now = new Date();
  return {
    patientName:   ctx.patientName,
    patientPhone:  ctx.patientPhone,
    queueNumber:   ctx.queueNumber,
    waitMinutes:   ctx.waitMinutes,
    doctorName:    ctx.doctorName,
    duration:      ctx.duration,
    riskScore:     ctx.riskScore,
    riskLevel:     ctx.riskLevel,
    staffName:     ctx.staffName,
    staffRole:     ctx.staffRole,
    recipientName: ctx.recipientName,
    date: now.toLocaleDateString("en-TZ", { day: "2-digit", month: "short", year: "numeric" }),
    time: now.toLocaleTimeString("en-TZ", { hour: "2-digit", minute: "2-digit" }),
  };
}

async function resolveRecipients(
  recipientType: NotificationRecipient,
  ctx: NotificationContext
): Promise<Recipient[]> {
  switch (recipientType) {
    case "PATIENT":
      if (!ctx.patientPhone || !ctx.patientName) return [];
      return [{ name: ctx.patientName, phone: ctx.patientPhone, type: "PATIENT" }];

    case "CUSTOM_PHONE":
      if (!ctx.recipientPhone || !ctx.recipientName) return [];
      return [{ name: ctx.recipientName, phone: ctx.recipientPhone, type: "CUSTOM_PHONE" }];

    case "ASSIGNED_DOCTOR": {
      if (!ctx.doctorId) return [];
      const doc = await prisma.user.findUnique({
        where: { id: ctx.doctorId, isActive: true, deletedAt: null },
        select: { name: true, phone: true },
      });
      if (!doc?.phone) return [];
      return [{ name: doc.name, phone: doc.phone, type: "ASSIGNED_DOCTOR" }];
    }

    case "ALL_DOCTORS": {
      const docs = await prisma.user.findMany({
        where: { role: "DOCTOR", isActive: true, deletedAt: null, phone: { not: null } },
        select: { name: true, phone: true },
      });
      return docs
        .filter((d): d is typeof d & { phone: string } => !!d.phone)
        .map((d) => ({ name: d.name, phone: d.phone, type: "ALL_DOCTORS" as NotificationRecipient }));
    }

    case "ALL_ADMINS": {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true, deletedAt: null, phone: { not: null } },
        select: { name: true, phone: true },
      });
      return admins
        .filter((a): a is typeof a & { phone: string } => !!a.phone)
        .map((a) => ({ name: a.name, phone: a.phone, type: "ALL_ADMINS" as NotificationRecipient }));
    }

    case "ALL_BOOTH_ATTENDANTS": {
      const booth = await prisma.user.findMany({
        where: { role: "BOOTH_ATTENDANT", isActive: true, deletedAt: null, phone: { not: null } },
        select: { name: true, phone: true },
      });
      return booth
        .filter((b): b is typeof b & { phone: string } => !!b.phone)
        .map((b) => ({ name: b.name, phone: b.phone, type: "ALL_BOOTH_ATTENDANTS" as NotificationRecipient }));
    }

    case "ALL_STAFF": {
      const staff = await prisma.user.findMany({
        where: { isActive: true, deletedAt: null, phone: { not: null } },
        select: { name: true, phone: true },
      });
      return staff
        .filter((s): s is typeof s & { phone: string } => !!s.phone)
        .map((s) => ({ name: s.name, phone: s.phone, type: "ALL_STAFF" as NotificationRecipient }));
    }

    case "ONLINE_DOCTORS_ONLY": {
      const docs = await prisma.user.findMany({
        where: { role: "DOCTOR", isActive: true, isOnline: true, deletedAt: null, phone: { not: null } },
        select: { name: true, phone: true },
      });
      return docs
        .filter((d): d is typeof d & { phone: string } => !!d.phone)
        .map((d) => ({ name: d.name, phone: d.phone, type: "ONLINE_DOCTORS_ONLY" as NotificationRecipient }));
    }

    case "ONLINE_DOCTORS_ADMINS_BOOTH": {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          phone: { not: null },
          OR: [
            { role: "DOCTOR", isOnline: true },
            { role: "ADMIN" },
            { role: "BOOTH_ATTENDANT" },
          ],
        },
        select: { name: true, phone: true },
      });
      return users
        .filter((u): u is typeof u & { phone: string } => !!u.phone)
        .map((u) => ({ name: u.name, phone: u.phone, type: "ONLINE_DOCTORS_ADMINS_BOOTH" as NotificationRecipient }));
    }

    default:
      return [];
  }
}

async function hasRecentAlert(eventType: NotificationEventType, relatedEntityId: string, windowMins = 60): Promise<boolean> {
  const since = new Date(Date.now() - windowMins * 60 * 1000);
  const existing = await prisma.notificationLog.findFirst({
    where: {
      eventType,
      relatedEntityId,
      status: "SENT",
      createdAt: { gte: since },
    },
    select: { id: true },
  });
  return !!existing;
}

export async function triggerNotification(
  eventType: NotificationEventType,
  ctx: NotificationContext
): Promise<void> {
  const template = await prisma.notificationTemplate.findUnique({
    where: { eventType },
  });

  if (!template) {
    console.warn(`[notifications] No template found for event: ${eventType}`);
    return;
  }

  if (!template.isEnabled) {
    console.info(`[notifications] Template disabled: ${eventType}`);
    return;
  }

  // Rate-limit LONG_WAIT_ALERT per queue entry (60 min window)
  if (eventType === "LONG_WAIT_ALERT" && ctx.queueEntryId) {
    const alreadySent = await hasRecentAlert("LONG_WAIT_ALERT", ctx.queueEntryId);
    if (alreadySent) return;
  }

  const recipients = await resolveRecipients(template.recipientType, ctx);

  if (recipients.length === 0) {
    console.info(`[notifications] ${eventType}: no recipients with phone numbers found`);
    await prisma.notificationLog.create({
      data: {
        templateId:      template.id,
        eventType,
        recipientPhone:  "N/A",
        recipientName:   "N/A",
        recipientType:   template.recipientType,
        renderedMessage: "",
        originatorConvId: makeOriginatorId(eventType),
        status:          "SKIPPED",
        errorMessage:    "No recipients with phone numbers",
        relatedEntityId: ctx.queueEntryId ?? ctx.consultationId ?? null,
        metadata:        { reason: "no_recipients" },
      },
    });
    return;
  }

  const vars = buildVars(ctx);

  await Promise.allSettled(
    recipients.map(async (recipient) => {
      const rendered = renderTemplate(template.messageTemplate, {
        ...vars,
        recipientName: recipient.name,
      });

      const originatorConvId = makeOriginatorId(eventType);
      let status: NotificationStatus = "PENDING";
      let gatewayRequestId: string | undefined;
      let errorMessage: string | undefined;

      try {
        const result = await sendSms(recipient.phone, rendered, originatorConvId);

        if (result.success) {
          status = "SENT";
          gatewayRequestId = result.requestId;
          console.info(`[notifications] ${eventType} → ${recipient.name} (${recipient.phone}): SENT [${gatewayRequestId}]`);
        } else {
          status = "FAILED";
          errorMessage = result.error;
          console.error(`[notifications] ${eventType} → ${recipient.name} (${recipient.phone}): FAILED — ${errorMessage}`);
        }
      } catch (err) {
        status = "FAILED";
        errorMessage = err instanceof Error ? err.message : "Unexpected error";
        console.error(`[notifications] ${eventType} → ${recipient.name}: EXCEPTION — ${errorMessage}`);
      }

      await prisma.notificationLog.create({
        data: {
          templateId:      template.id,
          eventType,
          recipientPhone:  recipient.phone,
          recipientName:   recipient.name,
          recipientType:   recipient.type,
          renderedMessage: rendered,
          originatorConvId,
          gatewayRequestId,
          status,
          errorMessage,
          relatedEntityId: ctx.queueEntryId ?? ctx.consultationId ?? null,
          metadata: {
            patientName:    ctx.patientName,
            queueEntryId:   ctx.queueEntryId,
            consultationId: ctx.consultationId,
          },
        },
      });
    })
  );
}
