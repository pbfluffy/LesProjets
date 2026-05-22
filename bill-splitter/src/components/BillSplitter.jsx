import MemberSection from './MemberSection'
import FoodList from './FoodList'
import ExtrasSection from './ExtrasSection'
import ResultSection from './ResultSection'
import { useBillStore } from '../hooks/useBillStore'
import { useLang } from '../LangContext'
import appStyles from '../App.module.css'

const fieldsetReset = { border: 0, padding: 0, margin: 0, minInlineSize: 'auto' }

export default function BillSplitter({ sharedState, readOnly, onSaveBill }) {
  const { t } = useLang()
  const store = useBillStore(sharedState)
  const result = store.calculate()
  const snapshot = {
    billName: store.billName,
    members: store.members,
    foods: store.foods,
    vatEnabled: store.vatEnabled,
    serviceChargeEnabled: store.serviceChargeEnabled,
    serviceChargeRate: store.serviceChargeRate,
    promptPay: store.promptPay,
    bankInfo: store.bankInfo,
    notes: store.notes,
  }
  const handleSave = (onSaveBill && !readOnly) ? () => onSaveBill('split', snapshot) : undefined
  return (
    <div>
      <fieldset disabled={readOnly} style={fieldsetReset}>
        <input
          type="text"
          className={appStyles.billNameInput}
          value={store.billName}
          onChange={e => store.setBillName(e.target.value)}
          placeholder={t.billNamePlaceholder}
          maxLength={60}
        />
        <MemberSection members={store.members} onAdd={store.addMember} onRemove={store.removeMember} />
        <FoodList foods={store.foods} members={store.members} onAdd={store.addFood} onUpdate={store.updateFood} onToggleMember={store.toggleFoodMember} onRemove={store.removeFood} onSelectAll={store.setAllMembers} />
        <ExtrasSection vatEnabled={store.vatEnabled} onVatChange={store.setVatEnabled} serviceChargeEnabled={store.serviceChargeEnabled} onServiceChargeChange={store.setServiceChargeEnabled} serviceChargeRate={store.serviceChargeRate} onServiceChargeRateChange={store.setServiceChargeRate} promptPay={store.promptPay} onPromptPayChange={store.setPromptPay} bankInfo={store.bankInfo} onBankInfoChange={store.setBankInfo} notes={store.notes} onNotesChange={store.setNotes} />
      </fieldset>
      <ResultSection result={result} members={store.members} promptPay={store.promptPay} bankInfo={store.bankInfo} notes={store.notes} billName={store.billName} snapshot={snapshot} tab="split" onSave={handleSave} />
    </div>
  )
}
