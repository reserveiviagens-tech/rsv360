import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  rsvAssistantCartOffsetPx,
  rsvColors,
  rsvLayout,
  rsvTouchTargetPx,
  rsvTypography,
  rsvZIndex,
} from '../tokens';

describe('rsv design token contract (F-019)', () => {
  it('exports canonical mockup colors', () => {
    assert.equal(rsvColors.midnight, '#0F172A');
    assert.equal(rsvColors.amber, '#D97706');
    assert.equal(rsvColors.action, '#16A34A');
    assert.equal(rsvColors.canvas, '#F8FAFC');
  });

  it('defines 1360px centered container contract', () => {
    assert.equal(rsvLayout.containerMaxPx, 1360);
    assert.equal(rsvLayout.containerMaxClass, 'max-w-7xl');
  });

  it('enforces 44px minimum touch target', () => {
    assert.equal(rsvTouchTargetPx, 44);
  });

  it('names cart bar z-index 1100 for mobile CartStickyBar', () => {
    assert.equal(rsvZIndex.cartBar, 1100);
  });

  it('documents CaldasAI bottom offset when cart has items', () => {
    assert.equal(rsvAssistantCartOffsetPx, 88);
  });

  it('uses clamp() for fluid title and price', () => {
    assert.match(rsvTypography.fluidTitle, /^clamp\(/);
    assert.match(rsvTypography.fluidPrice, /^clamp\(/);
  });
});