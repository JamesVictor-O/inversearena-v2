"use client";

import { motion, AnimatePresence } from "framer-motion";

type RoundStatus = "prevailed" | "voided";

interface RoundResolvedOverlayProps {
  isOpen: boolean;
  status: RoundStatus;
  roundNumber: number;
  casualties: number;
  victors: number;
  majorityPercent: number;
  minorityPercent: number;
  winnerPath: "heads" | "tails";
  txHash?: string;
  nextRoundCountdown?: number;
  onProceed: () => void;
  onJoinAnother?: () => void;
}

export function RoundResolvedOverlay({
  isOpen,
  status,
  roundNumber,
  casualties,
  victors,
  majorityPercent,
  minorityPercent,
  winnerPath,
  nextRoundCountdown = 28,
  onProceed,
  onJoinAnother,
}: RoundResolvedOverlayProps) {
  const isPrevailed = status === "prevailed";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 overflow-auto"
        >
          {/* Split Background - Left (Voided/Dark) */}
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[#0a0a0a] overflow-hidden">
            {/* Diagonal ELIMINATED stripe */}
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: "-10%", opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="absolute inset-0 flex items-center"
            >
              <span
                className="font-black text-[100px] md:text-[140px] lg:text-[180px] text-neon-pink whitespace-nowrap select-none tracking-tight"
                style={{ transform: "rotate(-15deg)", opacity: 0.3 }}
              >
                ELIMINATED
              </span>
            </motion.div>
          </div>

          {/* Split Background - Right (Prevailed/Gray with green border) */}
          <div
            className={`absolute inset-y-0 right-0 w-1/2 overflow-hidden bg-[#4a4a4a] ${
              isPrevailed ? "border-l-4 border-t-4 border-neon-green" : ""
            }`}
          >
            {/* Background winner text */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="font-bold text-[80px] md:text-[120px] lg:text-[150px] text-white/10 whitespace-nowrap select-none">
                {winnerPath.toUpperCase()}
              </span>
            </motion.div>

            {/* SURVIVED Badge - positioned inside right panel */}
            {isPrevailed && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="absolute bottom-8 right-8"
              >
                <span className="bg-neon-green text-black font-pixel text-sm px-6 py-3 border-2 border-black">
                  SURVIVED
                </span>
              </motion.div>
            )}
          </div>

          <div className="relative min-h-screen p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-neon-pink" />
                    <span className="font-pixel text-xs text-white tracking-wider">
                      INVERSE ARENA
                    </span>
                  </div>
                  <nav className="hidden md:flex gap-6 font-pixel text-[10px] tracking-wider">
                    <span className="text-white/40">ARENA</span>
                    <span className="text-neon-pink">HISTORY</span>
                    <span className="text-white/40">VAULT</span>
                  </nav>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-pixel text-[8px] text-white/40 text-right">
                    NETWORK<br />
                    <span className="text-neon-green">SOROBAN MAINNET</span>
                  </span>
                  <button className="bg-neon-pink px-4 py-2 font-pixel text-[8px] text-white">
                    0X71C...4A2
                  </button>
                </div>
              </header>

              {/* Status Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 mb-6">
                {/* Majority Status - Voided */}
                <motion.div
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="p-6"
                >
                  <p className="font-pixel text-[8px] text-neon-pink tracking-wider mb-2">
                    MAJORITY STATUS
                  </p>
                  <p className="font-pixel text-2xl md:text-4xl text-white">
                    {majorityPercent}% <span className="text-white">VOIDED</span>
                  </p>
                </motion.div>

                {/* Minority Status - Prevailed */}
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="p-6"
                >
                  <p className="font-pixel text-[8px] text-neon-green tracking-wider mb-2 text-right">
                    MINORITY STATUS
                  </p>
                  <p className="font-pixel text-2xl md:text-4xl text-right text-neon-green">
                    {minorityPercent}% PREVAILED
                  </p>
                </motion.div>
              </div>

              {/* Main Banner */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <span className="inline-block bg-neon-pink text-white font-pixel text-[8px] px-4 py-2 mb-4">
                  PHASE {String(roundNumber).padStart(2, "0")} RESOLVED
                </span>
                <h1 className="font-pixel text-3xl md:text-5xl text-white mb-3">
                  ROUND {roundNumber} COMPLETE
                </h1>
                <p className="font-pixel text-[10px] text-white/40 tracking-wider">
                  THE WEAK WERE MANY, THE STRONG WERE FEW
                </p>
              </motion.div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
                {/* Casualties Card */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-[#1a1a1a] border border-zinc-800 p-4"
                >
                  <p className="font-pixel text-[8px] text-white/40 tracking-wider mb-2">
                    CASUALTIES
                  </p>
                  <p className="font-pixel text-3xl text-neon-pink">
                    {casualties} <span className="text-base">ELIMINATED</span>
                  </p>
                </motion.div>

                {/* Victors Card */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="bg-[#1a1a1a] border border-zinc-800 p-4"
                >
                  <p className="font-pixel text-[8px] text-white/40 tracking-wider mb-2">
                    VICTORS
                  </p>
                  <p className="font-pixel text-3xl text-neon-green">
                    {victors} <span className="text-base">REMAINING</span>
                  </p>
                </motion.div>
              </div>

              {/* Action Paths - Single white card with both options */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="max-w-xl mx-auto"
              >
                <div className="bg-white p-6 space-y-4">
                  {/* Survivor Path */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="inline-block bg-neon-green text-black font-pixel text-[6px] px-2 py-0.5 mb-2">
                        SURVIVOR PATH
                      </span>
                      <p className="font-bold text-black text-sm">
                        PROCEED TO NEXT ROUND
                      </p>
                      <p className="text-zinc-500 text-xs">
                        Next round starts in <span className="text-black font-bold">{nextRoundCountdown}S</span>
                      </p>
                    </div>
                    <button
                      onClick={onProceed}
                      disabled={!isPrevailed}
                      className={`px-8 py-3 font-pixel text-xs transition-colors whitespace-nowrap ${
                        isPrevailed
                          ? "bg-neon-green text-black hover:bg-neon-green/90"
                          : "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                      }`}
                    >
                      NEXT ROUND
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-zinc-200" />

                  {/* Eliminated Path */}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="inline-block bg-zinc-400 text-white font-pixel text-[6px] px-2 py-0.5 mb-2">
                        ELIMINATED PATH
                      </span>
                      <p className="font-bold text-zinc-400 text-sm">
                        GAME OVER
                      </p>
                      <p className="text-zinc-400 text-xs">
                        YOUR JOURNEY ENDS HERE
                      </p>
                    </div>
                    <button
                      onClick={onJoinAnother}
                      disabled={isPrevailed}
                      className={`px-6 py-3 font-pixel text-xs transition-colors whitespace-nowrap ${
                        !isPrevailed
                          ? "bg-neon-pink text-white hover:bg-neon-pink/90"
                          : "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                      }`}
                    >
                      JOIN ANOTHER ARENA
                    </button>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm px-6 py-3 flex flex-wrap justify-between items-center text-white/30 font-mono text-[8px] uppercase tracking-wider gap-4 z-10">
            <div className="flex gap-6">
              <span>LINE: SOROBAN_NETWORK_ACTIVE</span>
              <span>ROUND {roundNumber + 1} COMMENCING IN {nextRoundCountdown}S</span>
            </div>
            <div className="flex gap-6">
              <span>STAY IN THE MINORITY. SURVIVE.</span>
              <span>YIELD FLOWING TO SURVIVORS VAULTS</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
              <span>SYSTEM ONLINE: SOROBAN_NETWORK</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
