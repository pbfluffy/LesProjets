import MemberSection from './MemberSection'
import FoodList from './FoodList'
import ReceiptScanner from './ReceiptScanner'
import ExtrasSection from './ExtrasSection'
import ResultSection from './ResultSection'
import StickyBottomBar from './StickyBottomBar'
import { useBillStore } from '../hooks/useBillStore'
import { useLang } from '../LangContext'
import { CURRENCIES, symbolFor } from '../currencies'
import appStyles from '../App.module.css'

const fieldsetReset = { border: 0, padding: 0, margin: 0, minInlineSize: 'auto' }

export default function BillSplitter({ sharedState, readOnly, onSaveBill, savedPayees = [], onSavePayee, onRemovePayee, payeesEnabled }) {
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
    roundTotalEnabled: store.roundTotalEnabled,
    currency: store.currency,
  }
  const currencySymbol = symbolFor(store.currency)
  const handleSave = (onSaveBill && !readOnly) ? () => onSaveBill('split', snapshot) : undefined
  return (
    <div style={{ paddingBottom: 80 }}>
      <fieldset disabled={readOnly} style={fieldsetReset}>
        <ReceiptScanner onAddItems={store.addFoods} onSetBillName={(name) => { if (!store.billName.trim()) store.setBillName(name) }} onSetVat={store.setVatEnabled} onSetServiceCharge={store.setServiceChargeEnabled} onSetServiceChargeRate={store.setServiceChargeRate} onSetCurrency={store.setCurrency} />
        <input
          type="text"
          className={appStyles.billNameInput}
          value={store.billName}
          onChange={e => store.setBillName(e.target.value)}
          placeholder={t.billNamePlaceholder}
          maxLength={60}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px 0 8px' }}>
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => store.setCurrency(c.code)}
              style={{
                fontSize: 12,
                padding: '3px 10px',
                borderRadius: 999,
                border: '0.5px solid',
                borderColor: store.currency === c.code ? 'var(--color-text)' : 'var(--color-border)',
                background: store.currency === c.code ? 'var(--color-text)' : 'transparent',
                color: store.currency === c.code ? 'var(--color-surface)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        <MemberSection members={store.members} onAdd={store.addMember} onRemove={store.removeMember} />
        <FoodList foods={store.foods} members={store.members} onAdd={store.addFood} onUpdate={store.updateFood} onToggleMember={store.toggleFoodMember} onRemove={store.removeFood} onSelectAll={store.setAllMembers} currencySymbol={currencySymbol} />
        <ExtrasSection vatEnabled={store.vatEnabled} onVatChange={store.setVatEnabled} serviceChargeEnabled={store.serviceChargeEnabled} onServiceChargeChange={store.setServiceChargeEnabled} serviceChargeRate={store.serviceChargeRate} onServiceChargeRateChange={store.setServiceChargeRate} promptPay={store.promptPay} onPromptPayChange={store.setPromptPay} bankInfo={store.bankInfo} onBankInfoChange={store.setBankInfo} notes={store.notes} onNotesChange={store.setNotes} savedPayees={savedPayees} onSavePayee={onSavePayee} onRemovePayee={onRemovePayee} payeesEnabled={payeesEnabled && !readOnly} />
      </fieldset>
      <ResultSection result={result} members={store.members} promptPay={store.promptPay} bankInfo={store.bankInfo} notes={store.notes} billName={store.billName} snapshot={snapshot} tab="split" onSave={handleSave} initialPaid={sharedState?.paid} roundTotalEnabled={store.roundTotalEnabled} onRoundTotalChange={store.setRoundTotalEnabled} readOnly={readOnly} currency={store.currency} currencySymbol={currencySymbol} />
      <StickyBottomBar memberCount={store.members.length} grandTotal={result.grandTotal} currencySymbol={currencySymbol} />
    </div>
  )
}
