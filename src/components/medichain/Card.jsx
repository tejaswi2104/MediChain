import React from "react";
import { cn } from "@/lib/utils";

export default function Card({ title, icon, actions, children, className }) {
  return (
    <div className={cn("mc-card", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-heading font-bold text-base flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}