.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 16px 0;
}

.head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.label {
  font-size: 12px;
  color: var(--muted);
  font-family: monospace;
}

.value {
  font-size: 12px;
  font-family: monospace;
}

.bar {
  background: var(--bg3);
  border-radius: 6px;
  height: 10px;
  overflow: hidden;
  margin: 8px 0;
}

.fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.4s ease, background 0.2s ease;
}

.delta {
  font-size: 11px;
  color: var(--muted);
  text-align: right;
  margin-top: 4px;
}

.macroRow {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.pill {
  flex: 1;
  background: var(--bg3);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}

.pillVal {
  font-size: 14px;
  font-weight: 700;
  font-family: monospace;
}

.pillLabel {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--muted);
  margin-top: 2px;
}
