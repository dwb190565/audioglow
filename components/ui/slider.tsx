"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex touch-none select-none items-center",
      props.orientation === "vertical"
        ? "h-full flex-col"
        : "w-full",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className={cn(
      "relative grow overflow-hidden rounded-full bg-secondary",
      props.orientation === "vertical" ? "w-2" : "h-2"
    )}>
      <SliderPrimitive.Range className={cn(
        "absolute bg-accent",
        props.orientation === "vertical" ? "w-full" : "h-full"
        )} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-accent bg-background ring-offset-background transition-colors disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
