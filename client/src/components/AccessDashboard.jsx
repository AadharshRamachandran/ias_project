import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
    getSigner,
    getFileRegistry,
    getAccessControl,
    getTimeBoundPermissions,
    getZKPVerifier,
    signAuthMessage
} from "../utils/blockchain";

export default function AccessDashboard({ account, onShareClick }) {
    const [files, setFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (account) loadFiles();
    }, [account]);

    const loadFiles = async () => {
        try {
            setIsLoading(true);
            const signer = await getSigner();
            const registry = await getFileRegistry(signer);
            const accessControl = await getAccessControl(signer);
            const timeBound = await getTimeBoundPermissions(signer);

            // 1. Get all file IDs registered to this owner
            const fileIds = await registry.getOwnerFiles(account);

            const filePromises = fileIds.map(async (idStr) => {
                const id = Number(idStr);
                // getFile returns: owner, cids, fileHash, timestamp, isDeleted, fileName, fileSize
                const data = await registry.getFile(id);

                // Also fetch active share grantees
                const grantees = await accessControl.getFileGrantees(id);

                let activeShares = [];
                for (const grantee of grantees) {
                    // Check if time-bound permission is still valid
                    const isValid = await timeBound.isAccessValid(grantee, id);
                    if (isValid) {
                        const perm = await timeBound.getPermissionForUserFile(grantee, id);
                        activeShares.push({
                            address: grantee,
                            expiryX: perm.expiryTimestamp.toNumber() * 1000
                        });
                    }
                }

                return {
                    id,
                    owner: data.owner,
                    cids: data.cids,
                    hash: data.fileHash,
                    timestamp: data.timestamp.toNumber() * 1000,
                    isDeleted: data.isDeleted,
                    fileName: data.fileName,
                    fileSize: data.fileSize.toNumber(),
                    activeShares
                };
            });

            const loadedFiles = await Promise.all(filePromises);
            // Filter out deleted files
            setFiles(loadedFiles.filter(f => !f.isDeleted).reverse());

        } catch (err) {
            console.error(err);
            toast.error("Failed to load your files: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (file) => {
        try {
            const toastId = toast.loading("Verifying ZKP & ABE Policies...");

            const signer = await getSigner();
            const auth = await signAuthMessage(signer);

            // Simulate getting the decryption materials (usually these arrive via backend /share)
            // For demo we mock the retrieval metadata
            const fakeAesKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
            const fakeIvs = JSON.stringify([]);
            const fakeAuthTags = JSON.stringify([]);

            toast.update(toastId, { render: "Decrypting from IPFS (AES-256-GCM)..." });

            const res = await fetch(
                `/api/access/${file.id}?cids=${encodeURIComponent(JSON.stringify(file.cids))}&aesKeyHex=${fakeAesKey}&ivs=${encodeURIComponent(fakeIvs)}&authTags=${encodeURIComponent(fakeAuthTags)}`,
                {
                    headers: {
                        "x-user-address": auth.address,
                        "x-signature": auth.signature,
                        "x-message": auth.message,
                        "x-zkp-proof": "placeholder_zkp_proof",
                    },
                }
            );

            if (!res.ok) {
                let err;
                try { err = await res.json(); } catch { err = { error: "Download failed" } }
                throw new Error(err.error);
            }

            // Trigger browser download
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.fileName || `secure_file_${file.id}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.update(toastId, { render: "File decrypted securely!", type: "success", isLoading: false, autoClose: 3000 });

        } catch (err) {
            console.error(err);
            toast.dismiss();
            toast.error(err.message || "Access denied by ABAC or Time-Bound policies");
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center py-20 text-cyber-400">Loading blockchain registry...</div>;
    }

    if (files.length === 0) {
        return (
            <div className="text-center py-20">
                <div className="w-16 h-16 mx-auto rounded-full bg-dark-700 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <p className="text-gray-400">You haven't uploaded any files yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {files.map((file) => (
                <div key={file.id} className="bg-dark-800/80 rounded-xl p-5 border border-cyber-900/40 hover:border-cyber-600/50 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">

                        {/* File Info */}
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-cyber-900/50 flex flex-shrink-0 items-center justify-center border border-cyber-700/50">
                                <svg className="w-5 h-5 text-cyber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                                    {file.fileName}
                                    <span className="text-xs font-normal px-2 py-0.5 rounded bg-dark-700 text-gray-400">ID: {file.id}</span>
                                </h3>
                                <div className="text-sm text-gray-500 mt-1 space-x-3">
                                    <span>{(file.fileSize / 1024 / 1024).toFixed(3)} MB</span>
                                    <span>•</span>
                                    <span>{new Date(file.timestamp).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span className="font-mono text-cyber-700" title={file.cids.join(", ")}>
                                        {file.cids.length} IPFS chunks
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleDownload(file)}
                                className="btn-outline px-4 py-2 text-xs flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Decrypt
                            </button>

                            <button
                                onClick={() => onShareClick(file.id)}
                                className="btn-primary px-4 py-2 text-xs flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-5.368m0 5.368l5.664 3.236m-5.664-8.604l5.664-3.236m7.128 7.128a3 3 0 100-6 3 3 0 000 6zm-7.128 7.128a3 3 0 100-6 3 3 0 000 6z" />
                                </svg>
                                Share
                            </button>
                        </div>

                    </div>

                    {/* Active Shares overview */}
                    {file.activeShares.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-dark-700">
                            <div className="text-xs text-yellow-500 mb-2 font-medium">Active Time-Bound Shares:</div>
                            <div className="space-y-1">
                                {file.activeShares.map((share, i) => (
                                    <div key={i} className="text-xs text-gray-400 flex justify-between bg-dark-900/50 px-3 py-1.5 rounded">
                                        <span className="font-mono">{share.address.slice(0, 8)}...{share.address.slice(-6)}</span>
                                        <span className="text-yellow-600">Expires: {new Date(share.expiryX).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            ))}
        </div>
    );
}
