"use client";

import React, { useEffect, useState } from "react";
import { useAccount, useDisconnect, useChainId, useChains } from "wagmi";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Wallet, LogOut, Copy, Check, Network } from "lucide-react";

// Chain Logo Component with fallback
function ChainLogo({ chain }: { chain: { id: number; name: string; iconUrl?: string } }) {
    const [imgError, setImgError] = useState(false);
    const logoUrl = chain.iconUrl || `https://icons.llamao.fi/icons/chains/rsz_${chain.id}.jpg`;

    if (imgError) {
        return <Network className="h-3.5 w-3.5" />;
    }

    return <img src={logoUrl} alt={chain.name} className="h-3.5 w-3.5 rounded-full" onError={() => setImgError(true)} />;
}

export function WalletButton() {
    const { address } = useAccount();
    const { disconnectAsync } = useDisconnect();
    const chainId = useChainId();
    const chains = useChains();
    const [mounted, setMounted] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Get current chain info
    const currentChain = chains.find((chain) => chain.id === chainId);

    if (!mounted || !address) {
        return null;
    }

    const handleDisconnect = async () => {
        try {
            setMessage(null);
            await disconnectAsync();
        } catch (error: any) {
            setMessage(error?.message ?? "Failed to disconnect wallet");
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy address:", error);
        }
    };

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 flex-wrap">
                {/* Chain Badge */}
                {currentChain && (
                    <Badge 
                        variant="outline" 
                        className="px-4 py-2 text-xs font-black bg-white"
                        title={currentChain.name}
                    >
                        <div className="flex items-center gap-2">
                            <ChainLogo chain={currentChain} />
                            <span className="hidden sm:inline font-black">{currentChain.name.toUpperCase()}</span>
                            <span className="sm:hidden font-black">{currentChain.name.split(" ")[0].toUpperCase()}</span>
                        </div>
                    </Badge>
                )}

                {/* Wallet Address Badge */}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge 
                                variant="default" 
                                className="px-4 py-2 font-mono text-xs font-black bg-[#FF6B9D] text-black cursor-help"
                            >
                                <Wallet className="h-4 w-4 mr-1.5" />
                                {address.slice(0, 6)}…{address.slice(-4)}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                            <p className="font-mono text-xs break-all">{address}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Copy Button */}
                <Button variant="outline" size="icon-sm" onClick={handleCopy} className="h-10 w-10 bg-white" title="Copy address">
                    {copied ? <Check className="h-5 w-5 text-[#00FF88]" /> : <Copy className="h-5 w-5 text-black" />}
                </Button>

                {/* Disconnect Button */}
                <Button variant="default" size="sm" onClick={handleDisconnect} className="h-10 bg-[#FF3333] text-black font-black">
                    <LogOut className="h-4 w-4 mr-1.5" />
                    DISCONNECT
                </Button>
            </div>
            {message && <span className="text-xs font-black text-black bg-[#FF3333] px-3 py-1 border-2 border-black animate-fade-in">{message}</span>}
        </div>
    );
}
