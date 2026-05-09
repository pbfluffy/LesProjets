import MemberSection from './MemberSection'
import FoodList from './FoodList'
import ExtrasSection from './ExtrasSection'
import ResultSection from './ResultSection'
import { useBillStore } from '../hooks/useBillStore'

const fieldsetReset = { border: 0, padding: 0, margin: 0, minInlineSize: 'auto' }

export default function BillSplitter({ sharedState, readOnly }) {
  const store = useBillStore(sharedState)
  const result = store.calculate()
  const snapshot = {
    members: store.members,
    foods: store.foods,
    vatEnabled: store.vatEnabled,
    serviceChargeEnabled: store.serviceChargeEnabled,
    promptPay: store.promptPay,
    bankInfo: store.bankInfo,
    notes: store.notes,
  }
  return (
    <div>
      <fieldset disabled={readOnly} style={fieldsetReset}>
        <MemberSection members={store.members} onAdd={store.addMember} onRemove={store.removeMember} />
        <FoodList foods={store.foods} members={store.members} onAdd={store.addFood} onUpdate={store.updateFood} onToggleMember={store.toggleFoodMember} onRemove={store.removeFood} onSelectAll={store.setAllMembers} />
        <ExtrasSection vatEnabled={store.vatEnabled} onVatChange={store.setVatEnabled} serviceChargeEnabled={store.serviceChargeEnabled} onServiceChargeChange={store.setServiceChargeEnabled} promptPay={store.promptPay} onPromptPayChange={store.setPromptPay} bankInfo={store.bankInfo} onBankInfoChange={store.setBankInfo} notes={store.notes} onNotesChange={store.setNotes} />
      </fieldset>
      <ResultSection result={result} members={store.members} promptPay={store.promptPay} bankInfo={store.bankInfo} notes={store.notes} snapshot={snapshot} tab="split" />
    </div>
  )
}
