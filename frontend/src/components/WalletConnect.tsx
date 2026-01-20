
import { useState } from 'react';
import { ethers } from 'ethers';
import { Button } from './ui/button';
import { Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

export default function WalletConnect() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [linkedAddress, setLinkedAddress] = useState<string | null>(null);

    const handleConnectAndLink = async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (!window.ethereum) throw new Error("No crypto wallet found. Please install MetaMask.");

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const walletAddress = await signer.getAddress();

            // 1. Sign Message
            const message = `Connect to E-Health: ${user.id}`;
            const signature = await signer.signMessage(message);

            // 2. Send to Backend
            const token = localStorage.getItem('token');
            await axios.post('http://127.0.0.1:8000/users/link-wallet', {
                walletAddress,
                signature
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setLinkedAddress(walletAddress);
            toast.success("Wallet Linked Successfully!");

        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.detail || error.message || "Failed to link wallet";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {linkedAddress ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium border border-green-200">
                    <Wallet size={14} />
                    <span>{linkedAddress.slice(0, 6)}...{linkedAddress.slice(-4)}</span>
                </div>
            ) : (
                <Button
                    onClick={handleConnectAndLink}
                    disabled={loading}
                    variant="outline"
                    className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                >
                    <Wallet size={16} />
                    {loading ? "Linking..." : "Connect Wallet"}
                </Button>
            )}
        </div>
    );
}
