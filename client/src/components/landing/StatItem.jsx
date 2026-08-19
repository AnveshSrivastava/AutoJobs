import React from "react";

export default function StatItem({ value, label, gradientClass }) {
  return (
    <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2 group">
      <div className={`text-[48px] md:text-[64px] font-bold tabular-nums tracking-tight text-transparent bg-clip-text bg-gradient-to-br ${gradientClass} transition-transform duration-300 group-hover:scale-105`}>
        {value}
      </div>
      <div className="text-[12px] font-medium text-on-surface-variant uppercase tracking-widest font-mono">
        {label}
      </div>
    </div>
  );
}
