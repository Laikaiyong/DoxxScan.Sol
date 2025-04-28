"use client";

import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { CivicAuthProvider } from "@civic/auth-web3/react";
import { clusterApiUrl } from "@solana/web3.js";

export default function WalletContextProvider({ children }) {
  // Set up Solana RPC endpoint (defaults to devnet, change to 'mainnet-beta' for production)
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
  
  // Set up supported wallets
  const wallets = useMemo(
    () => [],
    []
  );

  // Civic Auth client ID
  const CIVIC_CLIENT_ID = process.env.NEXT_PUBLIC_CIVIC_CLIENT_ID;

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <CivicAuthProvider clientId={CIVIC_CLIENT_ID}>
            {children}
          </CivicAuthProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}