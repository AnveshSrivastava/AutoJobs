import React from "react";

export default function FeatureCard({ icon: Icon, title, description, iconColorClass }) {
  return (
    <div className="bg-surface-container-highest/20 rounded-xl p-8 flex flex-col gap-4 border border-outline-variant/10 hover:border-outline-variant/30 transition-colors">
      <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center mb-2">
        <Icon className={`w-6 h-6 ${iconColorClass}`} />
      </div>
      <h3 className="text-[24px] font-bold text-on-surface">
        {title}
      </h3>
      <p className="text-[16px] text-on-surface-variant leading-relaxed">
        {description}
      </p>
    </div>
  );
}
