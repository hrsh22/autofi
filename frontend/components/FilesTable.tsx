"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { SynapseStorageClient } from "@autofi/sdk/synapse";
import { getRouterAddress } from "@autofi/sdk/onlyswaps";
import { downloadBytes } from "../lib/download";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { FileText, Download, Calendar, DollarSign, Clock, FolderOpen, Copy, Check } from "lucide-react";
import { formatUnits } from "viem";

type UserFile = {
    id: string;
    fileName: string;
    fileSize: number;
    fileHash: string;
    commp: string | null;
    providerId: string | null;
    storageDurationDays: number;
    storageCost: string;
    uploadedAt: number | null;
};

export function FilesTable({ refreshKey }: { refreshKey: number }) {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [files, setFiles] = useState<UserFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [copiedCommP, setCopiedCommP] = useState<string | null>(null);

    const prerequisites = useMemo(() => {
        if (!backendUrl) return "Set NEXT_PUBLIC_BACKEND_URL to load your files.";
        return null;
    }, [backendUrl]);

    const client = useMemo(() => {
        if (!publicClient || !walletClient || !backendUrl) return undefined;
        return new SynapseStorageClient({
            publicClient,
            walletClient,
            routerAddress: getRouterAddress(baseSepolia.id)
        });
    }, [publicClient, walletClient, backendUrl]);

    useEffect(() => {
        let mounted = true;
        async function run() {
            if (!client || !address) {
                return;
            }
            setLoading(true);
            try {
                const f = await client.listFiles(address as `0x${string}`);
                if (!mounted) return;
                setFiles(f);
                setMsg("");
            } catch (e: any) {
                setMsg(e?.message || "Failed to fetch files");
            } finally {
                setLoading(false);
            }
        }
        if (!prerequisites) {
            run();
        } else {
            setMsg(prerequisites);
            setFiles([]);
        }
        return () => {
            mounted = false;
        };
    }, [client, address, refreshKey, prerequisites]);

    async function download(file: UserFile) {
        if (prerequisites) {
            setMsg(prerequisites);
            return;
        }
        if (!client || !file.commp) {
            setMsg("File not ready for download.");
            return;
        }
        try {
            const bytes = await client.downloadFile(file.commp);
            downloadBytes(bytes, file.fileName || "download.bin");
        } catch (e: any) {
            setMsg(e?.message || "Download failed");
        }
    }

    async function copyCommP(commp: string) {
        try {
            await navigator.clipboard.writeText(commp);
            setCopiedCommP(commp);
            setTimeout(() => setCopiedCommP(null), 2000);
        } catch (error) {
            console.error("Failed to copy CommP:", error);
        }
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    const formatDate = (timestamp: number | null): string => {
        if (!timestamp) return "N/A";
        try {
            // uploadedAt is stored in milliseconds (from Date.now() in backend)
            // Date.now() returns milliseconds since epoch (e.g., 1700000000000)
            // If timestamp is less than year 2000 in milliseconds, it's likely in seconds
            // Year 2000 in milliseconds = 946684800000
            let timestampInMs: number;
            
            if (timestamp < 946684800000) {
                // Timestamp is in seconds, convert to milliseconds
                timestampInMs = timestamp * 1000;
            } else {
                // Timestamp is already in milliseconds
                timestampInMs = timestamp;
            }
            
            const date = new Date(timestampInMs);
            
            if (isNaN(date.getTime())) {
                return "N/A";
            }
            
            // Format as readable date: "Dec 25, 2023" or "Jan 1, 2024"
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return "N/A";
        }
    };

    return (
        <Card className="bg-white">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#C44569] border-4 border-black">
                        <FolderOpen className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <CardTitle className="text-xl font-black text-black">YOUR FILES</CardTitle>
                        <CardDescription className="text-black font-bold">Manage your stored files</CardDescription>
                    </div>
                    {files.length > 0 && (
                        <Badge variant="default" className="bg-black text-white border-2 border-black font-black">
                            {files.length} {files.length === 1 ? "FILE" : "FILES"}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {loading && (
                    <div className="space-y-3">
                        <Skeleton className="h-20 w-full border-4 border-black" />
                        <Skeleton className="h-20 w-full border-4 border-black" />
                        <Skeleton className="h-20 w-full border-4 border-black" />
                    </div>
                )}
                {!loading && files.length === 0 && !prerequisites && (
                    <div className="text-center py-12">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-black" />
                        <p className="text-base font-black text-black mb-1">NO FILES YET</p>
                        <p className="text-sm font-bold text-black">Upload your first file to get started</p>
                    </div>
                )}
                {!loading && files.length > 0 && (
                    <div className="space-y-4">
                        {files.map((f) => {
                            const costEth = formatUnits(BigInt(f.storageCost), 18);
                            return (
                                <div key={f.id} className="p-5 border-4 border-black bg-white">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <div className="p-3 bg-[#FFE066] border-4 border-black shrink-0">
                                                <FileText className="h-6 w-6 text-black" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 
                                                    className="font-black text-black truncate mb-2 text-base" 
                                                    title={f.fileName}
                                                >
                                                    {f.fileName}
                                                </h4>
                                                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-black">
                                                    <div className="flex items-center gap-1">
                                                        <span>{formatFileSize(f.fileSize)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>{f.storageDurationDays} days</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="h-4 w-4" />
                                                        <span>{parseFloat(costEth).toFixed(6)} USDFC</span>
                                                    </div>
                                                    {f.uploadedAt && (
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-4 w-4" />
                                                            <span>{formatDate(f.uploadedAt)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {f.commp && (
                                                    <div className="mt-3 flex items-center gap-2">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className="text-xs font-mono font-black bg-white cursor-help"
                                                                    >
                                                                        CommP: {f.commp.slice(0, 12)}…
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-md">
                                                                    <p className="font-mono text-xs break-all">{f.commp}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            onClick={() => copyCommP(f.commp!)}
                                                            className="h-6 w-6 p-0"
                                                            title="Copy CommP"
                                                        >
                                                            {copiedCommP === f.commp ? (
                                                                <Check className="h-3 w-3 text-[#00FF88]" />
                                                            ) : (
                                                                <Copy className="h-3 w-3 text-black" />
                                                            )}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            {f.commp ? (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => download(f)}
                                                    className="min-w-[120px] bg-[#00FF88]">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    DOWNLOAD
                                                </Button>
                                            ) : (
                                                <Badge variant="secondary" className="text-xs font-black bg-[#FFE066] text-black">
                                                    PROCESSING
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {msg && <div className="mt-4 p-4 border-4 border-black bg-white text-sm font-black text-black">{msg}</div>}
            </CardContent>
        </Card>
    );
}
