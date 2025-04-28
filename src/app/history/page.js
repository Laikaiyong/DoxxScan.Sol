'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { UserButton, useUser } from "@civic/auth-web3/react";
import Navbar from "@/components/navbar";

export default function ScanHistory() {
  const router = useRouter();
  const { user, isAuthenticated } = useUser();
  
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // When not authenticated, redirect to home
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Fetch scan history from MongoDB for the authenticated user
  useEffect(() => {
    const fetchHistory = async () => {
      if (!isAuthenticated || !user) return;
      
      try {
        setIsLoading(true);
        
        const response = await fetch('/api/get-reports', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch scan history');
        }
        
        const data = await response.json();
        setReports(data.reports);
      } catch (err) {
        console.error('Error fetching scan history:', err);
        setError('Failed to load your scan history. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistory();
  }, [isAuthenticated, user]);

  // Delete report function
  const handleDeleteReport = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report?')) return;
    
    try {
      const response = await fetch(`/api/delete-report?id=${reportId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete report');
      }
      
      // Remove the deleted report from state
      setReports(reports.filter(report => report._id !== reportId));
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report. Please try again.');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return `${date.toLocaleDateString()} (${formatDistanceToNow(date, { addSuffix: true })})`;
    } catch {
      return 'Unknown date';
    }
  };

  // Get risk color based on score
  const getRiskColor = (score) => {
    if (score > 70) return 'text-red-600';
    if (score > 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f5f2ea] dark:bg-[#1a1814] text-[#333] dark:text-[#f5f2ea]">
        <div className="max-w-7xl mx-auto px-6 py-12 flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">Please log in to view your scan history</h2>
            <p className="mb-6 text-[#666] dark:text-[#bbb]">
              You need to be logged in to access your saved wallet scans.
            </p>
            <Link href="/">
              <button className="px-6 py-3 rounded-lg bg-[#6e634a] text-white hover:bg-[#5d5340] transition-colors font-medium">
                Return to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f2ea] dark:bg-[#1a1814] text-[#333] dark:text-[#f5f2ea]">
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Scan History</h1>
            <p className="text-[#666] dark:text-[#bbb]">
              Review and manage your previous wallet analysis reports
            </p>
          </div>
          
          <Link href="/">
            <button className="mt-4 md:mt-0 px-4 py-2 bg-[#6e634a] text-white rounded-lg hover:bg-[#5d5340] transition-colors">
              New Scan
            </button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-10 h-10 border-4 border-[#e0d9c7] border-t-[#6e634a] rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white dark:bg-[#2a251e] p-8 rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] text-center">
            <p className="text-lg mb-4">You don't have any saved scans yet.</p>
            <p className="text-[#666] dark:text-[#bbb] mb-6">
              When you scan a wallet, you can save the report to view it later.
            </p>
            <Link href="/">
              <button className="px-6 py-3 rounded-lg bg-[#6e634a] text-white hover:bg-[#5d5340] transition-colors font-medium">
                Scan a Wallet
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {reports.map((report) => (
              <div key={report._id} className="bg-white dark:bg-[#2a251e] rounded-lg border border-[#e0d9c7] dark:border-[#3a3530] overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                    <div>
                      <h2 className="text-xl font-semibold mb-1 break-all">
                        {report.walletAddress}
                      </h2>
                      <p className="text-sm text-[#666] dark:text-[#bbb]">
                        Scanned {formatDate(report.savedAt || report.timestamp)}
                      </p>
                    </div>
                    
                    <div className="mt-4 md:mt-0 flex items-center space-x-3">
                      <div className="flex items-center">
                        <span className="text-sm text-[#666] dark:text-[#bbb] mr-2">Risk Score:</span>
                        <span className={`font-bold ${getRiskColor(report.riskScore)}`}>
                          {report.riskScore}/100
                        </span>
                      </div>
                      
                      <span className="text-[#666] dark:text-[#bbb]">|</span>
                      
                      <div>
                        <span className="text-sm text-[#666] dark:text-[#bbb] mr-2">Value:</span>
                        <span className="font-medium">${report.portfolioValue?.toLocaleString() || "0"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {report.tokenCount && (
                      <div className="bg-[#e0d9c7] dark:bg-[#3a3530] px-3 py-1 rounded text-sm">
                        {report.tokenCount} tokens
                      </div>
                    )}
                    
                    {report.highRiskTokens > 0 && (
                      <div className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-3 py-1 rounded text-sm">
                        {report.highRiskTokens} high-risk tokens
                      </div>
                    )}
                    
                    {report.transactionCount && (
                      <div className="bg-[#e0d9c7] dark:bg-[#3a3530] px-3 py-1 rounded text-sm">
                        {report.transactionCount} transactions
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Link href={`/address/${report.walletAddress}`}>
                      <button className="px-4 py-2 bg-[#6e634a] text-white rounded-lg hover:bg-[#5d5340] transition-colors">
                        View Report
                      </button>
                    </Link>
                    
                    <button 
                      onClick={() => handleDeleteReport(report._id)}
                      className="px-4 py-2 text-red-600 hover:text-red-800 dark:hover:text-red-400 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}