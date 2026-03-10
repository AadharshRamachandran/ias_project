import React, { useState } from "react";
import GDPRPanel from "../components/GDPRPanel";
import TimeBoundShare from "../components/TimeBoundShare";

export default function GDPRRequests({ account }) {
    const [activeTab, setActiveTab] = useState("gdpr");

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
                <p className="text-gray-400">Please connect your wallet to access compliance features.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Compliance & Privacy</h1>
                    <p className="text-gray-400 text-sm">
                        Manage your right to erasure, Article 20 data exports, and audit detailed access logs locally.
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div className="flex bg-dark-800 p-1 rounded-xl border border-cyber-900/50">
                    <button
                        onClick={() => setActiveTab("gdpr")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "gdpr"
                                ? "bg-cyber-600 text-white shadow-md shadow-cyber-900/30"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        Data Privacy (GDPR)
                    </button>
                    <button
                        onClick={() => setActiveTab("timebound")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "timebound"
                                ? "bg-cyber-600 text-white shadow-md shadow-cyber-900/30"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        Access Expiry Checker
                    </button>
                </div>
            </div>

            <div className="glass-card p-6 min-h-[600px]">
                {activeTab === "gdpr" && <GDPRPanel account={account} />}
                {activeTab === "timebound" && <TimeBoundShare account={account} />}
            </div>
        </div>
    );
}
