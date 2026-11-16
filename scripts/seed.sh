#!/bin/sh
# Seed + miner for the regtest classroom chain. Safe to re-run.
set -eu

CLI="bitcoin-cli -regtest -rpcconnect=bitcoind -rpcuser=${BTC_RPC_USER} -rpcpassword=${BTC_RPC_PASS}"
INTERVAL="${BLOCK_INTERVAL:-10}"

# Create the faucet wallet, or load it if it already exists from a previous run.
if ! $CLI -rpcwallet=faucet getwalletinfo >/dev/null 2>&1; then
  $CLI createwallet faucet >/dev/null 2>&1 || $CLI loadwallet faucet >/dev/null
fi

ADDR=$($CLI -rpcwallet=faucet getnewaddress "miner" bech32)
HEIGHT=$($CLI getblockcount)

# Coinbase outputs need 100 confirmations before they can be spent.
if [ "$HEIGHT" -lt 101 ]; then
  echo "[seed] mining $((101 - HEIGHT)) blocks to fund the faucet"
  $CLI generatetoaddress $((101 - HEIGHT)) "$ADDR" >/dev/null
fi

echo "[seed] faucet balance: $($CLI -rpcwallet=faucet getbalance) BTC"
echo "[seed] mining 1 block every ${INTERVAL}s"

while true; do
  $CLI generatetoaddress 1 "$ADDR" >/dev/null
  sleep "$INTERVAL"
done
