# AfyaCall – Saba Saba Digital Engagement Portal

A production-ready, Dockerized telemedicine platform for the AfyaCall Saba Saba Exhibition. Built with Next.js 15, Socket.IO, Daily.co video, and PostgreSQL.

---

## Quick Start

```bash
# 1. Copy environment variables
cp .env.example .env
# Edit .env with your Daily.co credentials

# 2. Launch everything
docker compose up -d --build

# 3. The migrate service runs automatically (migrations + seed)
# 4. Visit http://localhost:3000
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Docker Network                      │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Next.js 15  │  │ PostgreSQL 16│  │  Redis 7  │  │
│  │  + Socket.IO │──│              │  │           │  │
│  │  Port 3000   │  │  Port 5432   │  │ Port 6379 │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────┘
```

**Stack:**
- **Frontend:** Next.js 15 (App Router), TypeScript, TailwindCSS, Shadcn/UI
- **Realtime:** Socket.IO (custom Node.js server)
- **Video:** Daily.co embedded iframe
- **Database:** PostgreSQL 16 + Prisma ORM
- **Cache/Queue:** Redis 7 (ioredis)
- **Auth:** NextAuth v5 (credentials provider)
- **Charts:** Recharts
- **Export:** xlsx library

---

## User Flows

### Visitor Flow
```
Landing Page
    ↓
Register (Name, Phone, Gender, Age Group)
    ↓
Choose Service:
  ├── Talk to Doctor → Join Queue → Wait → Video Consultation
  ├── Health Assessment → 8 Questions → Risk Result
  └── About AfyaCall → Info Pages
```

### Doctor Flow
```
Login → Doctor Dashboard → View Queue → Start Consultation
    → Video Call (Daily.co) → End Call → Add Notes → Complete
```

### Admin Flow
```
Login → Admin Dashboard (Analytics) → Staff Management → Reports/Export
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `NEXTAUTH_SECRET` | ✅ | JWT signing secret (min 32 chars) |
| `NEXTAUTH_URL` | ✅ | Public app URL |
| `DAILY_API_KEY` | ✅ | Daily.co API key |
| `DAILY_DOMAIN` | ✅ | Your Daily.co domain (e.g. `yourname.daily.co`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL for client-side code |
| `NEXT_PUBLIC_SOCKET_URL` | ✅ | Socket.IO server URL |

---

## Default Credentials

After seeding, these accounts are available:

| Role | Email | Password |
|---|---|---|
| Admin | admin@afyacall.co.tz | Admin@2024! |
| Doctor | dr.amina@afyacall.co.tz | Doctor@2024! |
| Doctor | dr.john@afyacall.co.tz | Doctor@2024! |
| Booth Attendant | booth@afyacall.co.tz | Booth@2024! |

---

## Routes

### Visitor (Public)
| Path | Description |
|---|---|
| `/` | Landing / Home |
| `/register` | Visitor registration |
| `/services` | Service selection |
| `/assessment` | Health assessment wizard |
| `/assessment/results` | Risk results |
| `/queue/[id]` | Queue status (realtime) |
| `/consultation/[id]` | Video consultation room |
| `/about` | About AfyaCall |

### Staff (Auth Required)
| Path | Role | Description |
|---|---|---|
| `/login` | Any | Login page |
| `/doctor/dashboard` | Doctor/Admin | Queue management |
| `/doctor/consultation/[id]` | Doctor/Admin | Video + notes |
| `/admin/dashboard` | Admin | Analytics |
| `/admin/doctors` | Admin | Staff management |
| `/admin/reports` | Admin | Data export |

### API
| Endpoint | Method | Description |
|---|---|---|
| `/api/visitors` | POST | Register visitor |
| `/api/queue` | GET, POST | Queue management |
| `/api/queue/[id]` | GET, PATCH | Queue entry |
| `/api/consultations` | POST | Start consultation |
| `/api/consultations/[id]` | GET, PATCH | Manage consultation |
| `/api/assessment` | GET, POST | Health assessments |
| `/api/admin/analytics` | GET | Dashboard analytics |
| `/api/admin/export` | GET | Export data |
| `/api/admin/users` | GET, POST | User management |
| `/api/health` | GET | Health check |

---

## Database Schema

```
users ──────────────── consultations ──── consultation_notes
visitors ──┬────────── queue_entries ─────┘            daily_rooms
           └────────── health_assessments
           
accounts (NextAuth)
sessions (NextAuth)
activity_logs
```

---

## Socket.IO Events

| Event | Direction | Description |
|---|---|---|
| `visitor:join` | Client→Server | Join visitor room |
| `queue:join` | Client→Server | Subscribe to queue entry |
| `doctor:join` | Client→Server | Join doctor dashboard |
| `admin:join` | Client→Server | Join admin dashboard |
| `queue:doctor-ready` | Server→Client | Doctor started consultation |
| `queue:position-changed` | Server→Client | Queue position updated |
| `consultation:ended` | Server→Client | Consultation completed |
| `queue:updated` | Server→Client | Queue refreshed |
| `doctor:dashboard-update` | Server→Client | New visitor joined |

---

## Development

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis (Docker)
docker compose up postgres redis -d

# Run migrations
npx prisma migrate dev

# Seed database
npm run prisma:seed

# Start development server
npm run dev
```

---

## Production Deployment

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f nextjs

# Run migrations manually
docker compose run --rm migrate

# Restart app
docker compose restart nextjs
```

### Resource Requirements
- **RAM:** 2GB minimum, 4GB recommended
- **CPU:** 2 cores minimum
- **Storage:** 10GB for database + logs
- **Network:** HTTPS recommended (configure reverse proxy)

---

## Security Considerations

1. **Change default passwords** in `.env` before production
2. **Set `NEXTAUTH_SECRET`** to a cryptographically random string (`openssl rand -base64 32`)
3. **Configure HTTPS** using nginx/Caddy reverse proxy
4. **Restrict database access** — PostgreSQL should not be exposed externally
5. **Rate limiting** is implemented via Redis (20 registrations/min per IP)
6. **CSRF protection** via NextAuth built-in protection
7. **Input validation** via Zod on all endpoints

---

## Monitoring

The app exposes `/api/health` for health checks:

```json
{
  "status": "ok",
  "timestamp": "2024-07-07T10:00:00.000Z",
  "service": "afyacall-saba-saba"
}
```

Docker health checks are configured with 30s intervals.

---

## License

AfyaCall Saba Saba – Exhibition Portal  
© 2024 AfyaCall Tanzania. All rights reserved.
