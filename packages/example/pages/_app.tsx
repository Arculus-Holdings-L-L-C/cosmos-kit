/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable unused-imports/no-unused-imports */
import "bootstrap/dist/css/bootstrap.min.css";
import "../style/global.css";
import "@interchain-ui/react/styles";

import { Chain } from "@chain-registry/types";
import { Decimal } from "@cosmjs/math";
import { GasPrice } from "@cosmjs/stargate";
import { wallets as coin98Wallets } from "@cosmos-kit/coin98";
import { ChainName } from "@cosmos-kit/core";
import { MainWalletBase } from "@cosmos-kit/core";
import { wallets as keplrWallets } from "@cosmos-kit/keplr";
import { wallets as arculusWallets } from "@cosmos-kit/arculus";
import { wallets as leapWallets } from "@cosmos-kit/leap";
import { wallets as owalletWallets } from "@cosmos-kit/owallet";
import { ChainProvider } from "@cosmos-kit/react";
import { wallets as stationWallets } from "@cosmos-kit/station";
import { wallets as ctrlWallets } from "@cosmos-kit/ctrl";
import { useTheme } from "@interchain-ui/react";
import { assets, chains } from "chain-registry";
import type { AppProps } from "next/app";
import React from "react";

import { RootLayout } from "../components/layout";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <RootLayout>
      <ChainProvider
        chains={["cosmoshub", "secretnetwork"]}
        assetLists={[]}
        wallets={[
          ...owalletWallets,
          ...keplrWallets,
          ...arculusWallets,
          ...leapWallets,
          ...stationWallets,
        ]}
        throwErrors={false}
        subscribeConnectEvents={true}
        walletConnectOptions={{
          signClient: {
            projectId: "d5235b42fc7273823b6dc3214c822da3",
            metadata: {
              name: "Cosmos Kit Example",
              description: "Cosmos Kit Example App",
              url: "https://cosmoskit.com",
              icons: ["https://raw.githubusercontent.com/cosmology-tech/cosmos-kit/main/packages/example/public/favicon-32x32.png"],
            },
            relayUrl: "wss://relay.walletconnect.com",
          },
        }}
      >
        <Component {...pageProps} />
      </ChainProvider>
    </RootLayout>
  );
}

export default MyApp;
