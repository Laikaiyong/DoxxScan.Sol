"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { UserButton, useUser } from "@civic/auth-web3/react";

// Require Solana wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

export default function Navbar() {
  const { publicKey } = useWallet();
  const { user, isAuthenticated } = useUser();
  const [walletBalance, setWalletBalance] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Truncate wallet address for display
  const shortenAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <nav className="sticky top-0 z-10 bg-[#f5f2ea] dark:bg-[#1a1814] border-b border-[#e0d9c7] dark:border-[#2a251e] px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <Image 
                src="/vercel.svg" 
                alt="DoxxScan Logo" 
                width={28} 
                height={28} 
                className="dark:invert" 
              />
              <span className="font-semibold text-xl">DoxxScan</span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Only show History link when user is authenticated */}
          {isAuthenticated && (
            <Link href="/history" className="text-[#666] dark:text-[#bbb] hover:text-[#6e634a] dark:hover:text-white">
              Scan History
            </Link>
          )}
        </div>

        {/* Wallet Connection and User Button */}
        <div className="flex items-center gap-3">
          {publicKey && (
            <div className="hidden md:flex items-center text-sm text-[#666] dark:text-[#bbb]">
              <span>{shortenAddress(publicKey.toString())}</span>
              {walletBalance !== null && (
                <span className="ml-2 bg-[#e0d9c7] dark:bg-[#3a3530] px-2 py-1 rounded-md">
                  {walletBalance} SOL
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {/* <WalletMultiButton className="!bg-[#6e634a] hover:!bg-[#5d5340]" /> */}
            <UserButton />
          </div>
          
          {/* Mobile menu button */}
          {publicKey && (
          <button 
            className="md:hidden ml-2 text-[#666] dark:text-[#bbb]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-[#e0d9c7] dark:border-[#2a251e]">
          <div className="flex flex-col space-y-3">
            {/* Only show History link when user is authenticated */}
            {isAuthenticated && (
              <Link href="/history" className="text-[#666] dark:text-[#bbb] hover:text-[#6e634a] dark:hover:text-white">
                Scan History
              </Link>
            )}
            {publicKey && (
              <div className="flex items-center py-2 text-sm text-[#666] dark:text-[#bbb]">
                <span className="mr-2">Wallet:</span>
                <span>{shortenAddress(publicKey.toString())}</span>
                {walletBalance !== null && (
                  <span className="ml-2 bg-[#e0d9c7] dark:bg-[#3a3530] px-2 py-1 rounded-md">
                    {walletBalance} SOL
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}