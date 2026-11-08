import { addDays } from "date-fns";
import { AccountStatus, RoleName } from "../../src/config/business";
import { parseDateOnlyUtc } from "../../src/lib/dates";

export interface SeedUserDef {
  userId: number;
  fullName: string;
  birthDate: Date;
  phone: string;
  email: string | null;
}

export interface SeedUserRoleDef {
  userId: number;
  roleName: RoleName;
}

export interface SeedAccountDef {
  accountId: number;
  userId: number;
  passwordHash: string | null;
  status: AccountStatus;
}

export interface StaffProfileSpec {
  code: string;
  userId: number;
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
  staffRole: RoleName;
  accountStatus: AccountStatus;
  patientAlias: string | null;
}

export const STAFF_PROFILES: readonly StaffProfileSpec[] = [
  { code: "D01", userId: 20001, fullName: "Nguyễn Minh Anh", birthDate: "1982-03-14", phone: "0917000001", email: "d01@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D02", userId: 20002, fullName: "Trần Quốc Bảo", birthDate: "1985-07-22", phone: "0917000002", email: "d02@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D03", userId: 20003, fullName: "Lê Hoàng Nam", birthDate: "1988-11-05", phone: "0917000003", email: "d03@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: "P0596" },
  { code: "D04", userId: 20004, fullName: "Phạm Thu Hà", birthDate: "1984-01-19", phone: "0917000004", email: "d04@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D05", userId: 20005, fullName: "Hoàng Đức Long", birthDate: "1981-09-30", phone: "0917000005", email: "d05@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D06", userId: 20006, fullName: "Huỳnh Ngọc Lan", birthDate: "1987-04-11", phone: "0917000006", email: "d06@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D07", userId: 20007, fullName: "Phan Gia Huy", birthDate: "1986-12-08", phone: "0917000007", email: "d07@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D08", userId: 20008, fullName: "Vũ Thanh Mai", birthDate: "1990-06-25", phone: "0917000008", email: "d08@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D09", userId: 20009, fullName: "Võ Minh Khang", birthDate: "1983-02-17", phone: "0917000009", email: "d09@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D10", userId: 20010, fullName: "Đặng Thảo Vy", birthDate: "1989-10-03", phone: "0917000010", email: "d10@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D11", userId: 20011, fullName: "Nguyễn Quốc Tuấn", birthDate: "1980-08-16", phone: "0917000011", email: "d11@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: "P0597" },
  { code: "D12", userId: 20012, fullName: "Trần Ngọc Linh", birthDate: "1991-05-09", phone: "0917000012", email: "d12@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D13", userId: 20013, fullName: "Lê Minh Quân", birthDate: "1985-03-27", phone: "0917000013", email: "d13@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D14", userId: 20014, fullName: "Phạm Anh Khoa", birthDate: "1982-11-21", phone: "0917000014", email: "d14@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "D15", userId: 20015, fullName: "Hoàng Thanh Sơn", birthDate: "1986-07-13", phone: "0917000015", email: "d15@viclinic.example", staffRole: "DOCTOR", accountStatus: "DISABLED", patientAlias: null },
  { code: "D16", userId: 20016, fullName: "Huỳnh Gia An", birthDate: "1992-01-08", phone: "0917000016", email: "d16@viclinic.example", staffRole: "DOCTOR", accountStatus: "ACTIVE", patientAlias: null },
  { code: "R01", userId: 21001, fullName: "Phan Thị Hạnh", birthDate: "1993-04-18", phone: "0917100001", email: "r01@viclinic.example", staffRole: "RECEPTIONIST", accountStatus: "ACTIVE", patientAlias: null },
  { code: "R02", userId: 21002, fullName: "Vũ Ngọc Trâm", birthDate: "1994-09-07", phone: "0917100002", email: "r02@viclinic.example", staffRole: "RECEPTIONIST", accountStatus: "ACTIVE", patientAlias: "P0598" },
  { code: "R03", userId: 21003, fullName: "Võ Minh Châu", birthDate: "1990-12-15", phone: "0917100003", email: "r03@viclinic.example", staffRole: "RECEPTIONIST", accountStatus: "ACTIVE", patientAlias: null },
  { code: "R04", userId: 21004, fullName: "Đặng Quốc Dũng", birthDate: "1995-02-24", phone: "0917100004", email: "r04@viclinic.example", staffRole: "RECEPTIONIST", accountStatus: "PENDING_ACTIVATION", patientAlias: null },
  { code: "M01", userId: 22001, fullName: "Nguyễn Thanh Bình", birthDate: "1988-05-20", phone: "0917200001", email: "m01@viclinic.example", staffRole: "CLINIC_MANAGER", accountStatus: "ACTIVE", patientAlias: "P0599" },
  { code: "M02", userId: 22002, fullName: "Trần Gia Khánh", birthDate: "1987-10-12", phone: "0917200002", email: "m02@viclinic.example", staffRole: "CLINIC_MANAGER", accountStatus: "ACTIVE", patientAlias: null },
  { code: "A01", userId: 23001, fullName: "Lê Minh Đức", birthDate: "1989-03-06", phone: "0917300001", email: "a01@viclinic.example", staffRole: "ADMIN", accountStatus: "ACTIVE", patientAlias: null },
  { code: "A02", userId: 23002, fullName: "Phạm Ngọc Yến", birthDate: "1991-08-28", phone: "0917300002", email: "a02@viclinic.example", staffRole: "ADMIN", accountStatus: "ACTIVE", patientAlias: "P0600" },
] as const;

const SURNAMES = [
  "Nguyễn",
  "Trần",
  "Lê",
  "Phạm",
  "Hoàng",
  "Huỳnh",
  "Phan",
  "Vũ",
  "Võ",
  "Đặng",
] as const;

const MIDDLES = [
  "Văn",
  "Thị",
  "Minh",
  "Ngọc",
  "Quốc",
  "Gia",
  "Anh",
  "Thanh",
] as const;

const GIVENS = [
  "An",
  "Bình",
  "Châu",
  "Dũng",
  "Giang",
  "Hà",
  "Hạnh",
  "Hùng",
  "Huy",
  "Khang",
  "Khánh",
  "Lan",
  "Linh",
  "Long",
  "Mai",
  "Minh",
  "Nam",
  "Ngân",
  "Ngọc",
  "Phúc",
  "Quân",
  "Sơn",
  "Trang",
  "Trâm",
  "Tuấn",
  "Vy",
  "Yến",
  "Đức",
  "Thảo",
  "Khoa",
] as const;

export function getPatientUserId(patientNumber: number): number {
  if (patientNumber >= 1 && patientNumber <= 595) {
    return 10000 + patientNumber;
  }
  switch (patientNumber) {
    case 596:
      return 20003;
    case 597:
      return 20011;
    case 598:
      return 21002;
    case 599:
      return 22001;
    case 600:
      return 23002;
    default:
      throw new Error(`Invalid patientNumber: ${patientNumber}`);
  }
}

export function getPatientAccountStatus(patientNumber: number): AccountStatus | null {
  if (patientNumber >= 1 && patientNumber <= 150) {
    return null;
  }
  if (patientNumber >= 151 && patientNumber <= 175) {
    return "PENDING_ACTIVATION";
  }
  if (patientNumber >= 176 && patientNumber <= 205) {
    return "DISABLED";
  }
  return "ACTIVE";
}

function computePatientBirthDate(i: number): Date {
  if (i >= 271 && i <= 330) {
    const days = ((i - 271) * 53) % 3650;
    return addDays(parseDateOnlyUtc("2014-01-01"), days);
  }
  if (i >= 331 && i <= 370) {
    const days = ((i - 331) * 41) % 1825;
    return addDays(parseDateOnlyUtc("2009-01-01"), days);
  }
  if (i >= 501 && i <= 550) {
    const days = ((i - 501) * 149) % 7300;
    return addDays(parseDateOnlyUtc("1945-01-01"), days);
  }
  const days = (i * 97) % 14245;
  return addDays(parseDateOnlyUtc("1970-01-01"), days);
}

export function buildIdentitySeedData(demoPasswordHash: string): {
  users: SeedUserDef[];
  userRoles: SeedUserRoleDef[];
  accounts: SeedAccountDef[];
} {
  const users: SeedUserDef[] = [];
  const userRoles: SeedUserRoleDef[] = [];
  const accounts: SeedAccountDef[] = [];

  for (let i = 1; i <= 595; i++) {
    const userId = 10000 + i;
    const surname = SURNAMES[(i - 1) % 10];
    const middle = MIDDLES[Math.floor((i - 1) / 10) % 8];
    const given = GIVENS[Math.floor((i - 1) / 80) % 30];
    const fullName = `${surname} ${middle} ${given}`;
    const phone = `0908${String(i).padStart(6, "0")}`;
    const email =
      i <= 390 ? `p${String(i).padStart(4, "0")}@patient.viclinic.example` : null;
    const birthDate = computePatientBirthDate(i);

    users.push({ userId, fullName, birthDate, phone, email });
    userRoles.push({ userId, roleName: "PATIENT" });

    const accStatus = getPatientAccountStatus(i);
    if (accStatus !== null) {
      accounts.push({
        accountId: userId + 50000,
        userId,
        passwordHash: accStatus === "PENDING_ACTIVATION" ? null : demoPasswordHash,
        status: accStatus,
      });
    }
  }

  for (const st of STAFF_PROFILES) {
    users.push({
      userId: st.userId,
      fullName: st.fullName,
      birthDate: parseDateOnlyUtc(st.birthDate),
      phone: st.phone,
      email: st.email,
    });
    userRoles.push({ userId: st.userId, roleName: st.staffRole });
    if (st.patientAlias !== null) {
      userRoles.push({ userId: st.userId, roleName: "PATIENT" });
    }
    accounts.push({
      accountId: st.userId + 50000,
      userId: st.userId,
      passwordHash: st.accountStatus === "PENDING_ACTIVATION" ? null : demoPasswordHash,
      status: st.accountStatus,
    });
  }

  return { users, userRoles, accounts };
}
