CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "full_name" VARCHAR(120) NOT NULL,
    "birth_date" DATE,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(120),

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

CREATE UNIQUE INDEX "users_phone_key" ON "users" ("phone");
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users" (lower(btrim("email"))) WHERE "email" IS NOT NULL;

CREATE TABLE "user_roles" (
    "user_id" INTEGER NOT NULL,
    "role" VARCHAR(30) NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role"),
    CONSTRAINT "chk_user_roles_role" CHECK ("role" IN ('PATIENT', 'RECEPTIONIST', 'DOCTOR', 'CLINIC_MANAGER', 'ADMIN')),
    CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_user_roles_one_staff_role"
ON "user_roles" ("user_id")
WHERE "role" IN ('RECEPTIONIST', 'DOCTOR', 'CLINIC_MANAGER', 'ADMIN');

CREATE TABLE "accounts" (
    "account_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "password_hash" VARCHAR(255),
    "status" VARCHAR(30) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("account_id"),
    CONSTRAINT "chk_accounts_status" CHECK ("status" IN ('PENDING_ACTIVATION', 'ACTIVE', 'DISABLED')),
    CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "accounts_user_id_key" ON "accounts" ("user_id");

CREATE TABLE "services" (
    "service_id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "services_pkey" PRIMARY KEY ("service_id"),
    CONSTRAINT "chk_services_duration_positive" CHECK ("duration_minutes" > 0)
);

CREATE TABLE "doctor_services" (
    "doctor_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,

    CONSTRAINT "doctor_services_pkey" PRIMARY KEY ("doctor_id", "service_id"),
    CONSTRAINT "doctor_services_doctor_id_fkey" FOREIGN KEY ("doctor_id")
        REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "doctor_services_service_id_fkey" FOREIGN KEY ("service_id")
        REFERENCES "services"("service_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_doctor_services_service_doctor" ON "doctor_services" ("service_id", "doctor_id");

CREATE TABLE "doctor_shifts" (
    "shift_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "doctor_shifts_pkey" PRIMARY KEY ("shift_id"),
    CONSTRAINT "chk_doctor_shifts_interval" CHECK ("end_at" > "start_at"),
    CONSTRAINT "excl_doctor_shifts_overlap" EXCLUDE USING gist (
        "doctor_id" WITH =,
        tstzrange("start_at", "end_at", '[)') WITH &&
    ),
    CONSTRAINT "doctor_shifts_doctor_id_fkey" FOREIGN KEY ("doctor_id")
        REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_doctor_shifts_doctor_start" ON "doctor_shifts" ("doctor_id", "start_at");

CREATE TABLE "doctor_unavailability" (
    "unavailability_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "doctor_unavailability_pkey" PRIMARY KEY ("unavailability_id"),
    CONSTRAINT "chk_doctor_unavailability_interval" CHECK ("end_at" > "start_at"),
    CONSTRAINT "doctor_unavailability_doctor_id_fkey" FOREIGN KEY ("doctor_id")
        REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_doctor_unavailability_doctor_start" ON "doctor_unavailability" ("doctor_id", "start_at");

CREATE TABLE "appointments" (
    "appointment_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "service_id" INTEGER NOT NULL,
    "doctor_id" INTEGER,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6) NOT NULL,
    "status" VARCHAR(20) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("appointment_id"),
    CONSTRAINT "chk_appointments_interval" CHECK ("end_at" > "start_at"),
    CONSTRAINT "chk_appointments_status" CHECK ("status" IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT "chk_appointments_patient_not_doctor" CHECK ("doctor_id" IS NULL OR "patient_id" <> "doctor_id"),
    CONSTRAINT "chk_appointments_doctor_required_for_confirmed_completed" CHECK (
        "status" NOT IN ('CONFIRMED', 'COMPLETED') OR "doctor_id" IS NOT NULL
    ),
    CONSTRAINT "excl_appointments_patient_overlap" EXCLUDE USING gist (
        "patient_id" WITH =,
        tstzrange("start_at", "end_at", '[)') WITH &&
    )
    WHERE ("status" IN ('PENDING', 'CONFIRMED')),
    CONSTRAINT "excl_appointments_doctor_overlap" EXCLUDE USING gist (
        "doctor_id" WITH =,
        tstzrange("start_at", "end_at", '[)') WITH &&
    )
    WHERE ("doctor_id" IS NOT NULL AND "status" IN ('PENDING', 'CONFIRMED')),
    CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id")
        REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id")
        REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id")
        REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "idx_appointments_patient_start" ON "appointments" ("patient_id", "start_at");
CREATE INDEX "idx_appointments_doctor_start" ON "appointments" ("doctor_id", "start_at");
CREATE INDEX "idx_appointments_service_start" ON "appointments" ("service_id", "start_at");
CREATE INDEX "idx_appointments_status_start" ON "appointments" ("status", "start_at");
CREATE INDEX "idx_appointments_start" ON "appointments" ("start_at");

CREATE TABLE "appointment_history" (
    "history_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "actor_user_id" INTEGER NOT NULL,
    "old_doctor_id" INTEGER,
    "new_doctor_id" INTEGER,
    "old_service_id" INTEGER,
    "new_service_id" INTEGER,
    "changed_at" TIMESTAMPTZ(6) NOT NULL,
    "old_status" VARCHAR(20),
    "new_status" VARCHAR(20) NOT NULL,
    "old_start_at" TIMESTAMPTZ(6),
    "new_start_at" TIMESTAMPTZ(6),
    "old_end_at" TIMESTAMPTZ(6),
    "new_end_at" TIMESTAMPTZ(6),

    CONSTRAINT "appointment_history_pkey" PRIMARY KEY ("history_id"),
    CONSTRAINT "chk_appointment_history_old_status" CHECK ("old_status" IS NULL OR "old_status" IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT "chk_appointment_history_new_status" CHECK ("new_status" IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT "appointment_history_appointment_id_fkey" FOREIGN KEY ("appointment_id")
        REFERENCES "appointments"("appointment_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointment_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id")
        REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointment_history_old_doctor_id_fkey" FOREIGN KEY ("old_doctor_id")
        REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointment_history_new_doctor_id_fkey" FOREIGN KEY ("new_doctor_id")
        REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointment_history_old_service_id_fkey" FOREIGN KEY ("old_service_id")
        REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "appointment_history_new_service_id_fkey" FOREIGN KEY ("new_service_id")
        REFERENCES "services"("service_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "idx_appointment_history_appt_changed" ON "appointment_history" ("appointment_id", "changed_at");

CREATE TABLE "notifications" (
    "notification_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "recipient_user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("notification_id"),
    CONSTRAINT "notifications_appointment_id_fkey" FOREIGN KEY ("appointment_id")
        REFERENCES "appointments"("appointment_id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id")
        REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_notifications_recipient_created" ON "notifications" ("recipient_user_id", "created_at");

CREATE TABLE "auth_sessions" (
    "session_id" BIGSERIAL NOT NULL,
    "account_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("session_id"),
    CONSTRAINT "auth_sessions_account_id_fkey" FOREIGN KEY ("account_id")
        REFERENCES "accounts"("account_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions" ("token_hash");
CREATE INDEX "idx_auth_sessions_account" ON "auth_sessions" ("account_id");

CREATE TABLE "otp_challenges" (
    "challenge_id" UUID NOT NULL,
    "account_id" INTEGER,
    "phone" VARCHAR(20) NOT NULL,
    "purpose" VARCHAR(30) NOT NULL,
    "code_digest" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "otp_challenges_pkey" PRIMARY KEY ("challenge_id"),
    CONSTRAINT "chk_otp_challenges_purpose" CHECK ("purpose" IN ('ACTIVATE', 'RECOVER_PASSWORD', 'REACTIVATE')),
    CONSTRAINT "otp_challenges_account_id_fkey" FOREIGN KEY ("account_id")
        REFERENCES "accounts"("account_id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "idx_otp_challenges_phone_purpose" ON "otp_challenges" ("phone", "purpose", "created_at");
CREATE INDEX "idx_otp_challenges_account_purpose" ON "otp_challenges" ("account_id", "purpose");
