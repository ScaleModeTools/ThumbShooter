import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/class-name";

interface ImmersiveStageFrameProps {
  readonly children: ReactNode;
  readonly className?: string;
}

const immersiveStagePaddingStyle = {
  paddingTop: "max(0.75rem, env(safe-area-inset-top))",
  paddingRight: "max(0.75rem, env(safe-area-inset-right))",
  paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
  paddingLeft: "max(0.75rem, env(safe-area-inset-left))"
} satisfies CSSProperties;

export function ImmersiveStageFrame({
  children,
  className
}: ImmersiveStageFrameProps) {
  return (
    <div className="relative flex min-h-dvh flex-col" style={immersiveStagePaddingStyle}>
      <div
        className={cn(
          "relative flex min-h-0 flex-1 overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/88 shadow-[0_28px_90px_rgb(15_23_42_/_0.2)] backdrop-blur-xl",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
