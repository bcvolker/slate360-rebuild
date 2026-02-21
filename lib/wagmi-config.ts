import { http, createConfig } from "wagmi";
import { polygon, mainnet } from "wagmi/chains";
import { injected, metaMask, walletConnect } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [polygon, mainnet],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [polygon.id]: http(),
    [mainnet.id]: http(),
  },
  ssr: true,
});
