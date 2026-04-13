import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FlightTrackerMap from "@/components/FlightTrackerMap";
import ATCTrainer from "@/components/ATCTrainer";
import { Radar, Radio } from "lucide-react";

const tabs = [
  { id: "tracker", label: "Live Flight Tracker", icon: Radar },
  { id: "atc", label: "ATC Trainer", icon: Radio },
] as const;

const LiveToolsPage = () => {
  const [activeTab, setActiveTab] = useState<"tracker" | "atc">("tracker");

  return (
    <>
      <Helmet>
        <title>Live Sky — Flight Tracker & ATC Trainer | SimPilot.AI</title>
        <meta name="description" content="Track real-time flights on an interactive map and practice ATC radio communications with AI-powered training." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 sm:pt-24 pb-8 sm:pb-16">
          <div className="container mx-auto px-3 sm:px-6">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-foreground mb-1 sm:mb-2">
                Live Aviation <span className="text-primary">Tools</span>
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm">
                Real-time flight tracking powered by OpenSky Network and AI-powered ATC communication training.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-4 sm:mb-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="absolute inline-flex h-full w-full rounded-full bg-green-400/40 animate-pulse" />
                    <span className={`relative inline-flex rounded-full h-3 w-3 shadow-[0_0_8px_2px_rgba(34,197,94,0.6)] ${activeTab === tab.id ? "bg-green-300" : "bg-green-500"}`} />
                  </span>
                  <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.id === "tracker" ? "Tracker" : "ATC"}</span>
                </button>
              ))}
            </div>

            {/* Content */}
            {activeTab === "tracker" ? (
              <div className="h-[calc(100vh-200px)] sm:h-[600px] md:h-[700px]">
                <FlightTrackerMap />
              </div>
            ) : (
              <ATCTrainer />
            )}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default LiveToolsPage;
