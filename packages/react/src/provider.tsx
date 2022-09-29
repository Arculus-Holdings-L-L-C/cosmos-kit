import { ChainName, MainWalletData, SignerOptions, ViewOptions, WalletManager, WalletName, WalletOption, EndpointOptions, StorageOptions } from '@cosmos-kit/core';
import { WalletModalProps } from '@cosmos-kit/core';
import React, { createContext, ReactNode, useEffect, useMemo, useState } from 'react';

import { DefaultModal } from './modal';
import { Chain } from '@chain-registry/types';

export const walletContext = createContext<{ walletManager: WalletManager } | null>(null);

export const WalletProvider = ({
  chains,
  wallets,
  walletModal,
  signerOptions,
  viewOptions,
  endpointOptions,
  storageOptions,
  children,
}: {
  chains: Chain[],
  wallets: WalletOption[],
  walletModal?: ({
    isOpen,
    setOpen,
  }: WalletModalProps) => JSX.Element;
  signerOptions?: SignerOptions,
  viewOptions?: ViewOptions;
  endpointOptions?: EndpointOptions;
  storageOptions?: StorageOptions;
  children: ReactNode;
}) => {

  const walletManager = useMemo(() => (
    new WalletManager(
      chains,
      wallets,
      signerOptions,
      viewOptions,
      endpointOptions,
      storageOptions
    )
  ), []);

  const [walletData, setWalletData] = useState<MainWalletData>();
  const [walletState, setWalletState] = useState(walletManager.state);
  const [walletMsg, setWalletMsg] = useState<string | undefined>();
  const [walletName, setWalletName] = useState<WalletName | undefined>(
    walletManager.currentWalletName
  );

  const [isViewOpen, setViewOpen] = useState<boolean>(false);
  const [chainName, setChainName] = useState<ChainName | undefined>();
  const [qrUri, setQRUri] = useState<string | undefined>();

  walletManager.setActions({
    data: setWalletData,
    state: setWalletState,
    message: setWalletMsg,
    walletName: setWalletName,
    viewOpen: setViewOpen,
    chainName: setChainName,
    qrUri: setQRUri,
  });

  const Modal = walletModal || DefaultModal;

  useEffect(() => {
    if (walletManager.useStorage) {
      const storeStr = window.localStorage.getItem('walletManager');
      if (storeStr) {
        const { currentWalletName, currentChainName } = JSON.parse(storeStr);
        walletManager.setCurrentWallet(currentWalletName);
        walletManager.setCurrentChain(currentChainName);
        if (currentWalletName) {
          walletManager.connect();
        }
      }

      const handleTabClose = event => {
        event.preventDefault();
        if (walletManager.storageOptions.clearOnTabClose) {
          window.localStorage.removeItem('walletManager');
        }
      };

      window.addEventListener('beforeunload', handleTabClose);

      return () => {
        window.removeEventListener('beforeunload', handleTabClose);
      };
    }
  }, [])

  return (
    <walletContext.Provider
      value={{
        walletManager
      }}
    >
      {children}
      <Modal
        isOpen={isViewOpen}
        setOpen={setViewOpen}
      />
    </walletContext.Provider>
  );
};
