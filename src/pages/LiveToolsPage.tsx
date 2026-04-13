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
        <title>Live Flight Tracker & ATC Trainer | SimPilot.AI</title>
        <meta name="description" content="Track real-time flights on an interactive map and practice ATC radio communications with AI-powered training." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 sm:px-6">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                Live Aviation <span className="text-primary">Tools</span>
              </h1>
              <p className="text-muted-foreground max-w-xl mx-auto text-sm">
                Real-time flight tracking powered by OpenSky Network and AI-powered ATC communication training.
              </p>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-6">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            {activeTab === "tracker" ? (
              <div className="h-[600px] md:h-[700px]">
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
