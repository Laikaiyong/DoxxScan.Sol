import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const chain = searchParams.get("chain") || "sol";
    
    if (!address) {
      return NextResponse.json(
        { error: "Token address is required" },
        { status: 400 }
      );
    }
    
    const API_KEY = process.env.NEXT_PUBLIC_WEBACY_API_KEY;
    
    if (!API_KEY) {
      return NextResponse.json(
        { error: "Webacy API key not configured" },
        { status: 500 }
      );
    }
    
    const response = await fetch(
      `https://api.webacy.com/addresses/${address}?chain=${chain}&show_low_risk=true`,
      {
        method: "GET",
        headers: {
          "accept": "application/json",
          "x-api-key": API_KEY,
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Webacy API error: ${response.status} - ${errorText}`);
      
      return NextResponse.json(
        { 
          error: "Failed to fetch token risk data", 
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Error in token-risk API route:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}