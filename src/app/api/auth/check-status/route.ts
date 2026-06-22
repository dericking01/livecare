import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lightweight endpoint: tells the login page if a given email belongs to a
// blocked (isActive=false) account. Never reveals passwords or secrets.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string };
    if (!email) return NextResponse.json({ blocked: false });

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null },
      select: { isActive: true },
    });

    // Only return blocked=true when the account explicitly exists and is inactive.
    // For unknown emails we return blocked=false so we don't leak account existence.
    if (user && !user.isActive) {
      return NextResponse.json({ blocked: true });
    }

    return NextResponse.json({ blocked: false });
  } catch {
    return NextResponse.json({ blocked: false });
  }
}
