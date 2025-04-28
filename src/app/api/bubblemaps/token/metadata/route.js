import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tokenAddress = searchParams.get('token');

  if (!tokenAddress) {
    return NextResponse.json({ error: 'Token parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api-legacy.bubblemaps.io/map-metadata?chain=sol&token=${tokenAddress}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.BUBBLEMAP_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`BubbleMaps API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}