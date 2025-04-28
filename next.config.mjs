/** @type {import('next').NextConfig} */

import { createCivicAuthPlugin } from "@civic/auth-web3/nextjs"

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
};

const withCivicAuth = createCivicAuthPlugin({
  clientId: process.env.NEXT_PUBLIC_CIVIC_CLIENT_ID,
});

export default withCivicAuth(nextConfig);
