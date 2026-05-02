import MemberSection from './MemberSection'
import FoodList from './FoodList'
import ExtrasSection from './ExtrasSection'
import ResultSection from './ResultSection'
import { useBillStore } from '../hooks/useBillStore'

export default function BillSplitter() {
  const store = useBillStore()
  const result = store.calculate()
  return (
    <div>
      <MemberSection members={store.members} onAdd={store.addMember} onRemove={store.removeMember} />
      <FoodList foods={store.foods} members={store.members} onAdd={store.addFood} onUpdate={store.updateFood} onToggleMember={store.toggleFoodMember} onRemove={store.removeFood} onSelectAll={store.setAllMembers} />
      <ExtrasSection vatEnabled={store.vatEnabled} onVatChange={store.setVatEnabled} serviceChargeEnabled={store.serviceChargeEnabled} onServiceChargeChange={store.setServiceChargeEnabled} promptPay={store.promptPay} onPromptPayChange={store.setPromptPay} bankInfo={store.bankInfo} onBankInfoChange={store.setBankInfo} notes={store.notes} onNotesChange={store.setNotes} />
      <ResultSection result={result} members={store.members} promptPay={store.promptPay} bankInfo={store.bankInfo} notes={store.notes} />
    </div>
  )
}
