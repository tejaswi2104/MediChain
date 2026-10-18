import React from "react";
import { cn } from "@/lib/utils";

export default function Stepper({ steps, current }) {
  return (
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div className="flex items-center gap-2">
            <span className={cn("mc-step-dot", i === current && "mc-step-dot-active")}>
              {i < current ? "✓" : i + 1}
            </span>
            <span className={cn("mc-step", i === current && "mc-step-active")}>{s}</span>
          </div>
          {i < steps.length - 1 && <span className="mc-step-line" />}
        </React.Fragment>
      ))}
    </div>
  );
}