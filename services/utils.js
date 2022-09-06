import { Constants } from "../common/constants";
import { getStacksAPIPrefix } from "../services/auth";

export async function getRecentBlock() {
    // Get btc domain for logged in user
    const response = await fetch(
        getStacksAPIPrefix() + "/extended/v1/block?limit=1"
    );
    const responseObject = await response.json();

    return responseObject?.results?.[0];
}

export function formStacksExplorerUrl(txId) {
    return (
        "https://explorer.stacks.co/txid/" +
        txId +
        "?chain=" +
        (Constants.STACKS_MAINNET_FLAG ? "mainnet" : "testnet")
    );
}

export function convertToDisplayDateFormat(date) {
    return new Date(date).toLocaleDateString('general', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', hour12: true, minute: 'numeric' })
}