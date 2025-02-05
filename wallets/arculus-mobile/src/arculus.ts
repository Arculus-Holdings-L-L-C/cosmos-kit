import { preferredEndpoints } from './config';
import { arculusMobileInfo, ArculusMobileWallet } from './wallet-connect';

const arculusMobile = new ArculusMobileWallet(arculusMobileInfo, preferredEndpoints);

export const wallets = [arculusMobile];
