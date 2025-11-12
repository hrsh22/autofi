"use client";

import React, { useLayoutEffect, useEffect, useState } from "react";
import { useAccount } from "wagmi";
// Import web3modal module first to ensure initialization
import "../lib/web3modal";
import { useWeb3Modal, isWeb3ModalEnabled } from "../lib/web3modal";
import { useConnect } from "wagmi";
import { Button } from "./ui/button";
import { Wallet, Database, ArrowLeftRight } from "lucide-react";

function ConnectWithModal() {
    const [mounted, setMounted] = useState(false);

    // Ensure component only renders client-side
    useLayoutEffect(() => {
        setMounted(true);
    }, []);

    // Always call hook (React requirement) - initialization happens at module load
    const { open } = useWeb3Modal();

    if (!mounted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-10 animate-fade-in">
            <div className="text-center space-y-8 max-w-2xl">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-[#FF6B9D] border-4 border-black mb-6">
                    <Wallet className="h-12 w-12 text-black" />
                </div>
                <div className="space-y-4">
                    <h1 className="text-6xl font-black text-black">WELCOME TO FILBRIDGE</h1>
                    <p className="text-2xl font-bold text-black">SECURE, DECENTRALIZED FILE STORAGE POWERED BY SYNAPSE AND ONLYSWAPS</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 max-w-4xl">
                    <div className="p-6 bg-[#00D9FF] border-4 border-black">
                        <Database className="h-8 w-8 text-black mb-3" />
                        <h3 className="font-black text-base mb-2 text-black">SYNAPSE</h3>
                        <p className="text-xs font-bold text-black">
                            Synapse SDK helps you store your files on Filecoin network. No Filecoin wallet needed - upload from any blockchain.
                        </p>
                    </div>
                    <div className="p-6 bg-[#FF8C42] border-4 border-black">
                        <ArrowLeftRight className="h-8 w-8 text-black mb-3" />
                        <h3 className="font-black text-base mb-2 text-black">ONLYSWAPS</h3>
                        <p className="text-xs font-bold text-black">
                            Cross-chain bridge protocol that automatically converts your ERC20 tokens to USDFC for Filecoin storage payments.
                        </p>
                    </div>
                </div>
            </div>

            <Button onClick={() => open()} size="lg" className="px-10 py-7 text-xl font-black h-auto bg-[#FF6B9D]">
                <Wallet className="h-6 w-6 mr-3" />
                CONNECT WALLET
            </Button>
        </div>
    );
}

function ConnectWithFallback() {
    const { connectAsync, connectors, isPending } = useConnect();
    const [mounted, setMounted] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    const handleConnect = async (connectorId: string) => {
        const connector = connectors.find((item) => item.id === connectorId);
        if (!connector) {
            setMessage("No compatible wallet connector found");
            return;
        }
        try {
            setMessage(null);
            await connectAsync({ connector });
        } catch (error: any) {
            setMessage(error?.message ?? "Failed to connect wallet");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-10 animate-fade-in">
            <div className="text-center space-y-8 max-w-2xl">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-[#FF6B9D] border-4 border-black mb-6">
                    <Wallet className="h-12 w-12 text-black" />
                </div>
                <div className="space-y-4">
                    <h1 className="text-6xl font-black text-black">WELCOME TO FILBRIDGE SYNAPSE</h1>
                    <p className="text-2xl font-bold text-black">SECURE, DECENTRALIZED FILE STORAGE POWERED BY BLOCKCHAIN</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 max-w-4xl">
                    <div className="p-6 bg-[#00D9FF] border-4 border-black">
                        <Database className="h-8 w-8 text-black mb-3" />
                        <h3 className="font-black text-base mb-2 text-black">SYNAPSE</h3>
                        <p className="text-xs font-bold text-black">
                            Filecoin storage SDK that stores your files on decentralized Filecoin network. No Filecoin wallet needed - upload from any
                            blockchain.
                        </p>
                    </div>
                    <div className="p-6 bg-[#FF8C42] border-4 border-black">
                        <ArrowLeftRight className="h-8 w-8 text-black mb-3" />
                        <h3 className="font-black text-base mb-2 text-black">ONLYSWAPS</h3>
                        <p className="text-xs font-bold text-black">
                            Cross-chain bridge protocol that automatically converts your tokens (USDT/USDC) to USDFC for Filecoin storage payments.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-md">
                {connectors.length === 0 && (
                    <p className="text-black font-black text-center bg-[#FF3333] p-4 border-4 border-black">NO WALLET CONNECTORS CONFIGURED.</p>
                )}
                {connectors.map((connector) => (
                    <Button
                        key={connector.id}
                        onClick={() => handleConnect(connector.id)}
                        size="lg"
                        disabled={isPending}
                        className="w-full h-auto py-7 text-xl font-black bg-[#FF6B9D]">
                        <Wallet className="h-6 w-6 mr-3" />
                        {isPending ? "CONNECTING…" : `CONNECT ${connector.name.toUpperCase()}`}
                    </Button>
                ))}
            </div>
            {message && <div className="p-5 bg-[#FF3333] border-4 border-black text-black text-base font-black max-w-md text-center">{message}</div>}
        </div>
    );
}

export function ConnectWallet() {
    return isWeb3ModalEnabled ? <ConnectWithModal /> : <ConnectWithFallback />;
}
