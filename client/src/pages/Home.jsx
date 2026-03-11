import React from "react";
import { Link } from "react-router-dom";

export default function Home({ connectWallet, account }) {
    return (
        <div className="relative min-h-screen">
            {/* Hero Section */}
            <div className="absolute inset-0 bg-hero-glow -z-10"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
                <div className="text-center">
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
                        <span className="text-white">True Decentralized</span>
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyber-400 via-cyber-200 to-cyber-500 text-glow">
                            File Security
                        </span>
                    </h1>

                    <p className="mt-4 max-w-2xl text-xl text-gray-400 mx-auto mb-10">
                        SecureFileShare goes beyond IPFS hash mapping. We use{" "}
                        <strong className="text-gray-200">Attribute-Based Encryption</strong> for access, and enforce{" "}
                        <strong className="text-gray-200">GDPR compliance</strong> natively on-chain.
                    </p>

                    <div className="flex justify-center gap-4">
                        {account ? (
                            <Link to="/dashboard" className="btn-primary text-lg px-8 py-4">
                                Enter Dashboard
                            </Link>
                        ) : (
                            <button onClick={connectWallet} className="btn-primary text-lg px-8 py-4">
                                Connect MetaMask
                            </button>
                        )}
                        <a href="#features" className="btn-outline text-lg px-8 py-4 shadow-none text-cyber-400">
                            Learn More
                        </a>
                    </div>
                </div>

                {/* Feature Grid */}
                <div id="features" className="mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                    <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "0ms" }}>
                        <div className="w-12 h-12 rounded-lg bg-cyber-900/50 flex items-center justify-center mb-4 border border-cyber-700/50">
                            <svg className="w-6 h-6 text-cyber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                            </svg>
                        </div>
                        <h3 className="section-title">Attribute-Based Encryption</h3>
                        <p className="text-gray-400 text-sm">
                            Granular access control using ABE policies to ensure only authorized users can decrypt files.
                        </p>
                    </div>

                    <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
                        <div className="w-12 h-12 rounded-lg bg-purple-900/30 flex items-center justify-center mb-4 border border-purple-700/30">
                            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <h3 className="section-title text-purple-100">Attribute Encryption</h3>
                        <p className="text-gray-400 text-sm">
                            Use Shamir Secret Sharing to define attribute thresholds (e.g., must be `role:doctor` AND `org:hospital`) to decrypt the AES-GCM file key.
                        </p>
                    </div>

                    <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
                        <div className="w-12 h-12 rounded-lg bg-green-900/30 flex items-center justify-center mb-4 border border-green-700/30">
                            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h3 className="section-title text-green-100">GDPR Compliant</h3>
                        <p className="text-gray-400 text-sm">
                            Built-in right to erasure unpins data from Kubo IPFS and orphans the smart contract CID record, alongside Article 20 JSON data exports.
                        </p>
                    </div>

                    <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
                        <div className="w-12 h-12 rounded-lg bg-yellow-900/30 flex items-center justify-center mb-4 border border-yellow-700/30">
                            <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="section-title text-yellow-100">Time-Bound Shares</h3>
                        <p className="text-gray-400 text-sm">
                            Smart contract enforced time-bomb limits read access length, verifiable automatically via `block.timestamp`.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
}
