import React from "react";
import StatItem from "./StatItem";

const statsData = [
  { value: "150+", label: "Companies Tracked", gradientClass: "from-primary to-secondary" },
  { value: "$0–5", label: "Monthly Cost", gradientClass: "from-secondary to-tertiary" },
  { value: "20 Min", label: "A Day", gradientClass: "from-tertiary to-primary" }
];

export default function Stats() {
  return (
    <section id="pricing" className="py-24 px-6 md:px-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-[1280px] mx-auto">
        <div className="bg-surface-container-low rounded-2xl overflow-hidden shadow-lg relative border border-outline-variant/10">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-tertiary/5 opacity-50 z-0 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center py-12 px-8 md:px-16 gap-12 md:gap-0">
            {statsData.map((stat, idx) => (
              <React.Fragment key={idx}>
                <StatItem {...stat} />
                {idx < statsData.length - 1 && (
                  <div className="hidden md:block w-px h-24 bg-gradient-to-b from-transparent via-outline-variant/30 to-transparent"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
