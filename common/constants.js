export const Constants = {
  // Stacks mainnet network flag
  STACKS_MAINNET_FLAG:
    process.env.NEXT_PUBLIC_STACKS_MAINNET_FLAG === "false" ? false : true,

  // IPFS gateway
  IPFS_GATEWAY: "https://ipfs.owl.link/ipfs/"
};
