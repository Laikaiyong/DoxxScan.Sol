import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
    }

    const response = await fetch(
      `https://api.webacy.com/quick-profile/${address}?chain=sol&withApprovals=true`,
      {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'x-api-key': process.env.NEXT_PUBLIC_WEBACY_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Webacy API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in webacy-profile API route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Webacy profile data' },
      { status: 500 }
    );
  }
}