import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TokenReport({ tokenAddress, isExpanded, tokenReportData, isLoading }) {
  // Format risk score color
  const getRiskColor = (score) => {
    if (score > 70) return "text-red-600";
    if (score > 40) return "text-yellow-600";
    return "text-green-600";
  };

  if (!isExpanded) return null;
  
  if (isLoading) {
    return (
      <div className="p-4 border-t border-[#e0d9c7] dark:border-[#3a3530]">
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-[#6e634a] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  if (!tokenReportData) {
    return (
      <div className="p-4 border-t border-[#e0d9c7] dark:border-[#3a3530]">
        <p className="text-center text-[#666] dark:text-[#bbb]">No report data available</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-[#e0d9c7] dark:border-[#3a3530]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Verification Section */}
        <div className="bg-[#f5f2ea] dark:bg-[#1a1814] p-4 rounded-lg">
          <h4 className="text-md font-medium mb-3">Verification</h4>
          
          {tokenReportData.verification ? (
            <div className="space-y-2">
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Status:</span>
                {tokenReportData.verification.jup_verified ? (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                    Verified
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800">
                    Unverified
                  </span>
                )}
                {tokenReportData.verification.jup_strict && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                    Strict Verified
                  </span>
                )}
              </div>
              
              {tokenReportData.verification.name && (
                <div className="text-sm">
                  <span className="text-[#666] dark:text-[#bbb]">Name:</span> {tokenReportData.verification.name}
                </div>
              )}
              
              {tokenReportData.verification.description && (
                <div className="text-sm">
                  <span className="text-[#666] dark:text-[#bbb]">Description:</span> {tokenReportData.verification.description}
                </div>
              )}
              
              {tokenReportData.verification.links && tokenReportData.verification.links.length > 0 && (
                <div>
                  <p className="text-sm text-[#666] dark:text-[#bbb]">Links:</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {tokenReportData.verification.links.map((link, idx) => (
                      <Link 
                        key={idx}
                        href={link.value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs bg-[#e0d9c7] dark:bg-[#3a3530] rounded text-[#6e634a] dark:text-[#f5f2ea] hover:underline"
                      >
                        {link.provider}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#666] dark:text-[#bbb]">No verification data available</p>
          )}
        </div>
        
        {/* Risk Score Section */}
        <div className="bg-[#f5f2ea] dark:bg-[#1a1814] p-4 rounded-lg">
          <h4 className="text-md font-medium mb-3">Risk Assessment</h4>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Overall Risk Score:</span>
              <span className={`font-bold ${getRiskColor(tokenReportData.score_normalised)}`}>
                {tokenReportData.score_normalised}/100
              </span>
            </div>
            
            <div className="w-full bg-[#e0d9c7] dark:bg-[#3a3530] h-2 rounded-full">
              <div
                className={`h-2 rounded-full ${
                  tokenReportData.score_normalised > 70
                    ? "bg-red-600"
                    : tokenReportData.score_normalised > 40
                    ? "bg-yellow-600"
                    : "bg-green-600"
                }`}
                style={{ width: `${tokenReportData.score_normalised}%` }}
              ></div>
            </div>
            
            {tokenReportData.rugged && (
              <div className="mt-2 px-3 py-2 bg-red-100 text-red-800 rounded-md">
                <span className="font-bold">Warning:</span> This token has been flagged as rugged
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Risks Section */}
      {tokenReportData.risks && tokenReportData.risks.length > 0 && (
        <div className="mt-6 bg-[#f5f2ea] dark:bg-[#1a1814] p-4 rounded-lg">
          <h4 className="text-md font-medium mb-3">Risk Factors</h4>
          
          <div className="space-y-2">
            {tokenReportData.risks.map((risk, idx) => (
              <div 
                key={idx} 
                className={`p-2 rounded-md ${
                  risk.level === 'high' 
                    ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300' 
                    : risk.level === 'medium'
                    ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                    : 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{risk.name}</span>
                  <span className="text-sm">Score: {risk.score}</span>
                </div>
                <p className="text-sm mt-1">{risk.description}</p>
                {risk.value && <p className="text-xs mt-1">Value: {risk.value}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Token Information Section */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Authorities Section */}
        <div className="bg-[#f5f2ea] dark:bg-[#1a1814] p-4 rounded-lg">
          <h4 className="text-md font-medium mb-3">Authorities</h4>
          
          <div className="space-y-2 text-sm">
            {tokenReportData.mintAuthority && (
              <div className="flex justify-between items-center">
                <span className="text-[#666] dark:text-[#bbb]">Mint Authority:</span>
                <span className="truncate max-w-[150px]" title={tokenReportData.mintAuthority}>
                  {`${tokenReportData.mintAuthority}`}
                </span>
              </div>
            )}
            
            {tokenReportData.freezeAuthority && (
              <div className="flex justify-between items-center">
                <span className="text-[#666] dark:text-[#bbb]">Freeze Authority:</span>
                <span className="truncate max-w-[150px]" title={tokenReportData.freezeAuthority}>
                  {`${tokenReportData.freezeAuthority}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Top Holders Section */}
      {tokenReportData.topHolders && tokenReportData.topHolders.length > 0 && (
        <div className="mt-6 bg-[#f5f2ea] dark:bg-[#1a1814] p-4 rounded-lg">
          <h4 className="text-md font-medium mb-3">Top Holders</h4>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#e0d9c7] dark:divide-[#3a3530]">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">Address</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">Percentage</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">Insider</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0d9c7] dark:divide-[#3a3530]">
                {tokenReportData.topHolders.map((holder, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      <span className="truncate block max-w-[150px]" title={holder.address}>
                        {`${holder.address.substring(0, 6)}...${holder.address.substring(holder.address.length - 4)}`}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      {holder.uiAmountString}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      {holder.pct ? `${holder.pct.toFixed(2)}%` : "-"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm">
                      {holder.insider ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Liquidity Information */}
      {tokenReportData.markets && tokenReportData.markets.length > 0 && (
        <div className="mt-6 bg-[#f5f2ea] dark:bg-[#1a1814] p-4 rounded-lg">
          <h4 className="text-md font-medium mb-3">Market Information</h4>
          
          <div className="space-y-4">
            {tokenReportData.markets.slice(0, 5).map((market, idx) => (
              <div key={idx} className="p-3 bg-white dark:bg-[#2a251e] rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Market Type: {market.marketType}</span>
                  <Link 
                    href={`https://solscan.io/account/${market.pubkey}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#6e634a] hover:underline text-sm"
                  >
                    View
                  </Link>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#666] dark:text-[#bbb]">
                      Liquidity A: {market.liquidityA || "Unknown"}
                    </p>
                    <p className="text-[#666] dark:text-[#bbb]">
                      Liquidity B: {market.liquidityB || "Unknown"}
                    </p>
                  </div>
                  
                  {market.lp && (
                    <div>
                      <p className="text-[#666] dark:text-[#bbb]">
                        LP Locked: {market.lp.lpLockedPct ? `${market.lp.lpLockedPct.toFixed(2)}%` : "Unknown"}
                      </p>
                      <p className="text-[#666] dark:text-[#bbb]">
                        USD Locked: ${market.lp.lpLockedUSD ? market.lp.lpLockedUSD.toLocaleString() : "Unknown"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}