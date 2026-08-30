<<<<<<< HEAD
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
=======
import { cn } from '@/lib/utils';
import { Loader2Icon } from 'lucide-react';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
>>>>>>> 96e6827 (i;u;;;;j)
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
<<<<<<< HEAD
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
=======
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
>>>>>>> 96e6827 (i;u;;;;j)
