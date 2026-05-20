import { createContext, useContext } from 'react'
import { useVotes } from './useVotes'

// Single Firebase subscription shared across all consumers (PlaceCard,
// PlaceDetail, VoteButtons). Wrap the app root in <VotesProvider>
// and read it with useVotesCtx().

const VotesContext = createContext(null)

export function VotesProvider({ children }) {
  const votes = useVotes()
  return <VotesContext.Provider value={votes}>{children}</VotesContext.Provider>
}

export function useVotesCtx() {
  const ctx = useContext(VotesContext)
  if (!ctx) throw new Error('useVotesCtx must be used inside <VotesProvider>')
  return ctx
}
