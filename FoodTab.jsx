.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 16px 0;
}

.title {
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 12px;
  font-weight: 700;
}

.empty {
  text-align: center;
  padding: 32px 16px;
  color: var(--muted);
  font-size: 13px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.row:last-child {
  border-bottom: none;
}

.name {
  font-size: 13px;
}

.macros {
  font-size: 11px;
  color: var(--muted);
  font-family: monospace;
}

.right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kcal {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
  font-family: monospace;
}

.removeBtn {
  padding: 5px 10px;
  font-size: 12px;
  border-radius: 6px;
  background: rgba(239, 71, 111, 0.15);
  color: var(--red);
  border: 1px solid rgba(239, 71, 111, 0.3);
  cursor: pointer;
  transition: opacity 0.2s;
}

.removeBtn:hover {
  opacity: 0.8;
}
