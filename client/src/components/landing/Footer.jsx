import React from "react";
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer id="docs" className="bg-surface w-full py-16 px-6 md:px-12 border-t border-outline-variant/20 relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-[200px] bg-gradient-to-t from-primary/5 to-transparent blur-[100px] pointer-events-none rounded-full"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-[1280px] mx-auto relative z-10">
        <div className="flex flex-col space-y-6 lg:col-span-1">
          <div 
            className="text-2xl font-bold text-on-surface cursor-pointer tracking-tight hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            AutoJobs
          </div>
          <p className="text-[16px] text-on-surface-variant max-w-xs">
            Automate your job search workflow with precision scraping tools built for developers.
          </p>
          <div className="text-[14px] text-on-surface-variant mt-auto pt-8">
            © 2026 AutoJobs. Built for developers.
          </div>
        </div>

        <div className="flex flex-col space-y-4 mt-8 md:mt-0">
          <h4 className="text-[12px] text-on-surface font-bold uppercase tracking-widest mb-2 font-mono">
            Product
          </h4>
          <a onClick={() => navigate("/")} className="text-[16px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit">Features</a>
          <a onClick={() => navigate("/")} className="text-[16px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit">Pricing</a>
          <a onClick={() => navigate("/")} className="text-[16px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit">Changelog</a>
        </div>

        <div className="flex flex-col space-y-4 mt-8 lg:mt-0">
          <h4 className="text-[12px] text-on-surface font-bold uppercase tracking-widest mb-2 font-mono">
            Resources
          </h4>
          <a onClick={() => navigate("/")} className="text-[16px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit">Docs</a>
          <a onClick={() => navigate("/")} className="text-[16px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit">API Reference</a>
          <a onClick={() => navigate("/")} className="text-[16px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit">Status</a>
        </div>

        <div className="flex flex-col space-y-4 mt-8 lg:mt-0">
          <h4 className="text-[12px] text-on-surface font-bold uppercase tracking-widest mb-2 font-mono">
            Connect
          </h4>
          <a href = "https://github.com/AnveshSrivastava/AutoJobs" className="text-[16px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit target=_blank">GitHub</a>
          <a href = "https://x.com/OnlyAnvesh" className="text-[16px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit target=_blank">Twitter</a>
          <a onClick={() => navigate("/")} className="text-[16px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer w-fit">Privacy</a>
        </div>
      </div>
    </footer>
  );
}
