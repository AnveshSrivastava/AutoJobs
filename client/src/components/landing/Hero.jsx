import React from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Target, Send, Building2, CreditCard } from "lucide-react";

export default function Hero() {
  const navigate = useNavigate();

  return (
    <section id="about" className="relative pt-[160px] pb-[80px] px-6 md:px-12 flex flex-col items-center justify-start text-center min-h-[90vh]">
      <div className="relative z-20 max-w-3xl mx-auto flex flex-col items-center">
        <h1 className="font-bold text-[48px] leading-[52px] md:text-[72px] md:leading-[80px] tracking-tight text-on-surface mb-6 max-w-4xl mx-auto">
          Never miss a job that fits.
        </h1>
        <p className="text-[18px] md:text-[20px] text-on-surface-variant mb-10 max-w-xl mx-auto leading-relaxed">
          Plan, publish, and analyze content from one platform so you can reach
          more people & grow your brand with smart scoring and auto-outreach.
        </p>
        <button
          onClick={() => navigate("/app")}
          className="bg-primary text-surface font-semibold px-8 py-4 rounded-full flex items-center gap-2 hover:scale-105 transition-transform duration-300"
        >
          Get started
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </button>
      </div>

      <div className="relative w-full max-w-[1280px] mx-auto h-[500px] mt-16 flex justify-center items-end">
        <div
          className="absolute bottom-[-20%] w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 30% 30%, #57f1db 0%, #9ddf2e 40%, #ffcdd1 80%, #131313 100%)",
            filter: "blur(40px)",
          }}
        ></div>
        
        <img
          className="relative z-10 w-[500px] md:w-[800px] object-cover mix-blend-screen opacity-90"
          alt="Reflective 3D sphere"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuASYEdEQxrCFqXfDzbnXQybYmsTpj-Ct1q8L6eoeOZSTvARU9zro6hFhNFp_OfjV13ATXK9GM1ySubZ6Kj5O8eUj_vQ7LLK6s2mHD8WR5Mwlp9AtzgYkd0bfc4IJ-W6Ck09CpS_jqCDF6Wne7weUeyWImika1KeaKZ6uwc7yIJ_1U7JRPIpPn9w1uD6KuTRIpHIE3aNalk2zANFCET-3-5UtEXysGko_5eCCs34VBqfvQSWhCKGn8Vn8Q"
          style={{
            maskImage: "linear-gradient(to top, transparent, black 40%)",
            WebkitMaskImage: "linear-gradient(to top, transparent, black 40%)",
          }}
        />

        <div className="absolute inset-0 w-full h-full pointer-events-none z-20 hidden md:block">
          <div className="animate-bob absolute top-[20%] left-[15%] md:left-[25%] bg-surface-container/50 backdrop-blur-md border border-outline-variant/30 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg" style={{ animationDelay: '0.5s' }}>
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Mail className="text-primary w-3.5 h-3.5" />
            </div>
            <span className="text-[12px] font-semibold text-on-surface">Daily Digest</span>
          </div>

          <div className="animate-bob absolute top-[40%] right-[10%] md:right-[20%] bg-surface-container/50 backdrop-blur-md border border-outline-variant/30 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg" style={{ animationDelay: '1.2s' }}>
            <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center">
              <Target className="text-secondary w-3.5 h-3.5" />
            </div>
            <span className="text-[12px] font-semibold text-on-surface">Smart Scoring</span>
          </div>

          <div className="animate-bob absolute bottom-[40%] left-[5%] md:left-[15%] bg-surface-container/50 backdrop-blur-md border border-outline-variant/30 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg" style={{ animationDelay: '0.8s' }}>
            <div className="w-6 h-6 rounded-full bg-tertiary/20 flex items-center justify-center">
              <Send className="text-tertiary w-3.5 h-3.5" />
            </div>
            <span className="text-[12px] font-semibold text-on-surface">Auto Outreach</span>
          </div>

          <div className="animate-bob absolute top-[10%] right-[25%] md:right-[35%] bg-surface-container/50 backdrop-blur-md border border-outline-variant/30 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg" style={{ animationDelay: '1.5s' }}>
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Building2 className="text-primary w-3.5 h-3.5" />
            </div>
            <span className="text-[12px] font-semibold text-on-surface">150+ Companies</span>
          </div>

          <div className="animate-bob absolute bottom-[30%] right-[5%] md:right-[15%] bg-surface-container/50 backdrop-blur-md border border-outline-variant/30 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg" style={{ animationDelay: '0.2s' }}>
            <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center">
              <CreditCard className="text-secondary w-3.5 h-3.5" />
            </div>
            <span className="text-[12px] font-semibold text-on-surface">Zero Cost</span>
          </div>
        </div>
      </div>
    </section>
  );
}
