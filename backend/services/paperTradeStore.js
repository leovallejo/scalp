let state = {
  paperBalance: 1000,
  trades: [],
};

export function getPaperState() {
  return state;
}

export function getPaperTrades() {
  return state.trades.slice(0).reverse();
}

export function addPaperTrade(trade) {
  state.trades.push(trade);
}

export function setPaperBalance(value) {
  const num = Number(value);

  if (Number.isFinite(num) && num > 0) {
    state.paperBalance = num;
  }

  return state.paperBalance;
}
