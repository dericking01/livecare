const DAILY_API_BASE = "https://api.daily.co/v1";
const DAILY_API_KEY = process.env.DAILY_API_KEY || "";

interface DailyRoomProperties {
  name?: string;
  privacy?: "public" | "private";
  exp?: number;
  max_participants?: number;
  enable_chat?: boolean;
  enable_knocking?: boolean;
  enable_screenshare?: boolean;
  start_video_off?: boolean;
  start_audio_off?: boolean;
  owner_only_broadcast?: boolean;
  nbf?: number;
}

interface DailyRoom {
  id: string;
  name: string;
  api_created: boolean;
  privacy: string;
  url: string;
  created_at: string;
  config: DailyRoomProperties;
}

interface DailyMeetingToken {
  token: string;
}

interface DailyTokenProperties {
  room_name: string;
  user_name?: string;
  user_id?: string;
  is_owner?: boolean;
  exp?: number;
  nbf?: number;
  enable_screenshare?: boolean;
  start_video_off?: boolean;
  start_audio_off?: boolean;
}

async function dailyFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${DAILY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Daily.co API error ${response.status}: ${error}`);
  }

  return response.json() as Promise<T>;
}

export async function createDailyRoom(
  consultationId: string,
  durationMinutes = 30
): Promise<DailyRoom> {
  const expTime = Math.floor(Date.now() / 1000) + durationMinutes * 60;
  const roomName = `afyacall-${consultationId}-${Date.now()}`;

  return dailyFetch<DailyRoom>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name: roomName,
      privacy: "private",
      properties: {
        exp: expTime,
        max_participants: 2,
        enable_chat: false,
        enable_screenshare: false,
        start_video_off: false,
        start_audio_off: false,
        owner_only_broadcast: false,
      } satisfies DailyRoomProperties,
    }),
  });
}

export async function createDailyToken(
  props: DailyTokenProperties
): Promise<string> {
  const result = await dailyFetch<DailyMeetingToken>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({ properties: props }),
  });

  return result.token;
}

export async function deleteDailyRoom(roomName: string): Promise<void> {
  await dailyFetch(`/rooms/${roomName}`, { method: "DELETE" });
}

export async function getDailyRoom(roomName: string): Promise<DailyRoom> {
  return dailyFetch<DailyRoom>(`/rooms/${roomName}`);
}

export function getRoomUrl(roomName: string): string {
  const domain = process.env.DAILY_DOMAIN || "";
  return `https://${domain}/${roomName}`;
}

export async function createConsultationRoom(
  consultationId: string,
  doctorName: string,
  visitorName: string
): Promise<{
  roomName: string;
  roomUrl: string;
  doctorToken: string;
  visitorToken: string;
  expiresAt: Date;
}> {
  const expiryMinutes = 60;
  const expTimestamp = Math.floor(Date.now() / 1000) + expiryMinutes * 60;
  const expiresAt = new Date(expTimestamp * 1000);

  const room = await createDailyRoom(consultationId, expiryMinutes);

  const [doctorToken, visitorToken] = await Promise.all([
    createDailyToken({
      room_name: room.name,
      user_name: doctorName,
      is_owner: true,
      exp: expTimestamp,
    }),
    createDailyToken({
      room_name: room.name,
      user_name: visitorName,
      is_owner: false,
      exp: expTimestamp,
    }),
  ]);

  return {
    roomName: room.name,
    roomUrl: room.url,
    doctorToken,
    visitorToken,
    expiresAt,
  };
}
