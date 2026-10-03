import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type ClientDetail = {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  preferredContactMethod: string;
  communicationPreference: string;
  relationshipNotes: string;
};

type AccountDetail = {
  accountId: string;
  institution: string;
  accountType: string;
  estimatedAssets: number;
};

type TransferRecord = {
  transferId: string;
  transferAmount: number;
  stage: string;
  status: string;
  completionPercent: number;
  lastActivityAt: string;
  startedAt: string;
  hasUnresolvedClientQuestion: boolean;
};

type Requirement = {
  requirementId: string;
  displayName: string;
  required: boolean;
  status: string;
  blocksNextStage: boolean;
  requestedAt: string;
  completedAt: string | null;
};

type Interaction = {
  interactionId: string;
  summary: string;
  timestamp: string;
  direction: string;
  createdBy: string;
  type: string;
};

type RiskAssessment = {
  level: RiskLevel;
  score: number;
  reasons: string[];
};

type TransferDetail = {
  client: ClientDetail;
  account: AccountDetail;
  transfer: TransferRecord;
  requirements: Requirement[];
  interactions: Interaction[];
  risk: RiskAssessment;
};

type AnalysisCitation = {
  ref: string;
  source: string;
  quote: string;
};

type Analysis = {
  summary: string;
  riskExplanation: string;
  recommendedAction: string;
  nextSteps: string[];
  citations: AnalysisCitation[];
  meta: {
    retrievalQuery: string;
    sources: string[];
  };
};

type AnalysisStatus = "idle" | "loading" | "success" | "error";

type RequirementState = "done" | "missing" | "pending";

const RISK_LABELS: Record<RiskLevel, string> = {
  HIGH: "High risk",
  MEDIUM: "Medium risk",
  LOW: "Low risk",
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

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getRequirementState(status: string): RequirementState {
  const normalized = status.toUpperCase();

  if (normalized === "COMPLETE" || normalized === "VERIFIED") {
    return "done";
  }

  if (normalized === "MISSING") {
    return "missing";
  }

  return "pending";
}

async function readErrorMessage(response: Response) {
  try {
    const body: unknown = await response.json();

    if (body && typeof body === "object") {
      const { error, message } = body as { error?: unknown; message?: unknown };

      if (typeof error === "string" && error) {
        return error;
      }

      if (typeof message === "string" && message) {
        return message;
      }
    }
  } catch {
    // Non-JSON error body; fall through to the status-based message.
  }

  return `The analysis service responded with status ${response.status}.`;
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

type TransferDrawerProps = {
  clientName: string;
  detail: TransferDetail | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRetry: () => void;
};

function TransferDrawer({
  clientName,
  detail,
  loading,
  error,
  onClose,
  onRetry,
}: TransferDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const analysisHeadingRef = useRef<HTMLHeadingElement>(null);
  const analysisControllerRef = useRef<AbortController | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [analysisError, setAnalysisError] = useState("");

  useEffect(() => {
    closeButtonRef.current?.focus();

    return () => analysisControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (analysisStatus === "success") {
      analysisHeadingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      analysisHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [analysisStatus]);

  const runAnalysis = () => {
    if (!detail || analysisControllerRef.current) {
      return;
    }

    const controller = new AbortController();
    analysisControllerRef.current = controller;
    setAnalysisStatus("loading");
    setAnalysisError("");

    fetch(
      `${API_BASE}/api/transfers/${encodeURIComponent(detail.transfer.transferId)}/analyze`,
      { method: "POST", signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        return response.json() as Promise<Analysis>;
      })
      .then((data) => {
        setAnalysis(data);
        setAnalysisStatus("success");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setAnalysisError(
          err instanceof Error && err.message
            ? err.message
            : "Please check your connection and try again.",
        );
        setAnalysisStatus("error");
      })
      .finally(() => {
        if (analysisControllerRef.current === controller) {
          analysisControllerRef.current = null;
        }
      });
  };

  const scrollToAnalysis = () => {
    analysisHeadingRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    analysisHeadingRef.current?.focus({ preventScroll: true });
  };

  const blockers = useMemo(
    () =>
      detail
        ? detail.requirements.filter(
            (requirement) =>
              requirement.blocksNextStage &&
              getRequirementState(requirement.status) !== "done",
          )
        : [],
    [detail],
  );

  const sortedInteractions = useMemo(
    () =>
      detail
        ? [...detail.interactions].sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          )
        : [],
    [detail],
  );

  const displayName = detail?.client.name ?? clientName;
  const needsAttention =
    !!detail &&
    (blockers.length > 0 ||
      detail.transfer.hasUnresolvedClientQuestion ||
      detail.risk.level === "HIGH");
  const completion = detail ? clampPercent(detail.transfer.completionPercent) : 0;

  return (
    <div className="drawer-layer">
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />

      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header className="drawer-header">
          <div className="drawer-identity">
            <div className="drawer-avatar" aria-hidden="true">
              {getInitials(displayName)}
            </div>

            <div>
              <p className="drawer-eyebrow">Transfer detail</p>
              <h2 id="drawer-title">{displayName}</h2>
              {detail && (
                <p className="drawer-subtitle">
                  {detail.account.accountType} ·{" "}
                  {formatCurrency(detail.transfer.transferAmount)}
                </p>
              )}
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="drawer-close"
            onClick={onClose}
            aria-label="Close transfer detail"
          >
            ×
          </button>
        </header>

        <div className="drawer-body">
          {loading && (
            <div className="drawer-state" role="status" aria-live="polite">
              <span className="drawer-spinner" aria-hidden="true" />
              Loading transfer details…
            </div>
          )}

          {!loading && error && (
            <div className="drawer-state drawer-error" role="alert">
              <strong>We couldn't load this transfer.</strong>
              <span>{error}</span>
              <button
                type="button"
                className="drawer-secondary-button"
                onClick={onRetry}
                aria-label="Retry loading transfer detail"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && detail && (
            <>
              <section className="drawer-summary" aria-label="Transfer summary">
                <div className="drawer-summary-row">
                  <div>
                    <div className="drawer-label">Status</div>
                    <span className="status-badge drawer-status">
                      {formatStatus(detail.transfer.status)}
                    </span>
                  </div>

                  <div>
                    <div className="drawer-label">Stage</div>
                    <div className="drawer-value">
                      {formatStatus(detail.transfer.stage)}
                    </div>
                  </div>

                  <div>
                    <div className="drawer-label">Risk</div>
                    <span
                      className={`drawer-risk-badge ${detail.risk.level.toLowerCase()}`}
                    >
                      <span className="risk-dot" aria-hidden="true" />
                      {RISK_LABELS[detail.risk.level]}
                      <span className="drawer-risk-score">
                        Score {detail.risk.score}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="drawer-progress">
                  <div className="drawer-progress-label">
                    <span>Transfer completion</span>
                    <strong>{completion}%</strong>
                  </div>
                  <div
                    className="drawer-progress-track"
                    role="progressbar"
                    aria-label="Transfer completion"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={completion}
                  >
                    <div
                      className="drawer-progress-fill"
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                  <div className="drawer-meta">
                    Started {formatDate(detail.transfer.startedAt)} · Last
                    activity {formatDateTime(detail.transfer.lastActivityAt)}
                  </div>
                </div>
              </section>

              {needsAttention && (
                <section
                  className="drawer-attention"
                  aria-labelledby="attention-title"
                >
                  <h3 id="attention-title">
                    <span aria-hidden="true">!</span> Needs attention
                  </h3>

                  <ul>
                    {blockers.map((blocker) => (
                      <li key={blocker.requirementId}>
                        <strong>{blocker.displayName}</strong> is{" "}
                        {formatStatus(blocker.status).toLowerCase()} and blocks
                        the next stage.
                      </li>
                    ))}

                    {detail.transfer.hasUnresolvedClientQuestion && (
                      <li>
                        <strong>Unresolved client question</strong> — the
                        client is waiting on a response.
                      </li>
                    )}

                    {blockers.length === 0 &&
                      !detail.transfer.hasUnresolvedClientQuestion && (
                        <li>
                          This transfer is flagged as{" "}
                          <strong>high risk</strong>. Review the reasons below.
                        </li>
                      )}
                  </ul>
                </section>
              )}

              {analysis && analysisStatus === "success" && (
                <section
                  className="ai-analysis"
                  aria-labelledby="ai-analysis-title"
                >
                  <header className="ai-analysis-header">
                    <h3
                      id="ai-analysis-title"
                      ref={analysisHeadingRef}
                      tabIndex={-1}
                    >
                      <span className="ai-mark" aria-hidden="true">
                        ✦
                      </span>
                      AI Analysis
                    </h3>
                    <span className="ai-tag">AI-assisted</span>
                  </header>

                  <p className="ai-summary">{analysis.summary}</p>

                  <div className="ai-recommendation">
                    <h4>Recommended action</h4>
                    <p>{analysis.recommendedAction}</p>
                  </div>

                  <div className="ai-block">
                    <h4>Why this transfer is at risk</h4>
                    <p>{analysis.riskExplanation}</p>
                  </div>

                  {analysis.nextSteps.length > 0 && (
                    <div className="ai-block">
                      <h4>Next steps</h4>
                      <ol className="ai-steps">
                        {analysis.nextSteps.map((step, index) => (
                          <li key={`${index}-${step}`}>
                            <span className="ai-step-number" aria-hidden="true">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {analysis.citations.length > 0 && (
                    <div className="ai-block">
                      <h4>
                        Grounded in firm procedures
                        <span className="drawer-count">
                          {analysis.citations.length}{" "}
                          {analysis.citations.length === 1
                            ? "citation"
                            : "citations"}
                          {analysis.meta.sources.length > 0 &&
                            ` · ${analysis.meta.sources.length} ${
                              analysis.meta.sources.length === 1
                                ? "source"
                                : "sources"
                            }`}
                        </span>
                      </h4>
                      <ul className="ai-citations">
                        {analysis.citations.map((citation, index) => (
                          <li
                            key={`${citation.ref}-${index}`}
                            className="ai-citation"
                          >
                            <div className="ai-citation-source">
                              <span className="ai-citation-ref">
                                {citation.ref}
                              </span>
                              <span className="ai-citation-file">
                                {citation.source}
                              </span>
                            </div>
                            <blockquote>{citation.quote}</blockquote>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="ai-disclaimer">
                    AI-assisted analysis grounded in transfer data and firm
                    procedures. Advisor review required.
                  </p>
                </section>
              )}

              {detail.risk.reasons.length > 0 && (
                <section className="drawer-section">
                  <h3>Risk reasons</h3>
                  <ul className="drawer-chips">
                    {detail.risk.reasons.map((reason) => (
                      <li key={reason} className="drawer-chip">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="drawer-section">
                <h3>
                  Requirements
                  <span className="drawer-count">
                    {
                      detail.requirements.filter(
                        (requirement) =>
                          getRequirementState(requirement.status) === "done",
                      ).length
                    }
                    /{detail.requirements.length} complete
                  </span>
                </h3>

                {detail.requirements.length === 0 ? (
                  <p className="drawer-empty">No requirements on file.</p>
                ) : (
                  <ul className="requirement-list">
                    {detail.requirements.map((requirement) => {
                      const state = getRequirementState(requirement.status);

                      return (
                        <li
                          key={requirement.requirementId}
                          className={`requirement-item ${state} ${
                            requirement.blocksNextStage && state !== "done"
                              ? "blocking"
                              : ""
                          }`}
                        >
                          <span
                            className="requirement-icon"
                            aria-hidden="true"
                          >
                            {state === "done"
                              ? "✓"
                              : state === "missing"
                                ? "✕"
                                : "…"}
                          </span>

                          <div className="requirement-main">
                            <div className="requirement-name">
                              {requirement.displayName}
                              {!requirement.required && (
                                <span className="requirement-optional">
                                  Optional
                                </span>
                              )}
                            </div>
                            <div className="requirement-meta">
                              {requirement.completedAt
                                ? `Completed ${formatDate(requirement.completedAt)}`
                                : `Requested ${formatDate(requirement.requestedAt)}`}
                            </div>
                          </div>

                          <div className="requirement-tags">
                            <span className={`requirement-status ${state}`}>
                              {formatStatus(requirement.status)}
                            </span>
                            {requirement.blocksNextStage && (
                              <span className="requirement-blocker">
                                Blocks next stage
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="drawer-section">
                <h3>Recent interactions</h3>

                {sortedInteractions.length === 0 ? (
                  <p className="drawer-empty">No interactions recorded yet.</p>
                ) : (
                  <ol className="interaction-list">
                    {sortedInteractions.map((interaction) => (
                      <li
                        key={interaction.interactionId}
                        className="interaction-item"
                      >
                        <div className="interaction-meta">
                          <span className="interaction-type">
                            {formatStatus(interaction.type)}
                          </span>
                          <span>{formatStatus(interaction.direction)}</span>
                          <span>·</span>
                          <time dateTime={interaction.timestamp}>
                            {formatDateTime(interaction.timestamp)}
                          </time>
                        </div>
                        <p className="interaction-summary">
                          {interaction.summary}
                        </p>
                        <div className="interaction-author">
                          Logged by {interaction.createdBy}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="drawer-section">
                <h3>Client contact &amp; preferences</h3>

                {detail.transfer.hasUnresolvedClientQuestion && (
                  <div className="drawer-question-flag">
                    <span aria-hidden="true">?</span>
                    Client has an unresolved question
                  </div>
                )}

                <dl className="contact-grid">
                  <div>
                    <dt>Email</dt>
                    <dd>
                      {detail.client.email ? (
                        <a href={`mailto:${detail.client.email}`}>
                          {detail.client.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      {detail.client.phone ? (
                        <a href={`tel:${detail.client.phone}`}>
                          {detail.client.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Preferred contact</dt>
                    <dd>
                      {detail.client.preferredContactMethod
                        ? formatStatus(detail.client.preferredContactMethod)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Communication preference</dt>
                    <dd>{detail.client.communicationPreference || "—"}</dd>
                  </div>
                </dl>

                {detail.client.relationshipNotes && (
                  <p className="relationship-notes">
                    {detail.client.relationshipNotes}
                  </p>
                )}
              </section>
            </>
          )}
        </div>

        <footer className="drawer-footer">
          {analysisStatus === "loading" && (
            <div className="ai-status" role="status" aria-live="polite">
              <span className="drawer-spinner small" aria-hidden="true" />
              <span>
                <strong>Analyzing transfer…</strong>
                <span className="ai-status-detail">
                  Reviewing transfer facts and firm procedures
                </span>
              </span>
            </div>
          )}

          {analysisStatus === "error" && (
            <div className="ai-error" role="alert">
              <strong>Analysis couldn't be completed.</strong> {analysisError}
            </div>
          )}

          {analysisStatus === "success" ? (
            <button
              type="button"
              className="drawer-complete-button"
              onClick={scrollToAnalysis}
              aria-label="Analysis complete. Jump to AI analysis"
            >
              <span aria-hidden="true">✓</span> Analysis complete · View
            </button>
          ) : (
            <button
              type="button"
              className="drawer-primary-button"
              onClick={runAnalysis}
              disabled={!detail || loading || analysisStatus === "loading"}
              aria-busy={analysisStatus === "loading"}
              aria-label={
                analysisStatus === "loading"
                  ? "Analyzing transfer"
                  : analysisStatus === "error"
                    ? "Retry AI analysis"
                    : "Analyze this transfer with AI"
              }
            >
              {analysisStatus === "loading"
                ? "Analyzing transfer…"
                : analysisStatus === "error"
                  ? "Retry analysis"
                  : "✦ Analyze with AI"}
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

export default function App() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<"ALL" | RiskLevel>("ALL");
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(
    null,
  );
  const [detail, setDetail] = useState<TransferDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRequest, setDetailRequest] = useState(0);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const openTransfer = (transfer: Transfer, trigger: HTMLElement) => {
    lastTriggerRef.current = trigger;
    setDetailLoading(true);
    setSelectedTransfer(transfer);
  };

  const closeDrawer = useCallback(() => {
    setSelectedTransfer(null);
    setDetail(null);
    setDetailError("");
    setDetailLoading(false);
    lastTriggerRef.current?.focus();
  }, []);

  const selectedTransferId = selectedTransfer?.transferId ?? null;

  useEffect(() => {
    if (!selectedTransferId) {
      return;
    }

    const controller = new AbortController();

    setDetail(null);
    setDetailError("");
    setDetailLoading(true);

    fetch(
      `${API_BASE}/api/transfers/${encodeURIComponent(selectedTransferId)}`,
      { signal: controller.signal },
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "This transfer could not be found."
              : `The server responded with status ${response.status}.`,
          );
        }

        return response.json() as Promise<TransferDetail>;
      })
      .then((data) => {
        setDetail(data);
        setDetailLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setDetailError(
          err instanceof Error && err.message
            ? err.message
            : "Please check your connection and try again.",
        );
        setDetailLoading(false);
      });

    return () => controller.abort();
  }, [selectedTransferId, detailRequest]);

  useEffect(() => {
    if (!selectedTransferId) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedTransferId, closeDrawer]);

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
                          type="button"
                          className="row-action"
                          aria-label={`Open transfer details for ${transfer.clientName}`}
                          onClick={(event) =>
                            openTransfer(transfer, event.currentTarget)
                          }
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

      {selectedTransfer && (
        <TransferDrawer
          key={selectedTransfer.transferId}
          clientName={selectedTransfer.clientName}
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onClose={closeDrawer}
          onRetry={() => setDetailRequest((count) => count + 1)}
        />
      )}
    </div>
  );
}