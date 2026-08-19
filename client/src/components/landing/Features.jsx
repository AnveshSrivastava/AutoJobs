import React from "react";
import FeatureCard from "./FeatureCard";
import { ListChecks, Search, Mail, Building2, ArrowLeftRight, HardDrive } from "lucide-react";

const featureData = [
  {
    icon: ListChecks,
    iconColorClass: "text-primary",
    title: "Rule-based filtering",
    description:
      "Define exactly what makes a job a good fit. Set requirements for experience, region, and required technology. Jobs that don't match are instantly discarded.",
  },
  {
    icon: Search,
    iconColorClass: "text-secondary",
    title: "Deep intent signals",
    description:
      "Go beyond the job description. The scraper cross-references companies with recent funding rounds and hiring sprees to find high-intent buyers.",
  },
  {
    icon: Mail,
    iconColorClass: "text-tertiary",
    title: "Automated outreach",
    description:
      "Don't just find jobs—apply to them. Generate personalized DMs and emails for the hiring manager based on the specific job requirements.",
  },
  {
    icon: Building2,
    iconColorClass: "text-primary",
    title: "150+ Companies tracked",
    description:
      "Monitor the career pages of top tech companies. Get notified the moment a new role opens up that matches your highly specific criteria.",
  },
  {
    icon: ArrowLeftRight,
    iconColorClass: "text-secondary",
    title: "Hot-swap configurations",
    description:
      "Pivot your search strategy instantly. Change parameters from Backend to Fullstack without rebuilding your pipeline.",
  },
  {
    icon: HardDrive,
    iconColorClass: "text-tertiary",
    title: "Runs entirely on your own machine",
    description:
      "Keep your search private and secure. The core engine runs locally, ensuring your data never leaves your environment.",
  }
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6 md:px-12 relative overflow-hidden bg-surface-container-lowest">
      <div className="max-w-[1280px] mx-auto relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-[40px] md:text-[56px] font-bold text-on-surface mb-6 leading-tight">
            Everything you need to automate your search.
          </h2>
          <p className="text-[18px] md:text-[20px] text-on-surface-variant max-w-2xl mx-auto">
            Stop wasting time manually filtering through irrelevant roles.
            Build a pipeline that does the heavy lifting for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureData.map((feature, idx) => (
            <FeatureCard key={idx} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
