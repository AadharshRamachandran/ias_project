import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { getProvider } from "./utils/blockchain";

import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import GDPRRequests from "./pages/GDPRRequests";

export default function App() {
    const [account, setAccount] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        checkConnection();
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    toast.info(`Connected to ${accounts[0].slice(0, 6)}...`);
                } else {
                    setAccount(null);
                    toast.warn("Wallet disconnected");
                    navigate("/");
                }
            });
        }
    }, []);

    const checkConnection = async () => {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0) {
                setAccount(accounts[0]);
            }
        }
    };

    const connectWallet = async () => {
        try {
            const provider = await getProvider();
            const signer = provider.getSigner();
            const addr = await signer.getAddress();
            setAccount(addr);
            toast.success("Wallet connected successfully!");
            if (location.pathname === "/") {
                navigate("/dashboard");
            }
        } catch (err) {
            toast.error("Failed to connect wallet: " + err.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* Navbar */}
            <nav className="border-b border-cyber-900/50 bg-dark-900/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link to="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyber-600 to-cyber-400 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyber-400 to-cyber-200">
                                    SecureFileShare
                                </span>
                            </Link>

                            {account && (
                                <div className="ml-10 flex items-baseline space-x-4">
                                    <Link
                                        to="/dashboard"
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === "/dashboard"
                                                ? "bg-cyber-900/40 text-cyber-400"
                                                : "text-gray-300 hover:text-white hover:bg-dark-800"
                                            }`}
                                    >
                                        Dashboard
                                    </Link>
                                    <Link
                                        to="/gdpr"
                                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location.pathname === "/gdpr"
                                                ? "bg-cyber-900/40 text-cyber-400"
                                                : "text-gray-300 hover:text-white hover:bg-dark-800"
                                            }`}
                                    >
                                        Compliance & GDPR
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div>
                            {account ? (
                                <div className="flex items-center gap-4">
                                    <span className="badge-teal">
                                        {account.slice(0, 6)}...{account.slice(-4)}
                                    </span>
                                </div>
                            ) : (
                                <button onClick={connectWallet} className="btn-primary">
                                    Connect Wallet
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-grow">
                <Routes>
                    <Route path="/" element={<Home connectWallet={connectWallet} account={account} />} />
                    <Route path="/dashboard" element={<Dashboard account={account} />} />
                    <Route path="/gdpr" element={<GDPRRequests account={account} />} />
                </Routes>
            </main>

            {/* Footer */}
            <footer className="border-t border-cyber-900/30 bg-dark-900 py-6 text-center text-sm text-gray-500">
                <p>Built with <span className="text-red-500">♥</span> using React, Solidity & IPFS.</p>
                <p className="mt-1">Attribute-Based Encryption | GDPR Compliance</p>
            </footer>
        </div>
    );
}
