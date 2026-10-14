'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type {
  DialogContentProps,
  DialogDescriptionProps,
  DialogOverlayProps,
  DialogTitleProps,
} from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { radixCreate, radixRoot, radixUiExport } from '@/lib/radix-jsx';

const Sheet = radixRoot(DialogPrimitive.Root);
const SheetTrigger = radixRoot(DialogPrimitive.Trigger);
const SheetPortal = radixRoot(DialogPrimitive.Portal);
const SheetClose = DialogPrimitive.Close;

const SheetOverlay = radixUiExport<DialogOverlayProps, HTMLDivElement>(
  React.forwardRef<HTMLDivElement, DialogOverlayProps>(function SheetOverlay({ className, ...props }, ref) {
    return radixCreate(DialogPrimitive.Overlay, {
      ref,
      className: cn(
        'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        className,
      ),
      ...props,
    });
  }) as React.FC<DialogOverlayProps & React.RefAttributes<HTMLDivElement>>,
);
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const SheetContent = radixUiExport<DialogContentProps, HTMLDivElement>(
  React.forwardRef<HTMLDivElement, DialogContentProps>(function SheetContent(
    { className, children, ...props },
    ref,
  ) {
    return (
      <SheetPortal>
        <SheetOverlay />
        {radixCreate(DialogPrimitive.Content, {
          ref,
          className: cn(
            'fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col border-l bg-background shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            className,
          ),
          ...props,
          children: [
            children,
            radixCreate(DialogPrimitive.Close, {
              className:
                'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              children: [
                <X key="x" className="h-4 w-4" />,
                <span key="sr" className="sr-only">
                  Fechar
                </span>,
              ],
            }),
          ],
        })}
      </SheetPortal>
    );
  }) as React.FC<DialogContentProps & React.RefAttributes<HTMLDivElement>>,
);
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 border-b px-6 py-4 text-left', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('mt-auto flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end', className)}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = radixUiExport<DialogTitleProps, HTMLHeadingElement>(
  React.forwardRef<HTMLHeadingElement, DialogTitleProps>(function SheetTitle({ className, ...props }, ref) {
    return radixCreate(DialogPrimitive.Title, {
      ref,
      className: cn('text-lg font-semibold leading-none tracking-tight', className),
      ...props,
    });
  }) as React.FC<DialogTitleProps & React.RefAttributes<HTMLHeadingElement>>,
);
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = radixUiExport<DialogDescriptionProps, HTMLParagraphElement>(
  React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(function SheetDescription(
    { className, ...props },
    ref,
  ) {
    return radixCreate(DialogPrimitive.Description, {
      ref,
      className: cn('text-sm text-muted-foreground', className),
      ...props,
    });
  }) as React.FC<DialogDescriptionProps & React.RefAttributes<HTMLParagraphElement>>,
);
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
