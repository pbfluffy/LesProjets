import SumDemo from './SumDemo'
import IFDemo from './IFDemo'
import VlookupDemo from './VlookupDemo'
import SumifDemo from './SumifDemo'
import CountifDemo from './CountifDemo'
import IferrorDemo from './IferrorDemo'

const DEMOS = {
  sum: SumDemo,
  if: IFDemo,
  vlookup: VlookupDemo,
  sumif: SumifDemo,
  countif: CountifDemo,
  iferror: IferrorDemo,
}

export default function Demo({ id }) {
  const Component = DEMOS[id]
  if (!Component) return null
  return <Component />
}
