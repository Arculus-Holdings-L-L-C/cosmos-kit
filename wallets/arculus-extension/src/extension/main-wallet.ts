import { EndpointOptions, Wallet } from '@cosmos-kit/core';
import { MainWalletBase } from '@cosmos-kit/core';
import { Keplr } from '@keplr-wallet/provider-extension';

import { ChainArculusExtension } from './chain-wallet';
import { ArculusClient } from './client';

export class ArculusExtensionWallet extends MainWalletBase {
  constructor(
    walletInfo: Wallet,
    preferredEndpoints?: EndpointOptions['endpoints']
  ) {
    super(walletInfo, ChainArculusExtension);
    this.preferredEndpoints = preferredEndpoints;
  }

  async initClient() {
    this.initingClient();
    try {
      const arculus = await Keplr.getKeplr();
      this.initClientDone(arculus ? new ArculusClient(arculus) : undefined);
    } catch (error) {
      this.initClientError(error);
    }
  }
}
