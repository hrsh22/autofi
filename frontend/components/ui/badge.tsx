import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center border-2 border-black px-3 py-1 text-xs font-black w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-black focus-visible:ring-0 transition-all overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-black border-black [a&]:hover:bg-[#FF4D7A]",
        secondary:
          "bg-secondary text-white border-black [a&]:hover:bg-[#A83A5A]",
        destructive:
          "bg-destructive text-black border-black [a&]:hover:bg-[#FF0000]",
        outline:
          "bg-white text-black border-black [a&]:hover:bg-[#00D9FF]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
