import * as React from "react"
import { cn } from "@/lib/utils"

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  pauseOnHover?: boolean
}

export function Marquee({ className, pauseOnHover, children, ...props }: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn("flex overflow-hidden", className)}
    >
      <div
        className={cn(
          "flex shrink-0 justify-around min-w-full gap-4",
          "animate-[marquee_var(--duration,40s)_linear_infinite]",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          "flex shrink-0 justify-around min-w-full gap-4",
          "animate-[marquee_var(--duration,40s)_linear_infinite]",
          pauseOnHover && "hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
    </div>
  )
}
