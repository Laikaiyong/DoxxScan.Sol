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
    // Call Webacy API with server-side API key
    const response = await fetch(
      `https://api.webacy.com/addresses/${address}?chain=sol&show_low_risk=true`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_WEBACY_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Webacy API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching Webacy risk data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Webacy risk data' },
      { status: 500 }
    );
  }
}