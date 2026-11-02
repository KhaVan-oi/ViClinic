# ViClinic — Prisma ORM Guide

This guide outlines how to use **Prisma ORM** for the ViClinic database layer, aligned with the latest ERD and Data Dictionary.

---

## 1. Directory Structure

```text
ViClinic/
├── database/
│   ├── schema.prisma       # Main Prisma data models & relational schema
│   ├── seed.js             # Automated seed script (1,000 appointments, 5 doctors)
│   ├── PASSWORD_HASH.md    # Bcrypt password specifications & test credentials
│   └── PRISMA_GUIDE.md     # This usage guide
├── .env.example            # Sample environment variables
└── package.json            # NPM scripts & dependencies (points to database/schema.prisma)
```

---

## 2. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Update `DATABASE_URL` with your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/viclinic?schema=public"
   ```

---

## 3. Available Commands

| Task | NPM Command | Equivalent NPX Command |
| :--- | :--- | :--- |
| **Generate Prisma Client** | `npm run prisma:generate` | `npx prisma generate` |
| **Apply Migrations** | `npm run prisma:migrate` | `npx prisma migrate dev --name init` |
| **Run Seed Data** | `npm run prisma:seed` | `npx prisma db seed` |
| **Open Web Studio GUI** | `npm run prisma:studio` | `npx prisma studio` |

---

## 4. Models Overview (`database/schema.prisma`)

- **`User`**: Base profile identity (`user_id`, `full_name`, `birth_date`, `phone`, `email`).
- **`UserRole`**: Multi-role support (`user_id`, `role`), composite PK `[user_id, role]`.
- **`Account`**: Web authentication credentials (`password_hash`, `status`).
- **`Service`**: Clinic medical catalog (`duration_minutes`, `is_active`).
- **`DoctorService`**: Many-to-many qualifications between Doctor and Service.
- **`DoctorShift`**: Scheduled work shifts with index on `[doctor_id, start_at, end_at]`.
- **`DoctorUnavailability`**: Doctor leaves / unavailable intervals.
- **`Appointment`**: 1,000 records structured with NFR-001 composite indexes.
- **`AppointmentHistory`**: Audit trail for state transitions and reschedule logs.
- **`Notification`**: In-app notifications linked to appointments.

