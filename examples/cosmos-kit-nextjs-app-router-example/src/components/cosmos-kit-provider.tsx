"use client";

import "@interchain-ui/react/styles";
import { ChainProvider } from "@cosmos-kit/react";
import { chains, assets } from "chain-registry";
import { wallets as arculusWallets } from "@cosmos-kit/arculus-mobile";
import { wallets as leapMobileWallets } from "@cosmos-kit/leap-mobile";
import { wallets as keplrMobileWallets } from "@cosmos-kit/keplr-mobile";
import { wallets as trustMobileWallets } from "@cosmos-kit/trust-mobile";
import { MainWalletBase } from "@cosmos-kit/core";

// Define WalletConnect Options using Arculus projectId
const walletConnectOptions = {
  signClient: {
    // Use the projectId from ArculusMobileInfo
    projectId: 'd5235b42fc7273823b6dc3214c822da3',
    relayUrl: 'wss://relay.walletconnect.com',
    metadata: {
      name: 'CosmosKit Example',
      description: 'CosmosKit App Router Example',
      url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000/',
      icons: ['https://your-app-icon-url.png'], // Replace with actual icon URL if available
    },
    autoConnect: false
  },
};

// Combine wallet arrays
const combinedWallets = [...arculusWallets, ...leapMobileWallets, ...keplrMobileWallets, ...trustMobileWallets] as unknown as MainWalletBase[];

export function CosmosKitProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChainProvider
      chains={chains}
      assetLists={assets}
      wallets={combinedWallets}
      logLevel={"DEBUG"}
      throwErrors={false}
      modalOptions={{
        mobile: { displayQRCodeEveryTime: true }
      }}
      walletConnectOptions={
        walletConnectOptions
      }
    >
      {children}
    </ChainProvider >
  );
}
