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
  const [error, setError] = useState("");

  const handleScan = async (e) => {
    e.preventDefault();
    if (!walletAddress.trim()) return;
    
    setIsLoading(true);
    setError("");
    
    try {
      let addressToUse = walletAddress.trim();
      
      // Check if input contains a dot, suggesting it might be a domain
      if (addressToUse.includes(".")) {
        try {
          // Call the RugCheck domain lookup API
          const response = await fetch(`https://api.rugcheck.xyz/v1/domains/lookup/${addressToUse}`);
          
          if (response.ok) {
            const resolvedAddress = await response.text();
            
            // If we get a valid response (Solana addresses are 44 characters)
            if (resolvedAddress && resolvedAddress.length >= 32) {
              // Remove any quotes that might be in the response
              addressToUse = resolvedAddress.replace(/['"]+/g, '');
              console.log(`Resolved domain ${walletAddress} to address: ${addressToUse}`);
            } else {
              console.warn(`Domain resolution returned invalid address: ${resolvedAddress}`);
            }
          } else {
            console.warn(`Failed to resolve domain: ${addressToUse}`);
          }
        } catch (domainError) {
          console.error("Error resolving domain:", domainError);
          // Continue with the original input if domain resolution fails
        }
      }
      
      // Route to address page with the resolved or original input
      router.push(`/address/${addressToUse}`);
    } catch (error) {
      console.error("Error navigating:", error);
      setError("There was an error processing your request. Please try again.");
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
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter wallet address or domain (.sol, .superteam...)"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg bg-white dark:bg-[#2a251e] border border-[#e0d9c7] dark:border-[#3a3530] focus:outline-none focus:ring-2 focus:ring-[#d6cdb7]"
              />
              <button
                type="submit"
                disabled={isLoading}
                className={`px-6 py-3 rounded-lg bg-[#6e634a] text-white hover:bg-[#5d5340] transition-colors font-medium ${isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scanning...
                  </div>
                ) : 'Scan'}
              </button>
            </div>
            
            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>
            )}
            
            {walletAddress.includes(".") && (
              <p className="text-sm text-[#666] dark:text-[#bbb] mt-1">
                Domain detected - we&apos;ll resolve {walletAddress} to its wallet address
              </p>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}