import {
  wallets as ext,
} from '@cosmos-kit/arculus-extension';
import { wallets as mobile } from '@cosmos-kit/arculus-mobile';

export const wallets = [...ext, ...mobile];
