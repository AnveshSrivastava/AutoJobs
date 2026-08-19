import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState(0);
  const isClickScrolling = useRef(false);
  const scrollTimeout = useRef(null);

  const navItems = [
    { label: "About", id: "about" },
    { label: "Features", id: "features" },
    { label: "Pricing", id: "pricing" },
    { label: "Docs", id: "docs" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      
      if (isClickScrolling.current) return;

      const currentItem = navItems.reduce((current, item, index) => {
        const section = document.getElementById(item.id);
        const sectionTop = section?.getBoundingClientRect().top;
        if (sectionTop <= 180 && sectionTop > current.sectionTop) {
          return { index, sectionTop };
        }
        return current;
      }, { index: 0, sectionTop: Number.NEGATIVE_INFINITY });
      
      setActiveItem(currentItem.index);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (index, sectionId) => {
    setActiveItem(index);
    isClickScrolling.current = true;
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isClickScrolling.current = false;
    }, 1000); // 1s is enough for smooth scroll to finish
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-surface/95 backdrop-blur-xl border-b border-outline-variant/20 shadow-md py-3' : 'bg-transparent py-5'}`}>
      <div className="flex justify-between items-center px-6 md:px-12 max-w-[1280px] mx-auto">
        <div 
          className="text-2xl font-bold text-on-surface cursor-pointer tracking-tight hover:opacity-80 transition-opacity"
          onClick={() => navigate("/")}
        >
          AutoJobs
        </div>
        <div className="hidden md:grid md:grid-cols-4 relative items-center rounded-full border border-outline-variant/40 bg-transparent p-1">
          <span
            aria-hidden="true"
            className="absolute inset-y-1 rounded-full bg-primary transition-all duration-500 ease-out"
            style={{
              left: `calc(${activeItem * 25}% + 0.25rem)`,
              width: "calc(25% - 0.5rem)",
            }}
          />
          {navItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(index, item.id)}
              className={`relative z-10 appearance-none border-0 bg-transparent rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${activeItem === index ? "text-black scale-[1.03]" : "text-white"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => navigate("/app")}
          className="bg-transparent text-white font-semibold px-6 py-2.5 rounded-full transition-all duration-300 ease-out hover:bg-primary hover:text-black hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
        >
          Try for free
        </button>
      </div>
    </nav>
  );
}
