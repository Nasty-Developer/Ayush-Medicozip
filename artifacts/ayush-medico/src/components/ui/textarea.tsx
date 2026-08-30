<<<<<<< HEAD
import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
=======
import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>>>>>>> 96e6827 (i;u;;;;j)
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
<<<<<<< HEAD
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
=======
        'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
>>>>>>> 96e6827 (i;u;;;;j)
      )}
      ref={ref}
      {...props}
    />
<<<<<<< HEAD
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
=======
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };
>>>>>>> 96e6827 (i;u;;;;j)
