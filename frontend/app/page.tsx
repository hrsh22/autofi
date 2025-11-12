"use client";
import { useAccount } from "wagmi";
import dynamic from "next/dynamic";
import { WalletButton } from "../components/WalletButton";
import { StatusCard } from "../components/StatusCard";
import { CreditsPanel } from "../components/CreditsPanel";
import { UploadPanel } from "../components/UploadPanel";
import { FilesTable } from "../components/FilesTable";
import { useState, useEffect } from "react";
import { Skeleton } from "../components/ui/skeleton";

// Dynamically import ConnectWallet to ensure Web3Modal is initialized client-side
const ConnectWallet = dynamic(() => import("../components/ConnectWallet").then((mod) => ({ default: mod.ConnectWallet })), { ssr: false });

export default function Home() {
    const { isConnected } = useAccount();
    const [mounted, setMounted] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const onUploaded = () => setRefreshKey((k) => k + 1);

    // Prevent hydration mismatch by only rendering after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Show loading state during hydration
    if (!mounted) {
        return (
            <main className="min-h-screen gradient-bg">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-center min-h-[60vh]">
                        <div className="space-y-4 w-full max-w-md">
                            <Skeleton className="h-12 w-64 mx-auto" />
                            <Skeleton className="h-8 w-48 mx-auto" />
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // Show connect wallet landing page if not connected
    if (!isConnected) {
        return (
            <main className="min-h-screen gradient-bg">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                    <ConnectWallet />
                </div>
            </main>
        );
    }

    // Show main app when connected
    return (
        <main className="min-h-screen gradient-bg">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
                {/* Header */}
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b-4 border-black">
                    <div className="space-y-2">
                        <h1 className="text-5xl font-black text-black">FILBRIDGE</h1>
                        <p className="text-base font-bold text-black">DECENTRALIZED STORAGE PLATFORM</p>
                    </div>
                    <WalletButton />
                </header>

                {/* Credits Panel */}
                <div className="animate-slide-up">
                    <CreditsPanel />
                </div>

                {/* Upload Section */}
                <div className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
                    <UploadPanel onUploaded={onUploaded} />
                </div>

                {/* Files Table */}
                <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                    <FilesTable refreshKey={refreshKey} />
                </div>

                {/* Backend Status - Monitoring Only */}
                <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
                    <StatusCard />
                </div>
            </div>
        </main>
    );
}
