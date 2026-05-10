import { TREE_NODES } from '../../data/skill-tree'
import { FORMULAS_BY_ID } from '../../data/formulas'
import NodeCard from './NodeCard'
import styles from './SkillTree.module.css'

export default function SkillTree({ onSelect }) {
  // Group nodes by tier
  const tiers = TREE_NODES.reduce((acc, n) => {
    acc[n.tier] = acc[n.tier] || []
    acc[n.tier].push(n)
    return acc
  }, {})
  const tierKeys = Object.keys(tiers).map(Number).sort((a, b) => a - b)

  return (
    <div className={styles.tree}>
      {tierKeys.map((tier, idx) => {
        const nodes = tiers[tier].sort((a, b) => a.col - b.col)
        // Adapt grid to node count for nicer mobile flow
        const cols = nodes.length
        return (
          <div key={tier} className={styles.tierWrap}>
            {idx > 0 && <div className={styles.connector} aria-hidden="true" />}
            <div
              className={styles.tier}
              style={{
                gridTemplateColumns: `repeat(${Math.min(cols, 3)}, minmax(0, 1fr))`,
              }}
            >
              {nodes.map(node => (
                <NodeCard
                  key={node.id}
                  node={node}
                  formula={FORMULAS_BY_ID[node.id]}
                  locked={false /* Phase 1: all unlocked */}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
