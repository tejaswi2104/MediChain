import React from "react";
import { cn } from "@/lib/utils";

export default function Chip({ children, danger }) {
  return <span className={cn("mc-chip", danger && "mc-chip-danger")}>{children}</span>;
}