import { useState } from "react";
import { ethers } from "ethers";
import { useAuth } from "../context/AuthContext";
import { CONTRACT_ADDRESS, HEALTH_DATA_ABI } from "../constants";

export default function AccessControlPanel() {
    const { user } = useAuth();
    const [doctorAddress, setDoctorAddress] = useState("");
    const [status, setStatus] = useState("");

    if (!user || user.role !== "patient") return null;

    async function handleGrant() {
        if (!ethers.isAddress(doctorAddress)) {
            alert("Invalid Ethereum Address");
            return;
        }
        try {
            if (!window.ethereum) throw new Error("No Wallet");
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_DATA_ABI, signer);

            setStatus("Granting access...");
            const tx = await contract.grantAccess(doctorAddress);
            await tx.wait();
            setStatus("Access Granted!");
        } catch (err: any) {
            console.error(err);
            setStatus("Error: " + err.message);
        }
    }

    async function handleRevoke() {
        if (!ethers.isAddress(doctorAddress)) {
            alert("Invalid Ethereum Address");
            return;
        }
        try {
            if (!window.ethereum) throw new Error("No Wallet");
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_DATA_ABI, signer);

            setStatus("Revoking access...");
            const tx = await contract.revokeAccess(doctorAddress);
            await tx.wait();
            setStatus("Access Revoked!");
        } catch (err: any) {
            console.error(err);
            setStatus("Error: " + err.message);
        }
    }

    return (
        <div className="p-4 border rounded shadow bg-white dark:bg-gray-800">
            <h2 className="text-xl font-bold mb-4">Data Privacy Controls</h2>
            <div className="flex flex-col gap-2">
                <label className="text-sm">Doctor's Wallet Address</label>
                <input
                    type="text"
                    value={doctorAddress}
                    onChange={(e) => setDoctorAddress(e.target.value)}
                    className="p-2 border rounded"
                    placeholder="0x..."
                />
                <div className="flex gap-2 mt-2">
                    <button onClick={handleGrant} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Grant Access
                    </button>
                    <button onClick={handleRevoke} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                        Revoke Access
                    </button>
                </div>
                {status && <p className="mt-2 text-sm font-semibold">{status}</p>}
            </div>
        </div>
    );
}
