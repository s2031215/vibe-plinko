export interface RoundResultData {
  winningTunnels: number[];
  multiplier: number;
}

/**
 * rollRound
 *
 * RNG logic decoupled from physics.
 * Selects winning tunnel(s) and multiplier the moment player inserts beads.
 * @returns {RoundResultData} Data used to guide the ball
 */
export function rollRound(): RoundResultData {
  const numTunnels = Math.floor(Math.random() * 6) + 1; // 1 to 6 tunnels
  const tunnels: number[] = [];

  while (tunnels.length < numTunnels) {
    const t = Math.floor(Math.random() * 12);
    if (!tunnels.includes(t)) {
      tunnels.push(t);
    }
  }

  let multiplier = 2;
  if (numTunnels === 1) multiplier = 10;
  else if (numTunnels === 2) multiplier = 8;
  else if (numTunnels === 3) multiplier = 6;
  else if (numTunnels === 4) multiplier = 4;

  return { winningTunnels: tunnels, multiplier };
}
