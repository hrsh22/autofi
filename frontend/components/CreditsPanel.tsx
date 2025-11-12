"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { baseSepolia } from "wagmi/chains";
import { SynapseStorageClient } from "@autofi/sdk/synapse";
import { getRouterAddress } from "@autofi/sdk/onlyswaps";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Separator } from "./ui/separator";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2, XCircle } from "lucide-react";

export function CreditsPanel() {
    const { address } = useAccount();
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    const [balanceWei, setBalanceWei] = useState<string>("0");
    const [history, setHistory] = useState<Array<{ id: string; type: string; amount: string; description: string; createdAt: number }>>([]);
    const [amount, setAmount] = useState<string>("1.0");
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<string>("");

    const prerequisites = useMemo(() => {
        return null;
    }, []);

    const client = useMemo(() => {
        if (!publicClient || !walletClient || !backendUrl) return undefined;
        return new SynapseStorageClient({
            publicClient,
            walletClient,
            routerAddress: getRouterAddress(baseSepolia.id)
        });
    }, [publicClient, walletClient, backendUrl]);

    const fetchData = useCallback(async () => {
        if (!client || !address) {
            return;
        }
        try {
            console.log("[CreditsPanel] Fetching credit balance for:", address);
            const b = await client.getCreditBalance(address as `0x${string}`);
            console.log("[CreditsPanel] Credit balance response:", b);
            setBalanceWei(b.balance);

            console.log("[CreditsPanel] Fetching credit history for:", address);
            const h = await client.getCreditHistory(address as `0x${string}`, 10);
            console.log("[CreditsPanel] Credit history response (raw):", h);
            console.log("[CreditsPanel] Credit history length:", h.length);

            if (h.length > 0) {
                console.log("[CreditsPanel] First transaction sample:", {
                    id: h[0].id,
                    type: h[0].type,
                    amount: h[0].amount,
                    createdAt: h[0].createdAt,
                    createdAtType: typeof h[0].createdAt,
                    createdAtValue: h[0].createdAt,
                    fullTransaction: h[0]
                });
            }

            setHistory(h);
        } catch (e: any) {
            console.error("[CreditsPanel] Error fetching credits:", e);
            setMsg(e?.message || "Failed to fetch credits");
        }
    }, [client, address]);

    useEffect(() => {
        if (prerequisites) {
            setMsg(prerequisites);
            setBalanceWei("0");
            setHistory([]);
            return;
        }
        setMsg("");
        fetchData();
    }, [fetchData, prerequisites]);

    const balance = useMemo(() => {
        try {
            return formatUnits(BigInt(balanceWei), 18);
        } catch {
            return "0";
        }
    }, [balanceWei]);

    async function fund() {
        if (!client || !address) {
            setMsg("Wallet not ready. Please try again.");
            return;
        }
        try {
            setLoading(true);
            setMsg("");
            const wei = parseUnits(amount || "0", 18);
            const result = await client.fundCredits({
                amount: wei,
                userAddress: address as `0x${string}`,
                sourceChainId: baseSepolia.id,
                sourceTokenSymbol: "RUSD"
            });
            setMsg(`Funded: ${formatUnits(BigInt(result.amountFunded), 18)} USDFC (bridgeId: ${result.bridgeRequestId})`);
            await fetchData();
        } catch (e: any) {
            setMsg(e?.message || "Funding failed");
        } finally {
            setLoading(false);
        }
    }

    const formatDate = (createdAt: number | null | undefined): string => {
        if (createdAt == null || createdAt === undefined) {
            return "Date not available";
        }

        try {
            let timestamp: number;
            if (typeof createdAt === "string") {
                timestamp = parseInt(createdAt, 10);
            } else {
                timestamp = Number(createdAt);
            }

            if (isNaN(timestamp) || timestamp === 0) {
                return "Date not available";
            }

            const timestampInMs = timestamp < 946684800 ? timestamp * 1000 : timestamp;
            const date = new Date(timestampInMs);

            if (isNaN(date.getTime())) {
                return "Invalid date";
            }

            return date.toLocaleString();
        } catch (e) {
            console.error("[CreditsPanel] Date formatting error:", e);
            return "Date error";
        }
    };

    const isCredit = (type: string) => {
        const lowerType = type.toLowerCase();
        // Transaction types are 'deposit' (credit) or 'deduct' (debit)
        return lowerType === "deposit" || lowerType.includes("credit") || lowerType.includes("fund");
    };

    return (
        <Card className="bg-white">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[#FF6B9D] border-4 border-black">
                        <Wallet className="h-6 w-6 text-black" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-black text-black">CREDITS</CardTitle>
                        <CardDescription className="text-black font-bold">Manage your storage credits</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Balance Display */}
                <div className="p-6 bg-[#FF6B9D] border-4 border-black">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-black text-black">AVAILABLE BALANCE</span>
                        <Badge variant="default" className="bg-black text-white border-2 border-black font-black">
                            USDFC
                        </Badge>
                    </div>
                    <div className="text-5xl font-black text-black mb-2">{parseFloat(balance).toFixed(4)}</div>
                    <div className="text-xs font-bold text-black">{balanceWei !== "0" ? `${BigInt(balanceWei).toString()} wei` : "No credits"}</div>
                </div>

                {/* Fund Credits Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            placeholder="Amount (USDFC)"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={!!prerequisites}
                            className="flex-1"
                        />
                        <Button disabled={loading || !!prerequisites} onClick={fund} className="min-w-[120px]">
                            {loading ? (
                                <>
                                    <ArrowUpCircle className="h-4 w-4 mr-2 animate-pulse" />
                                    Funding…
                                </>
                            ) : (
                                <>
                                    <ArrowUpCircle className="h-4 w-4 mr-2" />
                                    Fund Credits
                                </>
                            )}
                        </Button>
                    </div>
                    {msg && (
                        <div
                            className={`flex items-start gap-2 p-4 border-4 border-black text-sm font-bold ${
                                msg.includes("Failed") || msg.includes("error") || msg.includes("Error")
                                    ? "bg-[#FF3333] text-black"
                                    : "bg-[#00FF88] text-black"
                            }`}>
                            {msg.includes("Failed") || msg.includes("error") || msg.includes("Error") ? (
                                <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                            ) : (
                                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                            )}
                            <span className="flex-1 font-black">{msg}</span>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Transaction History */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">Recent Transactions</h3>
                        <Badge variant="outline" className="text-xs">
                            {history.length} {history.length === 1 ? "transaction" : "transactions"}
                        </Badge>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {history.length === 0 ? (
                            <div className="text-center py-8 text-sm font-bold text-black">
                                <Clock className="h-8 w-8 mx-auto mb-2" />
                                <p className="font-black">NO TRANSACTIONS YET</p>
                            </div>
                        ) : (
                            history.map((t) => {
                                const amountFormatted = formatUnits(BigInt(t.amount), 18);
                                const isCreditTx = isCredit(t.type);

                                return (
                                    <div
                                        key={t.id}
                                        className={`flex items-center justify-between p-4 border-4 border-black ${
                                            isCreditTx ? "bg-[#00FF88]" : "bg-[#00D9FF]"
                                        }`}>
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`p-2 border-2 border-black ${isCreditTx ? "bg-white" : "bg-black"}`}>
                                                {isCreditTx ? (
                                                    <ArrowDownCircle className={`h-5 w-5 ${isCreditTx ? "text-black" : "text-white"}`} />
                                                ) : (
                                                    <ArrowUpCircle className="h-5 w-5 text-white" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div 
                                                    className="text-sm font-black text-black truncate uppercase" 
                                                    title={t.type}
                                                >
                                                    {t.type}
                                                </div>
                                                <div className="text-xs font-bold text-black">{formatDate(t.createdAt)}</div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-black text-black ml-4">
                                            {isCreditTx ? "+" : "-"}
                                            {amountFormatted} USDFC
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
