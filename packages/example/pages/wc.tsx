import SignClient from "@walletconnect/sign-client";
import { useEffect, useState } from "react";

import { Web3Modal } from "../wc/client";
import QRCodeSVG from "qrcode.react";

const projectId = "d5235b42fc7273823b6dc3214c822da3";

// 2. Configure web3modal
const web3modal = new Web3Modal({ projectId: projectId });

export default function HomePage() {
  const [signClient, setSignClient] = useState<SignClient | undefined>(
    undefined
  );
  const [qrcode, setQrcode] = useState(<></>);

  // 3. Initialize sign client
  async function onInitializeSignClient() {
    try {
      const client = await SignClient.init({
        projectId: projectId,
        relayUrl: "wss://relay.walletconnect.com",
        metadata: {
          name: "Cosmos Kit Example",
          description: "Cosmos Kit Example App",
          url: "https://cosmoskit.com",
          icons: ["https://raw.githubusercontent.com/cosmology-tech/cosmos-kit/main/packages/example/public/favicon-32x32.png"],
        },
      });
      setSignClient(client);
    } catch (error) {
      console.error("Failed to initialize SignClient:", error);
    }
  }

  // 4. Initiate connection and pass pairing uri to the modal
  async function onOpenModal() {
    if (!signClient) {
      console.error("SignClient not initialized");
      return;
    }

    try {
      const namespaces = {
        cosmos: {
          methods: [
            "cosmos_getAccounts",
            "cosmos_signAmino",
            "cosmos_signDirect",
          ],
          chains: [`cosmos:cosmoshub-4`],
          events: ["chainChanged", "accountsChanged"],
        },
      };

      const { uri, approval } = await signClient.connect({
        requiredNamespaces: namespaces,
      });

      if (!uri) {
        console.error("No URI generated for connection");
        return;
      }

      // Set QR code and open modal
      setQrcode(
        <QRCodeSVG
          value={uri}
          size={300}
          bgColor={"#ffffff"}
          fgColor={"#000000"}
          level={"L"}
          includeMargin={false}
        />
      );

      web3modal.openModal({
        uri,
        standaloneChains: namespaces.cosmos.chains,
      });

      // Wait for approval
      const session = await approval();
      console.log("Session established:", session);

      // Close modal after successful connection
      web3modal.closeModal();
    } catch (error) {
      console.error("Connection error:", error);
      web3modal.closeModal();
    }
  }

  useEffect(() => {
    onInitializeSignClient();
  }, []);

  return signClient ? (
    <div>
      <button onClick={onOpenModal}>Connect Wallet</button>
      {qrcode}
    </div>
  ) : (
    "Initializing..."
  );
}
