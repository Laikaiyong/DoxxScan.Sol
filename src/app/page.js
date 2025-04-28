'use client';

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { UserButton, useAuth } from "@civic/auth-web3/react";
import { getUser } from "@civic/auth-web3/nextjs";

export default function Home() {
  const { user } = getUser();
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!walletAddress.trim()) return;
    
    setIsLoading(true);
    
    try {
      // Route to address page with the input
      router.push(`/address/${walletAddress.trim()}`);
    } catch (error) {
      console.error("Error navigating:", error);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#f5f2ea] dark:bg-[#1a1814] text-[#333] dark:text-[#f5f2ea]">
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            How doxxed & exposed are you?
          </h1>
          <p className="text-lg text-[#666] dark:text-[#bbb] max-w-2xl mx-auto">
            Scan your wallet to assess exposure to rugs, scams, and privacy risks. 
            Powered by Solscan, DD.xyz, and RugCheck.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleScan} className="max-w-xl mx-auto mb-16">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter wallet address or domain (.sol, .eth...)"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="flex-1 px-4 py-3 rounded-lg bg-white dark:bg-[#2a251e] border border-[#e0d9c7] dark:border-[#3a3530] focus:outline-none focus:ring-2 focus:ring-[#d6cdb7]"
            />
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg bg-[#6e634a] text-white hover:bg-[#5d5340] transition-colors font-medium ${isLoading ? 'opacity-70' : ''}`}
            >
              {isLoading ? 'Scanning...' : 'Scan'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}