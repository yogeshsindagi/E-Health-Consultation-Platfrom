import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAuth } from "../context/AuthContext";
import { CONTRACT_ADDRESS, HEALTH_DATA_ABI } from "../constants";

interface LogEvent {
    patient: string;
    provider: string;
    timestamp: string;
    resourceId: string;
    blockNumber: number;
}

export default function AccessLogViewer() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.walletAddress) {
            fetchLogs();
        }
    }, [user]);

    async function fetchLogs() {
        try {
            setLoading(true);
            if (!window.ethereum) return;
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_DATA_ABI, provider);

            // Filter: Patient = Current User (assuming their wallet is connected and matches)
            // If user is patient, we filter by patient. If user is doctor, maybe filter by provider?
            // Requirement: "display who accessed THEIR files" -> Patient view.

            const filter = contract.filters.LogAccess(user?.walletAddress, null);
            const events = await contract.queryFilter(filter, -10000); // Last 10k blocks? or 'earliest'

            const formattedLogs = events.map((e: any) => ({
                patient: e.args[0],
                provider: e.args[1],
                timestamp: new Date(Number(e.args[2]) * 1000).toLocaleString(),
                resourceId: e.args[3],
                blockNumber: e.blockNumber
            }));

            setLogs(formattedLogs.reverse()); // Newest first
        } catch (err) {
            console.error("Failed to fetch logs", err);
        } finally {
            setLoading(false);
        }
    }

    if (!user || !user.walletAddress) return null;

    return (
        <div className="p-4 border rounded shadow bg-white dark:bg-gray-800 mt-4">
            <h2 className="text-xl font-bold mb-4">Access History</h2>
            {loading ? <p>Loading blockchain events...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-700">
                                <th className="p-2 text-left">Time</th>
                                <th className="p-2 text-left">Doctor Address</th>
                                <th className="p-2 text-left">Resource</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, i) => (
                                <tr key={i} className="border-b">
                                    <td className="p-2">{log.timestamp}</td>
                                    <td className="p-2 font-mono">{log.provider}</td>
                                    <td className="p-2">{log.resourceId}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {logs.length === 0 && <p className="p-2 text-gray-500">No access logs found.</p>}
                </div>
            )}
        </div>
    );
}
