import { useEffect, useMemo, useState } from "react";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

type Transfer = {
  transferId: string;
  clientName: string;
  accountType: string;
  transferAmount: number;
  status: string;
  riskLevel: RiskLevel;
  riskReasons: string[];
  daysSinceActivity: number;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

export default function App() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"ALL" | RiskLevel>("ALL");

  useEffect(() => {
    fetch(`${API_BASE}/api/transfers`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load transfers.");
        }

        return response.json();
      })
      .then((data) => {
        setTransfers(data);
        setLoading(false);
      })
      .catch(() => {
        setError("We couldn't load transfer data.");
        setLoading(false);
      });
  }, []);

  const metrics = useMemo(() => {
    const highRisk = transfers.filter(
      (transfer) => transfer.riskLevel === "HIGH",
    ).length;

    const needsAttention = transfers.filter(
      (transfer) =>
        transfer.riskLevel === "HIGH" ||
        transfer.riskLevel === "MEDIUM",
    ).length;

    const complete = transfers.filter(
      (transfer) => transfer.status === "COMPLETE",
    ).length;

    const assets = transfers.reduce(
      (sum, transfer) => sum + transfer.transferAmount,
      0,
    );

    return {
      highRisk,
      needsAttention,
      complete,
      assets,
    };
  }, [transfers]);

  const filteredTransfers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return transfers.filter((transfer) => {
      const matchesSearch =
        transfer.clientName.toLowerCase().includes(query) ||
        transfer.accountType.toLowerCase().includes(query);

      const matchesRisk =
        riskFilter === "ALL" || transfer.riskLevel === riskFilter;

      return matchesSearch && matchesRisk;
    });
  }, [transfers, search, riskFilter]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <div className="brand-mark">T</div>

            <div>
              <div className="brand-name">TransferReady</div>
              <div className="brand-subtitle">Advisor Intelligence</div>
            </div>
          </div>

          <nav className="nav">
            <button className="nav-item active">
              <span className="nav-icon">⌂</span>
              Dashboard
            </button>

            <button className="nav-item">
              <span className="nav-icon">⇄</span>
              Transfers
            </button>

            <button className="nav-item">
              <span className="nav-icon">◫</span>
              Reports
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="advisor-avatar">AR</div>

          <div>
            <div className="advisor-name">Alex Rivera</div>
            <div className="advisor-role">Financial Advisor</div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="eyebrow">TRANSFER OPERATIONS</p>
            <h1>Good evening, Alex.</h1>
            <p className="header-copy">
              Here's where your client transfers need attention today.
            </p>
          </div>

          <div className="system-status">
            <span className="status-dot" />
            Live data
          </div>
        </header>

        <section className="metrics-grid">
          <article className="metric-card">
            <div className="metric-label">Total transfers</div>
            <div className="metric-value">{transfers.length}</div>
            <div className="metric-caption">Active transfer book</div>
          </article>

          <article className="metric-card danger-card">
            <div className="metric-label">High risk</div>
            <div className="metric-value">{metrics.highRisk}</div>
            <div className="metric-caption danger-text">
              Immediate attention recommended
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Needs attention</div>
            <div className="metric-value">{metrics.needsAttention}</div>
            <div className="metric-caption">High + medium risk</div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Transfer assets</div>
            <div className="metric-value metric-currency">
              {formatCurrency(metrics.assets)}
            </div>
            <div className="metric-caption">
              {metrics.complete} transfers complete
            </div>
          </article>
        </section>

        <section className="transfer-section">
          <div className="section-heading">
            <div>
              <h2>Client transfers</h2>
              <p>
                Prioritized automatically by transfer risk and recent activity.
              </p>
            </div>

            <div className="result-count">
              {filteredTransfers.length} results
            </div>
          </div>

          <div className="toolbar">
            <div className="search-wrapper">
              <span className="search-icon">⌕</span>
              <input
                type="search"
                placeholder="Search clients or account types..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="filter-group">
              {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => (
                <button
                  key={level}
                  className={`filter-button ${
                    riskFilter === level ? "selected" : ""
                  }`}
                  onClick={() => setRiskFilter(level)}
                >
                  {level === "ALL"
                    ? "All"
                    : level.charAt(0) + level.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="state-message">Loading client transfers…</div>
          )}

          {error && <div className="state-message error-message">{error}</div>}

          {!loading && !error && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Account</th>
                    <th>Assets</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Last activity</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {filteredTransfers.map((transfer) => (
                    <tr key={transfer.transferId}>
                      <td>
                        <div className="client-cell">
                          <div className="client-avatar">
                            {getInitials(transfer.clientName)}
                          </div>

                          <div>
                            <div className="client-name">
                              {transfer.clientName}
                            </div>
                            <div className="transfer-id">
                              {transfer.transferId.replace("TRANSFER#", "TR-")}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>{transfer.accountType}</td>

                      <td className="amount-cell">
                        {formatCurrency(transfer.transferAmount)}
                      </td>

                      <td>
                        <span className="status-badge">
                          {formatStatus(transfer.status)}
                        </span>
                      </td>

                      <td>
                        <div className="risk-cell">
                          <span
                            className={`risk-badge ${transfer.riskLevel.toLowerCase()}`}
                          >
                            <span className="risk-dot" />
                            {transfer.riskLevel}
                          </span>

                          {transfer.riskReasons[0] && (
                            <span className="risk-reason">
                              {transfer.riskReasons[0]}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={
                            transfer.daysSinceActivity >= 7
                              ? "stale-activity"
                              : ""
                          }
                        >
                          {transfer.daysSinceActivity === 1
                            ? "1 day ago"
                            : `${transfer.daysSinceActivity} days ago`}
                        </span>
                      </td>

                      <td>
                        <button
                          className="row-action"
                          aria-label={`Open ${transfer.clientName}`}
                        >
                          →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTransfers.length === 0 && (
                <div className="empty-state">
                  No transfers match your current filters.
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}