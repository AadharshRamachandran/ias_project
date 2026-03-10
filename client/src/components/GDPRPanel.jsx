import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    getSigner,
    getFileRegistry,
    getGDPRCompliance
} from "../utils/blockchain";

export default function GDPRPanel({ account }) {
    const [files, setFiles] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [isErasing, setIsErasing] = useState(false);

    useEffect(() => {
        if (account) {
            loadUserData();
            loadAuditLogs();
        }
    }, [account]);

    const loadUserData = async () => {
        try {
            setIsLoading(true);
            const signer = await getSigner();
            const registry = await getFileRegistry(signer);

            const fileIds = await registry.getOwnerFiles(account);
            const filePromises = fileIds.map(async (idStr) => {
                const id = Number(idStr);
                const data = await registry.getFile(id);
                return {
                    id,
                    fileName: data.fileName,
                    cids: data.cids,
                    isDeleted: data.isDeleted
                };
            });

            const loadedFiles = await Promise.all(filePromises);
            setFiles(loadedFiles.filter(f => !f.isDeleted));
        } catch (err) {
            console.error(err);
            toast.error("Failed to load user files for GDPR panel");
        } finally {
            setIsLoading(false);
        }
    };

    const loadAuditLogs = async () => {
        try {
            const res = await fetch(`/api/gdpr/audit?userId=${account}`);
            const data = await res.json();
            if (data.success) {
                setAuditLogs(data.logs || []);
            }
        } catch (err) {
            console.error("Failed to load audit logs:", err);
        }
    };

    const handleExportData = async () => {
        try {
            setIsExporting(true);
            const toastId = toast.loading("Generating Article 20 Data Export...");

            const res = await fetch(`/api/gdpr/export?userId=${account}`);
            const data = await res.json();

            if (!data.success) throw new Error(data.error);

            // Trigger JSON download
            const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `gdpr_export_${account.slice(0, 8)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.update(toastId, { render: "Export successful!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (err) {
            console.error(err);
            toast.dismiss();
            toast.error("Data export failed: " + err.message);
        } finally {
            setIsExporting(false);
        }
    };

    const handleErasureRequest = async (file) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY erase '${file.fileName}'? This will unpin it from IPFS and remove it from the blockchain.`)) {
            return;
        }

        try {
            setIsErasing(true);
            const toastId = toast.loading("Processing Right to Erasure request...");

            // 1. Backend erasure (SQLite + IPFS unpin)
            toast.update(toastId, { render: "Unpinning from IPFS & wiping local logs..." });
            const res = await fetch("/api/gdpr/erase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: account,
                    fileId: file.id,
                    cids: file.cids
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Backend erasure failed");

            // 2. On-chain erasure
            toast.update(toastId, { render: "Recording immutable erasure on Blockchain..." });
            const signer = await getSigner();
            const gdprContract = await getGDPRCompliance(signer);

            const tx = await gdprContract.fulfillErasure(file.id);
            await tx.wait();

            toast.update(toastId, { render: "File permanently erased!", type: "success", isLoading: false, autoClose: 3000 });

            // Refresh
            loadUserData();
            loadAuditLogs();

        } catch (err) {
            console.error(err);
            toast.dismiss();
            toast.error("Erasure failed: " + err.message);
        } finally {
            setIsErasing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">

            {/* Overview & Export */}
            <div className="bg-dark-800 rounded-xl p-6 border border-cyber-900/30 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-100 mb-1">Article 20: Data Portability</h3>
                    <p className="text-sm text-gray-400 max-w-lg">
                        Download a machine-readable JSON file containing all metadata, audit trails, and consent records associated with your wallet address.
                    </p>
                </div>
                <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="btn-primary whitespace-nowrap"
                >
                    {isExporting ? "Compiling..." : "Download JSON Archive"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Right to Erasure List */}
                <div>
                    <h3 className="text-lg font-bold text-red-100 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Article 17: Right to Erasure
                    </h3>

                    <div className="bg-dark-800/50 rounded-xl border border-red-900/30 overflow-hidden h-80 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-gray-500 text-sm">Loading files...</div>
                        ) : files.length === 0 ? (
                            <div className="p-4 text-gray-500 text-sm">No active files found to erase.</div>
                        ) : (
                            <ul className="divide-y divide-dark-700/50">
                                {files.map(file => (
                                    <li key={file.id} className="p-4 flex items-center justify-between hover:bg-dark-700/30 transition-colors">
                                        <div className="truncate pr-4">
                                            <div className="text-sm font-medium text-gray-200">{file.fileName}</div>
                                            <div className="text-xs text-gray-500">ID: {file.id} • {file.cids.length} Chunks</div>
                                        </div>
                                        <button
                                            onClick={() => handleErasureRequest(file)}
                                            disabled={isErasing}
                                            className="btn-danger text-xs px-3 py-1.5"
                                        >
                                            Erase
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Audit Trail */}
                <div>
                    <h3 className="text-lg font-bold text-cyber-100 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Access Audit Trail
                    </h3>

                    <div className="bg-dark-800/50 rounded-xl border border-cyber-900/30 overflow-hidden h-80 overflow-y-auto">
                        {auditLogs.length === 0 ? (
                            <div className="p-4 text-gray-500 text-sm">No backend audit logs found.</div>
                        ) : (
                            <ul className="divide-y divide-dark-700/50">
                                {auditLogs.map((log) => (
                                    <li key={log.logId} className="p-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-xs font-bold ${log.action.includes("ERASE") ? "text-red-400" :
                                                    log.action.includes("SHARE") ? "text-purple-400" :
                                                        "text-cyber-400"
                                                }`}>
                                                {log.action}
                                            </span>
                                            <span className="text-[10px] text-gray-500">
                                                {new Date(log.accessTimestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 flex justify-between">
                                            <span>File: {log.fileId}</span>
                                            <span className="font-mono text-gray-600 block truncate ml-4 max-w-[120px]">
                                                {log.isAnonymised ? "Anon" : log.ipAddress || "Internal"}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
