import { OS, Wallet } from '@cosmos-kit/core';

import { ICON } from '../constant';

export const ArculusMobileInfo: Wallet = {
  name: 'arculus-mobile',
  prettyName: 'Arculus Mobile',
  logo: ICON,
  mode: 'wallet-connect',
  mobileDisabled: () => {
    try {
      // Check if we're on a mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Only disable if we're on mobile AND the Arculus app is not detected
      if (isMobile && !('arculus' in window)) {
        console.warn('Please install the Arculus app to use this wallet on mobile devices.');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking mobile compatibility:', error);
      return false;
    }
  },
  rejectMessage: {
    source: 'Request rejected',
  },
  downloads: [
    {
      device: 'mobile',
      os: 'android',
      link: 'https://play.google.com/store/apps/details?id=co.arculus.wallet.android',
    },
    {
      device: 'mobile',
      os: 'ios',
      link: 'https://apps.apple.com/us/app/arculus-wallet/id1575425801',
    },
    {
      link: 'https://www.getarculus.com/',
    },
  ],
  connectEventNamesOnWindow: ['arculus_keystorechange'],
  walletconnect: {
    name: 'Arculus Wallet',
    projectId: 'd5235b42fc7273823b6dc3214c822da3',
    mobile: {
      native: {
        ios: 'arculuswc:',
        android: 'arculuswc:',
      },
    },
    formatNativeUrl: (
      appUrl: string,
      wcUri: string,
      os: OS | undefined,
      _name: string
    ): string => {
      try {
        const plainAppUrl = appUrl.split(':')[0];
        const encodedWcUrl = encodeURIComponent(wcUri);
        switch (os) {
          case 'ios':
            return `${plainAppUrl}://wcV2?${encodedWcUrl}`;
          case 'android':
            return `${plainAppUrl}://wcV2?${encodedWcUrl}#Intent;package=co.arculus.wallet.android;scheme=arculuswc;end;`;
          default:
            return `${plainAppUrl}://wcV2?${encodedWcUrl}`;
        }
      } catch (error) {
        console.error('Error formatting native URL:', error);
        return '';
      }
    },
  },
};
