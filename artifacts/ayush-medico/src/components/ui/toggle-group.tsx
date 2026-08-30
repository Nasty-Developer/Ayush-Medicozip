<<<<<<< HEAD
"use client"

import * as React from "react"
import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { toggleVariants } from "@/components/ui/toggle"
=======
'use client';

import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { type VariantProps } from 'class-variance-authority';
>>>>>>> 96e6827 (i;u;;;;j)

const ToggleGroupContext = React.createContext<
  VariantProps<typeof toggleVariants>
>({
<<<<<<< HEAD
  size: "default",
  variant: "default",
})
=======
  size: 'default',
  variant: 'default',
});
>>>>>>> 96e6827 (i;u;;;;j)

const ToggleGroup = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => (
  <ToggleGroupPrimitive.Root
    ref={ref}
<<<<<<< HEAD
    className={cn("flex items-center justify-center gap-1", className)}
=======
    className={cn('flex items-center justify-center gap-1', className)}
>>>>>>> 96e6827 (i;u;;;;j)
    {...props}
  >
    <ToggleGroupContext.Provider value={{ variant, size }}>
      {children}
    </ToggleGroupContext.Provider>
  </ToggleGroupPrimitive.Root>
<<<<<<< HEAD
))

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName
=======
));

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;
>>>>>>> 96e6827 (i;u;;;;j)

const ToggleGroupItem = React.forwardRef<
  React.ElementRef<typeof ToggleGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, ...props }, ref) => {
<<<<<<< HEAD
  const context = React.useContext(ToggleGroupContext)
=======
  const context = React.useContext(ToggleGroupContext);
>>>>>>> 96e6827 (i;u;;;;j)

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
<<<<<<< HEAD
        className
=======
        className,
>>>>>>> 96e6827 (i;u;;;;j)
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
<<<<<<< HEAD
  )
})

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName

export { ToggleGroup, ToggleGroupItem }
=======
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
>>>>>>> 96e6827 (i;u;;;;j)
