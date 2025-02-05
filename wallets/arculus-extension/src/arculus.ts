import { preferredEndpoints } from './config';
import { arculusExtensionInfo, ArculusExtensionWallet } from './extension';

const arculusExtension = new ArculusExtensionWallet(
  arculusExtensionInfo,
  preferredEndpoints
);

export const wallets = [arculusExtension];
