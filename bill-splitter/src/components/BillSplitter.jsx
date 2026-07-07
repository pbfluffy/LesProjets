import MemberSection from './MemberSection'
import FoodList from './FoodList'
import ReceiptScanner from './ReceiptScanner'
import ExtrasSection from './ExtrasSection'
import ResultSection from './ResultSection'
import StickyBottomBar from './StickyBottomBar'
import { useBillStore } from '../hooks/useBillStore'
import { useLang } from '../LangContext'
import { symbolFor } from '../currencies'
import appStyles from '../App.module.css'

const fieldsetReset = { border: 0, padding: 0, margin: 0, minInlineSize: 'auto' }

export default function BillSplitter({ sharedState, readOnly, onSaveBill, onNewBill, savedPayees = [], onSavePayee, onRemovePayee, payeesEnabled }) {
  const { t } = useLang()
  const store = useBillStore(sharedState)
  const result = store.calculate()
  const snapshot = {
    billName: store.billName,
    members: store.members,
    billOwner: store.billOwner,
    foods: store.foods,
    vatEnabled: store.vatEnabled,
    serviceChargeEnabled: store.serviceChargeEnabled,
    serviceChargeRate: store.serviceChargeRate,
    promptPay: store.promptPay,
    bankInfo: store.bankInfo,
    notes: store.notes,
    roundTotalEnabled: store.roundTotalEnabled,
    currency: store.currency,
    billDiscounts: store.billDiscounts,
    // #91 mark-as-paid — persisted so it survives Save/reload/cloud sync.
    paid: [...store.paid],
  }
  const currencySymbol = symbolFor(store.currency)
  const handleSave = (onSaveBill && !readOnly) ? () => onSaveBill('split', snapshot) : undefined
  return (
    <div style={{ paddingBottom: 80 }}>
      <fieldset disabled={readOnly} style={fieldsetReset}>
        <ReceiptScanner onAddItems={store.addFoods} onSetBillName={(name) => { if (!store.billName.trim()) store.setBillName(name) }} onSetVat={store.setVatEnabled} onSetServiceCharge={store.setServiceChargeEnabled} onSetServiceChargeRate={store.setServiceChargeRate} onSetCurrency={store.setCurrency} onSetBillDiscounts={store.addBillDiscounts} />
        <input
          type="text"
          className={appStyles.billNameInput}
          value={store.billName}
          onChange={e => store.setBillName(e.target.value)}
          placeholder={t.billNamePlaceholder}
          maxLength={60}
        />

        <MemberSection members={store.members} onAdd={store.addMember} onRemove={store.removeMember} />
        <FoodList foods={store.foods} members={store.members} onAdd={store.addFood} onUpdate={store.updateFood} onToggleMember={store.toggleFoodMember} onRemove={store.removeFood} onDuplicate={store.duplicateFood} onRestore={store.restoreFood} onSelectAll={store.setAllMembers} currencySymbol={currencySymbol} />
        <ExtrasSection vatEnabled={store.vatEnabled} onVatChange={store.setVatEnabled} serviceChargeEnabled={store.serviceChargeEnabled} onServiceChargeChange={store.setServiceChargeEnabled} serviceChargeRate={store.serviceChargeRate} onServiceChargeRateChange={store.setServiceChargeRate} promptPay={store.promptPay} onPromptPayChange={store.setPromptPay} bankInfo={store.bankInfo} onBankInfoChange={store.setBankInfo} notes={store.notes} onNotesChange={store.setNotes} savedPayees={savedPayees} onSavePayee={onSavePayee} onRemovePayee={onRemovePayee} payeesEnabled={payeesEnabled && !readOnly} billDiscounts={store.billDiscounts} onAddBillDiscount={store.addBillDiscount} onUpdateBillDiscount={store.updateBillDiscount} onRemoveBillDiscount={store.removeBillDiscount} members={store.members} />
      </fieldset>
      <ResultSection result={result} members={store.members} foods={store.foods} promptPay={store.promptPay} bankInfo={store.bankInfo} notes={store.notes} billName={store.billName} snapshot={snapshot} tab="split" onSave={handleSave} onNewBill={!readOnly ? onNewBill : undefined} paid={store.paid} onTogglePaid={store.togglePaid} billOwner={store.billOwner} onBillOwnerChange={store.setBillOwner} roundTotalEnabled={store.roundTotalEnabled} onRoundTotalChange={store.setRoundTotalEnabled} readOnly={readOnly} currency={store.currency} currencySymbol={currencySymbol} />
      <StickyBottomBar memberCount={store.members.length} grandTotal={result.grandTotal} rawSubtotal={result.rawSubtotal} currencySymbol={currencySymbol} />
    </div>
  )
}
