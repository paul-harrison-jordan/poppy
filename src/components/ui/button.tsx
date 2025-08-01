import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 kinetic-button hover:-translate-y-0.5 active:translate-y-0",
  {
    variants: {
      variant: {
        // Primary CTA - Poppy brand
        default: "bg-gradient-to-r from-poppy-primary to-poppy-primary/90 text-poppy-primary-foreground hover:from-poppy-primary-hover hover:to-poppy-primary/80 elevation-poppy hover:elevation-lg",
        
        // Success actions - Sprout brand
        success: "bg-gradient-to-r from-sprout-success to-sprout-success/90 text-sprout-success-foreground hover:from-sprout-success-hover hover:to-sprout-success/80 elevation-sprout hover:elevation-lg",
        
        // Secondary actions - Lavender brand
        secondary: "bg-gradient-to-r from-lavender-secondary-light to-lavender-secondary-light/90 text-lavender-secondary-foreground hover:bg-lavender-secondary-light/80 elevation-sm hover:elevation-md",
        
        // Warning/Alert actions
        warning: "bg-gradient-to-r from-warning to-warning/90 text-warning-foreground hover:from-warning/90 hover:to-warning/80 shadow-lg shadow-warning/20 hover:shadow-xl",
        
        // Destructive actions
        destructive: "bg-gradient-to-r from-destructive to-destructive/90 text-destructive-foreground hover:from-destructive/90 hover:to-destructive/80 shadow-lg shadow-destructive/20 hover:shadow-xl",
        
        // Outline variant with warm borders
        outline: "border-2 border-warm-neutral bg-background/50 backdrop-blur-sm text-warm-neutral hover:bg-warm-neutral-light hover:text-warm-neutral-foreground hover:border-warm-neutral-hover elevation-sm hover:elevation-md",
        
        // Ghost variant for subtle actions
        ghost: "text-warm-neutral hover:bg-warm-neutral-light hover:text-warm-neutral-foreground backdrop-blur-sm transition-smooth",
        
        // Link variant
        link: "text-poppy-primary underline-offset-4 hover:underline hover:text-poppy-primary-hover transition-smooth",
        
        // Legacy poppy variant for backward compatibility
        poppy: "bg-gradient-to-r from-poppy to-poppy/90 text-white hover:from-poppy/90 hover:to-poppy/80 shadow-lg shadow-poppy/20 hover:shadow-xl",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-lg",
        default: "h-10 px-4 py-2",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
