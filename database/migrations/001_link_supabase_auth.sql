-- =============================================================================
-- Migration 001: Liên kết USERS với Supabase Auth (auth.users)
-- Chạy SAU schema.sql. Mật khẩu do Supabase Auth quản lý (bcrypt trong auth.users),
-- nên ACCOUNTS.password_hash chỉ lưu marker 'SUPABASE_AUTH' để thỏa
-- chk_account_password_hash (ACTIVE/DISABLED bắt buộc NOT NULL).
-- =============================================================================

ALTER TABLE USERS
    ADD COLUMN IF NOT EXISTS auth_user_id UUID NULL UNIQUE
        REFERENCES auth.users (id) ON DELETE SET NULL;

-- Bảng nghiệp vụ chỉ truy cập qua service role ở server, chặn truy cập trực tiếp từ client
ALTER TABLE USERS ENABLE ROW LEVEL SECURITY;
ALTER TABLE ACCOUNTS ENABLE ROW LEVEL SECURITY;
