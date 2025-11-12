import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-black/60 selection:bg-primary selection:text-black border-black h-11 w-full min-w-0 border-4 bg-white px-4 py-2 text-base font-bold transition-all outline-none file:inline-flex file:h-9 file:border-4 file:border-black file:bg-white file:text-sm file:font-black disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-black focus-visible:ring-0 focus-visible:shadow-[4px_4px_0px_#000000]",
        "aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
