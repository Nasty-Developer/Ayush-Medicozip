<<<<<<< HEAD
import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
=======
import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
>>>>>>> 96e6827 (i;u;;;;j)

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
<<<<<<< HEAD
      "grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
      className
=======
      'grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      className,
>>>>>>> 96e6827 (i;u;;;;j)
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
<<<<<<< HEAD
      className={cn("grid place-content-center text-current")}
=======
      className={cn('grid place-content-center text-current')}
>>>>>>> 96e6827 (i;u;;;;j)
    >
      <Check className="h-4 w-4" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
<<<<<<< HEAD
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
=======
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
>>>>>>> 96e6827 (i;u;;;;j)
