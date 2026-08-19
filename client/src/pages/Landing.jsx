import React from "react";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import Features from "../components/landing/Features";
import Stats from "../components/landing/Stats";
import Footer from "../components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="bg-background min-h-screen text-on-surface font-body-md antialiased flex flex-col overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <Footer />
    </div>
  );
}
