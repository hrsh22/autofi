"use client";

import React, { useMemo, useState, useCallback } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { formatUnits } from "viem";
import { baseSepolia } from "wagmi/chains";
import { SynapseStorageClient } from "@autofi/sdk/synapse";
import { getRouterAddress } from "@autofi/sdk/onlyswaps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Upload, File, X, Calculator, Loader2 } from "lucide-react";

export function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const backendFilecoin = process.env.NEXT_PUBLIC_BACKEND_FILECOIN_ADDRESS as `0x${string}` | undefined;
    const [file, setFile] = useState<File | null>(null);
    const [days, setDays] = useState<number>(30);
    const [costWei, setCostWei] = useState<bigint | null>(null);
    const [msg, setMsg] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const prerequisites = useMemo(() => {
        if (!backendUrl) return "Set NEXT_PUBLIC_BACKEND_URL to upload files.";
        return null;
    }, [backendUrl]);

    const client = useMemo(() => {
        if (!publicClient || !walletClient || !backendUrl) return undefined;
        return new SynapseStorageClient({
            backendUrl,
            ...(backendFilecoin && { backendFilecoinAddress: backendFilecoin }),
            // @ts-expect-error - viem version mismatch
            publicClient,
            // @ts-expect-error - viem version mismatch
            walletClient,
            routerAddress: getRouterAddress(baseSepolia.id)
        });
    }, [publicClient, walletClient, backendUrl, backendFilecoin]);

    const cost = useMemo(() => {
        try {
            return costWei ? `${formatUnits(costWei, 18)} USDFC` : "-";
        } catch {
            return "-";
        }
    }, [costWei]);

    function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
        console.log("[UploadPanel] File selected", { files: e.target.files, fileCount: e.target.files?.length });
        const f = e.target.files?.[0];
        if (f) {
            console.log("[UploadPanel] File details:", { name: f.name, size: f.size, type: f.type });
        }
        setFile(f || null);
        setCostWei(null);
        setMsg("");
    }

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            setFile(droppedFile);
            setCostWei(null);
            setMsg("");
        }
    }, []);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    function estimate() {
        console.log("[UploadPanel] estimate() called", { prerequisites, client: !!client, file: !!file, days });

        if (prerequisites) {
            setMsg(prerequisites);
            return;
        }

        if (!file) {
            setMsg("Select a file first.");
            return;
        }

        if (!client) {
            console.error("[UploadPanel] Client not ready", {
                publicClient: !!publicClient,
                walletClient: !!walletClient,
                backendUrl,
                backendFilecoin
            });
            setMsg("Wallet not ready. Please wait a moment and try again.");
            return;
        }

        try {
            console.log("[UploadPanel] Calculating storage cost", { fileSize: file.size, days });
            const c = client.calculateStorageCost(file.size, days);
            console.log("[UploadPanel] Calculated cost:", c);
            setCostWei(c);
            setMsg("");
        } catch (e: any) {
            console.error("[UploadPanel] Error calculating cost:", e);
            setMsg(e?.message || "Failed to estimate cost");
        }
    }

    async function upload() {
        console.log("[UploadPanel] upload() called", { prerequisites, client: !!client, address: !!address, file: !!file, days });

        if (prerequisites) {
            setMsg(prerequisites);
            return;
        }

        if (!file) {
            setMsg("Select a file to upload.");
            return;
        }

        if (!client || !address) {
            console.error("[UploadPanel] Client or address not ready", {
                client: !!client,
                address: !!address,
                publicClient: !!publicClient,
                walletClient: !!walletClient
            });
            setMsg("Wallet not ready. Please wait a moment and try again.");
            return;
        }

        try {
            setLoading(true);
            setMsg("");
            console.log("[UploadPanel] Starting upload", { fileName: file.name, fileSize: file.size, days });
            await client.uploadFile({
                file,
                fileName: file.name,
                userAddress: address as `0x${string}`,
                storageDurationDays: days
            });
            console.log("[UploadPanel] Upload successful");
            setMsg("Upload successful");
            setFile(null);
            setCostWei(null);
            onUploaded();
        } catch (e: any) {
            console.error("[UploadPanel] Upload error:", e);
            setMsg(e?.message || "Upload failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card className="bg-white">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#00D9FF] border-4 border-black">
                        <Upload className="h-6 w-6 text-black" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black text-black">UPLOAD FILE</CardTitle>
                        <CardDescription className="text-black font-bold">Store your files on decentralized storage</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {prerequisites && <div className="p-4 bg-[#FF3333] border-4 border-black text-sm font-black text-black">{prerequisites}</div>}

                {/* File Upload Area */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`relative border-4 border-dashed border-black p-10 transition-all ${
                        isDragging ? "bg-[#00D9FF] border-black" : "bg-white hover:bg-[#FFE066]"
                    } ${!!prerequisites ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                    <input
                        type="file"
                        onChange={onSelectFile}
                        disabled={!!prerequisites}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        id="file-upload"
                    />
                    <div className="text-center space-y-4">
                        {file ? (
                            <>
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FF6B9D] border-4 border-black">
                                    <File className="h-10 w-10 text-black" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-base font-black text-black">{file.name}</p>
                                    <p className="text-xs font-bold text-black">{formatFileSize(file.size)}</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setFile(null);
                                        setCostWei(null);
                                        setMsg("");
                                    }}
                                    className="mt-2 bg-white">
                                    <X className="h-4 w-4 mr-1" />
                                    REMOVE
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-black border-4 border-black">
                                    <Upload className="h-10 w-10 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-base font-black text-black">
                                        {isDragging ? "DROP FILE HERE" : "CLICK TO UPLOAD OR DRAG AND DROP"}
                                    </p>
                                    <p className="text-xs font-bold text-black">Select a file to store</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Duration and Cost Estimation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Storage Duration</label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min={1}
                                value={days}
                                onChange={(e) => setDays(parseInt(e.target.value || "30"))}
                                disabled={!!prerequisites}
                                className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">days</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Estimated Cost</label>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" onClick={estimate} disabled={!!prerequisites || !file || !client} className="flex-1">
                                <Calculator className="h-4 w-4 mr-2" />
                                Estimate
                            </Button>
                            {cost !== "-" && (
                                <Badge variant="secondary" className="text-sm px-3 py-1.5">
                                    {cost}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Upload Button */}
                <Button disabled={loading || !file || !!prerequisites || !client} onClick={upload} className="w-full" size="lg">
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading…
                        </>
                    ) : (
                        <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload File
                        </>
                    )}
                </Button>

                {msg && (
                    <div
                        className={`p-4 border-4 border-black text-sm font-black ${
                            msg.includes("successful") || msg.includes("Success")
                                ? "bg-[#00FF88] text-black"
                                : msg.includes("Failed") || msg.includes("error") || msg.includes("Error")
                                  ? "bg-[#FF3333] text-black"
                                  : "bg-white text-black"
                        }`}>
                        {msg}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
