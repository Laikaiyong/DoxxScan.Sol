# 🕵️ DoxxScan.sol

PDF Format Over Here: https://drive.google.com/file/d/17nKB9I6APuURQPmvLl4ajlNr5c2XbYnr/view?usp=sharing (With Pictures)

## 🧠 Problem Statement: *"Are you doxxed? How sure are you?"*

In the world of Web3, transparency is both power and vulnerability.

Your wallet may be pseudonymous—but not anonymous. From a public blockchain, anyone can extract your:
- **Total portfolio value**
- **NFT assets**
- **.sol domain names**
- **Transaction patterns and relationships**
- **Token approvals and malicious airdrops**

What does that mean? You're more exposed than you think. If your wallet appears wealthy or interacts with malicious tokens, you could be flagged, targeted, or exploited.

**DoxxScan.sol** helps you surface your **on-chain footprint**, understand your **wallet risk**, and visualize what attackers and on-chain investigators can already see about you.

---

## 🛠️ Our Detective Toolkit

To make the invisible visible, we assembled a powerful suite of APIs:

| Tool         | Purpose                                                                 |
|--------------|-------------------------------------------------------------------------|
| 🔍 **Helius**     | Used for wallet inspection, NFT/asset portfolio analysis. Replaced SolScan due to API limitations. |
| 💰 **CoinGecko**  | Token price aggregation and metadata.                              |
| 🛡️ **DD by Webacy** | Comprehensive wallet risk scoring, sanctions checks, and threat insights. |
| ⚠️ **RugCheck**   | Token risk analysis based on on-chain behavior and deployer patterns. |
| 🧩 **Bubblemaps**  | Relationship analysis and wallet clustering via token holder maps. |
| 🔐 **Civic Auth**  | Sign-in method that allows users to save reports securely.         |

---

## 🔐 Sign In with Civic

Users sign in using **Civic Auth** to:
- Save and download detailed wallet reports
- View historical risk assessments
- Create a privacy profile


---

## 🔍 Search: Wallet or Domain

DoxxScan lets users input either:
- A **Solana wallet address**
- A **.sol domain name**

Once entered, the tool performs a series of scans pulling insights from all integrated data sources.


---

## 💼 Wallet Overview

Get a high-level summary of your wallet:

### 📊 Portfolio Summary
- Valuation via **CoinGecko** token prices
- Token quantities and holdings breakdown

### ⚠️ Smart Risk Profile
Powered by **DD by Webacy**:
- Wallet risk level (low, medium, high)
- Sanctions status
- First and total transaction count
- General risk exposure metrics


---

## 🧪 Token Risk Analysis

Each token is scanned via **RugCheck** and flagged as:
- ✅ Low Risk
- 🟡 Medium Risk
- ❌ High Risk

Insight into:
- Deployer behavior
- Liquidity pool locks
- Honeypot/transfer blockers


---

## 📈 Portfolio Details

For each token held:
- Name, price, and symbol
- Risk level via RugCheck
- Top holders (via Bubblemaps + Helius)
- Liquidity pool health


---

## 🧬 Relationship Analysis

Using **Bubblemaps**, users can inspect:
- Token holder distribution
- Wallet clustering
- Centralization risks

This helps you understand if you're holding tokens that are:
- Mostly held by insiders
- At risk of price manipulation


---

## 🔐 Webacy Risk Analysis

We use Webacy for a deep-dive into wallet behavior:

### 📥 Incoming / Outgoing Patterns
- Summary of transaction history
- Volume of inflows vs outflows

### 🧾 Token Exposure
- Which assets are high, medium, or low risk
- Token approvals linked to risky contracts

### 🧨 Threat Flags
- Sanctions watchlist status
- Suspicious approval risks

> _📷 Insert screenshot: Webacy risk heatmap_

---

## 🖼️ NFT Assets

Powered by **Helius**, users can:
- View all NFTs held
- See collection names, mint addresses, and previews
- Identify spam NFT drops


---

## 📄 Save and Export Reports

Once signed in with **Civic**, users can:
- Export full wallet risk reports in PDF format
- Bookmark and track previously searched addresses
- Use reports for internal audit, DAO transparency, or community trust


---

## 🔧 Technical Implementation

Here’s a breakdown of the key API endpoints and how we use them:

### 🛡️ Webacy APIs
- `GET /addresses/{walletAddress}`  
  → Returns detailed threat considerations (e.g., flagged behavior)

- `GET /quick-profile/{walletAddress}`  
  → Generates wallet risk level and summary insights

- `GET /addresses/sanctioned/{walletAddress}`  
  → Checks if wallet is on any sanctions watchlist

- `GET /addresses/{walletAddress}/approvals`  
  → Shows which tokens/contracts the user has granted spending access to, with risk scores

- `GET /addresses/${address}?chain=${chain}&show_low_risk=true`  
  → Full token risk report including low-risk tokens

### ⚠️ RugCheck APIs
- `GET /domains/lookup/{id}`  
  → Resolves a .sol domain to its wallet address

- `GET /tokens/{token}/report/summary`  
  → Returns token summary (risk grade, LP, deployer risk)

- `GET /tokens/{token}/report`  
  → Full deep-dive report for token risk

### 🔍 Helius APIs
- `GET /v0/addresses/{address}/transactions`  
  → Parsed transaction history from the Solana blockchain

- `POST /v0/addresses/searchAssets`  
  → Queries token and NFT holdings in a wallet

### 💰 CoinGecko APIs
- Token prices and icons used in asset tables and graphs

### 🧩 Bubblemaps
- Embedded iframe visualizations based on token address
- Shows wallet relationships, decentralization, and top holders

---

## 📉 Your On-Chain Footprint

With all this data, your on-chain fingerprint reveals:
- **What assets you own**
- **Who you've transacted with**
- **If your tokens are centralized or risky**
- **How “doxxed” or exposed you are as a target**

The more you know, the more you can protect your wallet and your reputation.

---

## 🎯 Use Cases

- Research before accepting token airdrops or collaborations
- Self-audits for influencers, DAO multisigs, and fund managers
- Transparency disclosures for grant-funded projects
- Clean up spam tokens and revoke malicious approvals

---

## 🌱 Future Directions

- Real-time alerts for token risk changes
- Privacy scoring models
- Social scoring using wallet influence
- ZK-safe address proof for compliance
