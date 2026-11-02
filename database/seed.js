// prisma/seed.js
// Seeding script for ViClinic database using Prisma Client
// Satisfies NFR-001 / NFR-010: Exactly 5 doctors and 1,000 appointments

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing database records...');

  // Delete records in reverse foreign-key dependency order
  await prisma.notification.deleteMany();
  await prisma.appointmentHistory.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorService.deleteMany();
  await prisma.doctorUnavailability.deleteMany();
  await prisma.doctorShift.deleteMany();
  await prisma.service.deleteMany();
  await prisma.account.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding users and roles...');

  const usersData = [
    { user_id: 1, full_name: 'Nguyễn Quản Trị', birth_date: new Date('1985-01-10'), phone: '0900000001', email: 'admin@viclinic.vn' },
    { user_id: 2, full_name: 'Trần Quản Lý', birth_date: new Date('1987-05-15'), phone: '0900000002', email: 'manager@viclinic.vn' },
    { user_id: 3, full_name: 'Lê Phước Thịnh', birth_date: new Date('1996-03-20'), phone: '0900000003', email: 'lephuocthinh@viclinic.vn' },
    { user_id: 4, full_name: 'BS. CK1 Trần Văn Tuấn', birth_date: new Date('1980-06-12'), phone: '0911000001', email: 'tuan.tran@viclinic.vn' },
    { user_id: 5, full_name: 'ThS. BS Nguyễn Thị Lan', birth_date: new Date('1985-09-24'), phone: '0911000002', email: 'lan.nguyen@viclinic.vn' },
    { user_id: 6, full_name: 'BS. CKI Lê Quang Hưng', birth_date: new Date('1979-11-03'), phone: '0911000003', email: 'hung.le@viclinic.vn' },
    { user_id: 7, full_name: 'ThS. BS Phạm Thanh Mai', birth_date: new Date('1988-02-18'), phone: '0911000004', email: 'mai.pham@viclinic.vn' },
    { user_id: 8, full_name: 'BS. CKII Vũ Hoàng Nam', birth_date: new Date('1975-08-30'), phone: '0911000005', email: 'nam.vu@viclinic.vn' },
    { user_id: 9, full_name: 'Lê Hoài An', birth_date: new Date('2001-02-15'), phone: '0922000001', email: 'hoaian@gmail.com' },
    { user_id: 10, full_name: 'Phạm Quốc Bình', birth_date: new Date('1998-09-30'), phone: '0922000002', email: 'quocbinh@gmail.com' },
    { user_id: 11, full_name: 'Đỗ Minh Trí', birth_date: new Date('1995-12-05'), phone: '0922000003', email: 'minhtri@gmail.com' },
    { user_id: 12, full_name: 'Vũ Minh Khang', birth_date: new Date('1992-07-18'), phone: '0922000004', email: 'vuminhkhang92@gmail.com' },
  ];

  await prisma.user.createMany({ data: usersData });

  const rolesData = [
    { user_id: 1, role: 'ADMIN' },
    { user_id: 2, role: 'CLINIC_MANAGER' },
    { user_id: 3, role: 'RECEPTIONIST' },
    { user_id: 4, role: 'DOCTOR' },
    { user_id: 5, role: 'DOCTOR' },
    { user_id: 6, role: 'DOCTOR' },
    { user_id: 7, role: 'DOCTOR' },
    { user_id: 8, role: 'DOCTOR' },
    { user_id: 9, role: 'PATIENT' },
    { user_id: 10, role: 'PATIENT' },
    { user_id: 11, role: 'PATIENT' },
    { user_id: 12, role: 'PATIENT' },
  ];

  await prisma.userRole.createMany({ data: rolesData });

  console.log('Seeding accounts...');

  const accountsData = [
    { account_id: 1, user_id: 1, password_hash: '$2b$10$tZ92E7c1o3K6eEwW2qR5uuY0zP4vR2lP3.k4hO6bQ8gE0o9mH7vLi', status: 'ACTIVE' },
    { account_id: 2, user_id: 2, password_hash: '$2b$10$wN35R9u7z1K8qQwO1tP4eeY3mO6bU8iK5.l7vR9cT1hG3k5oJ9vMa', status: 'ACTIVE' },
    { account_id: 3, user_id: 3, password_hash: '$2b$10$xL12Y8v9z3M5rRyP3wQ6uuZ4nP7cV0jL7.m9wS1dU3iH5l7pJ1vNa', status: 'ACTIVE' },
    { account_id: 4, user_id: 4, password_hash: '$2b$10$kP45T1w3z5O7tTzR5yS8uuA6pS9eX2lM9.o1yU3fW5kI7n9rL3vPa', status: 'ACTIVE' },
    { account_id: 5, user_id: 5, password_hash: '$2b$10$mR67V3y5z7Q9vVbT7zU0uuB8rU1gZ4nO1.q3zW5hY7mK9p1tN5vRa', status: 'ACTIVE' },
    { account_id: 6, user_id: 6, password_hash: '$2b$10$oT89X5z7z9S1xXdF9aW2uuC0tW3ib6pQ3.s5bY7jA9oM1r3vP7vTa', status: 'ACTIVE' },
    { account_id: 7, user_id: 7, password_hash: '$2b$10$qV01Z7b9z1U3zZfH1bY4uuD2vY5kd8rS5.u7dZ9lC1qO3t5xR9vVa', status: 'ACTIVE' },
    { account_id: 8, user_id: 8, password_hash: '$2b$10$sX23B9d1z3W5bBhJ3cZ6uuE4xZ7mf0tU7.w9fZ1nD3sQ5v7zT1vXa', status: 'ACTIVE' },
    { account_id: 9, user_id: 9, password_hash: '$2b$10$uZ45D1f3z5Y7dDjL5d08uuF6zB9nh2vW9.y1hB3pE5uS7x9bV3vZa', status: 'ACTIVE' },
    { account_id: 10, user_id: 10, password_hash: '$2b$10$wA67F3h5z7A9fFlN7e20uuG8bC1pj4xY1.03jD5rG7wU9z1dX5vba', status: 'ACTIVE' },
    { account_id: 11, user_id: 11, password_hash: null, status: 'PENDING_ACTIVATION' },
    { account_id: 12, user_id: 12, password_hash: '$2b$10$yC89H5j7z9C1hHpP9g42uuI0dE3rl6zZ3.25lF7tI9yW1b3fZ7vda', status: 'DISABLED' },
  ];

  await prisma.account.createMany({ data: accountsData });

  console.log('Seeding services and doctor allocations...');

  const servicesData = [
    { service_id: 1, name: 'Khám Tổng Quát Nội Khoa', duration_minutes: 30, is_active: true },
    { service_id: 2, name: 'Khám Chuyên Khoa Tim Mạch', duration_minutes: 45, is_active: true },
    { service_id: 3, name: 'Khám Chuyên Khoa Nhi', duration_minutes: 30, is_active: true },
    { service_id: 4, name: 'Tư Vấn Dinh Dưỡng Chuyên Sâu', duration_minutes: 30, is_active: true },
    { service_id: 5, name: 'Dịch Vụ Khám Cũ Ngừng Áp Dụng', duration_minutes: 60, is_active: false },
  ];

  await prisma.service.createMany({ data: servicesData });

  const doctorServicesData = [
    { doctor_id: 4, service_id: 1 },
    { doctor_id: 4, service_id: 2 },
    { doctor_id: 5, service_id: 1 },
    { doctor_id: 5, service_id: 4 },
    { doctor_id: 6, service_id: 1 },
    { doctor_id: 6, service_id: 2 },
    { doctor_id: 7, service_id: 1 },
    { doctor_id: 7, service_id: 3 },
    { doctor_id: 8, service_id: 1 },
    { doctor_id: 8, service_id: 4 },
  ];

  await prisma.doctorService.createMany({ data: doctorServicesData });

  console.log('Seeding shifts and unavailability...');

  const shiftsData = [
    { shift_id: 1, doctor_id: 4, start_at: new Date('2026-11-01T08:00:00+07:00'), end_at: new Date('2026-11-01T12:00:00+07:00') },
    { shift_id: 2, doctor_id: 4, start_at: new Date('2026-11-02T08:00:00+07:00'), end_at: new Date('2026-11-02T12:00:00+07:00') },
    { shift_id: 3, doctor_id: 4, start_at: new Date('2026-11-02T13:30:00+07:00'), end_at: new Date('2026-11-02T17:30:00+07:00') },
    { shift_id: 4, doctor_id: 5, start_at: new Date('2026-11-02T08:00:00+07:00'), end_at: new Date('2026-11-02T12:00:00+07:00') },
    { shift_id: 5, doctor_id: 6, start_at: new Date('2026-11-02T08:00:00+07:00'), end_at: new Date('2026-11-02T12:00:00+07:00') },
    { shift_id: 6, doctor_id: 7, start_at: new Date('2026-11-03T08:00:00+07:00'), end_at: new Date('2026-11-03T12:00:00+07:00') },
    { shift_id: 7, doctor_id: 8, start_at: new Date('2026-11-03T13:30:00+07:00'), end_at: new Date('2026-11-03T17:30:00+07:00') },
  ];

  await prisma.doctorShift.createMany({ data: shiftsData });

  await prisma.doctorUnavailability.create({
    data: {
      unavailability_id: 1,
      doctor_id: 4,
      start_at: new Date('2026-11-02T10:00:00+07:00'),
      end_at: new Date('2026-11-02T11:00:00+07:00'),
    },
  });

  console.log('Generating 1,000 valid appointments...');

  const pairs = [
    { doctor_id: 4, service_id: 1, duration: 30 },
    { doctor_id: 4, service_id: 2, duration: 45 },
    { doctor_id: 5, service_id: 1, duration: 30 },
    { doctor_id: 5, service_id: 4, duration: 30 },
    { doctor_id: 6, service_id: 1, duration: 30 },
    { doctor_id: 6, service_id: 2, duration: 45 },
    { doctor_id: 7, service_id: 1, duration: 30 },
    { doctor_id: 7, service_id: 3, duration: 30 },
    { doctor_id: 8, service_id: 1, duration: 30 },
    { doctor_id: 8, service_id: 4, duration: 30 },
  ];

  const serviceDurations = { 1: 30, 2: 45, 3: 30, 4: 30, 5: 60 };
  const appointments = [];

  for (let s = 1; s <= 1000; s++) {
    const pair = pairs[(s - 1) % 10];
    let patient_id = 9 + ((s - 1) % 4);
    let doctor_id = pair.doctor_id;
    let service_id = pair.service_id;
    let start_at;
    let status;

    if (s <= 700) {
      status = 'COMPLETED';
      const day = Math.floor((s - 1) / 10);
      const slot = (s - 1) % 10;
      const base = new Date('2026-08-01T08:00:00+07:00').getTime();
      start_at = new Date(base + day * 86400000 + slot * 50 * 60000);
    } else if (s <= 850) {
      status = 'CANCELLED';
      if (s === 701) {
        patient_id = 10;
        doctor_id = 4;
        service_id = 1;
        start_at = new Date('2026-08-16T14:00:00+07:00');
      } else {
        const idx = s - 702;
        const day = Math.floor(idx / 6);
        const slot = idx % 6;
        const base = new Date('2026-08-17T08:30:00+07:00').getTime();
        start_at = new Date(base + day * 86400000 + slot * 3600000);
      }
    } else if (s <= 950) {
      status = 'CONFIRMED';
      if (s === 851) {
        patient_id = 9;
        doctor_id = 4;
        service_id = 1;
        start_at = new Date('2026-11-01T08:00:00+07:00');
      } else {
        const idx = s - 851;
        const day = Math.floor(idx / 5);
        const slot = idx % 5;
        const offsets = [0, 1, 2, 5.5, 6.5];
        const base = new Date('2026-11-01T08:00:00+07:00').getTime();
        start_at = new Date(base + day * 86400000 + Math.round(offsets[slot] * 3600000));
      }
    } else {
      status = 'PENDING';
      if (s > 975) {
        doctor_id = null;
        service_id = 1 + ((s - 1) % 4);
      }
      const idx = s - 951;
      const day = Math.floor(idx / 5);
      const slot = idx % 5;
      const offsets = [0, 1, 2, 5.5, 6.5];
      const base = new Date('2026-11-21T08:00:00+07:00').getTime();
      start_at = new Date(base + day * 86400000 + Math.round(offsets[slot] * 3600000));
    }

    const duration = serviceDurations[service_id];
    const end_at = new Date(start_at.getTime() + duration * 60000);

    appointments.push({
      appointment_id: s,
      patient_id,
      service_id,
      doctor_id,
      start_at,
      end_at,
      status,
    });
  }

  await prisma.appointment.createMany({ data: appointments });

  console.log('Seeding sample history and notifications...');

  await prisma.appointmentHistory.createMany({
    data: [
      {
        history_id: 1,
        appointment_id: 851,
        actor_user_id: 9,
        old_doctor_id: null,
        new_doctor_id: 4,
        changed_at: new Date('2026-10-25T09:00:00+07:00'),
        old_status: null,
        new_status: 'PENDING',
        old_start_at: null,
        new_start_at: new Date('2026-11-01T08:00:00+07:00'),
        old_end_at: null,
        new_end_at: new Date('2026-11-01T08:30:00+07:00'),
      },
      {
        history_id: 2,
        appointment_id: 851,
        actor_user_id: 3,
        old_doctor_id: 4,
        new_doctor_id: 4,
        changed_at: new Date('2026-10-25T09:30:00+07:00'),
        old_status: 'PENDING',
        new_status: 'CONFIRMED',
        old_start_at: new Date('2026-11-01T08:00:00+07:00'),
        new_start_at: new Date('2026-11-01T08:00:00+07:00'),
        old_end_at: new Date('2026-11-01T08:30:00+07:00'),
        new_end_at: new Date('2026-11-01T08:30:00+07:00'),
      },
      {
        history_id: 3,
        appointment_id: 701,
        actor_user_id: 10,
        old_doctor_id: 4,
        new_doctor_id: 4,
        changed_at: new Date('2026-08-16T10:00:00+07:00'),
        old_status: 'CONFIRMED',
        new_status: 'CANCELLED',
        old_start_at: new Date('2026-08-16T14:00:00+07:00'),
        new_start_at: new Date('2026-08-16T14:00:00+07:00'),
        old_end_at: new Date('2026-08-16T14:30:00+07:00'),
        new_end_at: new Date('2026-08-16T14:30:00+07:00'),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        notification_id: 1,
        appointment_id: 851,
        recipient_user_id: 9,
        content: 'Lịch hẹn khám của bạn vào lúc 08:00 ngày 01/11/2026 đã được xác nhận thành công.',
        created_at: new Date('2026-10-25T09:30:00+07:00'),
      },
      {
        notification_id: 2,
        appointment_id: 851,
        recipient_user_id: 4,
        content: 'Bác sĩ có lịch hẹn mới từ bệnh nhân Lê Hoài An lúc 08:00 ngày 01/11/2026.',
        created_at: new Date('2026-10-25T09:30:00+07:00'),
      },
      {
        notification_id: 3,
        appointment_id: 701,
        recipient_user_id: 4,
        content: 'Bệnh nhân Phạm Quốc Bình đã hủy lịch hẹn ngày 16/08/2026.',
        created_at: new Date('2026-08-16T10:00:00+07:00'),
      },
    ],
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

