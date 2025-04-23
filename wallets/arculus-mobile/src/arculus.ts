import { preferredEndpoints } from './config';
import { ArculusMobileInfo, ArculusMobileWallet } from './wallet-connect';

// Create a new instance of the ArculusMobileWallet with the ArculusMobileInfo and preferredEndpoints
const arculusMobile = new ArculusMobileWallet(ArculusMobileInfo, preferredEndpoints);

// Export the wallets array with the arculusMobile wallet
export const wallets = [arculusMobile];
