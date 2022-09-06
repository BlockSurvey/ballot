function getStacksProvider() {
  return window.StacksProvider || window.BlockstackProvider;
}
function isStacksWalletInstalled() {
  return !!getStacksProvider();
}

export { getStacksProvider, isStacksWalletInstalled };
//# sourceMappingURL=utils.esm.js.map
