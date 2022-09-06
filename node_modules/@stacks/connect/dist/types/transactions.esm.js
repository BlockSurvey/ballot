var TransactionTypes;

(function (TransactionTypes2) {
  TransactionTypes2["ContractCall"] = "contract_call";
  TransactionTypes2["ContractDeploy"] = "smart_contract";
  TransactionTypes2["STXTransfer"] = "token_transfer";
})(TransactionTypes || (TransactionTypes = {}));

var ContractCallArgumentType;

(function (ContractCallArgumentType2) {
  ContractCallArgumentType2["BUFFER"] = "buffer";
  ContractCallArgumentType2["UINT"] = "uint";
  ContractCallArgumentType2["INT"] = "int";
  ContractCallArgumentType2["PRINCIPAL"] = "principal";
  ContractCallArgumentType2["BOOL"] = "bool";
})(ContractCallArgumentType || (ContractCallArgumentType = {}));

export { ContractCallArgumentType, TransactionTypes };
//# sourceMappingURL=transactions.esm.js.map
