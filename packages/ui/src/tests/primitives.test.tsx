import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  badgeVariants,
  buttonVariants,
  getStepperValueAfterDelta,
  NumericStepper,
  rsvTouchTargetPx,
} from '../index';

describe('F-020 ui primitives', () => {
  it('exports button variant names', () => {
    assert.deepEqual([...buttonVariants], ['primary', 'outline', 'ghost', 'amber']);
  });

  it('renders Button variants and loading/disabled states', () => {
    for (const variant of buttonVariants) {
      const html = renderToStaticMarkup(
        <Button variant={variant}>Comprar</Button>,
      );
      assert.match(html, /rsv-button/);
      assert.match(html, new RegExp(`data-variant="${variant}"`));
    }
    const loading = renderToStaticMarkup(<Button loading>Aguarde</Button>);
    assert.match(loading, /data-loading="true"/);
    assert.match(loading, /aria-busy="true"/);

    const disabled = renderToStaticMarkup(<Button disabled>Off</Button>);
    assert.match(disabled, /disabled/);
  });

  it('NumericStepper uses 44px touch targets and getStepperValueAfterDelta respects bounds', () => {
    const html = renderToStaticMarkup(
      <NumericStepper value={2} min={0} max={10} onChange={() => {}} />,
    );
    assert.match(html, new RegExp(`data-touch-min-px="${rsvTouchTargetPx}"`));
    assert.match(html, /min-width:44px/);
    assert.match(html, /min-height:44px/);

    assert.equal(getStepperValueAfterDelta(2, -1, 0, 10), 1);
    assert.equal(getStepperValueAfterDelta(0, -1, 0, 10), 0);
    assert.equal(getStepperValueAfterDelta(10, 1, 0, 10), 10);
  });

  it('exports badge variants and renders each', () => {
    assert.deepEqual([...badgeVariants], ['default', 'amber', 'outline', 'success']);
    for (const variant of badgeVariants) {
      const html = renderToStaticMarkup(
        <Badge variant={variant}>15% OFF</Badge>,
      );
      assert.match(html, /rsv-badge/);
      assert.match(html, new RegExp(`data-variant="${variant}"`));
    }
  });

  it('renders Accordion API with default open item', () => {
    const html = renderToStaticMarkup(
      <Accordion type="single" defaultValue="hot-park">
        <AccordionItem value="hot-park">
          <AccordionTrigger>Hot Park</AccordionTrigger>
          <AccordionContent>Ingressos</AccordionContent>
        </AccordionItem>
        <AccordionItem value="diroma">
          <AccordionTrigger>diRoma</AccordionTrigger>
          <AccordionContent>Oculto</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    assert.match(html, /data-rsv-accordion-root/);
    assert.match(html, /aria-expanded="true"/);
    assert.match(html, /Ingressos/);
    assert.doesNotMatch(html, /Oculto/);
  });
});