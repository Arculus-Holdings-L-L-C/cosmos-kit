import { Wallet } from '@cosmos-kit/core'
import { WCClient } from '@cosmos-kit/walletconnect'

export class ArculusClient extends WCClient {
  constructor(walletInfo: Wallet) {
    super(walletInfo)
  }

  get wcMobile() {
    return {
      native: {
        ios: 'arculuswc:',
        android: 'intent:',
      },
      universal: 'https://gw.arculus.co/app/wc'
    };
  }
}
