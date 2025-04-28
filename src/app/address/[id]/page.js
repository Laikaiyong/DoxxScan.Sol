"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { UserButton, useUser } from "@civic/auth-web3/react"; // Changed useAuth to useUser
import { useReactToPrint } from "react-to-print";
import TokenMarketDataExpander from "@/components/tokenMarketDataExpander";
import React, { useState, useEffect, useRef, Fragment } from "react";
import { Transition } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import TokenReport from "@/components/tokenReport";

export default function AddressPage() {
  const params = useParams();
  const router = useRouter();
  const walletAddress = params.id;
  const wallet = useUser();

  const [tokenRiskDataWebacy, setTokenRiskDataWebacy] = useState({});
  const [loadingTokenRiskData, setLoadingTokenRiskData] = useState(false);
  const [nftRiskDataWebacy, setNftRiskDataWebacy] = useState({});
  const [loadingNftRiskData, setLoadingNftRiskData] = useState(false);
  const [webacyProfile, setWebacyProfile] = useState(null);
  const [loadingWebacyProfile, setLoadingWebacyProfile] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRiskSummaryLoaded, setIsRiskSummaryLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [tokenMetadataCache, setTokenMetadataCache] = useState({});
  const [expandedTransaction, setExpandedTransaction] = useState(null);

  const [expandedTokenReports, setExpandedTokenReports] = useState({});
  const [tokenReportData, setTokenReportData] = useState({});
  const [loadingTokenReports, setLoadingTokenReports] = useState({});

  // State for all API data
  const [heliusData, setHeliusData] = useState(null);
  const [rugCheckData, setRugCheckData] = useState(null);
  const [gridData, setGridData] = useState(null);
  const [webacyData, setWebacyData] = useState(null);
  const [bubbleMapData, setBubbleMapData] = useState(null);
  const [solscanData, setSolscanData] = useState(null);

  const [transactionsData, setTransactionsData] = useState([]);
  const [solanaPriceUSD, setSolanaPriceUSD] = useState(0);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedTokenForBubbleMap, setSelectedTokenForBubbleMap] =
    useState(null);

  // Add these new state variables near the top of your component where other states are defined

  const [tokenRiskSummary, setTokenRiskSummary] = useState({
    high: [],
    medium: [],
    low: [],
    unknown: [],
  });
  const [processedTokenRisk, setProcessedTokenRisk] = useState(false);

  const [sanctionData, setSanctionData] = useState({
    isLoading: true,
    data: null,
  });

  const fetchWebacyProfile = async (address) => {
    try {
      setLoadingWebacyProfile(true);

      // Call your backend API endpoint that will hide the API key
      const response = await fetch(`/api/webacy-profile?address=${address}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch Webacy profile: ${response.status}`);
      }

      const data = await response.json();
      console.log("Webacy profile data:", data);
      setWebacyProfile(data);
      return data;
    } catch (error) {
      console.error("Error fetching Webacy profile:", error);
      return null;
    } finally {
      setLoadingWebacyProfile(false);
    }
  };

  const fetchNftRiskDataWebacy = async (nfts) => {
    setLoadingNftRiskData(true);

    try {
      const nftRiskData = {};

      // Process NFTs in batches to avoid too many concurrent requests
      const batchSize = 5;
      const nftAddresses = nfts.map((nft) => nft.id || nft.mint);

      for (let i = 0; i < nftAddresses.length; i += batchSize) {
        const batch = nftAddresses.slice(i, i + batchSize);
        const batchPromises = batch.map(async (nftAddress) => {
          try {
            const response = await fetch(
              `/api/token-risk?address=${nftAddress}&chain=sol`
            );
            if (!response.ok) return { nftAddress, data: null };

            const data = await response.json();
            return { nftAddress, data };
          } catch (err) {
            console.error(
              `Error fetching risk data for NFT ${nftAddress}:`,
              err
            );
            return { nftAddress, data: null };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ nftAddress, data }) => {
          if (data) {
            nftRiskData[nftAddress] = data;
          }
        });

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < nftAddresses.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setNftRiskDataWebacy(nftRiskData);
    } catch (err) {
      console.error("Error fetching NFT risk data:", err);
    } finally {
      setLoadingNftRiskData(false);
    }
  };

  const fetchTokenRiskDataWebacy = async (tokens) => {
    setLoadingTokenRiskData(true);

    try {
      const tokenRiskData = {};

      // Process tokens in batches to avoid too many concurrent requests
      const batchSize = 5;
      const tokenAddresses = tokens
        .filter((token) => token.amount > 0)
        .map((token) => token.mint);

      for (let i = 0; i < tokenAddresses.length; i += batchSize) {
        const batch = tokenAddresses.slice(i, i + batchSize);
        const batchPromises = batch.map(async (tokenAddress) => {
          try {
            const response = await fetch(
              `/api/token-risk?address=${tokenAddress}&chain=sol`
            );
            if (!response.ok) return { tokenAddress, data: null };

            const data = await response.json();
            return { tokenAddress, data };
          } catch (err) {
            console.error(
              `Error fetching risk data for token ${tokenAddress}:`,
              err
            );
            return { tokenAddress, data: null };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ tokenAddress, data }) => {
          if (data) {
            tokenRiskData[tokenAddress] = data;
          }
        });

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < tokenAddresses.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      setTokenRiskDataWebacy(tokenRiskData);
    } catch (err) {
      console.error("Error fetching token risk data:", err);
    } finally {
      setLoadingTokenRiskData(false);
    }
  };

  // Update useEffect to fetch token risk data when tokens are available
  useEffect(() => {
    if (heliusData?.tokens && heliusData.tokens.length > 0) {
      fetchTokenRiskDataWebacy(heliusData.tokens);
    }
  }, [heliusData?.tokens]);

  useEffect(() => {
    const nfts = getNFTs(
      solscanData?.items || (solscanData?.assets?.items ?? [])
    );
    if (nfts && nfts.length > 0) {
      fetchNftRiskDataWebacy(nfts);
    }
  }, [solscanData?.items, solscanData?.assets?.items]);

  // Add this new function to fetch sanction data from Webacy
  const fetchSanctionData = async (address) => {
    try {
      const response = await fetch(`/api/sanction-check?address=${address}`);
      if (!response.ok) throw new Error("Failed to fetch sanction data");
      return await response.json();
    } catch (err) {
      console.error("Error fetching sanction data:", err);
      return null;
    }
  };

  // Process token risk data from RugCheck and Helius
  // Find the function processTokenRiskData and update it to fetch and use RugCheck token reports

  // Update processTokenRiskData function with extensive logging

  const processTokenRiskData = async () => {
    console.log("🔍 Starting processTokenRiskData function");

    if (!heliusData?.tokens) {
      console.log("⛔ Early return from processTokenRiskData:", {
        processedTokenRisk,
        hasHeliusTokens: !!heliusData?.tokens,
        hasRugCheckTokens: !!rugCheckData?.tokens,
      });
      return;
    }

    console.log("📊 Token data available:", {
      heliusTokensCount: heliusData.tokens.length,
    });

    // Create temporary risk buckets
    const riskBuckets = {
      high: [],
      medium: [],
      low: [],
      unknown: [],
    };

    // Create a map of tokens from RugCheck for faster lookup
    const rugCheckTokensMap = {};

    // Process each token from Helius data
    console.log(
      "🔄 Processing",
      heliusData.tokens.length,
      "tokens from Helius data"
    );

    for (const token of heliusData.tokens) {
      console.log(
        `\n📝 Processing token: ${token.mint} (${
          token.symbol || "Unknown symbol"
        })`
      );

      if (token.amount <= 0) {
        console.log("⏭️ Skipping token with zero balance");
        continue; // Skip tokens with zero balance
      }

      // Try to find this token in RugCheck data
      const rugCheckToken = rugCheckTokensMap[token.mint];
      console.log(
        "🔍 RugCheck data for token:",
        rugCheckToken ? "Found" : "Not found"
      );

      // Create a combined token data object with risk info
      const tokenData = {
        mint: token.mint,
        symbol: token.symbol || tokenMetadataCache[token.mint]?.symbol || "",
        name:
          tokenMetadataCache[token.mint]?.name ||
          `Token ${token.mint.substring(0, 6)}...`,
        amount: token.amount / Math.pow(10, token.decimals),
        decimals: token.decimals,
        image: tokenMetadataCache[token.mint]?.image || null,
        price:
          rugCheckToken?.price ||
          tokenMetadataCache[token.mint]?.current_price ||
          0,
        value:
          (token.amount / Math.pow(10, token.decimals)) *
          (rugCheckToken?.price ||
            tokenMetadataCache[token.mint]?.current_price ||
            0),
        tokenAccount: token.tokenAccount,
      };

      console.log("📋 Created tokenData object:", {
        mint: tokenData.mint,
        symbol: tokenData.symbol,
        name: tokenData.name,
        amount: tokenData.amount,
        price: tokenData.price,
        value: tokenData.value,
      });

      try {
        console.log(
          "🌐 Fetching detailed token report from RugCheck API for",
          token.mint
        );
        // Fetch detailed token report from RugCheck API
        const tokenReportResponse = await fetch(
          `/api/token-report?address=${token.mint}`
        );

        console.log(
          "📡 Token report API response status:",
          tokenReportResponse.status
        );

        if (tokenReportResponse.ok) {
          const tokenReport = await tokenReportResponse.json();
          console.log(
            "📊 Received token report with score:",
            tokenReport.score_normalised
          );
          console.log(
            "🔄 Risks in report:",
            tokenReport.risks ? tokenReport.risks.length : 0
          );

          // Store this report data for later use
          setTokenReportData((prev) => ({
            ...prev,
            [token.mint]: tokenReport,
          }));

          // Determine risk level based on normalized score from the token report
          if (tokenReport.score_normalised !== undefined) {
            const normalizedScore = tokenReport.score_normalised;
            console.log(
              "🎯 Using normalized score for risk assessment:",
              normalizedScore
            );

            if (normalizedScore > 70) {
              console.log("🔴 Categorizing as HIGH risk");
              riskBuckets.high.push({
                ...tokenData,
                riskLevel: "high",
                riskSource: "rugcheck_report",
                reportData: {
                  score: normalizedScore,
                  risks: tokenReport.risks || [],
                },
              });
            } else if (normalizedScore > 40) {
              console.log("🟡 Categorizing as MEDIUM risk");
              riskBuckets.medium.push({
                ...tokenData,
                riskLevel: "medium",
                riskSource: "rugcheck_report",
                reportData: {
                  score: normalizedScore,
                  risks: tokenReport.risks || [],
                },
              });
            } else {
              console.log("🟢 Categorizing as LOW risk");
              riskBuckets.low.push({
                ...tokenData,
                riskLevel: "low",
                riskSource: "rugcheck_report",
                reportData: {
                  score: normalizedScore,
                  risks: tokenReport.risks || [],
                },
              });
            }
            console.log("⏩ Skipping fallback categorization for this token");
            continue; // Skip the rest of the loop since we've categorized this token
          } else {
            console.log(
              "⚠️ Token report doesn't have normalized score, using fallback"
            );
          }
        } else {
          console.log(
            "❌ Failed to fetch token report, status:",
            tokenReportResponse.status
          );
        }
      } catch (error) {
        console.error(
          `❌ Error fetching token report for ${token.mint}:`,
          error
        );
      }

      console.log("🔄 Using fallback categorization for token");
      // Fallback categorization if report fetch failed or didn't have score_normalised
      if (rugCheckToken) {
        console.log(
          "🔍 Using RugCheck's risk assessment:",
          rugCheckToken.riskLevel
        );
        // Use RugCheck's risk assessment if available
        switch (rugCheckToken.riskLevel) {
          case "high":
            console.log("🔴 Categorizing as HIGH risk (fallback)");
            riskBuckets.high.push({
              ...tokenData,
              riskLevel: "high",
              riskSource: "rugcheck",
            });
            break;
          case "medium":
            console.log("🟡 Categorizing as MEDIUM risk (fallback)");
            riskBuckets.medium.push({
              ...tokenData,
              riskLevel: "medium",
              riskSource: "rugcheck",
            });
            break;
          case "low":
            console.log("🟢 Categorizing as LOW risk (fallback)");
            riskBuckets.low.push({
              ...tokenData,
              riskLevel: "low",
              riskSource: "rugcheck",
            });
            break;
          default:
            console.log("❓ Categorizing as UNKNOWN risk (fallback)");
            riskBuckets.unknown.push({
              ...tokenData,
              riskLevel: "unknown",
              riskSource: "rugcheck",
            });
        }
      } else {
        console.log("🧮 Using our own heuristics based on other factors");
        // If not in RugCheck, use our own heuristics based on other factors
        // For example, tokens with market data might be less risky
        if (
          tokenMetadataCache[token.mint] &&
          tokenMetadataCache[token.mint].current_price > 0
        ) {
          console.log("🟢 Categorizing as LOW risk (heuristic)");
          // Token has market data, consider it lower risk
          riskBuckets.low.push({
            ...tokenData,
            riskLevel: "low",
            riskSource: "heuristic",
          });
        } else {
          console.log("❓ Categorizing as UNKNOWN risk (heuristic)");
          // No market data, consider it unknown risk
          riskBuckets.unknown.push({
            ...tokenData,
            riskLevel: "unknown",
            riskSource: "none",
          });
        }
      }
    }

    console.log("✅ Finished processing tokens. Risk buckets:", {
      high: riskBuckets.high.length,
      medium: riskBuckets.medium.length,
      low: riskBuckets.low.length,
      unknown: riskBuckets.unknown.length,
    });

    // Update state with processed data
    setTokenRiskSummary(riskBuckets);
    setProcessedTokenRisk(true);
    console.log("📝 Set processedTokenRisk to true");
  };

  // Add this useEffect to trigger the processing when data is available
  // Update the useEffect that calls processTokenRiskData

  useEffect(() => {
    console.log("🔄 useEffect for processTokenRiskData triggered", {
      hasHeliusTokens: !!heliusData?.tokens,
      hasRugCheckTokens: !!rugCheckData?.tokens,
      processedTokenRisk,
    });

    if (heliusData?.tokens || rugCheckData?.tokens || !processedTokenRisk) {
      console.log("✅ Conditions met to run processTokenRiskData");

      // Set a loading state
      setIsRiskSummaryLoaded(false);
      console.log("⏳ Setting isLoading to true");

      // Call the async function and handle completion
      processTokenRiskData()
        .then(() => {
          console.log("✅ processTokenRiskData completed successfully");
        })
        .catch((error) => {
          console.error("❌ Error in processTokenRiskData:", error);
        })
        .finally(() => {
          console.log("🏁 Setting isLoading to false");
          setIsRiskSummaryLoaded(true);
        });
    } else {
      console.log("⛔ Conditions not met to run processTokenRiskData");
    }
  }, [heliusData?.tokens, rugCheckData?.tokens, processedTokenRisk]);

  // Update the fetchTokenReport function with more logging

  const fetchTokenReport = async (tokenAddress) => {
    console.log("🔄 fetchTokenReport called for", tokenAddress);

    try {
      console.log("⏳ Setting loading state for token report");
      setLoadingTokenReports((prev) => ({ ...prev, [tokenAddress]: true }));

      console.log("🌐 Fetching token report from API route");
      // Use our server-side API route instead of directly calling RugCheck API
      const response = await fetch(`/api/token-report?address=${tokenAddress}`);
      console.log("📡 Token report API response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Token report API error:", errorData);
        throw new Error(
          errorData.error || `Failed to fetch token report: ${response.status}`
        );
      }

      const data = await response.json();
      console.log(
        "✅ Token report received with score:",
        data.score_normalised
      );

      console.log("📝 Updating tokenReportData state");
      setTokenReportData((prev) => ({ ...prev, [tokenAddress]: data }));
      return data;
    } catch (error) {
      console.error("❌ Error in fetchTokenReport:", error);
      return null;
    } finally {
      console.log(
        "🏁 Finished fetchTokenReport, setting loading state to false"
      );
      setLoadingTokenReports((prev) => ({ ...prev, [tokenAddress]: false }));
    }
  };

  // Add toggle function to expand/collapse token reports
  const toggleTokenReport = async (tokenAddress) => {
    // If we're expanding and don't have the data yet, fetch it
    if (!expandedTokenReports[tokenAddress] && !tokenReportData[tokenAddress]) {
      fetchTokenReport(tokenAddress);
    }

    setExpandedTokenReports((prev) => ({
      ...prev,
      [tokenAddress]: !prev[tokenAddress],
    }));
  };

  // Update the fetchBubbleMapData function to use heliusData.tokens directly
  const fetchBubbleMapData = async (address) => {
    try {
      // Prepare results object
      const results = {
        walletInteractions: {},
        tokenData: [],
        decentralizationScores: {},
        tokenMetadata: {},
      };

      // Get wallet transaction maps first
      try {
        const walletResponse = await fetch(
          `/api/bubblemaps/wallet?address=${address}`
        );

        if (walletResponse.ok) {
          const walletData = await walletResponse.json();
          results.walletInteractions = walletData;
        }
      } catch (err) {
        console.error("Error fetching wallet bubble map:", err);
      }

      // We'll only fetch the data, not parse the tokens here
      // The actual token processing will happen in the UI with heliusData.tokens
      return results;
    } catch (err) {
      console.error("Error in fetchBubbleMapData:", err);
      throw new Error("Failed to fetch Bubble Map data");
    }
  };

  // Update the fetchTokenBubbleMapData function
  const fetchTokenBubbleMapData = async (tokenAddress) => {
    try {
      // Get map data
      const mapResponse = await fetch(
        `/api/bubblemaps/token/map-data?token=${tokenAddress}`
      );

      if (!mapResponse.ok) return null;
      const mapData = await mapResponse.json();
      console.log(mapData);

      // Get metadata (decentralization score)
      const metadataResponse = await fetch(
        `/api/bubblemaps/token/metadata?token=${tokenAddress}`
      );

      let metadataData = {};
      let decentralizationScore = null;

      if (metadataResponse.ok) {
        metadataData = await metadataResponse.json();
        console.log(metadataData);
        if (metadataData.status === "OK") {
          decentralizationScore = metadataData.decentralisation_score;
        }
      }

      return {
        mapData,
        metadataData,
        decentralizationScore,
      };
    } catch (err) {
      console.error(
        `Error fetching bubble map for token ${tokenAddress}:`,
        err
      );
      return null;
    }
  };
  // Ref for printing
  const reportRef = useRef();

  const hasFungibleTokens = (items) => {
    return items.some((item) => item.interface === "FungibleToken");
  };

  const hasNFTs = (items) => {
    return items.some((item) => item.interface === "V1_NFT");
  };

  const getFungibleTokens = (items) => {
    return items.filter((item) => item.interface === "FungibleToken");
  };

  const getNFTs = (items) => {
    return items.filter((item) => item.interface === "V1_NFT");
  };

  const calculateTokensValue = (items) => {
    let total = 0;

    // Add value of fungible tokens
    items.forEach((item) => {
      if (
        item.interface === "FungibleToken" &&
        item.token_info?.price_info?.total_price
      ) {
        total += item.token_info.price_info.total_price;
      }
    });

    // Add SOL value
    if (solscanData?.nativeBalance?.total_price) {
      total += solscanData.nativeBalance.total_price;
    }

    return total;
  };
  // ...existing code...

  const [domainData, setDomainData] = useState([]);

  // Add this function to fetch domain data from SolanaFM API
  const fetchDomainData = async (address) => {
    try {
      const response = await fetch(
        `https://api.solana.fm/v0/domains/bonfida/${address}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch domain data");
      const data = await response.json();
      console.log(data);
      return data.result || [];
    } catch (err) {
      console.error("Error fetching domain data:", err);
      return [];
    }
  };

  // Update the fetchAllData function to include the new API call
  // Find the useEffect that contains fetchAllData and add fetchWebacyProfile to the Promise.allSettled array
  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);

      try {
        // Fetch data from all APIs in parallel
        const fetchResults = await Promise.allSettled([
          fetchHeliusData(walletAddress),
          fetchRugCheckData(walletAddress),
          fetchGridData(walletAddress),
          fetchWebacyData(walletAddress),
          fetchBubbleMapData(walletAddress),
          fetchSolscanData(walletAddress),
          fetchSolanaPrice(),
          fetchTokenMetadata(),
          fetchDomainData(walletAddress),
          fetchTransaction(walletAddress),
          fetchSanctionData(walletAddress),
          fetchWebacyProfile(walletAddress), // Add this line
        ]);

        // Process results
        if (fetchResults[0].status === "fulfilled")
          console.log(fetchResults[0].value);
        setHeliusData(fetchResults[0].value);
        if (fetchResults[1].status === "fulfilled")
          setRugCheckData(fetchResults[1].value);
        if (fetchResults[2].status === "fulfilled")
          setGridData(fetchResults[2].value);
        if (fetchResults[3].status === "fulfilled")
          setWebacyData(fetchResults[3].value);
        if (fetchResults[4].status === "fulfilled")
          setBubbleMapData(fetchResults[4].value);
        if (fetchResults[5].status === "fulfilled")
          setSolscanData(fetchResults[5].value);
        if (fetchResults[8].status === "fulfilled")
          setDomainData(fetchResults[8].value);
        if (fetchResults[10].status === "fulfilled")
          setSanctionData({ isLoading: false, data: fetchResults[10].value });
        // Add handling for fetchWebacyProfile results
        if (fetchResults[11].status === "fulfilled")
          setWebacyProfile(fetchResults[11].value);

        // Check if all requests failed
        const allFailed = fetchResults
          .slice(0, 6)
          .every((result) => result.status === "rejected");
        if (allFailed) {
          setError("Failed to fetch wallet data from any source.");
        }
      } catch (err) {
        console.error("Error fetching wallet data:", err);
        setError("An error occurred while fetching wallet data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [walletAddress]);

  const toggleTransactionDetails = (signature) => {
    if (expandedTransaction === signature) {
      setExpandedTransaction(null);
    } else {
      setExpandedTransaction(signature);
    }
  };

  // API fetch functions
  const fetchHeliusData = async (address) => {
    const response = await fetch(`/api/wallet-data?address=${address}`);
    if (!response.ok) throw new Error("Failed to fetch wallet data");
    return await response.json();
  };

  const fetchTokenMetadata = async () => {
    try {
      const response = await fetch("/api/token-metadata");
      if (!response.ok) throw new Error("Failed to fetch token metadata");

      const data = await response.json();
      setTokenMetadataCache(data.tokens || {});
    } catch (err) {
      console.error("Error fetching token metadata:", err);
    }
  };

  const fetchRugCheckData = async (address) => {
    // Replace with actual RugCheck API call
    const response = await fetch(
      `https://api.rugcheck.xyz/v1/scan?address=${address}&api-key=${process.env.NEXT_PUBLIC_RUGCHECK_API_KEY}`
    );
    if (!response.ok) throw new Error("Failed to fetch RugCheck data");
    return await response.json();
  };

  const fetchGridData = async (address) => {
    // Replace with actual Grid API call
    const response = await fetch(
      `https://api.ddxyz.io/v0/addresses/${address}/risk?api-key=${process.env.NEXT_PUBLIC_GRID_API_KEY}`
    );
    if (!response.ok) throw new Error("Failed to fetch Grid data");
    return await response.json();
  };

  const fetchWebacyData = async (address) => {
    const response = await fetch(`/api/webacy-risk?address=${address}`);
    if (!response.ok) throw new Error("Failed to fetch Webacy risk data");
    return await response.json();
  };

  const fetchSolscanData = async (address) => {
    const response = await fetch(`/api/wallet-assets?address=${address}`);
    if (!response.ok) throw new Error("Failed to fetch wallet assets data");
    return await response.json();
  };

  const calculatePortfolioValue = () => {
    let total = 0;

    // Add SOL value based on CoinGecko price
    if (heliusData && heliusData.nativeBalance) {
      const solBalance = heliusData.nativeBalance / 1e9;
      total += solBalance * solanaPriceUSD;
    }

    // Add token values
    if (solscanData) {
      total += calculateTokensValue(
        solscanData?.items || solscanData.assets?.items || []
      );
    }

    return total;
  };

  // Add a new function to fetch a transaction
  const fetchTransaction = async (address) => {
    setLoadingTransactions(true);
    try {
      const response = await fetch(
        `/api/wallet-transactions?address=${address}`
      );

      if (!response.ok) throw new Error("Failed to fetch transaction data");
      const responseData = await response.json();

      // Check if there are any transactions
      if (responseData && responseData.length > 0) {
        // Format the transaction data to display
        const formattedTransactions = responseData.map((transaction) => ({
          slot: transaction.slot,
          signature: transaction.signature,
          fee: transaction.fee,
          timestamp: transaction.timestamp,
          type: transaction.type,
          description: transaction.description,
          status: transaction.transactionError?.error ? "failed" : "success",
          accountKeys: transaction.instructions.reduce(
            (acc, inst) => [
              ...acc,
              ...inst.accounts.filter((acc) => !acc.includes(acc)),
            ],
            []
          ),
          nativeTransfers: transaction.nativeTransfers || [],
          tokenTransfers: transaction.tokenTransfers || [],
        }));

        setTransactionsData(formattedTransactions);
      } else {
        // No transactions found
        setTransactionsData([]);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactionsData([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Add a function to fetch Solana price from CoinGecko
  const fetchSolanaPrice = async () => {
    try {
      const response = await fetch("/api/solana-price");

      if (!response.ok) throw new Error("Failed to fetch Solana price");
      const data = await response.json();

      if (data && data.price) {
        setSolanaPriceUSD(data.price);
      }
    } catch (err) {
      console.error("Error fetching Solana price:", err);
    }
  };

  // Handle Save Report
  const handleSaveReport = async () => {
    // Check if user is authenticated
    if (!isAuthenticated && !authLoading) {
      // Prompt user to login
      login();
      return;
    }

    setIsSaving(true);

    try {
      // Prepare report data
      const reportData = {
        walletAddress,
        timestamp: new Date(),
        heliusData,
        rugCheckData,
        gridData,
        solscanData,
        riskScore: getRiskScore(),
        portfolioValue: calculatePortfolioValue(),
      };

      // Make API call to save report to MongoDB
      const response = await fetch("/api/save-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        throw new Error("Failed to save report");
      }

      setSaveSuccess(true);

      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error saving report:", error);
      alert("Failed to save report. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Setup print functionality
  const handlePrintReport = useReactToPrint({
    content: () => reportRef.current,
    documentTitle: `DoxxScan_${walletAddress}_${
      new Date().toISOString().split("T")[0]
    }`,
    onBeforeGetContent: () => {
      // Set print-friendly active tab
      setActiveTab("overview");
      return Promise.resolve();
    },
  });

  // Get risk score from Grid API data
  const getRiskScore = () => {
    if (!gridData || !gridData.riskScore) return 0;
    return gridData.riskScore;
  };

  const NftRiskCard = ({ nft, riskData }) => {
    const [isRiskExpanded, setIsRiskExpanded] = useState(false);

    if (!nft || !riskData) return null;

    const riskScore = riskData.overallRisk || 0;
    const nftIssues = riskData.issues || [];

    return (
      <div className="absolute top-2 right-2 z-10">
        <div
          className={`px-2 py-1 text-xs rounded-full font-medium cursor-pointer
            ${
              riskScore > 70
                ? "bg-red-100 text-red-800"
                : riskScore > 30
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800"
            }`}
          onClick={() => setIsRiskExpanded(!isRiskExpanded)}>
          {riskScore > 70
            ? "High Risk"
            : riskScore > 30
            ? "Medium Risk"
            : "Low Risk"}{" "}
          ({riskScore})
        </div>

        {isRiskExpanded && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-[#2a251e] rounded-lg shadow-lg border border-[#e0d9c7] dark:border-[#3a3530] p-3 z-20">
            <h5 className="text-sm font-medium mb-2">Risk Factors</h5>

            {nftIssues.length > 0 ? (
              <ul className="space-y-2 max-h-48 overflow-y-auto">
                {nftIssues.map((issue, idx) => (
                  <li key={idx} className="flex items-start">
                    <span
                      className={`
                      px-1.5 py-0.5 text-xs rounded-full mr-1.5 mt-0.5 flex-shrink-0
                      ${
                        issue.severity === "high"
                          ? "bg-red-100 text-red-800"
                          : issue.severity === "medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                      }
                    `}>
                      {issue.severity === "high"
                        ? "H"
                        : issue.severity === "medium"
                        ? "M"
                        : "L"}
                    </span>
                    <span className="text-xs">{issue.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#666] dark:text-[#bbb]">
                No specific issues detected for this NFT
              </p>
            )}

            {riskData.transactionCount && (
              <div className="mt-2 pt-2 border-t border-[#e0d9c7] dark:border-[#3a3530] text-xs">
                <div className="flex justify-between">
                  <span className="text-[#666] dark:text-[#bbb]">
                    Analyzed:
                  </span>
                  <span>{riskData.transactionCount} txns</span>
                </div>
                {riskData.high > 0 || riskData.medium > 0 ? (
                  <div className="flex justify-between mt-1">
                    <span className="text-[#666] dark:text-[#bbb]">Risky:</span>
                    <span>{riskData.high + riskData.medium} txns</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const TokenRiskCard = ({ token, tokenMetadata, riskData }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!token || !riskData) return null;

    const riskScore = riskData.overallRisk || 0;
    const tokenIssues = riskData.issues || [];

    const formattedAmount = token.amount / Math.pow(10, token.decimals);
    const tokenSymbol = tokenMetadata?.symbol || token.symbol || "Unknown";
    const tokenName =
      tokenMetadata?.name || `Token ${token.mint.substring(0, 6)}...`;

    return (
      <div className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] mb-4">
        <div
          className="p-4 border-b border-[#e0d9c7] dark:border-[#3a3530] flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center">
            {tokenMetadata?.image ? (
              <img
                src={tokenMetadata.image}
                alt={tokenSymbol}
                className="w-6 h-6 rounded-full mr-2"
              />
            ) : (
              <div className="w-6 h-6 bg-[#e0d9c7] dark:bg-[#3a3530] rounded-full flex items-center justify-center mr-2">
                <span className="text-xs">{tokenSymbol.substring(0, 2)}</span>
              </div>
            )}
            <span className="font-medium mr-2">{tokenName}</span>
            <span className="text-sm text-[#666] dark:text-[#bbb]">
              {formattedAmount.toLocaleString(undefined, {
                maximumFractionDigits: 4,
              })}{" "}
              {tokenSymbol}
            </span>
          </div>

          <div className="flex items-center">
            <div
              className={`px-2 py-0.5 text-xs rounded-full mr-3 
                ${
                  riskScore > 70
                    ? "bg-red-100 text-red-800"
                    : riskScore > 30
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}>
              {riskScore > 70
                ? "High Risk"
                : riskScore > 30
                ? "Medium Risk"
                : "Low Risk"}
            </div>

            <div className="flex items-center">
              <span className="mr-2 text-sm font-medium">{riskScore}/100</span>
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4">
            {tokenIssues.length > 0 ? (
              <>
                <h4 className="text-sm font-medium mb-2">Risk Factors</h4>
                <ul className="space-y-2">
                  {tokenIssues.map((issue, idx) => (
                    <li key={idx} className="flex items-start">
                      <span
                        className={`
                        px-2 py-0.5 text-xs rounded-full mr-2 mt-0.5
                        ${
                          issue.severity === "high"
                            ? "bg-red-100 text-red-800"
                            : issue.severity === "medium"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }
                      `}>
                        {issue.severity === "high"
                          ? "High"
                          : issue.severity === "medium"
                          ? "Medium"
                          : "Info"}
                      </span>
                      <div>
                        <p className="text-sm">{issue.description}</p>
                        {issue.tags && issue.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {issue.tags.map((tag, tagIdx) => (
                              <span
                                key={tagIdx}
                                className="text-xs bg-[#f5f2ea] dark:bg-[#1a1814] px-2 py-0.5 rounded">
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-[#666] dark:text-[#bbb]">
                  No specific issues detected for this token
                </p>
              </div>
            )}

            {riskData.transactionCount && (
              <div className="mt-4 pt-3 border-t border-[#e0d9c7] dark:border-[#3a3530]">
                <div className="flex justify-between text-sm">
                  <span className="text-[#666] dark:text-[#bbb]">
                    Transactions Analyzed:
                  </span>
                  <span>{riskData.transactionCount}</span>
                </div>
                {(riskData.medium > 0 || riskData.high > 0) && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-[#666] dark:text-[#bbb]">
                      Risky Transactions:
                    </span>
                    <span>
                      {riskData.high} high, {riskData.medium} medium
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 pt-2 text-right">
              <Link
                href={`https://solscan.io/token/${token.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#6e634a] hover:underline text-sm">
                View on Solscan
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  };

  const SelectedTokenAnalysis = ({
    tokenAddress,
    heliusTokenData,
    tokenMetadata,
    fetchTokenBubbleMapData,
  }) => {
    const [tokenBubbleData, setTokenBubbleData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const getTokenData = async () => {
        setIsLoading(true);
        try {
          const data = await fetchTokenBubbleMapData(tokenAddress);
          setTokenBubbleData(data);
        } catch (error) {
          console.error("Error fetching token bubble data:", error);
        } finally {
          setIsLoading(false);
        }
      };

      if (tokenAddress) {
        getTokenData();
      }
    }, [tokenAddress]);

    if (isLoading) {
      return (
        <div className="flex justify-center py-4 mb-8">
          <div className="w-8 h-8 border-2 border-[#6e634a] border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    if (!tokenBubbleData) {
      return (
        <div className="bg-white dark:bg-[#2a251e] p-4 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] mb-8">
          <p className="text-center text-[#666] dark:text-[#bbb]">
            Unable to load token analysis data
          </p>
        </div>
      );
    }

    // Format token balance
    const formattedAmount = heliusTokenData
      ? (
          heliusTokenData.amount / Math.pow(10, heliusTokenData.decimals)
        ).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        })
      : "0";

    // Get token name and symbol
    const tokenSymbol =
      tokenMetadata?.symbol || heliusTokenData?.symbol || "Unknown";
    const tokenName =
      tokenMetadata?.name ||
      tokenBubbleData.mapData?.full_name ||
      "Unknown Token";

    return (
      <div className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] mb-8">
        <div className="p-4 border-b border-[#e0d9c7] dark:border-[#3a3530]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-lg font-medium">
                {tokenName} ({tokenSymbol.toUpperCase()})
              </h4>
              <p className="text-sm text-[#666] dark:text-[#bbb] mt-1">
                Balance: {formattedAmount} {tokenSymbol.toUpperCase()}
              </p>

              {tokenMetadata && (
                <p className="text-sm mt-1">
                  Value: $
                  {(formattedAmount * tokenMetadata.current_price).toFixed(2)}
                  <span
                    className={`ml-2 text-xs ${
                      tokenMetadata.price_change_percentage_24h > 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}>
                    {tokenMetadata.price_change_percentage_24h > 0 ? "+" : ""}
                    {tokenMetadata.price_change_percentage_24h?.toFixed(2)}%
                  </span>
                </p>
              )}
            </div>

            {tokenBubbleData.decentralizationScore && (
              <div className="flex flex-col items-end">
                <div className="flex items-center mb-1">
                  <span className="text-sm text-[#666] dark:text-[#bbb] mr-2">
                    Decentralization:
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${
                      tokenBubbleData.decentralizationScore > 70
                        ? "bg-green-100 text-green-800"
                        : tokenBubbleData.decentralizationScore > 40
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}>
                    {tokenBubbleData.decentralizationScore > 70
                      ? "High"
                      : tokenBubbleData.decentralizationScore > 40
                      ? "Medium"
                      : "Low"}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-24 bg-[#e0d9c7] dark:bg-[#3a3530] h-2 rounded-full mr-2">
                    <div
                      className={`h-2 rounded-full ${
                        tokenBubbleData.decentralizationScore > 70
                          ? "bg-green-500"
                          : tokenBubbleData.decentralizationScore > 40
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${tokenBubbleData.decentralizationScore}%`,
                      }}></div>
                  </div>
                  <span className="text-sm font-medium">
                    {tokenBubbleData.decentralizationScore}/100
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {tokenBubbleData.mapData?.nodes?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t border-[#e0d9c7] dark:border-[#3a3530]">
            <div>
              <h5 className="text-sm font-medium mb-2">Top Holders</h5>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tokenBubbleData.mapData.nodes
                  .slice(0, 5)
                  .map((holder, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm">
                      <div className="flex items-center">
                        <span className="text-[#666] dark:text-[#bbb] mr-2">
                          {index + 1}.
                        </span>
                        <span className="truncate max-w-[150px]">
                          {holder.name ||
                            `${holder.address.substring(
                              0,
                              6
                            )}...${holder.address.substring(
                              holder.address.length - 4
                            )}`}
                        </span>
                        {holder.is_contract && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                            Contract
                          </span>
                        )}
                      </div>
                      <span className="font-medium">
                        {holder.percentage
                          ? `${holder.percentage.toFixed(2)}%`
                          : "N/A"}
                      </span>
                    </div>
                  ))}

                {tokenBubbleData.mapData.nodes.length > 5 && (
                  <p className="text-xs text-center text-[#666] dark:text-[#bbb] pt-2">
                    +{tokenBubbleData.mapData.nodes.length - 5} more holders
                  </p>
                )}
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium mb-2">Distribution Stats</h5>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#666] dark:text-[#bbb]">
                    Total Holders:
                  </span>
                  <span className="font-medium">
                    {tokenBubbleData.mapData.nodes.length.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#666] dark:text-[#bbb]">
                    Top 10 Holders %:
                  </span>
                  <span className="font-medium">
                    {tokenBubbleData.mapData.nodes
                      .slice(0, 10)
                      .reduce(
                        (sum, holder) => sum + (holder.percentage || 0),
                        0
                      )
                      .toFixed(2)}
                    %
                  </span>
                </div>

                {tokenBubbleData.decentralizationScore && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#666] dark:text-[#bbb]">
                      Concentration Risk:
                    </span>
                    <span
                      className={`font-medium ${
                        tokenBubbleData.decentralizationScore > 70
                          ? "text-green-600"
                          : tokenBubbleData.decentralizationScore > 40
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}>
                      {tokenBubbleData.decentralizationScore > 70
                        ? "Low"
                        : tokenBubbleData.decentralizationScore > 40
                        ? "Medium"
                        : "High"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Component for Token BubbleMap Card
  const TokenBubbleMapCard = ({
    token,
    tokenMetadata,
    fetchTokenBubbleMapData,
  }) => {
    const [tokenBubbleData, setTokenBubbleData] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const loadTokenData = async () => {
      if (tokenBubbleData || isLoading) return;

      setIsLoading(true);
      try {
        const data = await fetchTokenBubbleMapData(token.mint);
        setTokenBubbleData(data);
      } catch (error) {
        console.error("Error fetching token bubble data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Format token balance
    const formattedAmount = token.amount / Math.pow(10, token.decimals);

    // Get short address for display
    const shortMint = `${token.mint.substring(0, 4)}...${token.mint.substring(
      token.mint.length - 4
    )}`;

    // Get token name and symbol
    const tokenSymbol = tokenMetadata?.symbol || token.symbol || shortMint;
    const tokenName = tokenMetadata?.name || `Token ${shortMint}`;

    return (
      <div className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] overflow-hidden">
        <div
          className="p-4 border-b border-[#e0d9c7] dark:border-[#3a3530] cursor-pointer"
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded) loadTokenData();
          }}>
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center">
                <h4 className="text-lg font-medium mr-2">
                  {tokenName} ({tokenSymbol.toUpperCase()})
                </h4>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className={`h-5 w-5 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <p className="text-sm text-[#666] dark:text-[#bbb] mt-1">
                Balance:{" "}
                {formattedAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 4,
                })}{" "}
                {tokenSymbol.toUpperCase()}
              </p>

              {tokenMetadata && (
                <p className="text-sm mt-1">
                  Value: $
                  {(formattedAmount * tokenMetadata.current_price).toFixed(2)}
                  <span
                    className={`ml-2 text-xs ${
                      tokenMetadata.price_change_percentage_24h > 0
                        ? "text-green-500"
                        : "text-red-500"
                    }`}>
                    {tokenMetadata.price_change_percentage_24h > 0 ? "+" : ""}
                    {tokenMetadata.price_change_percentage_24h?.toFixed(2)}%
                  </span>
                </p>
              )}
            </div>

            <div className="flex items-center">
              <Link
                href={`https://app.bubblemaps.io/sol/token/${token.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#6e634a] hover:underline text-sm flex items-center mr-4">
                <img
                  src="https://img.cryptorank.io/coins/bubblemaps1695042766511.png"
                  alt="BubbleMap"
                  className="w-4 h-4 mr-1.5"
                />
                View Map
              </Link>
              <Link
                href={`https://solscan.io/token/${token.mint}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[#6e634a] hover:underline text-sm flex items-center">
                <img
                  src="https://avatars.githubusercontent.com/u/92743431?s=280&v=4"
                  alt="Solscan"
                  className="w-4 h-4 mr-1.5"
                />
                Solscan
              </Link>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[#e0d9c7] border-t-[#6e634a] rounded-full animate-spin"></div>
              </div>
            ) : tokenBubbleData ? (
              <>
                {/* Decentralization Score */}
                {tokenBubbleData.decentralizationScore && (
                  <div className="mb-4 p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                    <p className="text-sm font-medium mb-1">
                      Decentralization Score
                    </p>
                    <div className="flex items-center">
                      <div className="w-full bg-[#e0d9c7] dark:bg-[#3a3530] h-3 rounded-full mr-2">
                        <div
                          className={`h-3 rounded-full ${
                            tokenBubbleData.decentralizationScore > 70
                              ? "bg-green-500"
                              : tokenBubbleData.decentralizationScore > 40
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${tokenBubbleData.decentralizationScore}%`,
                          }}></div>
                      </div>
                      <span className="text-sm font-medium ml-2 min-w-[40px]">
                        {tokenBubbleData.decentralizationScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-[#666] dark:text-[#bbb] mt-2">
                      {tokenBubbleData.decentralizationScore > 70
                        ? "High decentralization - token ownership is well distributed"
                        : tokenBubbleData.decentralizationScore > 40
                        ? "Medium decentralization - moderate concentration of tokens"
                        : "Low decentralization - high concentration of tokens in few wallets"}
                    </p>
                  </div>
                )}

                {/* BubbleMap iframe */}
                <div className="h-72 w-full mb-4 rounded-lg overflow-hidden border border-[#e0d9c7] dark:border-[#3a3530]">
                  <iframe
                    src={`https://app.bubblemaps.io/sol/token/${token.mint}`}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    title={`${tokenSymbol} Distribution Map`}
                    className="bg-white"></iframe>
                </div>

                {/* Token distribution info */}
                {tokenBubbleData.mapData?.nodes?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                      <h5 className="text-sm font-medium mb-2">
                        Distribution Stats
                      </h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#666] dark:text-[#bbb]">
                            Total Holders:
                          </span>
                          <span className="font-medium">
                            {tokenBubbleData.mapData.nodes.length.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#666] dark:text-[#bbb]">
                            Top 10 Concentration:
                          </span>
                          <span className="font-medium">
                            {tokenBubbleData.mapData.nodes
                              .slice(0, 10)
                              .reduce(
                                (sum, holder) => sum + (holder.percentage || 0),
                                0
                              )
                              .toFixed(2)}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#666] dark:text-[#bbb]">
                            Your Position:
                          </span>
                          <span className="font-medium">
                            {tokenBubbleData.mapData.nodes.findIndex(
                              (node) => node.address === walletAddress
                            ) > -1
                              ? `#${
                                  tokenBubbleData.mapData.nodes.findIndex(
                                    (node) => node.address === walletAddress
                                  ) + 1
                                }`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                      <h5 className="text-sm font-medium mb-2">
                        Top 3 Holders
                      </h5>
                      <div className="space-y-2">
                        {tokenBubbleData.mapData.nodes
                          .slice(0, 3)
                          .map((holder, index) => (
                            <div
                              key={index}
                              className="flex justify-between items-center text-sm">
                              <div className="flex items-center">
                                <span className="text-[#666] dark:text-[#bbb] mr-2">
                                  {index + 1}.
                                </span>
                                <span className="truncate max-w-[150px]">
                                  {holder.name ||
                                    `${holder.address.substring(
                                      0,
                                      6
                                    )}...${holder.address.substring(
                                      holder.address.length - 4
                                    )}`}
                                </span>
                                {holder.is_contract && (
                                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                                    Contract
                                  </span>
                                )}
                              </div>
                              <span className="font-medium">
                                {holder.percentage
                                  ? `${holder.percentage.toFixed(2)}%`
                                  : "N/A"}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4 text-[#666] dark:text-[#bbb]">
                BubbleMap data is not available for this token.
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f5f2ea] dark:bg-[#1a1814] text-[#333] dark:text-[#f5f2ea]">
      <main className="max-w-7xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-[#e0d9c7] border-t-[#6e634a] rounded-full animate-spin mb-4"></div>
            <p className="text-lg">
              Analyzing wallet data for {walletAddress}...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-xl text-red-600 mb-4">{error}</p>
            <Link href="/">
              <button className="px-6 py-3 bg-[#6e634a] text-white rounded-lg hover:bg-[#5d5340] transition-colors">
                Try Another Address
              </button>
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">Wallet Analysis</h1>
                <p className="text-lg text-[#666] dark:text-[#bbb]">
                  {walletAddress}
                </p>
              </div>

              <div className="flex gap-3 mt-4 md:mt-0">
                <button
                  onClick={handlePrintReport}
                  className="px-4 py-2 bg-[#f5f2ea] dark:bg-[#2a251e] text-[#6e634a] dark:text-[#f5f2ea] border border-[#e0d9c7] dark:border-[#3a3530] rounded-lg hover:bg-[#e0d9c7] dark:hover:bg-[#3a3530] transition-colors flex items-center space-x-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="inline-block">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download</span>
                </button>

                <button
                  onClick={handleSaveReport}
                  disabled={isSaving}
                  className={`px-4 py-2 bg-[#6e634a] text-white rounded-lg hover:bg-[#5d5340] transition-colors flex items-center space-x-2 ${
                    isSaving ? "opacity-70" : ""
                  }`}>
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="inline-block">
                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                        <polyline points="17 21 17 13 7 13 7 21" />
                        <polyline points="7 3 7 8 15 8" />
                      </svg>
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>

              {saveSuccess && (
                <div className="fixed top-20 right-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  Report saved successfully!
                </div>
              )}
            </div>

            <div
              ref={reportRef}
              className="bg-[#f5f2ea] dark:bg-[#2a251e] rounded-xl shadow-md overflow-hidden border border-[#e0d9c7] dark:border-[#3a3530]">
              {/* Tabs */}
              <div className="flex border-b border-[#e0d9c7] dark:border-[#3a3530] overflow-x-auto">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === "overview"
                      ? "border-b-2 border-[#6e634a] text-[#6e634a]"
                      : "text-[#666] dark:text-[#bbb]"
                  }`}>
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("portfolio")}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === "portfolio"
                      ? "border-b-2 border-[#6e634a] text-[#6e634a]"
                      : "text-[#666] dark:text-[#bbb]"
                  }`}>
                  Portfolio
                </button>
                <button
                  onClick={() => setActiveTab("relationships")}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === "relationships"
                      ? "border-b-2 border-[#6e634a] text-[#6e634a]"
                      : "text-[#666] dark:text-[#bbb]"
                  }`}>
                  Relationships
                </button>
                <button
                  onClick={() => setActiveTab("riskAnalysis")}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === "riskAnalysis"
                      ? "border-b-2 border-[#6e634a] text-[#6e634a]"
                      : "text-[#666] dark:text-[#bbb]"
                  }`}>
                  Risk Analysis
                </button>
                <button
                  onClick={() => setActiveTab("solscan")}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === "solscan"
                      ? "border-b-2 border-[#6e634a] text-[#6e634a]"
                      : "text-[#666] dark:text-[#bbb]"
                  }`}>
                  Assets
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "overview" && (
                  <div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
                      <div>
                        <h2 className="text-xl font-semibold mb-2">
                          Wallet Overview
                        </h2>
                        <p className="text-sm text-[#666] dark:text-[#bbb] mb-2">
                          {walletAddress}
                        </p>

                        {/* Domain Information Section */}
                        {domainData && domainData.length > 0 && (
                          <div className="mt-2 mb-4">
                            <p className="text-sm font-medium text-[#666] dark:text-[#bbb] mb-1">
                              Associated Domains:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {domainData.map((domain, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block bg-[#e0d9c7] dark:bg-[#3a3530] px-2 py-1 rounded text-xs">
                                  {domain.domains &&
                                    domain.domains[0] &&
                                    domain.domains[0].name}
                                  {domain.nameServiceAccount && (
                                    <span className="ml-1 text-[#6e634a]">
                                      ({domain.nameServiceAccount})
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {heliusData?.domains &&
                          heliusData.domains.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {heliusData.domains.map((domain) => (
                                <span
                                  key={domain}
                                  className="inline-block bg-[#e0d9c7] dark:bg-[#3a3530] px-2 py-1 rounded text-xs">
                                  {domain}
                                </span>
                              ))}
                            </div>
                          )}
                      </div>
                      <div className="mt-4 md:mt-0 text-right">
                        <p className="text-sm text-[#666] dark:text-[#bbb]">
                          Total Portfolio Value
                        </p>
                        <p className="text-2xl font-bold">
                          ${calculatePortfolioValue().toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Helius Data Section */}
                    <div className="mb-8">
                      <div className="flex items-center mb-4">
                        <h3 className="text-lg font-medium mr-2">
                          Wallet Assets
                        </h3>
                        <div className="flex items-center text-sm text-[#666] dark:text-[#bbb]">
                          Powered by
                          <Image
                            src="https://images.ctfassets.net/23fkqdsgbpuj/1t0njrGaxERm0tVkwo3sNF/cee88331e9ec6f9c2351cdec444ba7e1/1666227862821.png"
                            alt="Helius"
                            width={80}
                            height={20}
                            className="ml-2"
                          />
                        </div>
                      </div>

                      {heliusData ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                            <h4 className="font-medium mb-3">SOL Balance</h4>
                            <p className="text-xl font-bold">
                              {heliusData.nativeBalance / 1e9 || "0"} SOL
                            </p>
                          </div>
                          <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                            <h4 className="font-medium mb-3">Token Count</h4>
                            <p className="text-xl font-bold">
                              {heliusData.tokens?.length || 0}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[#666] dark:text-[#bbb]">
                          Unable to load wallet assets data
                        </p>
                      )}
                    </div>

                    {/* Webacy Risk Analysis Section */}
                    <div className="mb-8">
                      <div className="flex items-center mb-4">
                        <h3 className="text-lg font-medium mr-2">
                          Smart Risk Analysis
                        </h3>
                        <div className="flex items-center text-sm text-[#666] dark:text-[#bbb]">
                          Powered by
                          <Image
                            src="https://world.webacy.com/content/images/2021/10/color_logo_1.png"
                            alt="Webacy"
                            width={60}
                            height={20}
                            className="ml-2"
                          />
                        </div>
                      </div>

                      {webacyData ? (
                        <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                Overall Risk Level
                              </p>
                              <div className="flex items-center mt-2">
                                <div
                                  className={`h-4 w-4 rounded-full mr-2 ${
                                    webacyData.overallRisk > 70
                                      ? "bg-red-500"
                                      : webacyData.overallRisk > 30
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}></div>
                                <p className="font-medium">
                                  {webacyData.overallRisk > 70
                                    ? "High Risk"
                                    : webacyData.overallRisk > 30
                                    ? "Medium Risk"
                                    : "Low Risk"}
                                </p>
                              </div>
                            </div>

                            {/* Sanction Check Card */}
                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                Sanctions Check
                              </p>
                              <div className="flex items-center mt-2">
                                {sanctionData.isLoading ? (
                                  <div className="h-4 w-4 border-2 border-[#6e634a] border-t-transparent rounded-full animate-spin mr-2"></div>
                                ) : (
                                  <div
                                    className={`h-4 w-4 rounded-full mr-2 ${
                                      sanctionData.data?.is_sanctioned
                                        ? "bg-red-500"
                                        : "bg-green-500"
                                    }`}></div>
                                )}
                                <p className="font-medium">
                                  {sanctionData.isLoading
                                    ? "Checking..."
                                    : sanctionData.data?.is_sanctioned
                                    ? "Sanctioned"
                                    : "Not Sanctioned"}
                                </p>
                              </div>
                            </div>

                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                Transactions
                              </p>
                              <p className="text-xl font-bold">
                                {webacyData.details?.address_info
                                  ?.transaction_count || 0}
                              </p>
                            </div>

                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                First Transaction
                              </p>
                              <p className="text-sm font-medium mt-1">
                                {webacyData.details?.address_info?.time_1st_tx
                                  ? new Date(
                                      webacyData.details.address_info.time_1st_tx
                                    ).toLocaleDateString()
                                  : "Unknown"}
                              </p>
                            </div>
                          </div>

                          {/* Sanction Alert - only show if sanctioned */}
                          {sanctionData.data?.is_sanctioned && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/30">
                              <p className="text-sm text-red-800 dark:text-red-300 flex items-center font-medium">
                                <svg
                                  className="w-5 h-5 mr-2"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                  xmlns="http://www.w3.org/2000/svg">
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Warning: This wallet address has been identified
                                on a sanctions list
                              </p>
                              <p className="text-sm text-red-800 dark:text-red-300 mt-2 pl-7">
                                Interacting with sanctioned addresses may have
                                legal implications. Exercise extreme caution.
                              </p>
                            </div>
                          )}

                          {webacyData.issues && webacyData.issues.length > 0 ? (
                            <div>
                              <h4 className="font-medium text-md mb-2">
                                Risk Issues Detected
                              </h4>
                              <ul className="space-y-2">
                                {webacyData.issues.map((issue, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span
                                      className={`
                  px-2 py-0.5 text-xs rounded-full mr-2 mt-0.5
                  ${
                    issue.severity === "high"
                      ? "bg-red-100 text-red-800"
                      : issue.severity === "medium"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-blue-100 text-blue-800"
                  }
                `}>
                                      {issue.severity === "high"
                                        ? "High"
                                        : issue.severity === "medium"
                                        ? "Medium"
                                        : "Info"}
                                    </span>
                                    <span className="text-sm">
                                      {issue.description}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : sanctionData.data?.is_sanctioned ? (
                            <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <svg
                                className="w-5 h-5 text-red-500 mr-2"
                                fill="currentColor"
                                viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <p className="text-sm text-red-800 dark:text-red-200">
                                This wallet is on a sanctions list. No other
                                risk issues were detected.
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <svg
                                className="w-5 h-5 text-green-500 mr-2"
                                fill="currentColor"
                                viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <p className="text-sm text-green-800 dark:text-green-200">
                                No risk issues detected for this wallet
                              </p>
                            </div>
                          )}

                          {webacyData.details?.address_info?.wash_trading >
                            0 && (
                            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center">
                                <svg
                                  className="w-4 h-4 mr-2"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor">
                                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Wash trading activity detected:{" "}
                                {webacyData.details.address_info.wash_trading *
                                  100}
                                % of transactions
                              </p>
                            </div>
                          )}

                          {webacyData.details?.address_info
                            ?.automated_trading && (
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center">
                                <svg
                                  className="w-4 h-4 mr-2"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor">
                                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                Automated trading bot activity detected
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] text-center">
                          <div className="animate-pulse flex flex-col items-center">
                            <div className="h-8 w-8 border-2 border-[#6e634a] border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-[#666] dark:text-[#bbb]">
                              Analyzing wallet risk data...
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RugCheck Data Section */}
                    <div className="mb-8">
                      <div className="flex items-center mb-4">
                        <h3 className="text-lg font-medium mr-2">
                          Token Risk Analysis
                        </h3>
                        <div className="flex items-center text-sm text-[#666] dark:text-[#bbb]">
                          Powered by
                          <Image
                            src="/rugcheck.png"
                            alt="RugCheck"
                            width={60}
                            height={20}
                            className="ml-2"
                          />
                        </div>
                      </div>

                      {heliusData?.tokens && isRiskSummaryLoaded ? (
                        <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                          {/* Risk Summary Section */}
                          <div className="mb-6">
                            <h4 className="font-medium text-lg mb-4">
                              Risk Summary
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              {tokenRiskSummary.high.length > 0 && (
                                <div className="mb-6">
                                  <h4 className="font-medium mb-3 text-red-600 dark:text-red-400 flex items-center">
                                    <svg
                                      className="w-4 h-4 mr-1"
                                      viewBox="0 0 20 20"
                                      fill="currentColor">
                                      <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    High-Risk Tokens
                                  </h4>
                                  <div className="space-y-2 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
                                    {tokenRiskSummary.high.map((token, idx) => (
                                      <div key={idx} className="flex flex-col">
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center">
                                            {token.image ? (
                                              <img
                                                src={token.image}
                                                alt={token.symbol}
                                                className="w-6 h-6 rounded-full mr-2"
                                              />
                                            ) : (
                                              <div className="w-6 h-6 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center mr-2">
                                                <span className="text-xs text-red-800 dark:text-red-200">
                                                  {token.symbol?.substring(
                                                    0,
                                                    2
                                                  ) || "?"}
                                                </span>
                                              </div>
                                            )}
                                            <span className="font-medium mr-2">
                                              {token.symbol || token.name}
                                            </span>
                                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                                              High Risk
                                            </span>

                                            {token.reportData?.score && (
                                              <span className="ml-2 text-xs text-red-700 dark:text-red-300">
                                                Score: {token.reportData.score}
                                                /100
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-right">
                                            <span className="block">
                                              $
                                              {token.value.toLocaleString(
                                                undefined,
                                                {
                                                  maximumFractionDigits: 2,
                                                }
                                              )}
                                            </span>
                                            <span className="text-xs text-[#666] dark:text-[#bbb]">
                                              {token.amount.toLocaleString(
                                                undefined,
                                                { maximumFractionDigits: 4 }
                                              )}{" "}
                                              tokens
                                            </span>
                                          </div>
                                        </div>

                                        {/* Add risk factors from report if available */}
                                        {token.reportData?.risks &&
                                          token.reportData.risks.length > 0 && (
                                            <div className="ml-8 mt-2 text-sm">
                                              <div className="text-xs font-medium text-red-800 dark:text-red-300 mb-1">
                                                Risk factors:
                                              </div>
                                              <ul className="space-y-1">
                                                {token.reportData.risks
                                                  .slice(0, 2)
                                                  .map((risk, rIdx) => (
                                                    <li
                                                      key={rIdx}
                                                      className="text-xs text-red-700 dark:text-red-300 flex items-center">
                                                      <span
                                                        className={`inline-block w-2 h-2 rounded-full mr-1 ${
                                                          risk.level === "high"
                                                            ? "bg-red-500"
                                                            : risk.level ===
                                                              "medium"
                                                            ? "bg-yellow-500"
                                                            : "bg-blue-500"
                                                        }`}></span>
                                                      {risk.name}:{" "}
                                                      {risk.description}
                                                    </li>
                                                  ))}
                                                {token.reportData.risks.length >
                                                  2 && (
                                                  <li className="text-xs text-red-700 dark:text-red-300">
                                                    +{" "}
                                                    {token.reportData.risks
                                                      .length - 2}{" "}
                                                    more issues
                                                  </li>
                                                )}
                                              </ul>
                                            </div>
                                          )}
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg text-sm text-red-800 dark:text-red-300">
                                    <p className="flex items-center">
                                      <svg
                                        className="w-4 h-4 mr-2 flex-shrink-0"
                                        fill="currentColor"
                                        viewBox="0 0 20 20">
                                        <path
                                          fillRule="evenodd"
                                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      High-risk tokens may have characteristics
                                      associated with scams, rug pulls, or
                                      unsafe contract features. Consider
                                      reviewing or removing these tokens from
                                      your portfolio.
                                    </p>
                                  </div>
                                </div>
                              )}
                              {/* Medium-risk tokens section - show up to 3 */}
                              {tokenRiskSummary.medium.length > 0 && (
                                <div className="mb-6">
                                  <h4 className="font-medium mb-3 text-yellow-600 dark:text-yellow-400 flex items-center">
                                    <svg
                                      className="w-4 h-4 mr-1"
                                      viewBox="0 0 20 20"
                                      fill="currentColor">
                                      <path
                                        fillRule="evenodd"
                                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Medium-Risk Tokens
                                  </h4>
                                  <div className="space-y-3 bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg">
                                    {tokenRiskSummary.medium
                                      .slice(0, 3)
                                      .map((token, idx) => (
                                        <div
                                          key={idx}
                                          className="flex flex-col">
                                          <div className="flex justify-between items-center">
                                            <div className="flex items-center">
                                              {token.image ? (
                                                <img
                                                  src={token.image}
                                                  alt={token.symbol}
                                                  className="w-6 h-6 rounded-full mr-2"
                                                />
                                              ) : (
                                                <div className="w-6 h-6 bg-yellow-200 dark:bg-yellow-800 rounded-full flex items-center justify-center mr-2">
                                                  <span className="text-xs text-yellow-800 dark:text-yellow-200">
                                                    {token.symbol?.substring(
                                                      0,
                                                      2
                                                    ) || "?"}
                                                  </span>
                                                </div>
                                              )}
                                              <span className="font-medium mr-2">
                                                {token.symbol || token.name}
                                              </span>
                                              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                                                Medium Risk
                                              </span>
                                              {token.reportData?.score && (
                                                <span className="ml-2 text-xs text-yellow-700 dark:text-yellow-300">
                                                  Score:{" "}
                                                  {token.reportData.score}/100
                                                </span>
                                              )}
                                            </div>
                                            <span>
                                              $
                                              {token.value.toLocaleString(
                                                undefined,
                                                {
                                                  maximumFractionDigits: 2,
                                                }
                                              )}
                                            </span>
                                          </div>

                                          {/* Add risk factors from report if available */}
                                          {token.reportData?.risks &&
                                            token.reportData.risks.length >
                                              0 && (
                                              <div className="ml-8 mt-1 text-sm">
                                                <div className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                                                  Main risk:
                                                </div>
                                                <div className="text-xs text-yellow-700 dark:text-yellow-300">
                                                  {
                                                    token.reportData.risks[0]
                                                      ?.name
                                                  }
                                                  :{" "}
                                                  {
                                                    token.reportData.risks[0]
                                                      ?.description
                                                  }
                                                  {token.reportData.risks
                                                    .length > 1 && (
                                                    <span className="text-xs ml-1">
                                                      +{" "}
                                                      {token.reportData.risks
                                                        .length - 1}{" "}
                                                      more issues
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      ))}

                                    {tokenRiskSummary.medium.length > 3 && (
                                      <p className="text-center text-sm text-[#666] dark:text-[#bbb]">
                                        +{tokenRiskSummary.medium.length - 3}{" "}
                                        more medium-risk tokens
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-900/30">
                                <p className="text-sm text-[#666] dark:text-[#bbb]">
                                  Low Risk
                                </p>
                                <div className="flex items-center mt-1">
                                  <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                                  <p className="text-xl font-bold">
                                    {tokenRiskSummary.low.length}
                                  </p>
                                </div>
                                <p className="text-xs text-[#666] dark:text-[#bbb] mt-1">
                                  Generally considered safer based on analysis
                                </p>
                              </div>

                              <div className="p-4 bg-gray-50 dark:bg-gray-800/20 rounded-lg border border-gray-100 dark:border-gray-800/30">
                                <p className="text-sm text-[#666] dark:text-[#bbb]">
                                  Unknown Risk
                                </p>
                                <div className="flex items-center mt-1">
                                  <div className="h-3 w-3 bg-gray-400 rounded-full mr-2"></div>
                                  <p className="text-xl font-bold">
                                    {tokenRiskSummary.unknown.length}
                                  </p>
                                </div>
                                <p className="text-xs text-[#666] dark:text-[#bbb] mt-1">
                                  Insufficient data to determine risk level
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Risk distribution bar */}
                          <div className="mb-6">
                            <div className="w-full h-4 rounded-full flex overflow-hidden">
                              {/* Only show segments with tokens */}
                              {tokenRiskSummary.high.length > 0 && (
                                <div
                                  className="h-full bg-red-500"
                                  style={{
                                    width: `${
                                      (tokenRiskSummary.high.length /
                                        heliusData.tokens.filter(
                                          (t) => t.amount > 0
                                        ).length) *
                                      100
                                    }%`,
                                  }}
                                  title={`High Risk: ${tokenRiskSummary.high.length} tokens`}></div>
                              )}
                              {tokenRiskSummary.medium.length > 0 && (
                                <div
                                  className="h-full bg-yellow-500"
                                  style={{
                                    width: `${
                                      (tokenRiskSummary.medium.length /
                                        heliusData.tokens.filter(
                                          (t) => t.amount > 0
                                        ).length) *
                                      100
                                    }%`,
                                  }}
                                  title={`Medium Risk: ${tokenRiskSummary.medium.length} tokens`}></div>
                              )}
                              {tokenRiskSummary.low.length > 0 && (
                                <div
                                  className="h-full bg-green-500"
                                  style={{
                                    width: `${
                                      (tokenRiskSummary.low.length /
                                        heliusData.tokens.filter(
                                          (t) => t.amount > 0
                                        ).length) *
                                      100
                                    }%`,
                                  }}
                                  title={`Low Risk: ${tokenRiskSummary.low.length} tokens`}></div>
                              )}
                              {tokenRiskSummary.unknown.length > 0 && (
                                <div
                                  className="h-full bg-gray-400"
                                  style={{
                                    width: `${
                                      (tokenRiskSummary.unknown.length /
                                        heliusData.tokens.filter(
                                          (t) => t.amount > 0
                                        ).length) *
                                      100
                                    }%`,
                                  }}
                                  title={`Unknown Risk: ${tokenRiskSummary.unknown.length} tokens`}></div>
                              )}
                            </div>
                            <div className="flex justify-between text-xs text-[#666] dark:text-[#bbb] mt-1">
                              <span>Lower Risk</span>
                              <span>Higher Risk</span>
                            </div>
                          </div>

                          {/* Token risk breakdown by value */}
                          <div className="mt-6">
                            <h4 className="font-medium mb-3">
                              Portfolio Risk Distribution
                            </h4>
                            {(() => {
                              // Calculate total values by risk category
                              const totalValue = {
                                high: tokenRiskSummary.high.reduce(
                                  (sum, token) => sum + token.value,
                                  0
                                ),
                                medium: tokenRiskSummary.medium.reduce(
                                  (sum, token) => sum + token.value,
                                  0
                                ),
                                low: tokenRiskSummary.low.reduce(
                                  (sum, token) => sum + token.value,
                                  0
                                ),
                                unknown: tokenRiskSummary.unknown.reduce(
                                  (sum, token) => sum + token.value,
                                  0
                                ),
                              };

                              const portfolioTotal =
                                totalValue.high +
                                totalValue.medium +
                                totalValue.low +
                                totalValue.unknown;

                              return (
                                <div>
                                  <div className="w-full h-6 rounded-lg flex overflow-hidden">
                                    {portfolioTotal > 0 && (
                                      <>
                                        {totalValue.high > 0 && (
                                          <div
                                            className="h-full bg-red-500"
                                            style={{
                                              width: `${
                                                (totalValue.high /
                                                  portfolioTotal) *
                                                100
                                              }%`,
                                            }}
                                            title={`High Risk: $${totalValue.high.toFixed(
                                              2
                                            )}`}></div>
                                        )}
                                        {totalValue.medium > 0 && (
                                          <div
                                            className="h-full bg-yellow-500"
                                            style={{
                                              width: `${
                                                (totalValue.medium /
                                                  portfolioTotal) *
                                                100
                                              }%`,
                                            }}
                                            title={`Medium Risk: $${totalValue.medium.toFixed(
                                              2
                                            )}`}></div>
                                        )}
                                        {totalValue.low > 0 && (
                                          <div
                                            className="h-full bg-green-500"
                                            style={{
                                              width: `${
                                                (totalValue.low /
                                                  portfolioTotal) *
                                                100
                                              }%`,
                                            }}
                                            title={`Low Risk: $${totalValue.low.toFixed(
                                              2
                                            )}`}></div>
                                        )}
                                        {totalValue.unknown > 0 && (
                                          <div
                                            className="h-full bg-gray-400"
                                            style={{
                                              width: `${
                                                (totalValue.unknown /
                                                  portfolioTotal) *
                                                100
                                              }%`,
                                            }}
                                            title={`Unknown Risk: $${totalValue.unknown.toFixed(
                                              2
                                            )}`}></div>
                                        )}
                                      </>
                                    )}
                                  </div>

                                  {/* Risk value breakdown in grid format */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                    <div className="flex items-center">
                                      <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                                      <div>
                                        <p className="text-xs text-[#666] dark:text-[#bbb]">
                                          Low Risk
                                        </p>
                                        <p className="text-sm font-medium">
                                          $
                                          {totalValue.low.toLocaleString(
                                            undefined,
                                            { maximumFractionDigits: 2 }
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center">
                                      <div className="h-3 w-3 bg-yellow-500 rounded-full mr-2"></div>
                                      <div>
                                        <p className="text-xs text-[#666] dark:text-[#bbb]">
                                          Medium Risk
                                        </p>
                                        <p className="text-sm font-medium">
                                          $
                                          {totalValue.medium.toLocaleString(
                                            undefined,
                                            { maximumFractionDigits: 2 }
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center">
                                      <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
                                      <div>
                                        <p className="text-xs text-[#666] dark:text-[#bbb]">
                                          High Risk
                                        </p>
                                        <p className="text-sm font-medium">
                                          $
                                          {totalValue.high.toLocaleString(
                                            undefined,
                                            { maximumFractionDigits: 2 }
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center">
                                      <div className="h-3 w-3 bg-gray-400 rounded-full mr-2"></div>
                                      <div>
                                        <p className="text-xs text-[#666] dark:text-[#bbb]">
                                          Unknown Risk
                                        </p>
                                        <p className="text-sm font-medium">
                                          $
                                          {totalValue.unknown.toLocaleString(
                                            undefined,
                                            { maximumFractionDigits: 2 }
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Warning if high risk tokens or value are found */}
                          {tokenRiskSummary.high.length > 0 && (
                            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg border border-red-100 dark:border-red-900/30">
                              <p className="flex items-center font-medium">
                                <svg
                                  className="w-5 h-5 mr-2 flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Risk Assessment Warning
                              </p>
                              <p className="mt-2 text-sm">
                                Your wallet contains{" "}
                                {tokenRiskSummary.high.length} high-risk token
                                {tokenRiskSummary.high.length > 1
                                  ? "s"
                                  : ""}{" "}
                                that may pose security concerns. Consider
                                reviewing these assets carefully before
                                interacting with them.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] text-center">
                          <div className="animate-pulse flex flex-col items-center">
                            <div className="h-8 w-8 border-2 border-[#6e634a] border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-[#666] dark:text-[#bbb]">
                              Analyzing token risk data...
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Link href="/">
                        <button className="px-4 py-2 bg-[#6e634a] text-white rounded-lg hover:bg-[#5d5340] transition-colors">
                          New Scan
                        </button>
                      </Link>
                    </div>
                  </div>
                )}
                {activeTab === "portfolio" && (
                  <div>
                    <div className="flex items-center mb-6">
                      <h2 className="text-xl font-semibold mr-2">
                        Portfolio Analysis
                      </h2>
                      <div className="flex items-center text-sm text-[#666] dark:text-[#bbb]">
                        Powered by
                        <Image
                          src="https://static.coingecko.com/s/coingecko-logo-5683263fd3ea8a4f152dd5f7299acfc5f84ee73955428acff22913b8e59e6c54.svg"
                          alt="Coingecko"
                          width={90}
                          height={20}
                          className="ml-2"
                        />
                        <Image
                          src="https://images.ctfassets.net/23fkqdsgbpuj/1t0njrGaxERm0tVkwo3sNF/cee88331e9ec6f9c2351cdec444ba7e1/1666227862821.png"
                          alt="Helius"
                          width={90}
                          height={20}
                          className="ml-2"
                        />
                        <Image
                          src="/rugcheck.png"
                          alt="RugCheck"
                          width={60}
                          height={20}
                          className="ml-2"
                        />
                      </div>
                    </div>

                    {/* Portfolio Summary */}
                    <div className="mb-8 p-4 bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                      <h3 className="text-lg font-medium mb-4">
                        Portfolio Summary
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                          <p className="text-sm text-[#666] dark:text-[#bbb]">
                            SOL Balance
                          </p>
                          <p className="text-xl font-bold">
                            {heliusData?.nativeBalance
                              ? (heliusData.nativeBalance / 1e9).toFixed(4)
                              : "0"}{" "}
                            SOL
                          </p>
                          <p className="text-sm text-[#666] dark:text-[#bbb]">
                            $
                            {solanaPriceUSD
                              ? (
                                  ((heliusData?.nativeBalance || 0) / 1e9) *
                                  solanaPriceUSD
                                ).toFixed(2)
                              : "0.00"}
                          </p>
                        </div>
                        <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                          <p className="text-sm text-[#666] dark:text-[#bbb]">
                            Token Value
                          </p>
                          <p className="text-xl font-bold">
                            $
                            {solscanData
                              ? calculateTokensValue(
                                  solscanData?.items ||
                                    solscanData.assets?.items ||
                                    []
                                ).toLocaleString()
                              : "0.00"}
                          </p>
                        </div>
                        <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                          <p className="text-sm text-[#666] dark:text-[#bbb]">
                            Total Portfolio Value
                          </p>
                          <p className="text-xl font-bold">
                            ${calculatePortfolioValue().toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {heliusData && heliusData.tokens ? (
                      <>
                        <p className="text-lg font-medium mb-4">
                          Token Holdings
                        </p>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-[#e0d9c7] dark:divide-[#3a3530]">
                            <thead>
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                  Token
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                  Amount
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                  Value
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                  Token Account
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e0d9c7] dark:divide-[#3a3530]">
                              {heliusData.tokens.map((token, idx) => {
                                // Show tokens with non-zero amounts first
                                const hasBalance = token.amount > 0;
                                const formattedAmount =
                                  token.amount / Math.pow(10, token.decimals);

                                // Get short address for display
                                const shortMint = `${token.mint.substring(
                                  0,
                                  4
                                )}...${token.mint.substring(
                                  token.mint.length - 4
                                )}`;
                                const shortTokenAccount = `${token.tokenAccount.substring(
                                  0,
                                  4
                                )}...${token.tokenAccount.substring(
                                  token.tokenAccount.length - 4
                                )}`;

                                // Get token metadata if available
                                const tokenMetadata =
                                  tokenMetadataCache[token.mint];

                                // Check if this token's report is expanded
                                const isReportExpanded =
                                  expandedTokenReports[token.mint] || false;
                                const isReportLoading =
                                  loadingTokenReports[token.mint] || false;
                                const reportData = tokenReportData[token.mint];

                                return (
                                  <React.Fragment key={idx}>
                                    <tr
                                      className={`${
                                        hasBalance ? "" : "opacity-70"
                                      } cursor-pointer hover:bg-[#f5f2ea] dark:hover:bg-[#1a1814]`}
                                      onClick={() =>
                                        toggleTokenReport(token.mint)
                                      }>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                          {tokenMetadata ? (
                                            <>
                                              <div className="flex-shrink-0 h-8 w-8 mr-3">
                                                <img
                                                  src={tokenMetadata.image}
                                                  alt={tokenMetadata.name}
                                                  className="h-8 w-8 rounded-full"
                                                />
                                              </div>
                                              <div>
                                                <p className="font-medium">
                                                  {tokenMetadata.name}
                                                </p>
                                                <p className="text-xs text-[#666] dark:text-[#bbb]">
                                                  {tokenMetadata.symbol.toUpperCase()}
                                                </p>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="flex items-center">
                                              <div className="flex-shrink-0 h-8 w-8 mr-3 bg-[#e0d9c7] dark:bg-[#3a3530] rounded-full flex items-center justify-center">
                                                <span className="text-xs">
                                                  {shortMint.substring(0, 2)}
                                                </span>
                                              </div>
                                              <span className="font-medium">
                                                {shortMint}
                                              </span>
                                            </div>
                                          )}
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className={`h-5 w-5 ml-2 transition-transform ${
                                              isReportExpanded
                                                ? "rotate-180"
                                                : ""
                                            }`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor">
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={2}
                                              d="M19 9l-7 7-7-7"
                                            />
                                          </svg>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        {formattedAmount.toLocaleString(
                                          undefined,
                                          {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 4,
                                          }
                                        )}
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        {tokenMetadata ? (
                                          <div>
                                            <p className="font-medium">
                                              $
                                              {tokenMetadata.current_price
                                                ? (
                                                    formattedAmount *
                                                    tokenMetadata.current_price
                                                  ).toFixed(2)
                                                : "—"}
                                            </p>
                                            {tokenMetadata.current_price >
                                              0 && (
                                              <p
                                                className={`text-xs ${
                                                  tokenMetadata.price_change_percentage_24h >
                                                  0
                                                    ? "text-green-500"
                                                    : "text-red-500"
                                                }`}>
                                                {tokenMetadata.price_change_percentage_24h >
                                                0
                                                  ? "↑"
                                                  : "↓"}
                                                {Math.abs(
                                                  tokenMetadata.price_change_percentage_24h
                                                ).toFixed(2)}
                                                %
                                              </p>
                                            )}
                                            {tokenMetadata.current_price >
                                              0 && (
                                              <p className="text-xs text-[#666] dark:text-[#bbb]">
                                                $
                                                {tokenMetadata.current_price.toLocaleString(
                                                  undefined,
                                                  {
                                                    minimumFractionDigits:
                                                      tokenMetadata.current_price <
                                                      0.01
                                                        ? 6
                                                        : 2,
                                                    maximumFractionDigits:
                                                      tokenMetadata.current_price <
                                                      0.01
                                                        ? 6
                                                        : 2,
                                                  }
                                                )}{" "}
                                                per token
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          <span>—</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-sm text-[#666] dark:text-[#bbb]">
                                        {shortTokenAccount}
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="relative group">
                                          <Link
                                            href={`https://solscan.io/token/${token.mint}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center text-[#6e634a] hover:underline text-sm">
                                            <img
                                              src="https://avatars.githubusercontent.com/u/92743431?s=280&v=4"
                                              alt="Solscan"
                                              className="w-4 h-4 mr-1.5"
                                            />
                                            View
                                          </Link>
                                          <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
                                            <div className="bg-[#333] text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                              View on Solscan
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>

                                    {/* Token Report Row - only renders when expanded */}
                                    <tr>
                                      <td colSpan="5" className="p-0">
                                        <TokenReport
                                          tokenAddress={token.mint}
                                          isExpanded={isReportExpanded}
                                          tokenReportData={reportData}
                                          isLoading={isReportLoading}
                                        />
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Transaction History Section */}
                        <div className="mt-8">
                          <h3 className="text-lg font-medium mb-4">
                            Recent Transactions
                          </h3>

                          {loadingTransactions ? (
                            <div className="flex justify-center py-4">
                              <div className="w-8 h-8 border-2 border-[#6e634a] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          ) : transactionsData.length > 0 ? (
                            <div className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] overflow-hidden">
                              <table className="min-w-full divide-y divide-[#e0d9c7] dark:divide-[#3a3530]">
                                <thead>
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                      Transaction
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                      Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                      Time
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e0d9c7] dark:divide-[#3a3530]">
                                  {transactionsData.map((transaction) => (
                                    <Fragment key={transaction.signature}>
                                      <tr
                                        className="hover:bg-[#f5f2ea] dark:hover:bg-[#1a1814] cursor-pointer"
                                        onClick={() =>
                                          toggleTransactionDetails(
                                            transaction.signature
                                          )
                                        }>
                                        <td className="px-4 py-4">
                                          <div className="flex items-center">
                                            <span className="truncate max-w-xs text-sm font-medium">
                                              {transaction.signature.substring(
                                                0,
                                                8
                                              )}
                                              ...
                                              {transaction.signature.substring(
                                                transaction.signature.length - 8
                                              )}
                                            </span>
                                            {expandedTransaction ===
                                            transaction.signature ? (
                                              <ChevronUpIcon className="w-4 h-4 ml-2" />
                                            ) : (
                                              <ChevronDownIcon className="w-4 h-4 ml-2" />
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                          {transaction.type || "Unknown"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                          {transaction.timestamp
                                            ? new Date(
                                                transaction.timestamp * 1000
                                              ).toLocaleString()
                                            : "—"}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                          <div className="relative group">
                                            <Link
                                              href={`https://solscan.io/tx/${transaction.signature}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="flex items-center text-[#6e634a] hover:underline text-sm">
                                              <img
                                                src="https://avatars.githubusercontent.com/u/92743431?s=280&v=4"
                                                alt="Solscan"
                                                className="w-4 h-4 mr-1.5"
                                              />
                                              View
                                            </Link>
                                            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
                                              <div className="bg-[#333] text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                                View on Solscan
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>

                                      {/* Expanded transaction details */}
                                      <Transition
                                        as="tr"
                                        show={
                                          expandedTransaction ===
                                          transaction.signature
                                        }
                                        enter="transition ease-out duration-100"
                                        enterFrom="transform opacity-0"
                                        enterTo="transform opacity-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100"
                                        leaveTo="transform opacity-0">
                                        <td
                                          colSpan="5"
                                          className="px-4 py-4 bg-[#f9f7f2] dark:bg-[#22201c]">
                                          <div className="space-y-4">
                                            {transaction.description && (
                                              <div>
                                                <h4 className="text-sm font-medium mb-1">
                                                  Description
                                                </h4>
                                                <p className="text-sm text-[#666] dark:text-[#bbb]">
                                                  {transaction.description}
                                                </p>
                                              </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <h4 className="text-sm font-medium mb-1">
                                                  Transaction Details
                                                </h4>
                                                <div className="space-y-1">
                                                  <div className="flex justify-between">
                                                    <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                      Fee:
                                                    </span>
                                                    <span className="text-xs">
                                                      {(
                                                        transaction.fee / 1e9
                                                      ).toFixed(6)}{" "}
                                                      SOL
                                                    </span>
                                                  </div>
                                                  <span
                                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                      transaction.status ===
                                                      "failed"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-green-100 text-green-800"
                                                    }`}>
                                                    {transaction.status ===
                                                    "failed"
                                                      ? "Failed"
                                                      : "Success"}
                                                  </span>
                                                  <div className="flex justify-between">
                                                    <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                      Slot:
                                                    </span>
                                                    <span className="text-xs">
                                                      {transaction.slot}
                                                    </span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                      Full Signature:
                                                    </span>
                                                    <span className="text-xs truncate max-w-xs">
                                                      {transaction.signature}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>

                                              {transaction.nativeTransfers &&
                                                transaction.nativeTransfers
                                                  .length > 0 && (
                                                  <div>
                                                    <h4 className="text-sm font-medium mb-1">
                                                      SOL Transfers
                                                    </h4>
                                                    <div className="space-y-2">
                                                      {transaction.nativeTransfers.map(
                                                        (transfer, idx) => (
                                                          <div
                                                            key={idx}
                                                            className="border border-[#e0d9c7] dark:border-[#3a3530] rounded p-2">
                                                            <div className="flex justify-between">
                                                              <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                                From:
                                                              </span>
                                                              <span className="text-xs truncate max-w-xs">
                                                                {transfer.fromUserAccount.substring(
                                                                  0,
                                                                  4
                                                                )}
                                                                ...
                                                                {transfer.fromUserAccount.substring(
                                                                  transfer
                                                                    .fromUserAccount
                                                                    .length - 4
                                                                )}
                                                              </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                              <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                                To:
                                                              </span>
                                                              <span className="text-xs truncate max-w-xs">
                                                                {transfer.toUserAccount.substring(
                                                                  0,
                                                                  4
                                                                )}
                                                                ...
                                                                {transfer.toUserAccount.substring(
                                                                  transfer
                                                                    .toUserAccount
                                                                    .length - 4
                                                                )}
                                                              </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                              <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                                Amount:
                                                              </span>
                                                              <span className="text-xs">
                                                                {(
                                                                  transfer.amount /
                                                                  1e9
                                                                ).toFixed(
                                                                  6
                                                                )}{" "}
                                                                SOL
                                                              </span>
                                                            </div>
                                                          </div>
                                                        )
                                                      )}
                                                    </div>
                                                  </div>
                                                )}

                                              {transaction.tokenTransfers &&
                                                transaction.tokenTransfers
                                                  .length > 0 && (
                                                  <div className="col-span-2">
                                                    <h4 className="text-sm font-medium mb-1">
                                                      Token Transfers
                                                    </h4>
                                                    <div className="space-y-2">
                                                      {transaction.tokenTransfers.map(
                                                        (transfer, idx) => (
                                                          <div
                                                            key={idx}
                                                            className="border border-[#e0d9c7] dark:border-[#3a3530] rounded p-2">
                                                            <div className="grid grid-cols-2 gap-2">
                                                              <div className="flex justify-between">
                                                                <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                                  From:
                                                                </span>
                                                                <span className="text-xs truncate max-w-xs">
                                                                  {transfer.fromUserAccount.substring(
                                                                    0,
                                                                    4
                                                                  )}
                                                                  ...
                                                                  {transfer.fromUserAccount.substring(
                                                                    transfer
                                                                      .fromUserAccount
                                                                      .length -
                                                                      4
                                                                  )}
                                                                </span>
                                                              </div>
                                                              <div className="flex justify-between">
                                                                <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                                  To:
                                                                </span>
                                                                <span className="text-xs truncate max-w-xs">
                                                                  {transfer.toUserAccount.substring(
                                                                    0,
                                                                    4
                                                                  )}
                                                                  ...
                                                                  {transfer.toUserAccount.substring(
                                                                    transfer
                                                                      .toUserAccount
                                                                      .length -
                                                                      4
                                                                  )}
                                                                </span>
                                                              </div>
                                                              <div className="flex justify-between">
                                                                <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                                  Token:
                                                                </span>
                                                                <span className="text-xs truncate max-w-xs">
                                                                  {transfer.mint.substring(
                                                                    0,
                                                                    4
                                                                  )}
                                                                  ...
                                                                  {transfer.mint.substring(
                                                                    transfer
                                                                      .mint
                                                                      .length -
                                                                      4
                                                                  )}
                                                                </span>
                                                              </div>
                                                              <div className="flex justify-between">
                                                                <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                                  Amount:
                                                                </span>
                                                                <span className="text-xs">
                                                                  {
                                                                    transfer.tokenAmount
                                                                  }
                                                                </span>
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                            </div>
                                          </div>
                                        </td>
                                      </Transition>
                                    </Fragment>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-[#666] dark:text-[#bbb]">
                              No recent transactions found for this wallet.
                            </p>
                          )}
                        </div>

                        <div className="mt-8 p-4 bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                          <h3 className="text-lg font-medium mb-4">
                            Token Summary
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                Total Tokens
                              </p>
                              <p className="text-xl font-bold">
                                {heliusData.tokens.length}
                              </p>
                            </div>
                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                Active Tokens
                              </p>
                              <p className="text-xl font-bold">
                                {
                                  heliusData.tokens.filter((t) => t.amount > 0)
                                    .length
                                }
                              </p>
                            </div>
                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                SOL Price (CoinGecko)
                              </p>
                              <p className="text-xl font-bold">
                                ${solanaPriceUSD.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <p className="text-[#666] dark:text-[#bbb]">
                        Unable to load portfolio data
                      </p>
                    )}
                  </div>
                )}
                {activeTab === "relationships" && (
                  <div>
                    <div className="flex items-center mb-6">
                      <h2 className="text-xl font-semibold mr-2">
                        Wallet Relationships
                      </h2>
                      <div className="flex items-center text-sm text-[#666] dark:text-[#bbb]">
                        Powered by
                        <Image
                          src="https://img.cryptorank.io/coins/bubblemaps1695042766511.png"
                          alt="BubbleMap"
                          width={40}
                          height={20}
                          className="ml-2"
                        />
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="w-12 h-12 border-4 border-[#e0d9c7] border-t-[#6e634a] rounded-full animate-spin"></div>
                      </div>
                    ) : bubbleMapData && heliusData?.tokens ? (
                      <>
                        <div className="mb-8">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium">
                              Token Distribution Network
                            </h3>
                            <div className="relative">
                              <select
                                className="appearance-none bg-white dark:bg-[#2a251e] border border-[#e0d9c7] dark:border-[#3a3530] rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-[#6e634a]"
                                value={selectedTokenForBubbleMap || "wallet"}
                                onChange={(e) =>
                                  setSelectedTokenForBubbleMap(e.target.value)
                                }>
                                <option value="wallet">
                                  Wallet Interactions
                                </option>
                                {heliusData.tokens
                                  .filter((token) => token.amount > 0) // Only show tokens with balance
                                  .map((token, idx) => {
                                    // Get token metadata if available
                                    const tokenMetadata =
                                      tokenMetadataCache[token.mint];
                                    const tokenSymbol =
                                      tokenMetadata?.symbol ||
                                      token.symbol ||
                                      token.mint.substring(0, 4);
                                    const tokenName =
                                      tokenMetadata?.name ||
                                      `Token ${token.mint.substring(0, 6)}`;

                                    return (
                                      <option key={idx} value={token.mint}>
                                        {tokenName} ({tokenSymbol.toUpperCase()}
                                        )
                                      </option>
                                    );
                                  })}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#666] dark:text-[#bbb]">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 9l-7 7-7-7"
                                  />
                                </svg>
                              </div>
                            </div>
                          </div>

                          <p className="text-[#666] dark:text-[#bbb] mb-4">
                            {selectedTokenForBubbleMap === "wallet" ||
                            !selectedTokenForBubbleMap
                              ? "This visualization shows how this wallet interacts with other addresses and smart contracts on the Solana blockchain."
                              : `This visualization shows the holder distribution for the selected token.`}
                          </p>

                          {/* Dynamic BubbleMap iframe based on selected token */}
                          <div className="h-96 w-full mb-8 rounded-lg overflow-hidden border border-[#e0d9c7] dark:border-[#3a3530]">
                            <iframe
                              src={
                                selectedTokenForBubbleMap &&
                                selectedTokenForBubbleMap !== "wallet"
                                  ? `https://app.bubblemaps.io/sol/token/${selectedTokenForBubbleMap}`
                                  : `https://app.bubblemaps.io/sol/address/${walletAddress}`
                              }
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              title={
                                selectedTokenForBubbleMap &&
                                selectedTokenForBubbleMap !== "wallet"
                                  ? "Token Distribution Bubble Map"
                                  : "Wallet Interaction Bubble Map"
                              }
                              className="bg-white"></iframe>
                          </div>
                        </div>

                        {/* Selected Token Analysis Card (shown only when a token is selected) */}
                        {selectedTokenForBubbleMap &&
                          selectedTokenForBubbleMap !== "wallet" && (
                            <SelectedTokenAnalysis
                              tokenAddress={selectedTokenForBubbleMap}
                              heliusTokenData={heliusData.tokens.find(
                                (t) => t.mint === selectedTokenForBubbleMap
                              )}
                              tokenMetadata={
                                tokenMetadataCache[selectedTokenForBubbleMap]
                              }
                              fetchTokenBubbleMapData={fetchTokenBubbleMapData}
                            />
                          )}

                        {/* Token Holdings BubbleMap Analysis */}
                        <div className="mb-8">
                          <h3 className="text-lg font-medium mb-4">
                            Token Holdings Analysis
                          </h3>
                          <p className="text-[#666] dark:text-[#bbb] mb-4">
                            Analysis of all tokens in this wallet, showing
                            distribution, concentration, and relationships.
                          </p>

                          {/* Token Filter/Search */}
                          <div className="mb-6 p-4 bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                            <h4 className="text-md font-medium mb-3">
                              Token Holdings Overview
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                                <p className="text-sm text-[#666] dark:text-[#bbb]">
                                  Total Tokens
                                </p>
                                <p className="text-xl font-bold">
                                  {
                                    heliusData.tokens.filter(
                                      (token) => token.amount > 0
                                    ).length
                                  }
                                </p>
                              </div>
                              <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                                <p className="text-sm text-[#666] dark:text-[#bbb]">
                                  Token Value
                                </p>
                                <p className="text-xl font-bold">
                                  $
                                  {calculateTokensValue(
                                    solscanData?.items ||
                                      solscanData.assets?.items ||
                                      []
                                  ).toLocaleString()}
                                </p>
                              </div>
                              <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                                <p className="text-sm text-[#666] dark:text-[#bbb]">
                                  SOL Balance
                                </p>
                                <p className="text-xl font-bold">
                                  {heliusData?.nativeBalance
                                    ? (heliusData.nativeBalance / 1e9).toFixed(
                                        4
                                      )
                                    : "0"}{" "}
                                  SOL
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Token Distribution Analysis Cards - Using heliusData.tokens */}
                        {heliusData.tokens.filter((token) => token.amount > 0)
                          .length > 0 ? (
                          <div className="space-y-8">
                            {heliusData.tokens
                              .filter((token) => token.amount > 0)
                              .map((token, idx) => (
                                <TokenBubbleMapCard
                                  key={idx}
                                  token={token}
                                  tokenMetadata={tokenMetadataCache[token.mint]}
                                  fetchTokenBubbleMapData={
                                    fetchTokenBubbleMapData
                                  }
                                />
                              ))}
                          </div>
                        ) : (
                          <div className="p-6 bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] text-center">
                            <p>No token holdings found in this wallet.</p>
                          </div>
                        )}

                        {/* Top Interactions */}
                        {bubbleMapData.walletInteractions?.topInteractions
                          ?.length > 0 && (
                          <div className="mt-8 mb-8">
                            <h3 className="text-lg font-medium mb-4">
                              Top Addresses Interacted With
                            </h3>
                            <div className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] overflow-hidden">
                              <table className="min-w-full divide-y divide-[#e0d9c7] dark:divide-[#3a3530]">
                                <thead>
                                  <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                      Address
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                      Type
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                      Interactions
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-[#666] dark:text-[#bbb] uppercase tracking-wider">
                                      Actions
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#e0d9c7] dark:divide-[#3a3530]">
                                  {bubbleMapData.walletInteractions.topInteractions.map(
                                    (interaction, idx) => (
                                      <tr
                                        key={idx}
                                        className="hover:bg-[#f5f2ea] dark:hover:bg-[#1a1814]">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <span className="text-sm font-medium">
                                              {interaction.name ||
                                                (interaction.address
                                                  ? `${interaction.address.substring(
                                                      0,
                                                      6
                                                    )}...${interaction.address.substring(
                                                      interaction.address
                                                        .length - 4
                                                    )}`
                                                  : "Unknown")}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                          <span
                                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                              interaction.is_contract
                                                ? "bg-blue-100 text-blue-800"
                                                : "bg-green-100 text-green-800"
                                            }`}>
                                            {interaction.is_contract
                                              ? "Contract"
                                              : "Wallet"}
                                          </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                                          {interaction.transaction_count ||
                                            interaction.count ||
                                            0}{" "}
                                          txns
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                          <Link
                                            href={`https://solscan.io/account/${interaction.address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[#6e634a] hover:underline text-sm">
                                            View
                                          </Link>
                                        </td>
                                      </tr>
                                    )
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-center mt-8">
                          <Link
                            href={`https://app.bubblemaps.io/sol/address/${walletAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-[#6e634a] text-white rounded-lg hover:bg-[#5d5340] transition-colors">
                            <img
                              src="https://img.cryptorank.io/coins/bubblemaps1695042766511.png"
                              alt="BubbleMap"
                              className="w-5 h-5"
                            />
                            View Full Interactive Map
                          </Link>
                        </div>
                      </>
                    ) : (
                      <div>
                        <p className="text-[#666] dark:text-[#bbb] mb-6">
                          Unable to load relationship data. BubbleMaps
                          integration may be unavailable for this wallet.
                        </p>

                        <div className="p-6 bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                          <div className="flex flex-col items-center justify-center">
                            <img
                              src="https://img.cryptorank.io/coins/bubblemaps1695042766511.png"
                              alt="BubbleMap"
                              className="w-16 h-16 mb-4 opacity-50"
                            />
                            <p className="text-center mb-4">
                              BubbleMaps visualization is not available for this
                              wallet or its tokens.
                            </p>
                            <Link
                              href={`https://app.bubblemaps.io/sol/address/${walletAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-[#6e634a] text-white rounded-lg hover:bg-[#5d5340] transition-colors">
                              Try on BubbleMaps
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "riskAnalysis" && (
                  <div>
                    <div className="flex items-center mb-6">
                      <h2 className="text-xl font-semibold mr-2">
                        Risk Analysis
                      </h2>
                      <div className="flex items-center text-sm text-[#666] dark:text-[#bbb]">
                        Powered by
                        <Image
                          src="https://world.webacy.com/content/images/2021/10/color_logo_1.png"
                          alt="Webacy"
                          width={60}
                          height={20}
                          className="ml-2 mr-2"
                        />
                        <Image
                          src="/rugcheck.png"
                          alt="RugCheck"
                          width={60}
                          height={20}
                          className="ml-2"
                        />
                      </div>
                    </div>

                    {/* Webacy Profile Analysis */}
                    <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">
                          Webacy Quick Profile
                        </h3>
                        <div className="flex items-center">
                          <Image
                            src="https://world.webacy.com/content/images/2021/10/color_logo_1.png"
                            alt="Webacy"
                            width={60}
                            height={20}
                            className="mr-2"
                          />
                        </div>
                      </div>

                      {loadingWebacyProfile ? (
                        <div className="animate-pulse flex flex-col items-center py-8">
                          <div className="h-8 w-8 border-2 border-[#6e634a] border-t-transparent rounded-full animate-spin mb-4"></div>
                          <p className="text-[#666] dark:text-[#bbb]">
                            Analyzing transaction risk data...
                          </p>
                        </div>
                      ) : webacyProfile ? (
                        <div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                Overall Risk
                              </p>
                              <div className="flex items-center mt-2">
                                <div
                                  className={`h-4 w-4 rounded-full mr-2 ${
                                    webacyProfile.overallRisk > 70
                                      ? "bg-red-500"
                                      : webacyProfile.overallRisk > 30
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }`}></div>
                                <p className="font-medium">
                                  {webacyProfile.overallRisk > 70
                                    ? "High Risk"
                                    : webacyProfile.overallRisk > 30
                                    ? "Medium Risk"
                                    : "Low Risk"}
                                </p>
                              </div>
                            </div>

                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                Analyzed Transactions
                              </p>
                              <p className="text-xl font-bold mt-1">
                                {webacyProfile.count || 0}
                              </p>
                            </div>

                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                High Risk Issues
                              </p>
                              <p className="text-xl font-bold mt-1">
                                {webacyProfile.high || 0}
                              </p>
                            </div>

                            <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                Medium Risk Issues
                              </p>
                              <p className="text-xl font-bold mt-1">
                                {webacyProfile.medium || 0}
                              </p>
                            </div>
                          </div>

                          {/* Risk Score Bar */}
                          <div className="mb-6">
                            <div className="flex justify-between text-xs text-[#666] dark:text-[#bbb] mb-1">
                              <span>0</span>
                              <span>
                                Risk Score: {webacyProfile.overallRisk}
                              </span>
                              <span>100</span>
                            </div>
                            <div className="w-full bg-[#e0d9c7] dark:bg-[#3a3530] h-3 rounded-full">
                              <div
                                className={`h-3 rounded-full ${
                                  webacyProfile.overallRisk > 70
                                    ? "bg-red-500"
                                    : webacyProfile.overallRisk > 30
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                style={{
                                  width: `${webacyProfile.overallRisk}%`,
                                }}></div>
                            </div>
                          </div>

                          {/* Transaction Issues */}
                          {webacyProfile.issues &&
                          webacyProfile.issues.length > 0 ? (
                            <div className="mt-6">
                              <h4 className="font-medium mb-3">
                                Analyzed Token Transactions
                              </h4>
                              <div className="space-y-4">
                                {webacyProfile.issues.map((issue, idx) => (
                                  <div
                                    key={idx}
                                    className="p-4 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                                    <div className="flex justify-between items-start mb-3">
                                      <div className="flex items-center">
                                        {issue.transaction?.token_risk
                                          ?.token_logo && (
                                          <img
                                            src={
                                              issue.transaction.token_risk
                                                .token_logo
                                            }
                                            alt={
                                              issue.transaction.token_name ||
                                              "Token"
                                            }
                                            className="w-8 h-8 rounded-full mr-3"
                                          />
                                        )}
                                        <div>
                                          <p className="font-medium">
                                            {issue.transaction.token_name ||
                                              issue.transaction.token_symbol ||
                                              issue.transaction.contract_address.substring(
                                                0,
                                                8
                                              ) + "..."}
                                          </p>
                                          <p className="text-xs text-[#666] dark:text-[#bbb]">
                                            {new Date(
                                              issue.transaction.timestamp * 1000
                                            ).toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                      <span
                                        className={`px-2 py-0.5 text-xs rounded-full ${
                                          issue.riskScore === "High Risk"
                                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                            : issue.riskScore === "Medium Risk"
                                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                        }`}>
                                        {issue.riskScore}
                                      </span>
                                    </div>

                                    {/* Transaction Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                                      <div className="flex justify-between">
                                        <span className="text-[#666] dark:text-[#bbb]">
                                          Direction:
                                        </span>
                                        <span className="font-medium capitalize">
                                          {issue.transaction.direction}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-[#666] dark:text-[#bbb]">
                                          Contract:
                                        </span>
                                        <Link
                                          href={`https://solscan.io/account/${issue.transaction.contract_address}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[#6e634a] hover:underline">
                                          {issue.transaction.contract_address.substring(
                                            0,
                                            6
                                          )}
                                          ...
                                          {issue.transaction.contract_address.substring(
                                            issue.transaction.contract_address
                                              .length - 4
                                          )}
                                        </Link>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-[#666] dark:text-[#bbb]">
                                          {issue.transaction.direction ===
                                          "incoming"
                                            ? "From"
                                            : "To"}
                                          :
                                        </span>
                                        <Link
                                          href={`https://solscan.io/account/${issue.transaction.from_to_address}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[#6e634a] hover:underline">
                                          {issue.transaction.from_to_address.substring(
                                            0,
                                            6
                                          )}
                                          ...
                                          {issue.transaction.from_to_address.substring(
                                            issue.transaction.from_to_address
                                              .length - 4
                                          )}
                                        </Link>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-[#666] dark:text-[#bbb]">
                                          Transaction:
                                        </span>
                                        <Link
                                          href={`https://solscan.io/tx/${issue.transaction.transaction_hash}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[#6e634a] hover:underline">
                                          View
                                        </Link>
                                      </div>
                                    </div>

                                    {/* Risk Tags */}
                                    {issue.tags && issue.tags.length > 0 && (
                                      <div className="mt-3">
                                        <p className="text-xs font-medium text-[#666] dark:text-[#bbb] mb-2">
                                          Risk Factors:
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {issue.tags.map((tag, tagIdx) => (
                                            <div
                                              key={tagIdx}
                                              className="group relative">
                                              <span
                                                className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                                  tag.severity > 0.7
                                                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                                    : tag.severity > 0.3
                                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                }`}>
                                                {tag.name}
                                              </span>
                                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10 w-64">
                                                <div className="bg-white dark:bg-[#2a251e] text-xs rounded py-2 px-3 shadow-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                                                  <p className="font-medium mb-1">
                                                    {tag.name}
                                                  </p>
                                                  <p className="text-[#666] dark:text-[#bbb]">
                                                    {tag.description}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                              <svg
                                className="w-5 h-5 text-green-500 mr-2"
                                fill="currentColor"
                                viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <p className="text-sm text-green-800 dark:text-green-200">
                                No risk issues detected in token transactions
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-[#f5f2ea] dark:bg-[#1a1814] rounded-lg">
                          <p className="text-[#666] dark:text-[#bbb] text-center">
                            Unable to load Webacy profile data
                          </p>
                        </div>
                      )}
                    </div>

                    {/* New section for token risk analysis */}
                    <h3 className="text-lg font-medium mb-4">
                      Token Risk Analysis
                    </h3>

                    {loadingTokenRiskData ? (
                      <div className="flex justify-center py-8">
                        <div className="w-8 h-8 border-2 border-[#6e634a] border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : heliusData?.tokens &&
                      Object.keys(tokenRiskDataWebacy).length > 0 ? (
                      <div>
                        <p className="text-sm text-[#666] dark:text-[#bbb] mb-4">
                          Detailed risk analysis for each token in your wallet.
                          Click on a token to view detailed risk factors.
                        </p>

                        {/* Display high-risk tokens first */}
                        {heliusData.tokens
                          .filter(
                            (token) =>
                              token.amount > 0 &&
                              tokenRiskDataWebacy[token.mint] &&
                              tokenRiskDataWebacy[token.mint].overallRisk > 70
                          )
                          .map((token, idx) => (
                            <TokenRiskCard
                              key={idx}
                              token={token}
                              tokenMetadata={tokenMetadataCache[token.mint]}
                              riskData={tokenRiskDataWebacy[token.mint]}
                            />
                          ))}

                        {/* Then medium-risk tokens */}
                        {heliusData.tokens
                          .filter(
                            (token) =>
                              token.amount > 0 &&
                              tokenRiskDataWebacy[token.mint] &&
                              tokenRiskDataWebacy[token.mint].overallRisk <=
                                70 &&
                              tokenRiskDataWebacy[token.mint].overallRisk > 30
                          )
                          .map((token, idx) => (
                            <TokenRiskCard
                              key={idx}
                              token={token}
                              tokenMetadata={tokenMetadataCache[token.mint]}
                              riskData={tokenRiskDataWebacy[token.mint]}
                            />
                          ))}

                        {/* Then low-risk tokens */}
                        {heliusData.tokens
                          .filter(
                            (token) =>
                              token.amount > 0 &&
                              tokenRiskDataWebacy[token.mint] &&
                              tokenRiskDataWebacy[token.mint].overallRisk <= 30
                          )
                          .map((token, idx) => (
                            <TokenRiskCard
                              key={idx}
                              token={token}
                              tokenMetadata={tokenMetadataCache[token.mint]}
                              riskData={tokenRiskDataWebacy[token.mint]}
                            />
                          ))}

                        {/* Tokens without risk data */}
                        {heliusData.tokens.filter(
                          (token) =>
                            token.amount > 0 && !tokenRiskDataWebacy[token.mint]
                        ).length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">
                              Tokens Without Risk Data
                            </h4>
                            <div className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] p-4">
                              <p className="text-sm text-[#666] dark:text-[#bbb]">
                                {
                                  heliusData.tokens.filter(
                                    (token) =>
                                      token.amount > 0 &&
                                      !tokenRiskDataWebacy[token.mint]
                                  ).length
                                }{" "}
                                token(s) have no available risk data.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] p-6 text-center">
                        <p className="text-[#666] dark:text-[#bbb]">
                          No token risk data available
                        </p>
                      </div>
                    )}

                    {/* NFT Risk Analysis (if NFTs exist) */}
                    {hasNFTs(
                      solscanData?.items || solscanData.assets?.items || []
                    ) && (
                      <div className="mb-8">
                        <h3 className="text-lg font-medium mb-4">
                          NFT Holdings
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {getNFTs(
                            solscanData?.items ||
                              solscanData.assets?.items ||
                              []
                          ).map((nft, idx) => (
                            <div
                              key={idx}
                              className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] overflow-hidden relative">
                              {/* Add NFT Risk Badge if data is available */}
                              {nftRiskDataWebacy[nft.id || nft.mint] && (
                                <NftRiskCard
                                  nft={nft}
                                  riskData={
                                    nftRiskDataWebacy[nft.id || nft.mint]
                                  }
                                />
                              )}

                              {nft.content?.links?.image && (
                                <div className="w-full h-48 overflow-hidden">
                                  <img
                                    src={nft.content.links.image}
                                    alt={nft.content?.metadata?.name || "NFT"}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="p-4">
                                <h4 className="font-medium text-sm mb-1 truncate">
                                  {nft.content?.metadata?.name ||
                                    nft.id.substring(0, 8) + "..."}
                                </h4>

                                {nft.content?.metadata?.description && (
                                  <p className="text-xs text-[#666] dark:text-[#bbb] mb-2 line-clamp-2">
                                    {nft.content.metadata.description}
                                  </p>
                                )}

                                {nft.content?.metadata?.attributes &&
                                  nft.content.metadata.attributes.length >
                                    0 && (
                                    <div className="mt-2">
                                      <p className="text-xs font-medium text-[#666] dark:text-[#bbb] mb-1">
                                        Attributes:
                                      </p>
                                      <div className="flex flex-wrap gap-1">
                                        {nft.content.metadata.attributes
                                          .slice(0, 3)
                                          .map((attr, i) => (
                                            <span
                                              key={i}
                                              className="text-xs bg-[#e0d9c7] dark:bg-[#3a3530] px-2 py-0.5 rounded">
                                              {attr.trait_type}: {attr.value}
                                            </span>
                                          ))}
                                        {nft.content.metadata.attributes
                                          .length > 3 && (
                                          <span className="text-xs text-[#666] dark:text-[#bbb]">
                                            +
                                            {nft.content.metadata.attributes
                                              .length - 3}{" "}
                                            more
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                <div className="mt-3 pt-2 border-t border-[#e0d9c7] dark:border-[#3a3530]">
                                  <Link
                                    href={`https://solscan.io/token/${nft.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer">
                                    <button className="w-full text-center text-xs text-[#6e634a] hover:underline">
                                      View on Solscan
                                    </button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === "solscan" && (
                  <div>
                    <div className="flex items-center mb-6">
                      <h2 className="text-xl font-semibold mr-2">
                        Asset Analysis
                      </h2>
                      <div className="flex items-center text-sm text-[#666] dark:text-[#bbb]">
                        Powered by
                        <Image
                          src="https://images.ctfassets.net/23fkqdsgbpuj/1t0njrGaxERm0tVkwo3sNF/cee88331e9ec6f9c2351cdec444ba7e1/1666227862821.png"
                          alt="Helius"
                          width={80}
                          height={24}
                          className="ml-2"
                        />
                      </div>
                    </div>

                    {solscanData ? (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                          <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                            <h4 className="font-medium mb-3">
                              Total External Assets
                            </h4>
                            <p className="text-xl font-bold">
                              {solscanData.total ||
                                solscanData.assets?.total ||
                                0}
                            </p>
                          </div>

                          <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                            <h4 className="font-medium mb-3">
                              External Portfolio Value
                            </h4>
                            <p className="text-xl font-bold">
                              $
                              {calculateTokensValue(
                                solscanData?.items ||
                                  solscanData.assets?.items ||
                                  []
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* NFT Section */}
                        {hasNFTs(
                          solscanData?.items || solscanData.assets?.items || []
                        ) && (
                          <div className="mb-8">
                            <h3 className="text-lg font-medium mb-4">
                              NFT Holdings
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {getNFTs(
                                solscanData?.items ||
                                  solscanData.assets?.items ||
                                  []
                              ).map((nft, idx) => (
                                <div
                                  key={idx}
                                  className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] overflow-hidden">
                                  {nft.content?.links?.image && (
                                    <div className="w-full h-48 overflow-hidden">
                                      <img
                                        src={nft.content.links.image}
                                        alt={
                                          nft.content?.metadata?.name || "NFT"
                                        }
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  <div className="p-4">
                                    <h4 className="font-medium text-sm mb-1 truncate">
                                      {nft.content?.metadata?.name ||
                                        nft.id.substring(0, 8) + "..."}
                                    </h4>

                                    {nft.content?.metadata?.description && (
                                      <p className="text-xs text-[#666] dark:text-[#bbb] mb-2 line-clamp-2">
                                        {nft.content.metadata.description}
                                      </p>
                                    )}

                                    {nft.content?.metadata?.attributes &&
                                      nft.content.metadata.attributes.length >
                                        0 && (
                                        <div className="mt-2">
                                          <p className="text-xs font-medium text-[#666] dark:text-[#bbb] mb-1">
                                            Attributes:
                                          </p>
                                          <div className="flex flex-wrap gap-1">
                                            {nft.content.metadata.attributes
                                              .slice(0, 3)
                                              .map((attr, i) => (
                                                <span
                                                  key={i}
                                                  className="text-xs bg-[#e0d9c7] dark:bg-[#3a3530] px-2 py-0.5 rounded">
                                                  {attr.trait_type}:{" "}
                                                  {attr.value}
                                                </span>
                                              ))}
                                            {nft.content.metadata.attributes
                                              .length > 3 && (
                                              <span className="text-xs text-[#666] dark:text-[#bbb]">
                                                +
                                                {nft.content.metadata.attributes
                                                  .length - 3}{" "}
                                                more
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                    <div className="mt-3 pt-2 border-t border-[#e0d9c7] dark:border-[#3a3530]">
                                      <Link
                                        href={`https://solscan.io/token/${nft.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer">
                                        <button className="w-full text-center text-xs text-[#6e634a] hover:underline">
                                          View on Solscan
                                        </button>
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-center mt-8">
                          <Link
                            href={`https://solscan.io/account/${walletAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-[#6e634a] hover:underline text-sm">
                            <img
                              src="https://avatars.githubusercontent.com/u/92743431?s=280&v=4"
                              alt="Solscan"
                              className="w-4 h-4 mr-1.5"
                            />
                            View
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[#666] dark:text-[#bbb]">
                        Unable to load asset data
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
