import { NextResponse } from 'next/server';

export async function GET() {
  console.log("📥 Solana Price API route called");
  
  try {
    // Prepare headers with API key
    const headers = {
      'accept': 'application/json'
    };
    
    // Add API key to headers if available
    if (process.env.NEXT_PUBLIC_CG_API_KEY) {
      console.log("🔑 Using CoinGecko API key");
      headers['x-cg-pro-api-key'] = process.env.NEXT_PUBLIC_CG_API_KEY;
    } else {
      console.log("⚠️ No CoinGecko API key found in environment variables");
    }

    console.log("🌐 Fetching Solana price from CoinGecko API");
    const response = await fetch(
      "https://api.coingecko.com/api/v3/coins/solana",
      { headers }
    );

    if (!response.ok) {
      const error = `CoinGecko API responded with status: ${response.status}`;
      console.error("❌", error);
      throw new Error(error);
    }

    const data = await response.json();
    
    if (!data.market_data || !data.market_data.current_price) {
      console.error("❌ Invalid response structure from CoinGecko API");
      throw new Error('Invalid response from CoinGecko API');
    }

    console.log(`✅ Received Solana price: $${data.market_data.current_price.usd}`);
    
    return NextResponse.json({
      price: data.market_data.current_price.usd,
      last_updated: data.market_data.last_updated,
      price_change_24h_percentage: data.market_data.price_change_percentage_24h
    });
  } catch (error) {
    console.error('❌ Error fetching Solana price:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Solana price' },
      { status: 500 }
    );
  }
}