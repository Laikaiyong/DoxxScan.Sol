"use client";

import { useState } from "react";
import Image from "next/image";

export default function TokenMarketDataExpander({ token, rugInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isRisky = rugInfo?.riskLevel === "high";
  
  // Format token balance to a human-readable number
  const formatBalance = (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(2)}K`;
    } else {
      return amount.toFixed(2);
    }
  };

  // Calculate token value in USD
  const tokenValue = (token.amount * (token.price || 0)).toLocaleString();

  return (
    <div className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] overflow-hidden">
      {/* Header - Always visible */}
      <div 
        className="p-4 flex justify-between items-center cursor-pointer hover:bg-[#e0d9c7] dark:hover:bg-[#3a3530] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          {token.logoURI && (
            <Image 
              src={token.logoURI} 
              alt={token.symbol || token.name} 
              width={24} 
              height={24}
              className="rounded-full"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          )}
          <div>
            <h3 className="font-medium">
              {token.symbol || token.name}
              {isRisky && (
                <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                  High Risk
                </span>
              )}
            </h3>
            <p className="text-sm text-[#666] dark:text-[#bbb]">
              {formatBalance(token.amount)} tokens (${tokenValue})
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          {token.price ? (
            <span className="text-sm font-medium mr-3">${token.price.toFixed(4)}</span>
          ) : (
            <span className="text-sm text-[#666] dark:text-[#bbb] mr-3">No price data</span>
          )}
          
          <svg 
            className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content - Market data and chart from GeckoTerminal */}
      {isExpanded && (
        <div className="border-t border-[#e0d9c7] dark:border-[#3a3530]">
          <div className="h-[400px] w-full">
            <iframe
              src={`https://www.geckoterminal.com/solana/tokens/${token.address}/embed?info=true&chart=true`}
              width="100%"
              height="100%"
              frameBorder="0"
              title={`${token.symbol || token.name} Market Data`}
              loading="lazy"
            ></iframe>
          </div>
          
          {/* Additional token info */}
          <div className="p-4 bg-[#e0d9c7]/30 dark:bg-[#3a3530]/30 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[#666] dark:text-[#bbb]">Contract</p>
              <p className="font-medium truncate">{token.address}</p>
            </div>
            <div>
              <p className="text-[#666] dark:text-[#bbb]">Market Cap</p>
              <p className="font-medium">
                {token.marketCap ? `$${token.marketCap.toLocaleString()}` : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-[#666] dark:text-[#bbb]">24h Volume</p>
              <p className="font-medium">
                {token.volume24h ? `$${token.volume24h.toLocaleString()}` : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-[#666] dark:text-[#bbb]">Risk Level</p>
              <p className={`font-medium ${isRisky ? 'text-red-600' : 'text-green-600'}`}>
                {isRisky ? 'High' : 'Low'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}