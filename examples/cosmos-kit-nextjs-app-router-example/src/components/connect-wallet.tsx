"use client";

import { useChain } from "@cosmos-kit/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { SignMode } from "cosmjs-types/cosmos/tx/signing/v1beta1/signing";
import { TxBody } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { makeSignDoc, makeAuthInfoBytes } from "@cosmjs/proto-signing";
import { Coin } from "@cosmjs/proto-signing";
import { DirectSignResponse } from "@cosmjs/proto-signing";
import Long from "long";
import { WalletAccount, DirectSignDoc, ChainContext } from "@cosmos-kit/core";

export function ConnectWallet() {
  const chainContext: ChainContext = useChain(process.env.NEXT_PUBLIC_CHAIN_NAME || "cosmoshub");
  const [getAccountsResult, setGetAccountsResult] = useState("");
  const [signDirectMemoResult, setSignDirectMemoResult] = useState("");

  const {
    connect,
    openView,
    status,
    username,
    address,
    message,
    wallet,
    chain,
    getSigningStargateClient,
    disconnect,
  } = chainContext;

  const isConnected = status === "Connected";

  // Test cosmos_getAccounts
  const handleGetAccounts = async () => {
    try {
      console.log("Testing cosmos_getAccounts...");

      if (!wallet || status !== "Connected") {
        throw new Error("Wallet not connected");
      }

      if (!chain) {
        throw new Error("Chain info not available");
      }

      // Using the getAccount method from the chainContext
      const account = await chainContext.getAccount?.();

      if (!account) {
        throw new Error("Failed to get account");
      }

      // Format the result as if we got multiple accounts
      const accounts = [account];
      console.log("Account:", account);

      // Format the result with full pubkey
      const result = `Found ${accounts.length} account(s):\n${accounts.map((acc: WalletAccount) =>
        `Address: ${acc.address}\nAlgo: ${acc.algo}\nPubKey: ${Buffer.from(acc.pubkey).toString('base64')}`
      ).join('\n\n')}`;

      setGetAccountsResult(result);
      alert(`Get Accounts Success!\nFound ${accounts.length} account(s)`);
    } catch (error: any) {
      console.error("Error in getAccounts:", error);
      setGetAccountsResult(`Error: ${error.message || String(error)}`);
      alert(`Get Accounts Failed: ${error.message || String(error)}`);
    }
  };

  // Test cosmos_signDirect with memo
  const handleSignDirectMemo = async () => {
    if (!wallet || status !== "Connected" || !chain) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      const msg = "John needs this message signed";
      console.log(`Attempting to sign direct with memo: "${msg}"`);
      console.log("Chain ID:", chain.chain_id);
      console.log("Wallet status:", status);
      console.log("Wallet provider:", wallet?.prettyName);

      // 1. Get necessary info
      console.log("Getting account info...");
      const account = await chainContext.getAccount?.();

      if (!account) {
        throw new Error("Failed to get account");
      }

      console.log("Account received:", JSON.stringify({
        address: account.address,
        algo: account.algo,
        pubkeyLength: account.pubkey.length
      }));

      const pubkeyBytes = account.pubkey;
      console.log("Pubkey (raw base64):", Buffer.from(pubkeyBytes).toString('base64'));

      // Create the Any type for the pubkey required by makeAuthInfoBytes
      const pubkeyProto = {
        typeUrl: "/cosmos.crypto.secp256k1.PubKey",
        value: pubkeyBytes,
      };

      // Skip connecting to RPC - use hardcoded values like in the simple test
      console.log("Using hardcoded sequence to avoid RPC connection");
      const accountNumber = 1;
      const sequence = 0;

      // 2. Create minimal TxBody with memo
      console.log("Creating TxBody with memo...");
      const txBody = TxBody.fromPartial({
        messages: [],
        memo: msg,
      });
      const txBodyBytes = TxBody.encode(txBody).finish();
      console.log("TxBody created, bytes length:", txBodyBytes.length);
      const bodyBytesBase64 = Buffer.from(txBodyBytes).toString('base64');
      console.log("TxBody base64:", bodyBytesBase64);

      // 3. Create AuthInfo
      console.log("Creating AuthInfo...");
      const feeAmount: Coin[] = [];
      const gasLimit = Long.fromNumber(0);

      const authInfoBytes = makeAuthInfoBytes(
        [{ pubkey: pubkeyProto, sequence }],
        feeAmount,
        gasLimit.toNumber(), // Convert Long to number
        undefined,
        undefined,
        SignMode.SIGN_MODE_DIRECT
      );
      console.log("AuthInfo created, bytes length:", authInfoBytes.length);
      const authInfoBytesBase64 = Buffer.from(authInfoBytes).toString('base64');
      console.log("AuthInfo base64:", authInfoBytesBase64);

      // 4. Create SignDoc - THIS IS THE KEY STRUCTURE FOR WALLETCONNECT
      console.log("Creating SignDoc for DirectSigning...");

      // Prepare the signDoc in the expected format
      const signDocInput: DirectSignDoc = {
        bodyBytes: txBodyBytes,
        authInfoBytes: authInfoBytes,
        chainId: chain.chain_id,
        accountNumber: BigInt(accountNumber)
      };

      // Log the signDoc that will be sent to the wallet
      console.log("SignDoc being sent to wallet:", {
        bodyBytes: bodyBytesBase64.substring(0, 20) + "...",
        authInfoBytes: authInfoBytesBase64.substring(0, 20) + "...",
        chainId: signDocInput.chainId,
        accountNumber: signDocInput.accountNumber ? signDocInput.accountNumber.toString() : "null"
      });

      // 5. Sign using signDirect from chainContext
      if (!chainContext.signDirect) {
        throw new Error("signDirect method not available");
      }

      console.log("Calling signDirect with address:", address);
      const response = await chainContext.signDirect(
        address || "",
        signDocInput
      );

      // Handle response safely - in case it contains non-serializable data
      try {
        console.log("WalletConnect Response:", JSON.stringify(response, (key, value) => {
          // Handle Uint8Array serialization for better logging
          if (value instanceof Uint8Array) {
            return Buffer.from(value).toString('base64');
          }
          return value;
        }, 2));
      } catch (jsonError) {
        console.warn("Couldn't stringify full response:", jsonError);
        console.log("Response keys:", Object.keys(response || {}));

        // Try logging parts of the response
        if (response?.signature) {
          console.log("Signature present with keys:", Object.keys(response.signature));
        }
        if (response?.signed) {
          console.log("Signed document present with keys:", Object.keys(response.signed));
        }
      }

      // Check response structure
      if (!response) {
        throw new Error("Empty response from signDirect");
      }

      // Safely extract signature and signed doc from the response
      const signature = response.signature;
      const signed = response.signed;

      if (!signature) {
        throw new Error("No signature in response");
      }

      // Create the result display sections
      let resultDisplay = `Successfully signed memo '${msg}'.\n\n`;

      // 1. Signature section - safely handle potential binary data
      let signatureBase64 = "";
      try {
        if (signature.signature) {
          if (typeof signature.signature === 'string') {
            // Some wallets might return base64 string directly
            signatureBase64 = signature.signature;
          } else {
            // Handle Uint8Array or other binary formats
            signatureBase64 = Buffer.from(signature.signature).toString('base64');
          }
          resultDisplay += `Signature: ${signatureBase64}\n\n`;
          console.log("Signature (base64):", signatureBase64);
        }
      } catch (sigError) {
        console.warn("Error processing signature:", sigError);
        resultDisplay += `Signature: [Error processing signature format]\n\n`;
      }

      // 2. PubKey section - safely handle potential format variations
      try {
        if (signature.pub_key) {
          console.log("Raw pub_key from response:", signature.pub_key);

          let pubKeyType = "unknown";
          let pubKeyValue = "none";

          // Handle type field
          if (signature.pub_key.type) {
            pubKeyType = signature.pub_key.type;
          } else if (signature.pub_key && 'typeUrl' in signature.pub_key) {
            pubKeyType = (signature.pub_key as any).typeUrl;
          }

          // Handle value field with multiple possible formats
          if (signature.pub_key.value) {
            if (typeof signature.pub_key.value === 'string') {
              pubKeyValue = signature.pub_key.value;
            } else if (signature.pub_key.value instanceof Uint8Array) {
              pubKeyValue = Buffer.from(signature.pub_key.value).toString('base64');
            } else {
              // Try to stringify the value
              try {
                pubKeyValue = JSON.stringify(signature.pub_key.value);
              } catch (e) {
                pubKeyValue = "[Complex object]";
              }
            }
          }

          resultDisplay += `PubKey:\nType: ${pubKeyType}\nValue: ${pubKeyValue}\n\n`;
          console.log("PubKey Info:", { type: pubKeyType, value: pubKeyValue });
        }
      } catch (pkError) {
        console.warn("Error processing pubkey:", pkError);
        resultDisplay += `PubKey: [Error processing pubkey format]\n\n`;
      }

      // 3. SignDoc section - safely extract and display
      resultDisplay += "SignDoc (what was signed):\n";

      try {
        if (signed) {
          // This is the WalletConnect format with the signDoc returned as "signed"
          console.log("Found WalletConnect-style 'signed' property in response");
          console.log("Raw signed from response:", signed);

          // Safe extraction with type checking
          if (signed.chainId) resultDisplay += `Chain ID: ${signed.chainId}\n`;
          if (signed.accountNumber) resultDisplay += `Account Number: ${signed.accountNumber}\n`;

          // Safely handle bytes fields with multiple possible formats
          let authInfoStr = "[Error processing authInfoBytes]";
          let bodyBytesStr = "[Error processing bodyBytes]";

          // Process authInfoBytes
          if (signed.authInfoBytes) {
            if (typeof signed.authInfoBytes === 'string') {
              authInfoStr = signed.authInfoBytes;
            } else if (signed.authInfoBytes instanceof Uint8Array) {
              authInfoStr = Buffer.from(signed.authInfoBytes).toString('base64');
            }
          }

          // Process bodyBytes
          if (signed.bodyBytes) {
            if (typeof signed.bodyBytes === 'string') {
              bodyBytesStr = signed.bodyBytes;
            } else if (signed.bodyBytes instanceof Uint8Array) {
              bodyBytesStr = Buffer.from(signed.bodyBytes).toString('base64');
            }
          }

          resultDisplay += `Auth Info Bytes: ${authInfoStr.substring(0, 20)}...\n`;
          resultDisplay += `Body Bytes: ${bodyBytesStr.substring(0, 20)}...\n`;

          try {
            console.log("SignDoc from response:", {
              chainId: signed.chainId,
              accountNumber: signed.accountNumber,
              authInfoBytes: authInfoStr.substring(0, 20) + "...",
              bodyBytes: bodyBytesStr.substring(0, 20) + "..."
            });
          } catch (logError) {
            console.warn("Error logging signed data:", logError);
          }
        } else {
          // Fallback to showing what we sent
          console.log("No 'signed' property in response, using the request SignDoc");
          resultDisplay += `Chain ID: ${chain.chain_id}\n`;
          resultDisplay += `Account Number: ${accountNumber.toString()}\n`;
          resultDisplay += `Auth Info Bytes: ${authInfoBytesBase64.substring(0, 20)}...\n`;
          resultDisplay += `Body Bytes: ${bodyBytesBase64.substring(0, 20)}...\n`;
        }
      } catch (signedError) {
        console.warn("Error processing signed document:", signedError);
        resultDisplay += `[Error processing signed document]\n`;
        // Use the request data as fallback
        resultDisplay += `Chain ID: ${chain.chain_id}\n`;
        resultDisplay += `Account Number: ${accountNumber.toString()}\n`;
      }

      // Display the result
      setSignDirectMemoResult(resultDisplay);

      // Enhanced alert with more details
      let pubKeyDisplay = "N/A";
      if (signature?.pub_key?.value) {
        if (typeof signature.pub_key.value === 'string') {
          pubKeyDisplay = signature.pub_key.value.slice(0, 15);
        } else if (signature.pub_key.value instanceof Uint8Array) {
          pubKeyDisplay = Buffer.from(signature.pub_key.value).toString('base64').slice(0, 15);
        }
      }

      const alertMessage =
        `Sign Direct Success!\n\n` +
        `Message: "${msg}"\n` +
        `Signature: ${signatureBase64 ? signatureBase64.slice(0, 20) : 'N/A'}...\n` +
        `Public Key: ${pubKeyDisplay}...\n` +
        `\nSee full details in the result box below`;

      alert(alertMessage);

    } catch (error: any) {
      console.error("Error in signDirect:", error);
      let errorMessage = error.message || String(error);

      // Enhanced error information for debugging
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }

      // Check for specific error conditions
      if (errorMessage.includes("Request rejected")) {
        errorMessage = "Request was rejected by the wallet. Please try again.";
      } else if (errorMessage.includes("not implemented")) {
        errorMessage = "This wallet doesn't support signDirect. Try another wallet.";
      } else if (errorMessage.includes("cannot deserialize SignDoc")) {
        errorMessage = "The wallet couldn't process the SignDoc structure. Format may be incompatible.";
      } else if (errorMessage.includes("JSON")) {
        errorMessage = "JSON parsing error. The wallet returned data in an unexpected format.";
      } else if (errorMessage.includes("TypeError")) {
        errorMessage = "Type error processing the wallet response. Check console for details.";
      }

      setSignDirectMemoResult(`Error: ${errorMessage}`);
      alert(`Sign Direct Failed: ${errorMessage}`);
    }
  };

  // Add a simplified direct signing test
  const handleSimpleSignTest = async () => {
    try {
      if (!wallet || status !== "Connected") {
        throw new Error("Wallet not connected");
      }

      console.log("Starting simple sign test");
      console.log("Address:", address);

      // Create a very simple SignDoc without needing RPC
      const simpleBodyBytes = new TextEncoder().encode("Test message to sign");
      const simpleAuthBytes = new TextEncoder().encode("Simple auth info");

      // Create a simple DirectSignDoc that doesn't require RPC
      const simpleSignDoc: DirectSignDoc = {
        bodyBytes: simpleBodyBytes,
        authInfoBytes: simpleAuthBytes,
        chainId: chain?.chain_id || "cosmoshub-4",
        accountNumber: BigInt(1) // Just use 1 for testing
      };

      console.log("Simple SignDoc created");
      console.log("bodyBytes length:", simpleBodyBytes.length);
      console.log("authInfoBytes length:", simpleAuthBytes.length);

      if (!chainContext.signDirect) {
        throw new Error("signDirect method not available");
      }

      // Call signDirect with simplified doc
      console.log("Calling signDirect with simplified doc...");
      const response = await chainContext.signDirect(
        address || "",
        simpleSignDoc
      );

      // Log response details
      try {
        console.log("Got response from wallet!");
        console.log("Response structure:", Object.keys(response));
        if (response.signature) console.log("Signature present:", typeof response.signature);
        if (response.signed) console.log("Signed present:", typeof response.signed);
      } catch (e) {
        console.log("Error examining response:", e);
      }

      let resultMsg = "Sign test succeeded!\n\n";

      if (response.signature) {
        resultMsg += "Signature details:\n";
        if (response.signature.pub_key) {
          resultMsg += `PubKey type: ${response.signature.pub_key.type || "unknown"}\n`;
          try {
            const pubkeyValue = response.signature.pub_key.value;
            resultMsg += `PubKey value: ${typeof pubkeyValue === 'string' ?
              pubkeyValue : (pubkeyValue ? Buffer.from(pubkeyValue).toString('base64') : 'undefined')}\n`;
          } catch (e) {
            resultMsg += `PubKey value error: ${e}\n`;
          }
        }

        if (response.signature.signature) {
          try {
            resultMsg += `Signature: ${typeof response.signature.signature === 'string' ?
              response.signature.signature : Buffer.from(response.signature.signature).toString('base64')}\n`;
          } catch (e) {
            resultMsg += `Signature error: ${e}\n`;
          }
        }
      }

      if (response.signed) {
        resultMsg += "\nSigned document details:\n";
        resultMsg += `ChainID: ${response.signed.chainId || 'undefined'}\n`;
        resultMsg += `Account number: ${response.signed.accountNumber || 'undefined'}\n`;
      }

      setSignDirectMemoResult(resultMsg);

      // Enhanced alert with more details
      const alertMessage =
        `Sign Test Succeeded!\n\n` +
        `Signature: ${response.signature?.signature?.slice(0, 20)}...\n` +
        `Public Key: ${response.signature?.pub_key?.value?.slice(0, 15)}...\n` +
        `Chain ID: ${response.signed?.chainId}\n` +
        `\nSee full details in the result box below`;

      alert(alertMessage);

    } catch (error: any) {
      console.error("Error in simple sign test:", error);
      setSignDirectMemoResult(`Error: ${error.message || String(error)}`);
      alert(`Sign Test Failed: ${error.message || String(error)}`);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Status:</span>
              <Badge
                variant={isConnected ? "default" : "secondary"}
                className={isConnected ? "bg-green-500" : ""}
              >
                {status}
              </Badge>
            </div>
            {address && (
              <a
                href={`https://www.mintscan.io/cosmos/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                View on Explorer <ExternalLink size={12} />
              </a>
            )}
          </div>

          {username && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Username:</span>
              <span className="text-sm">{username}</span>
            </div>
          )}

          {address && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Address:</span>
                <span className="text-sm font-mono">
                  {truncateAddress(address)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard(address)}
                title="Copy address"
              >
                <Copy size={14} />
              </Button>
            </div>
          )}

          {/* Connection button or wallet options */}
          <div className="flex flex-col gap-3 mt-2">
            {!isConnected ? (
              <Button className="w-full" onClick={() => connect()}>
                Connect Wallet
              </Button>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => openView()}
                  >
                    Wallet Options
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => disconnect()}
                  >
                    Disconnect Wallet
                  </Button>
                </div>

                <div className="flex flex-col gap-2 mt-3">
                  <h3 className="text-sm font-medium">Testing Functions:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleGetAccounts}
                    >
                      Test Get Accounts
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleSignDirectMemo}
                    >
                      Test Sign Direct
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleSimpleSignTest}
                    >
                      Simple Sign Test
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Results display */}
          {getAccountsResult && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="font-medium text-sm mb-1">Get Accounts Result:</p>
              <p className="text-xs whitespace-pre-wrap overflow-auto max-h-[200px]">{getAccountsResult}</p>
            </div>
          )}

          {signDirectMemoResult && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="font-medium text-sm mb-1">Sign Direct Result:</p>
              <p className="text-xs whitespace-pre-wrap overflow-auto max-h-[200px]">{signDirectMemoResult}</p>
            </div>
          )}

          {message && (
            <p className="mt-2 text-sm text-destructive">{message}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
