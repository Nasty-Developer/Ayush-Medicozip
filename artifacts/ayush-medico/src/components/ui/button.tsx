<<<<<<< HEAD
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0" +
" hover-elevate active-elevate-2",
=======
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0' +
    ' hover-elevate active-elevate-2',
>>>>>>> 96e6827 (i;u;;;;j)
  {
    variants: {
      variant: {
        default:
<<<<<<< HEAD
           // @replit: no hover, and add primary border
           "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border-destructive-border",
=======
          // @replit: no hover, and add primary border
          'bg-primary text-primary-foreground border border-primary-border',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm border-destructive-border',
>>>>>>> 96e6827 (i;u;;;;j)
        outline:
          // @replit Shows the background color of whatever card / sidebar / accent background it is inside of.
          // Inherits the current text color. Uses shadow-xs. no shadow on active
          // No hover state
<<<<<<< HEAD
          " border [border-color:var(--button-outline)] shadow-xs active:shadow-none ",
        secondary:
          // @replit border, no hover, no shadow, secondary border.
          "border bg-secondary text-secondary-foreground border border-secondary-border ",
        // @replit no hover, transparent border
        ghost: "border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // @replit changed sizes
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
=======
          ' border [border-color:var(--button-outline)] shadow-xs active:shadow-none ',
        secondary:
          // @replit border, no hover, no shadow, secondary border.
          'border bg-secondary text-secondary-foreground border border-secondary-border ',
        // @replit no hover, transparent border
        ghost: 'border border-transparent',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // @replit changed sizes
        default: 'min-h-9 px-4 py-2',
        sm: 'min-h-8 rounded-md px-3 text-xs',
        lg: 'min-h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
>>>>>>> 96e6827 (i;u;;;;j)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
<<<<<<< HEAD
  asChild?: boolean
=======
  asChild?: boolean;
>>>>>>> 96e6827 (i;u;;;;j)
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
<<<<<<< HEAD
    const Comp = asChild ? Slot : "button"
=======
    const Comp = asChild ? Slot : 'button';
>>>>>>> 96e6827 (i;u;;;;j)
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
<<<<<<< HEAD
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
=======
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
>>>>>>> 96e6827 (i;u;;;;j)
