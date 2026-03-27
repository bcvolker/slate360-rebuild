import { http, createConfig } from "wagmi";
import { polygon } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [
  injected(),
  coinbaseWallet({
    appName: "Slate360",
  }),
  ...(walletConnectProjectId
    ? [walletConnect({
        projectId: walletConnectProjectId,
        metadata: {
          name: "Slate360",
          description: "Slate360 Market Robot",
          url: "https://www.slate360.ai",
          icons: ["https://www.slate360.ai/logo.svg"],
        },
      })]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [polygon],
  connectors,
  transports: {
    [polygon.id]: http(),
  },
  ssr: true,
});
