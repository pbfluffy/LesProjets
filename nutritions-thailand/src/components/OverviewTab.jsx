import { useLang } from '../LangContext.jsx';
import {
  ACTIVITY,
  calcBMR,
  estimateBodyComp,
  getBMIBand,
} from '../data/constants.js';
import CaloriesCard from './CaloriesCard.jsx';
import DateSwitcher from './DateSwitcher.jsx';
import FoodLog from './FoodLog.jsx';
import StatCard from './StatCard.jsx';
import WaterTracker from './WaterTracker.jsx';
import styles from './OverviewTab.module.css';

export default function OverviewTab({ store }) {
  const { t } = useLang();
  const { stats, log, water, totals, dateKey } = store;

  const bmr = calcBMR(stats.weight, stats.height, stats.age, stats.gender);
  const act = ACTIVITY.find((a) => a.k === stats.activity) ?? ACTIVITY[2];
  const tdee = Math.round(bmr * act.mult);
  const target = tdee - stats.deficit;
  const bmi = stats.weight / (stats.height / 100) ** 2;
  const band = getBMIBand(bmi);
  const { leanMass, estimatedBodyFat } = estimateBodyComp(stats.weight, bmi);

  return (
    <>
      <DateSwitcher
        dateKey={dateKey}
        onPrev={() => store.shiftDate(-1)}
        onNext={() => store.shiftDate(1)}
        onToday={store.goToday}
      />

      <div className={styles.statRow}>
        <StatCard
          label={t('stat.tdee')}
          value={tdee}
          unit={t('stat.tdeeUnit')}
          color="var(--yellow)"
        />
        <StatCard
          label={t('stat.target')}
          value={target}
          unit={t('stat.targetUnit')}
          color="var(--accent)"
        />
        <StatCard
          label={t('stat.bmi')}
          value={bmi.toFixed(1)}
          unit={t(band.textKey)}
          color={band.color}
        />
        <StatCard
          label={t('stat.lean')}
          value={`${leanMass}kg`}
          unit={t('stat.bfNote', { bf: estimatedBodyFat })}
          color="var(--green)"
        />
      </div>

      <CaloriesCard eaten={Math.round(totals.kcal)} target={target} totals={totals} />
      <WaterTracker value={water} onChange={store.setWater} />
      <FoodLog log={log} onRemove={store.removeFromLog} />
    </>
  );
}
