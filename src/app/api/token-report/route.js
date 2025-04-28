import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tokenAddress = searchParams.get('address');

  if (!tokenAddress) {
    return NextResponse.json(
      { error: 'Token address is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.rugcheck.xyz/v1/tokens/${tokenAddress}/report`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.NEXT_PUBLIC_RUGCHECK_API_KEY
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RugCheck API responded with status: ${response.status}, details: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching token report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch token report' },
      { status: 500 }
    );
  }
}