import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const limit = searchParams.get('limit') || 50;

  if (!address) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {
    // Call Helius RPC API to search assets
    const response = await fetch(
      "https://mainnet.helius-rpc.com/?api-key=" + process.env.NEXT_PUBLIC_HELIUS_API_KEY,
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
            limit: parseInt(limit),
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Helius SearchAssets API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data.result || data);
  } catch (error) {
    console.error('Error fetching wallet assets:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wallet assets' },
      { status: 500 }
    );
  }
}