import React, { useState } from "react";
import FileUpload from "../components/FileUpload";
import AccessDashboard from "../components/AccessDashboard";
import FileShare from "../components/FileShare";

export default function Dashboard({ account }) {
    const [activeTab, setActiveTab] = useState("myFiles");
    const [selectedFileForShare, setSelectedFileForShare] = useState(null);

    if (!account) {
        return (
            <div className="flex flex-col items-center justify-center py-32">
                <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
                <p className="text-gray-400">Please connect your wallet to view the dashboard.</p>
            </div>
        );
    }

    const handleShareClick = (fileId) => {
        setSelectedFileForShare(fileId);
        setActiveTab("share");
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>

                {/* Navigation Tabs */}
                <div className="flex bg-dark-800 p-1 rounded-xl border border-cyber-900/50">
                    <button
                        onClick={() => setActiveTab("myFiles")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "myFiles"
                                ? "bg-cyber-600 text-white shadow-md shadow-cyber-900/30"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        My Files
                    </button>
                    <button
                        onClick={() => setActiveTab("upload")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "upload"
                                ? "bg-cyber-600 text-white shadow-md shadow-cyber-900/30"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        Upload
                    </button>
                    <button
                        onClick={() => setActiveTab("share")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "share"
                                ? "bg-cyber-600 text-white shadow-md shadow-cyber-900/30"
                                : "text-gray-400 hover:text-white"
                            }`}
                    >
                        Share
                    </button>
                </div>
            </div>

            <div className="glass-card p-6 min-h-[500px]">
                {activeTab === "myFiles" && (
                    <AccessDashboard account={account} onShareClick={handleShareClick} />
                )}

                {activeTab === "upload" && (
                    <FileUpload account={account} onUploadSuccess={() => setActiveTab("myFiles")} />
                )}

                {activeTab === "share" && (
                    <FileShare account={account} initialFileId={selectedFileForShare} />
                )}
            </div>
        </div>
    );
}
