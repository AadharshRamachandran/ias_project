import React, { useState } from "react";
import { toast } from "react-toastify";
import { getSigner, getTimeBoundPermissions } from "../utils/blockchain";

export default function TimeBoundShare({ account }) {
    const [fileId, setFileId] = useState("");
    const [userAddress, setUserAddress] = useState("");
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const checkAccess = async (e) => {
        e.preventDefault();
        if (!fileId || !userAddress) return toast.error("File ID and User Address required");

        try {
            setIsLoading(true);
            setStatus(null);

            const signer = await getSigner();
            const timeBound = await getTimeBoundPermissions(signer);

            const isValid = await timeBound.isAccessValid(userAddress, fileId);

            let expiryDate = null;
            let isNeverGranted = false;

            try {
                const perm = await timeBound.getPermissionForUserFile(userAddress, fileId);
                if (perm.expiryTimestamp.toNumber() === 0) {
                    isNeverGranted = true;
                } else {
                    expiryDate = new Date(perm.expiryTimestamp.toNumber() * 1000);
                }
            } catch (e) {
                isNeverGranted = true;
            }

            setStatus({
                isValid,
                expiryDate,
                isNeverGranted,
                checkedAt: new Date()
            });

        } catch (err) {
            console.error(err);
            toast.error("Failed to check access status");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevoke = async () => {
        try {
            setIsLoading(true);
            const toastId = toast.loading("Revoking expired permissions on-chain...");

            const signer = await getSigner();
            const timeBound = await getTimeBoundPermissions(signer);

            const tx = await timeBound.revokeExpiredPermissions(fileId);
            await tx.wait();

            toast.update(toastId, { render: "Cleanup successful!", type: "success", isLoading: false, autoClose: 3000 });

            // Re-check
            checkAccess({ preventDefault: () => { } });

        } catch (err) {
            console.error(err);
            toast.dismiss();
            toast.error("Revocation failed: " + (err.reason || err.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-4">
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Access Expiry Checker</h2>
                <p className="text-gray-400 text-sm">
                    Verify the current on-chain timestamp validity for any shared file. Anyone can trigger a cleanup of expired permissions.
                </p>
            </div>

            <form onSubmit={checkAccess} className="space-y-4 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">File ID</label>
                        <input
                            type="number"
                            value={fileId}
                            onChange={(e) => setFileId(e.target.value)}
                            className="input-cyber"
                            placeholder="0"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">User Address to Check</label>
                        <input
                            type="text"
                            value={userAddress}
                            onChange={(e) => setUserAddress(e.target.value)}
                            className="input-cyber font-mono"
                            placeholder="0x..."
                            required
                        />
                    </div>
                </div>
                <button type="submit" disabled={isLoading} className="btn-outline w-full py-3">
                    {isLoading ? "Querying Blockchain..." : "Check Status"}
                </button>
            </form>

            {status && (
                <div className={`p-6 rounded-xl border ${status.isValid ? "bg-green-900/20 border-green-500/30" : "bg-red-900/20 border-red-500/30"} transition-all animate-fade-in`}>
                    <div className="flex items-center gap-3 mb-4">
                        {status.isValid ? (
                            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <h3 className={`text-xl font-bold ${status.isValid ? "text-green-100" : "text-red-100"}`}>
                            {status.isValid ? "Access Granted" : "Access Denied"}
                        </h3>
                    </div>

                    <div className="text-sm text-gray-300 space-y-2">
                        {status.isNeverGranted ? (
                            <p>This user was never granted time-bound access, or the record was already cleaned up.</p>
                        ) : (
                            <>
                                <p>
                                    <span className="text-gray-500">Expiry Time:</span>{" "}
                                    <span className="font-mono">{status.expiryDate?.toLocaleString()}</span>
                                </p>
                                <p>
                                    <span className="text-gray-500">Checked At:</span>{" "}
                                    <span className="font-mono">{status.checkedAt.toLocaleString()}</span>
                                </p>

                                {!status.isValid && (
                                    <div className="mt-6 pt-4 border-t border-red-900/30">
                                        <p className="text-xs text-red-300 mb-3">
                                            This permission has expired but might still exist in the smart contract's state array.
                                            You can invoke the cleanup function.
                                        </p>
                                        <button
                                            onClick={handleRevoke}
                                            disabled={isLoading}
                                            className="btn-danger w-full py-2"
                                        >
                                            Trigger On-Chain Cleanup
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
