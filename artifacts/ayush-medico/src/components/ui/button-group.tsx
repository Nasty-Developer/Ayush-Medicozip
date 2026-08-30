<<<<<<< HEAD
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
=======
import { Slot } from '@radix-ui/react-slot';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
>>>>>>> 96e6827 (i;u;;;;j)

const buttonGroupVariants = cva(
  "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
<<<<<<< HEAD
          "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical:
          "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)
=======
          '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none',
        vertical:
          'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  },
);
>>>>>>> 96e6827 (i;u;;;;j)

function ButtonGroup({
  className,
  orientation,
  ...props
<<<<<<< HEAD
}: React.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
=======
}: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>) {
>>>>>>> 96e6827 (i;u;;;;j)
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
<<<<<<< HEAD
  )
=======
  );
>>>>>>> 96e6827 (i;u;;;;j)
}

function ButtonGroupText({
  className,
  asChild = false,
  ...props
<<<<<<< HEAD
}: React.ComponentProps<"div"> & {
  asChild?: boolean
}) {
  const Comp = asChild ? Slot : "div"
=======
}: React.ComponentProps<'div'> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : 'div';
>>>>>>> 96e6827 (i;u;;;;j)

  return (
    <Comp
      className={cn(
        "bg-muted shadow-xs flex items-center gap-2 rounded-md border px-4 text-sm font-medium [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
<<<<<<< HEAD
        className
      )}
      {...props}
    />
  )
=======
        className,
      )}
      {...props}
    />
  );
>>>>>>> 96e6827 (i;u;;;;j)
}

function ButtonGroupSeparator({
  className,
<<<<<<< HEAD
  orientation = "vertical",
=======
  orientation = 'vertical',
>>>>>>> 96e6827 (i;u;;;;j)
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="button-group-separator"
      orientation={orientation}
      className={cn(
<<<<<<< HEAD
        "bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto",
        className
      )}
      {...props}
    />
  )
=======
        'bg-input relative !m-0 self-stretch data-[orientation=vertical]:h-auto',
        className,
      )}
      {...props}
    />
  );
>>>>>>> 96e6827 (i;u;;;;j)
}

export {
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  buttonGroupVariants,
<<<<<<< HEAD
}
=======
};
>>>>>>> 96e6827 (i;u;;;;j)
