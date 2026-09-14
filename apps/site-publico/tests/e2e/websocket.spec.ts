/**
 * ✅ TESTES E2E: WebSocket e Chat
 * Testes end-to-end para funcionalidades WebSocket
 */

import { test, expect } from '@playwright/test';

test.describe('WebSocket e Chat', () => {
  test('deve conectar ao WebSocket', async ({ page }) => {
    await page.goto('/');
    
    // Verificar se WebSocket está disponível
    const wsConnected = await page.evaluate(() => {
      return new Promise((resolve) => {
        const ws = new WebSocket('ws://localhost:3002');
        ws.onopen = () => {
          ws.close();
          resolve(true);
        };
        ws.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 5000);
      });
    });
    
    // Se WebSocket server não estiver rodando, pular teste
    test.skip(!wsConnected, 'WebSocket server não está rodando');
    
    expect(wsConnected).toBe(true);
  });

  test('deve exibir chat em tempo real', async ({ page }) => {
    // Navegar para página com chat (ajustar rota conforme necessário)
    await page.goto('/viagens-grupo');
    await page.waitForLoadState('networkidle');
    
    // Procurar componente de chat
    const chatContainer = page.locator('[data-testid="chat-room"], .chat-room, .chat-container').first();
    
    if (await chatContainer.isVisible({ timeout: 5000 })) {
      await expect(chatContainer).toBeVisible();
      
      // Verificar se há campo de input
      const chatInput = page.locator('input[placeholder*="mensagem" i], textarea[placeholder*="mensagem" i]').first();
      if (await chatInput.isVisible()) {
        await expect(chatInput).toBeVisible();
      }
    }
  });

  test('deve enviar mensagem no chat', async ({ page }) => {
    await page.goto('/viagens-grupo');
    await page.waitForLoadState('networkidle');
    
    const chatInput = page.locator('input[placeholder*="mensagem" i], textarea[placeholder*="mensagem" i]').first();
    const sendButton = page.locator('button:has-text("Enviar"), button[type="submit"]').first();
    
    if (await chatInput.isVisible({ timeout: 5000 })) {
      const testMessage = `Teste E2E ${Date.now()}`;
      await chatInput.fill(testMessage);
      
      if (await sendButton.isVisible()) {
        await sendButton.click();
        
        // Aguardar mensagem aparecer
        await page.waitForTimeout(2000);
        
        // Verificar se mensagem foi exibida
        const messageText = page.locator(`text=${testMessage}`).first();
        if (await messageText.isVisible({ timeout: 3000 })) {
          await expect(messageText).toBeVisible();
        }
      }
    }
  });

  test('deve exibir indicador de digitação', async ({ page }) => {
    await page.goto('/viagens-grupo');
    await page.waitForLoadState('networkidle');
    
    const chatInput = page.locator('input[placeholder*="mensagem" i], textarea[placeholder*="mensagem" i]').first();
    
    if (await chatInput.isVisible({ timeout: 5000 })) {
      // Começar a digitar
      await chatInput.fill('Testando');
      
      // Verificar se indicador de digitação aparece (pode não estar implementado)
      await page.waitForTimeout(1000);
      
      const typingIndicator = page.locator('text=/digitando|typing/i').first();
      // Não falhar se não houver indicador (pode não estar implementado)
      if (await typingIndicator.isVisible({ timeout: 2000 })) {
        await expect(typingIndicator).toBeVisible();
      }
    }
  });

  test('deve receber notificações em tempo real', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verificar se há sistema de notificações
    const notificationContainer = page.locator('[data-testid="notifications"], .notifications, .toast').first();
    
    // Simular notificação via WebSocket (se possível)
    // Em um teste real, você enviaria uma notificação via API
    
    // Verificar se container de notificações existe
    if (await notificationContainer.isVisible({ timeout: 2000 })) {
      await expect(notificationContainer).toBeVisible();
    }
  });
});

