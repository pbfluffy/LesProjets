import { createContext, useContext } from 'react'

// Holds the shared vote-state bundle (tallies/myVotes/submitVote/etc).
// The single useVotes() call lives in App so the state is available before
// the Provider mounts (e.g. for sort logic that runs in App's body).
// Consumers read it with useVotesCtx().

const VotesContext = createContext(null)

export function VotesProvider({ value, children }) {
  return <VotesContext.Provider value={value}>{children}</VotesContext.Provider>
}

export function useVotesCtx() {
  const ctx = useContext(VotesContext)
  if (!ctx) throw new Error('useVotesCtx must be used inside <VotesProvider>')
  return ctx
}
