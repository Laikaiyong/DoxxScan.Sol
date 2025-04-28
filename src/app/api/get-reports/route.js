import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { getUser } from "@civic/auth-web3/nextjs";

export async function GET() {
  try {
    // Get authenticated user
    const { user, isAuthenticated } = getUser();
    
    // If user is not authenticated, return error
    if (!isAuthenticated || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db(process.env.MONGODB_DB);
    const reports = db.collection('reports');
    
    // Fetch reports for this user
    const userReports = await reports
      .find({ userId: user.id })
      .sort({ savedAt: -1 })  // Latest first
      .toArray();
    
    // Close MongoDB connection
    await client.close();
    
    // Process reports to add additional info
    const processedReports = userReports.map(report => {
      // Calculate high risk tokens count if available
      let highRiskTokens = 0;
      if (report.rugCheckData && report.rugCheckData.tokens) {
        highRiskTokens = report.rugCheckData.tokens.filter(token => token.riskLevel === 'high').length;
      }
      
      return {
        _id: report._id,
        walletAddress: report.walletAddress,
        timestamp: report.timestamp,
        savedAt: report.savedAt,
        riskScore: report.riskScore || 0,
        portfolioValue: report.portfolioValue || 0,
        tokenCount: report.heliusData?.tokens?.length || 0,
        highRiskTokens,
        transactionCount: report.solscanData?.txCount || 0
      };
    });
    
    return NextResponse.json({ reports: processedReports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}