import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Address parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.bubblemap.io/v1/sol/address/${address}/interactions?limit=20`,
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
    console.error('Error fetching wallet bubble map:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}