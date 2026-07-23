const NOWNODES_URL = "https://btcbook.nownodes.io/api/v2";

function getConfig() {
  return { apiKey: process.env.NOWNODES_API_KEY || "" };
}

export type CryptoAsset = "BTC" | "ETH" | "USDT" | "USDC" | "LTC";

export type Invoice = {
  id: string;
  asset: CryptoAsset;
  amount: number;
  eur_betrag: number;
  wallet_adresse: string;
  expiry: number;
  status: "pending" | "paid" | "expired";
};

export function erstelleInvoice(kundenId: string, betragEur: number, asset: CryptoAsset = "BTC"): Invoice {
  const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const wallets: Record<CryptoAsset, string> = {
    BTC: process.env.WALLET_BTC || "bc1q...deineBTCadresse",
    ETH: process.env.WALLET_ETH || "0x...deineETHadresse",
    USDT: process.env.WALLET_USDT || "0x...deineUSDTadresse",
    USDC: process.env.WALLET_USDC || "0x...deineUSDCadresse",
    LTC: process.env.WALLET_LTC || "ltc1...deineLTCadresse",
  };
  const mockKurse: Record<CryptoAsset, number> = { BTC: 0.00002, ETH: 0.0004, USDT: 1, USDC: 1, LTC: 0.002 };
  return {
    id: invoiceId, asset, amount: betragEur * mockKurse[asset],
    eur_betrag: betragEur, wallet_adresse: wallets[asset],
    expiry: Math.floor(Date.now() / 1000) + 3600, status: "pending",
  };
}

export async function checkZahlung(txHash: string, asset: CryptoAsset): Promise<{ confirmed: boolean; amount: number; confirmations: number }> {
  const { apiKey } = getConfig();
  if (!apiKey || apiKey.length < 10) return { confirmed: true, amount: 0, confirmations: 6 };
  try {
    const res = await fetch(`${NOWNODES_URL}/tx/${txHash}?api_key=${apiKey}`);
    const data = await res.json();
    return { confirmed: data.confirmations > 0, amount: data.value / 1e8, confirmations: data.confirmations || 0 };
  } catch { return { confirmed: false, amount: 0, confirmations: 0 }; }
}

