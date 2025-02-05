import {
  EndpointOptions,
  Wallet,
  WalletConnectOptions,
} from '@cosmos-kit/core';
import { ArculusClient as ExtensionArculusClient } from '@cosmos-kit/arculus-extension';
import { WCWallet } from '@cosmos-kit/walletconnect';
import { Keplr } from '@keplr-wallet/provider-extension';

import { ChainArculusMobile } from './chain-wallet';
import { ArculusClient } from './client';

export class ArculusMobileWallet extends WCWallet {
  constructor(
    walletInfo: Wallet,
    preferredEndpoints?: EndpointOptions['endpoints']
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    super(walletInfo, ChainArculusMobile, ArculusClient);
    this.preferredEndpoints = preferredEndpoints;
  }

  async initClient(options?: WalletConnectOptions): Promise<void> {
    try {
      const arculus = await Keplr.getKeplr();
      const userAgent: string | undefined = window.navigator.userAgent;
      if (arculus && userAgent.includes('ArculusWalletMobile')) {
        this.initClientDone(
          arculus ? new ExtensionArculusClient(arculus) : undefined
        );
      } else {
        await super.initClient(options);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Client Not Exist!') {
          await super.initClient(options);
          return;
        }

        this.initClientError(error);
      }
    }
  }
}
