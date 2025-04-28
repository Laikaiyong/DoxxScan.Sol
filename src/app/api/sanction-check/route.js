import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get the address from the URL parameters
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Call Webacy API for sanction checks
    const response = await fetch(
      `https://api.webacy.com/addresses/sanctioned/${address}?chain=sol`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_WEBACY_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Webacy API returned ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking sanctions:', error);
    return NextResponse.json(
      { error: 'Failed to check sanctions status', details: error.message },
      { status: 500 }
    );
  }
}