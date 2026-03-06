"use client";

import { useState } from "react";
import {
  useAccount, useConnect, useDisconnect, useSignMessage, useBalance,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import type { LiveChecklist } from "@/components/dashboard/market/types";

const USDC_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as const;
const BAL_ABI = [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const;
const ALLOW_ABI = [{ name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const;
const APPROVE_ABI = [{ name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }] }] as const;
const MAX_UINT256 = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");

interface UseMarketWalletStateParams {
  addLog: (msg: string) => void;
}

export function useMarketWalletState({ addLog }: UseMarketWalletStateParams) {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { writeContract, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: waitingApproveReceipt, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { data: maticData } = useBalance({ address, chainId: 137, query: { enabled: isConnected && !!address } });
  const POLYMARKET_SPENDER = process.env.NEXT_PUBLIC_POLYMARKET_SPENDER ?? "";
  const { data: usdcRaw } = useReadContract({ address: USDC_POLYGON, abi: BAL_ABI, functionName: "balanceOf", args: address ? [address] : undefined, chainId: 137, query: { enabled: isConnected && !!address } });
  const usdcBalance = usdcRaw != null ? (Number(usdcRaw) / 1e6).toFixed(2) : null;
  const { data: usdcAllowanceRaw } = useReadContract({ address: USDC_POLYGON, abi: ALLOW_ABI, functionName: "allowance", args: address && POLYMARKET_SPENDER ? [address, POLYMARKET_SPENDER as `0x${string}`] : undefined, chainId: 137, query: { enabled: isConnected && !!address && !!POLYMARKET_SPENDER } });
  const usdcAllowance = usdcAllowanceRaw != null ? Number(usdcAllowanceRaw) / 1e6 : 0;

  const [walletVerified, setWalletVerified] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletChoice, setWalletChoice] = useState<"metamask" | "coinbase" | "trust">("metamask");

  const liveChecklist: LiveChecklist = {
    walletConnected: isConnected,
    polygonSelected: chain?.id === 137,
    usdcFunded: Number(usdcBalance ?? 0) > 0,
    signatureVerified: walletVerified,
    usdcApproved: usdcAllowance > 0,
  };

  const handleConnectWallet = async () => {
    setWalletError("");
    try {
      if (!isConnected) {
        const pref = connectors.find(c => {
          const id = c.id.toLowerCase();
          if (walletChoice === "coinbase") return id.includes("coinbase");
          if (walletChoice === "trust") return id.includes("walletconnect");
          return id.includes("meta") || id.includes("injected");
        }) ?? connectors[0];
        if (!pref) { setWalletError("No wallet connector available."); return; }
        connect({ connector: pref }); return;
      }
      const message = `Slate360 Market Robot verification: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/market/wallet-connect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, message }),
      });
      if (res.ok) {
        setWalletVerified(true);
        addLog(`✅ Wallet verified: ${address}`);
      } else {
        const e = await res.json() as { error?: string };
        setWalletError(e.error ?? "Verification failed");
      }
    } catch (e: unknown) { setWalletError((e as Error).message || "Connection failed"); }
  };

  const handleApproveUsdc = () => {
    if (!address || !POLYMARKET_SPENDER) { setWalletError("Missing wallet address or spender env."); return; }
    try {
      writeContract({ address: USDC_POLYGON, abi: APPROVE_ABI, functionName: "approve", args: [POLYMARKET_SPENDER as `0x${string}`, MAX_UINT256], chainId: 137 });
      addLog("🧾 Sent USDC approval transaction.");
    } catch (e: unknown) { setWalletError((e as Error).message || "USDC approval failed"); }
  };

  return {
    address, isConnected, chain, isConnecting, isApproving,
    waitingApproveReceipt, approveSuccess, usdcBalance, maticData,
    walletVerified, setWalletVerified, walletError, walletChoice, setWalletChoice,
    liveChecklist, handleConnectWallet, handleApproveUsdc, disconnect,
    POLYMARKET_SPENDER,
  };
}
