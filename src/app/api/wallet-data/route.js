import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json(
      { error: 'Wallet address is required' },
      { status: 400 }
    );
  }

  try {
    // Call Helius API to fetch wallet balances
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Helius API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wallet data' },
      { status: 500 }
    );
  }
}