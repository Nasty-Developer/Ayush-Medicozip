<<<<<<< HEAD
import { useToast } from "@/hooks/use-toast"
=======
>>>>>>> 96e6827 (i;u;;;;j)
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
<<<<<<< HEAD
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()
=======
} from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';

export function Toaster() {
  const { toasts } = useToast();
>>>>>>> 96e6827 (i;u;;;;j)

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
<<<<<<< HEAD
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
=======
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
>>>>>>> 96e6827 (i;u;;;;j)
}
