import * as React from 'react';
import { cn } from '../lib/cn';

type AccordionType = 'single' | 'multiple';

interface AccordionContextValue {
  type: AccordionType;
  openItems: Set<string>;
  toggle: (itemValue: string) => void;
  collapsible: boolean;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<string | null>(null);

function useAccordionContext() {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error('Accordion components must be used within Accordion');
  return ctx;
}

function useAccordionItemValue() {
  const value = React.useContext(AccordionItemContext);
  if (value === null) throw new Error('AccordionTrigger/Content must be inside AccordionItem');
  return value;
}

function toSetFromValue(value: string | string[] | undefined): Set<string> {
  if (value === undefined) return new Set();
  if (Array.isArray(value)) return new Set(value);
  return value ? new Set([value]) : new Set();
}

function emitValue(type: AccordionType, set: Set<string>): string | string[] {
  if (type === 'single') return set.size ? [...set][0]! : '';
  return [...set];
}

export interface AccordionProps {
  type?: AccordionType;
  collapsible?: boolean;
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children: React.ReactNode;
  className?: string;
}

export function Accordion({
  type = 'single',
  collapsible = true,
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: AccordionProps) {
  const [uncontrolled, setUncontrolled] = React.useState<Set<string>>(() =>
    toSetFromValue(defaultValue),
  );
  const isControlled = value !== undefined;
  const openItems = isControlled ? toSetFromValue(value) : uncontrolled;

  const toggle = React.useCallback(
    (itemValue: string) => {
      const next = new Set(openItems);
      if (type === 'single') {
        if (next.has(itemValue) && collapsible) next.delete(itemValue);
        else {
          next.clear();
          next.add(itemValue);
        }
      } else if (next.has(itemValue)) next.delete(itemValue);
      else next.add(itemValue);

      if (!isControlled) setUncontrolled(next);
      onValueChange?.(emitValue(type, next));
    },
    [openItems, type, collapsible, isControlled, onValueChange],
  );

  const ctx = React.useMemo(
    () => ({ type, openItems, toggle, collapsible }),
    [type, openItems, toggle, collapsible],
  );

  return (
    <div className={cn('rsv-accordion', className)} data-rsv-accordion-root>
      <AccordionContext.Provider value={ctx}>{children}</AccordionContext.Provider>
    </div>
  );
}

export interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function AccordionItem({ value, children, className }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={value}>
      <div className={cn('rsv-accordion-item border-b', className)} data-rsv-accordion-item={value}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export interface AccordionTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AccordionTrigger({ className, children, ...props }: AccordionTriggerProps) {
  const { openItems, toggle } = useAccordionContext();
  const itemValue = useAccordionItemValue();
  const open = openItems.has(itemValue);

  return (
    <button
      type="button"
      className={cn(
        'rsv-accordion-trigger flex w-full items-center justify-between py-4 text-left font-medium',
        className,
      )}
      aria-expanded={open}
      data-state={open ? 'open' : 'closed'}
      onClick={() => toggle(itemValue)}
      {...props}
    >
      {children}
    </button>
  );
}

export interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

export function AccordionContent({ children, className }: AccordionContentProps) {
  const { openItems } = useAccordionContext();
  const itemValue = useAccordionItemValue();
  const open = openItems.has(itemValue);

  if (!open) return null;

  return (
    <div
      className={cn('rsv-accordion-content pb-4', className)}
      role="region"
      data-state="open"
      hidden={!open}
    >
      {children}
    </div>
  );
}