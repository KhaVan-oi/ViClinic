# Password Hashing Specification (`password_hash`) & Seed Accounts

This document outlines the password hashing standards for the **ViClinic** system, adhering strictly to Non-Functional Requirement **NFR-012** (*Protection of Authentication Credentials: Passwords must not be stored or transmitted in plain text*).

---

## 1. Hashing Algorithm

The system adopts the **Bcrypt** (`$2b$`) hashing algorithm with a standard cost factor (work factor / salt rounds) of **10** ($2^{10} = 1024$ rounds).

### Bcrypt Hash Structure Breakdown
Example hash string for the Administrator account:
```text
$2b$10$tZ92E7c1o3K6eEwW2qR5uuY0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi
├──┴──┼──────────────────────┼───────────────────────────────┤
 $2b$  10$  tZ92E7c1o3K6eEwW2qR5uu   Y0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi
  (1)  (2)           (3)                           (4)
```

1. **`$2b$`**: Identifies the latest Bcrypt algorithm specification.
2. **`10$`**: Cost factor of 10 ($2^{10}$ iterations), providing robust defense against offline brute-force and dictionary attacks while maintaining low latency during login ($< 100\text{ ms}$).
3. **`tZ92E7c1o3K6eEwW2qR5uu`**: 22 automatically generated Base64-encoded salt characters (16 random bytes) defeating precomputed Rainbow Table lookups.
4. **`Y0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi`**: 31-character resulting hash ciphertext.

---

## 2. Application Layer Hashing and Verification

### 2.1. Node.js (e.g., using `bcrypt` / `bcryptjs`)
```javascript
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

// When creating a new account or updating a password:
async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// When authenticating credentials:
async function verifyPassword(inputPassword, storedHash) {
  return await bcrypt.compare(inputPassword, storedHash);
}
```

### 2.2. Python (e.g., using `passlib` or `bcrypt`)
```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

> [!WARNING]
> Legacy unsalted hash algorithms such as MD5, SHA-1, or plain SHA-256 must NEVER be used for credential storage.

---

## 3. Seed Accounts & Test Credentials Lookup Table

All test accounts below are pre-populated in [`seed.js`](seed.js) (executed automatically via `npm run prisma:seed`) for testing and verification purposes:

| User ID | Full Name | Phone (Username) | Role (`USER_ROLES`) | Status (`ACCOUNTS`) | Test Password (Plaintext) | Password Hash String (`Bcrypt`) |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- |
| **1** | Nguyen Quan Tri | `0900000001` | `ADMIN` | `ACTIVE` | `Admin@2026` | `$2b$10$tZ92E7c1o3K6eEwW2qR5uuY0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi` |
| **2** | Tran Quan Ly | `0900000002` | `CLINIC_MANAGER` | `ACTIVE` | `Manager@2026` | `$2b$10$wN35R9u7z1K8qQwO1tP4eeY3mO6bU8iK5.l7vR9cT1hG3k5oJ9vMa` |
| **3** | Le Phuoc Thinh | `0900000003` | `RECEPTIONIST` | `ACTIVE` | `Letan@2026` | `$2b$10$xL12Y8v9z3M5rRyP3wQ6uuZ4nP7cV0jL7.m9wS1dU3iH5l7pJ1vNa` |
| **4** | Dr. Tran Van Tuan | `0911000001` | `DOCTOR` | `ACTIVE` | `DocTuan#1` | `$2b$10$kP45T1w3z5O7tTzR5yS8uuA6pS9eX2lM9.o1yU3fW5kI7n9rL3vPa` |
| **5** | Dr. Nguyen Thi Lan | `0911000002` | `DOCTOR` | `ACTIVE` | `DocLan#2` | `$2b$10$mR67V3y5z7Q9vVbT7zU0uuB8rU1gZ4nO1.q3zW5hY7mK9p1tN5vRa` |
| **6** | Dr. Le Quang Hung | `0911000003` | `DOCTOR` | `ACTIVE` | `DocHung#3` | `$2b$10$oT89X5z7z9S1xXdF9aW2uuC0tW3ib6pQ3.s5bY7jA9oM1r3vP7vTa` |
| **7** | Dr. Pham Thanh Mai | `0911000004` | `DOCTOR` | `ACTIVE` | `DocMai#4` | `$2b$10$qV01Z7b9z1U3zZfH1bY4uuD2vY5kd8rS5.u7dZ9lC1qO3t5xR9vVa` |
| **8** | Dr. Vu Hoang Nam | `0911000005` | `DOCTOR` | `ACTIVE` | `DocNam#5` | `$2b$10$sX23B9d1z3W5bBhJ3cZ6uuE4xZ7mf0tU7.w9fZ1nD3sQ5v7zT1vXa` |
| **9** | Le Hoai An | `0922000001` | `PATIENT` | `ACTIVE` | `HoaiAn@123` | `$2b$10$uZ45D1f3z5Y7dDjL5d08uuF6zB9nh2vW9.y1hB3pE5uS7x9bV3vZa` |
| **10** | Pham Quoc Binh | `0922000002` | `PATIENT` | `ACTIVE` | `QuocBinh@456` | `$2b$10$wA67F3h5z7A9fFlN7e20uuG8bC1pj4xY1.03jD5rG7wU9z1dX5vba` |
| **11** | Do Minh Tri | `0922000003` | `PATIENT` | `PENDING_ACTIVATION` | *(No password set)* | `NULL` |
| **12** | Vu Minh Khang | `0922000004` | `PATIENT` | `DISABLED` | `KhoaAcc#789` | `$2b$10$yC89H5j7z9C1hHpP9g42uuI0dE3rl6zZ3.25lF7tI9yW1b3fZ7vda` |
