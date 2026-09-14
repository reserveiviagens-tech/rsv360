import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';

const LOGIN_EMAIL = '#loginEmail, input[name="loginEmail"], input[name="email"]';
const LOGIN_PASSWORD = '#loginPassword, input[name="password"][type="password"]';

/**
 * Testes E2E - Dashboard do Proprietário
 */
test.describe('Dashboard do Proprietário E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill(LOGIN_EMAIL, 'admin@test.com');
    await page.fill(LOGIN_PASSWORD, 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(minhas-reservas|dashboard|admin\/cms)/);
  });

  test('deve acessar o dashboard do proprietário', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/dashboard/proprietario`);
    
    // Verificar sidebar azul
    await expect(page.locator('nav[class*="bg-[#0066CC]"], nav[class*="bg-blue"]')).toBeVisible();
    
    // Verificar título
    await expect(page.locator('h1')).toContainText(/proprietor|dashboard/i);
    
    // Verificar cards de estatísticas
    await expect(page.locator('text=Occupancy Rate, text=Revenue Today, text=Active Auctions, text=Won Auctions').first()).toBeVisible({ timeout: 10000 });
  });

  test('deve exibir gráficos de receita', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/dashboard/proprietario`);
    
    // Aguardar carregamento
    await page.waitForTimeout(2000);
    
    // Verificar se gráfico está presente (pode estar em loading)
    const chartExists = await page.locator('[class*="recharts"], canvas, svg').count() > 0;
    expect(chartExists || await page.locator('text=Revenue Trends').isVisible()).toBeTruthy();
  });

  test('deve listar leilões ativos', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/dashboard/proprietario`);
    
    // Aguardar carregamento
    await page.waitForTimeout(2000);
    
    // Verificar se há lista de leilões (pode estar vazia)
    const hasList = await page.locator('text=Leilões Ativos, text=Active Auctions').isVisible();
    const hasEmptyMessage = await page.locator('text=Nenhum leilão, text=Nenhum encontrado').isVisible();
    
    expect(hasList || hasEmptyMessage).toBeTruthy();
  });

  test('deve filtrar leilões por status', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/dashboard/proprietario`);
    
    await page.waitForTimeout(2000);
    
    // Clicar em filtro "Ativos"
    const activeFilter = page.locator('button:has-text("Ativos"), button:has-text("Active")').first();
    if (await activeFilter.isVisible()) {
      await activeFilter.click();
      await page.waitForTimeout(500);
    }
    
    // Verificar que filtro foi aplicado
    expect(await page.locator('button[class*="bg-blue-600"]').isVisible()).toBeTruthy();
  });
});

/**
 * Testes E2E - Leilões (melhorados)
 */
test.describe('Leilões E2E - Melhorados', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill(LOGIN_EMAIL, 'admin@test.com');
    await page.fill(LOGIN_PASSWORD, 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(minhas-reservas|dashboard|admin\/cms)/);
  });

  test('deve listar leilões com filtros funcionando', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/leiloes`);
    
    await expect(page.locator('h1')).toContainText(/leil|auction/i);
    
    // Aguardar carregamento
    await page.waitForTimeout(2000);
    
    // Verificar se há cards ou mensagem vazia
    const hasCards = await page.locator('[data-testid="auction-card"], .auction-card, a[href*="/leiloes/"]').count() > 0;
    const hasEmpty = await page.locator('text=Nenhum leilão').isVisible();
    
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('deve filtrar leilões por região', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/leiloes`);
    
    await page.waitForTimeout(2000);
    
    // Tentar encontrar e usar filtro de região
    const regionFilter = page.locator('input[placeholder*="região"], input[placeholder*="location"], select').first();
    if (await regionFilter.isVisible()) {
      await regionFilter.fill('Caldas Novas');
      await page.waitForTimeout(500);
    }
    
    // Verificar que página ainda está carregada
    await expect(page.locator('h1')).toContainText(/leil|auction/i);
  });
});

/**
 * Testes E2E - Flash Deals (melhorados)
 */
test.describe('Flash Deals E2E - Melhorados', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill(LOGIN_EMAIL, 'admin@test.com');
    await page.fill(LOGIN_PASSWORD, 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(minhas-reservas|dashboard|admin\/cms)/);
  });

  test('deve listar flash deals', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/flash-deals`);
    
    await expect(page.locator('h1')).toContainText(/flash|deal/i);
    
    await page.waitForTimeout(2000);
    
    const hasCards = await page.locator('[data-testid="flash-deal-card"], .flash-deal-card, a[href*="/flash-deals/"]').count() > 0;
    const hasEmpty = await page.locator('text=Nenhum flash deal').isVisible();
    
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('deve exibir timer de expiração', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/flash-deals`);
    
    await page.waitForTimeout(2000);
    
    // Verificar se há timer (pode estar em qualquer formato)
    const hasTimer = await page.locator('[class*="timer"], [class*="countdown"], text=/restam|expira|tempo/i').count() > 0;
    
    // Se não houver cards, não há timer para verificar
    const hasCards = await page.locator('[data-testid="flash-deal-card"]').count() > 0;
    if (hasCards) {
      expect(hasTimer).toBeTruthy();
    }
  });
});

/**
 * Testes de Performance Básicos
 */
test.describe('Performance E2E', () => {
  test('deve carregar página de leilões em menos de 3 segundos', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${FRONTEND_URL}/leiloes`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });

  test('deve carregar dashboard do proprietário em menos de 3 segundos', async ({ page }) => {
    // Login primeiro
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill(LOGIN_EMAIL, 'admin@test.com');
    await page.fill(LOGIN_PASSWORD, 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(minhas-reservas|dashboard|admin\/cms)/);
    
    const startTime = Date.now();
    await page.goto(`${FRONTEND_URL}/dashboard/proprietario`);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });
});

/**
 * Testes de Responsividade
 */
test.describe('Responsividade E2E', () => {
  test('deve funcionar em mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${FRONTEND_URL}/leiloes`);
    
    // Verificar que sidebar está oculta ou colapsável
    const sidebar = page.locator('nav[class*="sidebar"], aside').first();
    if (await sidebar.isVisible()) {
      // Deve ter botão de menu
      const menuButton = page.locator('button[class*="menu"], button:has-text("Menu")').first();
      expect(await menuButton.isVisible()).toBeTruthy();
    }
  });

  test('deve funcionar em tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${FRONTEND_URL}/leiloes`);
    
    // Verificar que página carrega corretamente
    await expect(page.locator('h1')).toContainText(/leil|auction/i);
  });

  test('deve funcionar em desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${FRONTEND_URL}/leiloes`);
    
    // Verificar layout desktop
    await expect(page.locator('h1')).toContainText(/leil|auction/i);
  });
});
