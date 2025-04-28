import { NextResponse } from 'next/server';

export async function GET() {
  console.log("📥 Token Metadata API route called");

  try {
    // Step 1: Get the complete list of coins with platform addresses
    console.log("🌐 Fetching coin list from CoinGecko API");
    const listResponse = await fetch(
      "https://api.coingecko.com/api/v3/coins/list?include_platform=true"
    );

    if (!listResponse.ok) {
      const error = `CoinGecko API responded with status: ${listResponse.status}`;
      console.error("❌", error);
      throw new Error(error);
    }

    const coinList = await listResponse.json();
    console.log(`✅ Retrieved ${coinList.length} coins from CoinGecko`);

    // Filter for tokens with Solana platform addresses
    const solanaTokens = coinList.filter(
      (token) => token.platforms && token.platforms.solana
    );
    console.log(`📋 Found ${solanaTokens.length} tokens with Solana addresses`);

    if (solanaTokens.length === 0) {
      console.log("⚠️ No Solana tokens found, returning empty object");
      return NextResponse.json({ tokens: {} });
    }

    // Step 2: Fetch market data for Solana ecosystem tokens (up to page 5)
    console.log("🔄 Fetching market data for Solana ecosystem tokens (pages 1-5)");
    
    const allMarketData = [];
    const pagesToFetch = 1;
    
    // Fetch market data from multiple pages in parallel
    const fetchPromises = [];
    for (let page = 1; page <= pagesToFetch; page++) {
      console.log(`🌐 Fetching market data page ${page}`);
      fetchPromises.push(
        fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&per_page=250&page=${page}&locale=en`
        )
      );
    }
    
    // Wait for all fetch requests to complete
    const responses = await Promise.all(fetchPromises);
    
    // Process all responses
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (!response.ok) {
        const error = `CoinGecko market data API responded with status: ${response.status} for page ${i+1}`;
        console.error("❌", error);
        throw new Error(error);
      }
      
      const pageData = await response.json();
      console.log(`✅ Page ${i+1}: Retrieved ${pageData.length} tokens with market data`);
      allMarketData.push(...pageData);
    }
    
    console.log(`🔢 Total market data entries: ${allMarketData.length}`);

    // Create the mapping from token contract address to market data
    const metadataMap = {};

    // For each token with market data, find its Solana address and map it
    allMarketData.forEach((tokenData) => {
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

    console.log(`📝 Created metadata mapping for ${Object.keys(metadataMap).length} Solana tokens`);
    console.log("📤 Returning token metadata");

    return NextResponse.json({ tokens: metadataMap });
  } catch (error) {
    console.error('❌ Error fetching token metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch token metadata' },
      { status: 500 }
    );
  }
}