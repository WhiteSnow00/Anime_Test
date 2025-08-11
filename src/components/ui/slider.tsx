"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  showValue?: boolean;
  valueLabelFormatter?: (value: number) => string;
};

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, showValue = false, valueLabelFormatter, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState<number[]>(
    (props.defaultValue as number[]) || (props.value as number[]) || [0]
  );

  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          "h-4"
        )}
        onValueChange={(v) => {
          setInternalValue(v);
          props.onValueChange?.(v);
        }}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className={cn(
            "block h-4 w-4 rounded-full border border-primary/60 bg-background",
            "ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        />
      </SliderPrimitive.Root>
      {showValue && (
        <div className="min-w-10 text-right text-xs text-muted-foreground">
          {valueLabelFormatter
            ? valueLabelFormatter(internalValue[0] ?? 0)
            : Math.round(internalValue[0] ?? 0)}
        </div>
      )}
    </div>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
