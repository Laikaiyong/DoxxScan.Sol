import "./globals.css";
import Provider from "./providers";
import Navbar from "@/components/navbar";

export const metadata = {
  title: "DoxxScan - Wallet Risk Analysis",
  description: "Scan your wallet to assess exposure to rugs, scams, and privacy risks",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Provider>
          <Navbar />
          {children}
        </Provider>
      </body>
    </html>
  );
}