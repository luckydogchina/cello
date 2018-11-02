module.exports = {
  defaultChannelName: "mychannel",
  fileUploadLimits: "100MB",
  limit: {
    chainNumber: 2
  },
  path: {
    chain: "/opt/cello/baas/users/%s/chains/%s",
    chainCode: "/opt/cello/baas/users/%s/chain_codes/%s",
    fabricConfig:"/opt/cello/fabric-1.0"
  },
  examples: {
    fabric: "/home/lijisai/cello/user-dashboard/src/config-template/cc_code/examples/fabric",
    ink: "/home/lijisai/cello/user-dashboard/src/config-template/cc_code/examples/ink"
  }
}