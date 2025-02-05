import { Wallet } from '@cosmos-kit/core';
import { Window as KeplrWindow } from '@keplr-wallet/types';

import { ICON } from '../constant';

export const arculusExtensionInfo: Wallet = {
  name: 'arculus-extension',
  prettyName: 'Arculus',
  logo: ICON,
  mode: 'extension',
  // In the Arculus Mobile in-app browser, Arculus is available in window.arculus,
  // similar to the extension on a desktop browser. For this reason, we must
  // check what mode the window.arculus client is in once it's available.
  mobileDisabled: () =>
    !(
      typeof document !== 'undefined' &&
      document.readyState === 'complete' &&
      (window as KeplrWindow).keplr &&
      (window as KeplrWindow).keplr.mode === 'mobile-web'
    ),
  rejectMessage: {
    source: 'Request rejected',
  },
  connectEventNamesOnWindow: ['keplr_keystorechange'],
  supportedChains: [
    'cosmoshub',
    'osmosis',
    'provenance'
  ],
  downloads: [
    {
      device: 'desktop',
      browser: 'chrome',
      link: 'https://chrome.google.com/webstore/detail/arculus/dmkamcknogkgcdfhhbddcghachkejeap?hl=en',
    },
    {
      device: 'desktop',
      browser: 'firefox',
      link: 'https://addons.mozilla.org/en-US/firefox/addon/arculus/',
    },
    {
      link: 'https://www.arculus.app/download',
    },
  ],
};
