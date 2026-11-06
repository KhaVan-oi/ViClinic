import { test, expect } from '@playwright/test';

test.describe('ViClinic UI & Role Switching Prototype', () => {
  test('should render Header and Role Switcher correctly', async ({ page }) => {
    await page.goto('/');

    // Check brand
    await expect(page.locator('text=ViClinic')).toBeVisible();

    // Check Role Switcher buttons
    await expect(page.locator('button', { hasText: 'Lễ Tân' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Bác Sĩ' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Quản Lý' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Quản Trị Viên' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Bệnh Nhân' })).toBeVisible();
  });

  test('should switch roles and render role-specific views', async ({ page }) => {
    await page.goto('/');

    // 1. Receptionist view contains booking buttons
    await expect(page.locator('text=Đặt lịch khám (PENDING)')).toBeVisible();
    await expect(page.locator('text=Tạo lịch khám đã xác nhận (CONFIRMED)')).toBeVisible();

    // 2. Switch to Doctor view
    await page.click('button:has-text("Bác Sĩ")');
    await expect(page.locator('text=Đánh dấu khoảng không sẵn sàng (UF-15)')).toBeVisible();

    // 3. Switch to Manager view
    await page.click('button:has-text("Quản Lý")');
    await expect(page.locator('text=Phân Ca Làm Việc Bác Sĩ (FR-M03-001)')).toBeVisible();

    // 4. Switch to Admin view
    await page.click('button:has-text("Quản Trị Viên")');
    await expect(page.locator('text=Quản Trị Người Dùng & Phân Quyền (RBAC)')).toBeVisible();

    // 5. Switch to Patient view
    await page.click('button:has-text("Bệnh Nhân")');
    await expect(page.locator('text=Cổng Bệnh Nhân Trực Tuyến')).toBeVisible();
  });
});
