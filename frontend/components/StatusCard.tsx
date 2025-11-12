"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Activity, CheckCircle2, XCircle, RefreshCw, ExternalLink } from "lucide-react";
import { formatUnits } from "viem";

export function StatusCard() {
    const [status, setStatus] = useState<{ balance: string; allowance: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    const fetchStatus = useCallback(async () => {
        console.log("[StatusCard] fetchStatus called");
        console.log("[StatusCard] backendUrl:", backendUrl);

        if (!backendUrl) {
            console.error("[StatusCard] Backend URL not configured");
            setError("Backend URL not configured. Set NEXT_PUBLIC_BACKEND_URL environment variable.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const requestUrl = `${backendUrl}/api/status`;
        console.log("[StatusCard] Making request to:", requestUrl);
        console.log("[StatusCard] Request timestamp:", new Date().toISOString());

        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                console.error("[StatusCard] Request timeout after 10 seconds");
                console.error("[StatusCard] Request URL:", requestUrl);
                controller.abort();
            }, 10000); // 10 second timeout

            const requestStartTime = Date.now();
            console.log("[StatusCard] Fetch started at:", requestStartTime);

            const response = await fetch(requestUrl, {
                signal: controller.signal,
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                // Add mode to help debug CORS issues
                mode: "cors"
            });

            const requestDuration = Date.now() - requestStartTime;
            console.log("[StatusCard] Fetch completed in:", requestDuration, "ms");
            console.log("[StatusCard] Response status:", response.status, response.statusText);
            console.log("[StatusCard] Response headers:", Object.fromEntries(response.headers.entries()));

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => "Unable to read error response");
                console.error("[StatusCard] Response not OK:", {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`Status request failed: ${response.status} ${response.statusText}`);
            }

            const responseText = await response.text();
            console.log("[StatusCard] Response body (raw):", responseText);

            let data;
            try {
                data = JSON.parse(responseText);
                console.log("[StatusCard] Response body (parsed):", data);
            } catch (parseError) {
                console.error("[StatusCard] JSON parse error:", parseError);
                console.error("[StatusCard] Response text that failed to parse:", responseText);
                throw new Error("Invalid JSON response from backend");
            }

            if (!data.synapse) {
                console.error("[StatusCard] Missing synapse data in response:", data);
                throw new Error("Invalid response format: missing synapse data");
            }

            console.log("[StatusCard] Successfully parsed status:", data.synapse);
            setStatus(data.synapse);
            setError(null);
        } catch (e: any) {
            const errorDetails = {
                name: e.name,
                message: e.message,
                stack: e.stack,
                cause: e.cause
            };
            console.error("[StatusCard] Fetch error details:", errorDetails);
            console.error("[StatusCard] Error occurred at:", new Date().toISOString());
            console.error("[StatusCard] Request URL was:", requestUrl);

            if (e.name === "AbortError") {
                const errorMsg = `Request timed out after 10 seconds. Backend URL: ${backendUrl}`;
                console.error("[StatusCard] Timeout error:", errorMsg);
                setError(errorMsg);
            } else if (e.message.includes("Failed to fetch") || e.message.includes("NetworkError")) {
                const errorMsg = `Cannot connect to backend at ${backendUrl}. Check if backend is running and CORS is configured.`;
                console.error("[StatusCard] Network error:", errorMsg);
                console.error("[StatusCard] Common causes: Backend not running, CORS not configured, wrong URL");
                setError(errorMsg);
            } else if (e.message.includes("CORS")) {
                const errorMsg = `CORS error: Backend at ${backendUrl} is not allowing requests from this origin.`;
                console.error("[StatusCard] CORS error:", errorMsg);
                setError(errorMsg);
            } else {
                console.error("[StatusCard] Other error:", e);
                setError(e?.message || "Failed to load backend status");
            }
            setStatus(null);
        } finally {
            console.log("[StatusCard] fetchStatus completed, setting loading to false");
            setLoading(false);
        }
    }, [backendUrl]);

    useEffect(() => {
        console.log("[StatusCard] Component mounted or backendUrl changed");
        console.log("[StatusCard] Current backendUrl:", backendUrl);
        console.log("[StatusCard] Calling fetchStatus");
        fetchStatus();
    }, [fetchStatus]);

    // Log when component mounts
    useEffect(() => {
        console.log("[StatusCard] Component mounted");
        console.log("[StatusCard] Environment check:", {
            backendUrl,
            hasBackendUrl: !!backendUrl,
            windowDefined: typeof window !== "undefined"
        });
    }, []);

    const balanceEth = status ? formatUnits(BigInt(status.balance), 18) : "0";
    const allowanceEth = status ? formatUnits(BigInt(status.allowance), 18) : "0";

    return (
        <Card className="bg-white">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary border-4 border-black">
                            <Activity className="h-6 w-6 text-black" />
                        </div>
                        <div>
                            <CardTitle className="text-xl font-black text-black">BACKEND STATUS</CardTitle>
                            <CardDescription className="text-black font-bold">Synapse service connection</CardDescription>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                            console.log("[StatusCard] Manual retry triggered");
                            fetchStatus();
                        }}
                        disabled={loading}
                        className="h-8 w-8">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {loading && (
                    <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        {backendUrl && <p className="text-xs text-muted-foreground">Connecting to {backendUrl}</p>}
                    </div>
                )}
                {!loading && error && (
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-5 bg-[#FF3333] border-4 border-black">
                            <XCircle className="h-6 w-6 text-black mt-0.5 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <p className="text-sm font-black text-black">{error}</p>
                                {backendUrl && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold text-black">Backend URL: {backendUrl}</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                console.log("[StatusCard] Testing backend URL accessibility");
                                                window.open(backendUrl, "_blank");
                                            }}
                                            className="mt-2 bg-white">
                                            <ExternalLink className="h-4 w-4 mr-1" />
                                            OPEN IN NEW TAB
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {!loading && !error && status && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-5 w-5 text-black" />
                            <Badge variant="default" className="bg-[#00FF88] text-black border-2 border-black font-black">
                                CONNECTED
                            </Badge>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-5 bg-[#00D9FF] border-4 border-black">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-black text-black">BALANCE</span>
                                </div>
                                <div className="text-3xl font-black text-black">{parseFloat(balanceEth).toFixed(6)}</div>
                                <div className="text-xs font-bold text-black mt-1">{BigInt(status.balance).toString()} wei</div>
                            </div>
                            <div className="p-5 bg-[#FF6B9D] border-4 border-black">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-black text-black">ALLOWANCE</span>
                                </div>
                                <div className="text-3xl font-black text-black">{parseFloat(allowanceEth).toFixed(6)}</div>
                                <div className="text-xs font-bold text-black mt-1">{BigInt(status.allowance).toString()} wei</div>
                            </div>
                        </div>
                    </div>
                )}
                {!loading && !error && !status && (
                    <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">No status data available</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
