"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { UserButton, useUser } from "@civic/auth-web3/react"; // Changed useAuth to useUser
import { useReactToPrint } from "react-to-print";
import TokenMarketDataExpander from "@/components/tokenMarketDataExpander";
import { useState, useEffect, useRef, Fragment } from "react";
import { Transition } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

export default function AddressPage() {
  const params = useParams();
  const router = useRouter();
  const walletAddress = params.id;
  const wallet = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [tokenMetadataCache, setTokenMetadataCache] = useState({});
  const [expandedTransaction, setExpandedTransaction] = useState(null);

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
        `https://api.solana.fm/v0/domains/${address}/reverse`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch domain data");
      const data = await response.json();
      return data.result || [];
    } catch (err) {
      console.error("Error fetching domain data:", err);
      return [];
    }
  };

  // Update the fetchAllData function to include domain fetching
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
          fetchDomainData(walletAddress), // Add this line
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
          setDomainData(fetchResults[8].value); // Add this line

        // Fetch transaction data separately to avoid too many concurrent requests
        await fetchTransaction(walletAddress);

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
    // Replace with actual Helius API call
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
    );
    if (!response.ok) throw new Error("Failed to fetch Helius data");
    return await response.json();
  };

  const fetchTokenMetadata = async () => {
    try {
      // Step 1: Get the complete list of coins with platform addresses
      const listResponse = await fetch(
        "https://api.coingecko.com/api/v3/coins/list?include_platform=true"
      );

      if (!listResponse.ok)
        throw new Error("Failed to fetch CoinGecko coin list");
      const coinList = await listResponse.json();

      // Filter for tokens with Solana platform addresses
      const solanaTokens = coinList.filter(
        (token) => token.platforms && token.platforms.solana
      );

      console.log(`Found ${solanaTokens.length} tokens on Solana blockchain`);

      if (solanaTokens.length === 0) {
        console.log("No Solana tokens found in CoinGecko list");
        return;
      }

      // Get IDs for tokens we want market data for - limit to 100 to avoid rate limiting
      const tokenIds = solanaTokens.map((token) => token.id).join(",");

      // Step 2: Fetch market data for the identified tokens
      const marketDataResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&per_page=3907&page=1&locale=en`
      );

      if (!marketDataResponse.ok)
        throw new Error("Failed to fetch CoinGecko market data");
      const marketData = await marketDataResponse.json();

      console.log(`Fetched market data for ${marketData.length} tokens`);

      // Create the mapping from token contract address to market data
      const metadataMap = {};

      // For each token with market data, find its Solana address and map it
      marketData.forEach((tokenData) => {
        const tokenInfo = solanaTokens.find((t) => t.id === tokenData.id);
        if (tokenInfo && tokenInfo.platforms.solana) {
          const solanaAddress = tokenInfo.platforms.solana;
          metadataMap[solanaAddress] = {
            id: tokenData.id,
            name: tokenData.name,
            symbol: tokenData.symbol,
            image: tokenData.image,
            current_price: tokenData.current_price,
            price_change_percentage_24h: tokenData.price_change_percentage_24h,
          };
        }
      });

      console.log(
        `Created metadata map for ${Object.keys(metadataMap).length} tokens`
      );

      setTokenMetadataCache(metadataMap);
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
    // Replace with actual Webacy API call
    const response = await fetch(
      `https://api.webacy.com/v1/address/${address}/scan?api-key=${process.env.NEXT_PUBLIC_WEBACY_API_KEY}`
    );
    if (!response.ok) throw new Error("Failed to fetch Webacy data");
    return await response.json();
  };

  const fetchSolscanData = async (address) => {
    // Replace with Helius searchAssets API call
    const response = await fetch(
      "https://mainnet.helius-rpc.com/?api-key=" +
        process.env.NEXT_PUBLIC_HELIUS_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "doxxscan-search",
          method: "searchAssets",
          params: {
            ownerAddress: address,
            tokenType: "all",
            limit: 50,
          },
        }),
      }
    );

    if (!response.ok)
      throw new Error("Failed to fetch Helius searchAssets data");

    const data = await response.json();
    console.log(data);
    return data.result || data; // Handle both result wrapper and direct response
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
      // Using the Helius API to fetch transactions for an address
      const response = await fetch(
        `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}&limit=10`,
        {
          method: "GET",
          headers: {
            Accept: "*/*",
          },
        }
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
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/solana"
      );

      if (!response.ok) throw new Error("Failed to fetch Solana price");
      const data = await response.json();

      if (data && data.market_data && data.market_data.current_price) {
        setSolanaPriceUSD(data.market_data.current_price.usd);
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
                                  {domain.domain}
                                  {domain.isSub && (
                                    <span className="ml-1 text-[#6e634a]">
                                      (subdomain)
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

                    {/* Risk Score Section (Grid API) */}
                    <div className="mb-8">
                      <div className="flex items-center mb-4">
                        <h3 className="text-lg font-medium mr-2">
                          Risk Assessment
                        </h3>
                        <div className="flex items-center text-sm text-[#666] dark:text-[#bbb]">
                          Powered by
                          <Image
                            src="https://world.webacy.com/content/images/2021/10/color_logo_1.png"
                            alt="DD.xyz"
                            width={60}
                            height={20}
                            className="ml-2"
                          />
                        </div>
                      </div>

                      {gridData ? (
                        <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                          <div className="flex items-center justify-between mb-2">
                            <span>Overall Risk Score</span>
                            <span
                              className={`font-bold ${
                                getRiskScore() > 70
                                  ? "text-red-600"
                                  : getRiskScore() > 40
                                  ? "text-yellow-600"
                                  : "text-green-600"
                              }`}>
                              {getRiskScore()}/100
                            </span>
                          </div>
                          <div className="w-full bg-[#e0d9c7] dark:bg-[#3a3530] h-2 rounded-full">
                            <div
                              className={`h-2 rounded-full ${
                                getRiskScore() > 70
                                  ? "bg-red-600"
                                  : getRiskScore() > 40
                                  ? "bg-yellow-600"
                                  : "bg-green-600"
                              }`}
                              style={{ width: `${getRiskScore()}%` }}></div>
                          </div>
                          <p className="text-sm mt-2 text-[#666] dark:text-[#bbb]">
                            {getRiskScore() > 70
                              ? "High risk - significant exposure detected"
                              : getRiskScore() > 40
                              ? "Medium risk - some concerning patterns found"
                              : "Low risk - good security practices observed"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-[#666] dark:text-[#bbb]">
                          Unable to load risk assessment data
                        </p>
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

                      {rugCheckData && rugCheckData.tokens ? (
                        <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                          <div className="space-y-3">
                            {rugCheckData.tokens
                              .slice(0, 5)
                              .map((token, index) => (
                                <div
                                  key={index}
                                  className="flex justify-between items-center">
                                  <div className="flex items-center">
                                    <span className="font-medium">
                                      {token.symbol || token.name}
                                    </span>
                                    {token.riskLevel === "high" && (
                                      <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                                        High Risk
                                      </span>
                                    )}
                                  </div>
                                  <span>
                                    $
                                    {(
                                      token.balance * (token.price || 0)
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              ))}

                            {rugCheckData.tokens.length > 5 && (
                              <p className="text-center text-sm text-[#666] dark:text-[#bbb] mt-2">
                                +{rugCheckData.tokens.length - 5} more tokens
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[#666] dark:text-[#bbb]">
                          Unable to load token risk data
                        </p>
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

                                return (
                                  <tr
                                    key={idx}
                                    className={hasBalance ? "" : "opacity-70"}>
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
                                          {tokenMetadata.current_price > 0 && (
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
                                          {tokenMetadata.current_price > 0 && (
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
                          alt="DD.xyz"
                          width={60}
                          height={20}
                          className="ml-2 mr-2"
                        />
                      </div>
                    </div>

                    {gridData ? (
                      <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] mb-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium">
                            Overall Risk Score
                          </h3>
                          <div
                            className={`text-2xl font-bold ${
                              getRiskScore() > 70
                                ? "text-red-600"
                                : getRiskScore() > 40
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}>
                            {getRiskScore()}/100
                          </div>
                        </div>

                        <div className="w-full bg-[#e0d9c7] dark:bg-[#3a3530] h-4 rounded-full">
                          <div
                            className={`h-4 rounded-full ${
                              getRiskScore() > 70
                                ? "bg-red-600"
                                : getRiskScore() > 40
                                ? "bg-yellow-600"
                                : "bg-green-600"
                            }`}
                            style={{ width: `${getRiskScore()}%` }}></div>
                        </div>

                        <p className="mt-4 text-[#666] dark:text-[#bbb]">
                          This score is calculated based on transaction
                          patterns, token holdings, and interaction with known
                          risky addresses.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[#666] dark:text-[#bbb] mb-6">
                        Unable to load risk score data
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {webacyData && (
                        <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                          <h3 className="text-lg font-medium mb-4">
                            Privacy Analysis
                          </h3>
                          <ul className="space-y-2">
                            {webacyData.privacyIssues?.map((issue, idx) => (
                              <li key={idx} className="flex items-start">
                                <span
                                  className={`bg-${
                                    issue.severity === "high"
                                      ? "red"
                                      : issue.severity === "medium"
                                      ? "yellow"
                                      : "green"
                                  }-100 
                                                text-${
                                                  issue.severity === "high"
                                                    ? "red"
                                                    : issue.severity ===
                                                      "medium"
                                                    ? "yellow"
                                                    : "green"
                                                }-800 
                                                text-xs px-2 py-0.5 rounded-full mr-2 mt-1`}>
                                  {issue.severity === "high"
                                    ? "High"
                                    : issue.severity === "medium"
                                    ? "Medium"
                                    : "Low"}
                                </span>
                                <span>{issue.description}</span>
                              </li>
                            ))}

                            {!webacyData.privacyIssues?.length && (
                              <li className="flex items-start">
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full mr-2 mt-1">
                                  Low
                                </span>
                                <span>
                                  No significant privacy issues detected
                                </span>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      <div className="bg-white dark:bg-[#2a251e] p-6 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530]">
                        <h3 className="text-lg font-medium mb-4">
                          Security Recommendations
                        </h3>
                        <ul className="space-y-2 text-[#666] dark:text-[#bbb]">
                          <li className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-2 text-[#6e634a]"
                              fill="currentColor"
                              viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"></path>
                            </svg>
                            Consider using a hardware wallet
                          </li>
                          <li className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-2 text-[#6e634a]"
                              fill="currentColor"
                              viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"></path>
                            </svg>
                            Create separate wallets for different activities
                          </li>
                          <li className="flex items-center">
                            <svg
                              className="w-4 h-4 mr-2 text-[#6e634a]"
                              fill="currentColor"
                              viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"></path>
                            </svg>
                            Avoid tokens flagged as high risk
                          </li>
                        </ul>
                      </div>
                    </div>
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
