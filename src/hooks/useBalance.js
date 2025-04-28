"use client";

import { useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";

export function useBalance() {
  const [balance, setBalance] = useState(null);
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  useEffect(() => {
    let isMounted = true;

    const fetchBalance = async () => {
      if (!publicKey) {
        setBalance(null);
        return;
      }

      try {
        const lamports = await connection.getBalance(publicKey);
        // Convert lamports to SOL (1 SOL = 1e9 lamports)
        const sol = lamports / 1e9;
        
        if (isMounted) {
          setBalance(sol.toFixed(4));
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        if (isMounted) {
          setBalance(null);
        }
      }
    };

    fetchBalance();

    // Set up interval to refresh balance every 30 seconds
    const intervalId = setInterval(fetchBalance, 30000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [connection, publicKey]);

  return balance;
}