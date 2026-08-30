<<<<<<< HEAD
import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"
=======
import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
>>>>>>> 96e6827 (i;u;;;;j)

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
<<<<<<< HEAD
      "relative flex w-full touch-none select-none items-center",
      className
=======
      'relative flex w-full touch-none select-none items-center',
      className,
>>>>>>> 96e6827 (i;u;;;;j)
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
<<<<<<< HEAD
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
=======
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
>>>>>>> 96e6827 (i;u;;;;j)
