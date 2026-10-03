import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { HeaderStripe, HeroChevrons, Icon, IconSprite, LplMark } from "./Icons";
import "./index.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const CURRENT_ADVISOR = {
  name: "Alex Rivera",
  firstName: "Alex",
  role: "Financial Advisor",
};

const ADVISOR_NAME_PLACEHOLDER = "[Advisor name]";

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

type FollowUpDraft = {
  subject: string;
  body: string;
  channel: string;
};

type FollowUpStatus = "idle" | "loading" | "success" | "error";

type CopyStatus = "idle" | "copied" | "error";

type RequirementState = "done" | "missing" | "pending";

type TransferStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "WAITING_ON_CLIENT"
  | "INTERNAL_REVIEW"
  | "CUSTODIAN_PROCESSING"
  | "COMPLETE";

type ReportsData = {
  totalTransfers: number;
  byStatus: Record<TransferStatus, number>;
  byRisk: Record<RiskLevel, number>;
  blockedCount: number;
  stalledCount: number;
  totalTransferAmount: number;
  atRiskTransferAmount: number;
  avgDaysSinceActivity: number;
  /** COMPLETE / total, expressed as 0..1. */
  completionRate: number;
  attentionNeeded: Transfer[];
};

type ReportsStatus = "idle" | "loading" | "success" | "error";

type View = "dashboard" | "transfers" | "reports";

const RISK_LABELS: Record<RiskLevel, string> = {
  HIGH: "High risk",
  MEDIUM: "Medium risk",
  LOW: "Low risk",
};

const RISK_ORDER: RiskLevel[] = ["HIGH", "MEDIUM", "LOW"];

// Pipeline order, so the status bars read left-to-right as transfer progress.
const STATUS_ORDER: TransferStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING_ON_CLIENT",
  "INTERNAL_REVIEW",
  "CUSTODIAN_PROCESSING",
  "COMPLETE",
];

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

  // RECEIVED counts as done for the advisor: the client has delivered it.
  if (
    normalized === "COMPLETE" ||
    normalized === "VERIFIED" ||
    normalized === "RECEIVED"
  ) {
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

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Copy command was rejected.");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

const BOLD_PATTERN = /\*\*(.+?)\*\*/g;

// Builds editor DOM from a plain-text draft, turning only **bold** spans into
// <strong>. Text is assigned via textContent so model output is never parsed
// as HTML.
function renderDraftBody(container: HTMLElement, body: string) {
  container.replaceChildren();

  body
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((line) => {
      const lineElement = document.createElement("div");
      const segments = line.split(BOLD_PATTERN);

      segments.forEach((segment, index) => {
        if (!segment) {
          return;
        }

        if (index % 2 === 1) {
          const strong = document.createElement("strong");
          strong.textContent = segment;
          lineElement.appendChild(strong);
        } else {
          lineElement.appendChild(
            document.createTextNode(segment.replace(/\*\*/g, "")),
          );
        }
      });

      if (!lineElement.hasChildNodes()) {
        lineElement.appendChild(document.createElement("br"));
      }

      container.appendChild(lineElement);
    });
}

const BLOCK_TAGS = new Set(["DIV", "P", "LI"]);

// Serializes the editor back to plain text: one line per block element or
// <br>, with all formatting dropped.
function readDraftBody(container: HTMLElement) {
  let text = "";

  const walk = (node: Node) => {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent ?? "";
        return;
      }

      if (!(child instanceof HTMLElement)) {
        return;
      }

      if (child.tagName === "BR") {
        text += "\n";
        return;
      }

      const isBlock = BLOCK_TAGS.has(child.tagName);

      if (isBlock && text && !text.endsWith("\n")) {
        text += "\n";
      }

      walk(child);

      if (isBlock && !text.endsWith("\n")) {
        text += "\n";
      }
    });
  };

  walk(container);

  return text
    .replace(/\u00a0/g, " ")
    .replace(/\*\*/g, "")
    .replace(/\s+$/, "");
}

// Fills in the signature placeholder the model leaves in generated drafts.
// Only the exact placeholder is replaced; the rest of the text is untouched.
function fillAdvisorPlaceholder(text: string) {
  return text.split(ADVISOR_NAME_PLACEHOLDER).join(CURRENT_ADVISOR.name);
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function shareOf(part: number, total: number) {
  return total > 0 ? (part / total) * 100 : 0;
}

function formatDays(days: number) {
  return days === 1 ? "1 day" : `${days} days`;
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
  const followUpHeadingRef = useRef<HTMLHeadingElement>(null);
  const followUpControllerRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const [followUp, setFollowUp] = useState<FollowUpDraft | null>(null);
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpStatus>("idle");
  const [followUpError, setFollowUpError] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const draftEditorRef = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [showAllInteractions, setShowAllInteractions] = useState(false);

  useEffect(() => {
    closeButtonRef.current?.focus();

    return () => {
      analysisControllerRef.current?.abort();
      followUpControllerRef.current?.abort();

      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (followUp && draftEditorRef.current) {
      renderDraftBody(draftEditorRef.current, followUp.body);
    }
  }, [followUp]);

  useEffect(() => {
    if (followUpStatus === "success") {
      followUpHeadingRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      followUpHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [followUpStatus]);

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

  const generateFollowUp = () => {
    if (!detail || followUpControllerRef.current) {
      return;
    }

    const controller = new AbortController();
    followUpControllerRef.current = controller;
    setFollowUpStatus("loading");
    setFollowUpError("");

    fetch(
      `${API_BASE}/api/transfers/${encodeURIComponent(detail.transfer.transferId)}/follow-up`,
      { method: "POST", signal: controller.signal },
    )
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readErrorMessage(response));
        }

        return response.json() as Promise<FollowUpDraft>;
      })
      .then((data) => {
        setFollowUp({ ...data, body: fillAdvisorPlaceholder(data.body) });
        setDraftSubject(data.subject);
        setCopyStatus("idle");
        setFollowUpStatus("success");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setFollowUpError(
          err instanceof Error && err.message
            ? err.message
            : "Please check your connection and try again.",
        );
        setFollowUpStatus("error");
      })
      .finally(() => {
        if (followUpControllerRef.current === controller) {
          followUpControllerRef.current = null;
        }
      });
  };

  const scrollToFollowUp = () => {
    followUpHeadingRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    followUpHeadingRef.current?.focus({ preventScroll: true });
  };

  const copyDraft = () => {
    const body = draftEditorRef.current
      ? readDraftBody(draftEditorRef.current)
      : "";
    const email = `Subject: ${draftSubject}\n\n${body}`;

    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }

    copyText(email)
      .then(() => setCopyStatus("copied"))
      .catch(() => setCopyStatus("error"))
      .finally(() => {
        copyTimerRef.current = window.setTimeout(() => {
          setCopyStatus("idle");
          copyTimerRef.current = null;
        }, 2200);
      });
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

  // Requirements that actually apply to this transfer, outstanding ones first.
  const trackedRequirements = useMemo(
    () =>
      detail
        ? detail.requirements
            .filter((r) => r.status.toUpperCase() !== "NOT_REQUIRED")
            .sort(
              (a, b) =>
                Number(getRequirementState(a.status) === "done") -
                Number(getRequirementState(b.status) === "done"),
            )
        : [],
    [detail],
  );
  const receivedCount = trackedRequirements.filter(
    (r) => getRequirementState(r.status) === "done",
  ).length;
  const completion = trackedRequirements.length
    ? clampPercent(Math.round((receivedCount / trackedRequirements.length) * 100))
    : 0;

  const daysSinceActivity = detail
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(detail.transfer.lastActivityAt).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  // Outbound touches since the client last replied, e.g. unanswered reminders.
  const unansweredFollowUps = (() => {
    let count = 0;
    for (const interaction of sortedInteractions) {
      if (interaction.direction.toUpperCase() === "INBOUND") break;
      count += 1;
    }
    return count;
  })();

  // One deduplicated list replacing the old callout + "Risk reasons" chips.
  const attentionItems: { key: string; content: ReactNode }[] = [];
  if (detail) {
    for (const blocker of blockers) {
      attentionItems.push({
        key: `block-${blocker.requirementId}`,
        content: (
          <>
            <strong>{blocker.displayName}</strong>{" "}
            {formatStatus(blocker.status).toLowerCase()} — blocks next stage
          </>
        ),
      });
    }
    for (const r of trackedRequirements) {
      if (
        r.required &&
        !r.blocksNextStage &&
        getRequirementState(r.status) === "missing"
      ) {
        attentionItems.push({
          key: `missing-${r.requirementId}`,
          content: (
            <>
              <strong>{r.displayName}</strong> missing
            </>
          ),
        });
      }
    }
    if (detail.transfer.status !== "COMPLETE" && daysSinceActivity >= 5) {
      attentionItems.push({
        key: "idle",
        content: (
          <>
            No activity in {daysSinceActivity} days
            {unansweredFollowUps > 0 &&
              ` (${unansweredFollowUps} ${
                unansweredFollowUps === 1 ? "follow-up" : "follow-ups"
              } sent, no reply)`}
          </>
        ),
      });
    }
    if (detail.transfer.hasUnresolvedClientQuestion) {
      attentionItems.push({
        key: "question",
        content: (
          <>
            <strong>Unresolved client question</strong> — client is waiting on
            a response
          </>
        ),
      });
    }
    if (attentionItems.length === 0 && detail.risk.level === "HIGH") {
      attentionItems.push({
        key: "high",
        content: (
          <>
            Flagged as <strong>high risk</strong>
          </>
        ),
      });
    }
  }

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
          <HeaderStripe />
          <div className="drawer-identity">
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
                <div className="drawer-summary-pills">
                  <span className="status-badge drawer-status">
                    {formatStatus(detail.transfer.status)}
                  </span>
                  <span className="drawer-stage-pill">
                    {formatStatus(detail.transfer.stage)}
                  </span>
                  <span
                    className={`drawer-risk-badge ${detail.risk.level.toLowerCase()}`}
                  >
                    <span className="risk-dot" aria-hidden="true" />
                    {RISK_LABELS[detail.risk.level]}
                  </span>
                </div>

                <div className="drawer-meta">
                  Last activity{" "}
                  <strong
                    className={daysSinceActivity >= 5 ? "drawer-meta-alert" : ""}
                  >
                    {daysSinceActivity === 0
                      ? "today"
                      : `${daysSinceActivity} ${
                          daysSinceActivity === 1 ? "day" : "days"
                        } ago`}
                  </strong>{" "}
                  · Started {formatDate(detail.transfer.startedAt)}
                </div>

                {trackedRequirements.length > 0 && (
                  <div className="drawer-progress">
                    <div className="drawer-progress-label">
                      <span>Requirements received</span>
                      <strong>
                        {receivedCount} of {trackedRequirements.length}
                      </strong>
                    </div>
                    <div
                      className="drawer-progress-track"
                      role="progressbar"
                      aria-label="Requirements received"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={completion}
                      aria-valuetext={`${receivedCount} of ${trackedRequirements.length} requirements received`}
                    >
                      <div
                        className="drawer-progress-fill"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>
                )}
              </section>

              {attentionItems.length > 0 && (
                <section
                  className="drawer-attention"
                  aria-labelledby="attention-title"
                >
                  <h3 id="attention-title">
                    <Icon name="alert" /> Needs attention
                  </h3>

                  <ul>
                    {attentionItems.map((item) => (
                      <li key={item.key}>{item.content}</li>
                    ))}
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

              {followUp && followUpStatus === "success" && (
                <section
                  className="followup-panel"
                  aria-labelledby="followup-title"
                >
                  <header className="followup-header">
                    <div>
                      <h3
                        id="followup-title"
                        ref={followUpHeadingRef}
                        tabIndex={-1}
                      >
                        Follow-Up Draft
                      </h3>
                      <p className="followup-subtitle">
                        Not sent · Review and edit before using
                      </p>
                    </div>

                    <div className="followup-tags">
                      <span className="followup-draft-tag">Draft</span>
                      <span className="ai-tag">AI-assisted</span>
                    </div>
                  </header>

                  <p className="followup-disclaimer">
                    Draft for advisor review only. TransferReady does not send
                    client communications or provide investment advice.
                  </p>

                  <dl className="followup-meta">
                    <div>
                      <dt>Channel</dt>
                      <dd>{formatStatus(followUp.channel || "email")}</dd>
                    </div>
                    <div>
                      <dt>Recipient</dt>
                      <dd>
                        {detail.client.name}
                        {detail.client.email && (
                          <span className="followup-email">
                            {" "}
                            &lt;{detail.client.email}&gt;
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="followup-field">
                    <label htmlFor="followup-subject">Subject</label>
                    <input
                      id="followup-subject"
                      type="text"
                      value={draftSubject}
                      onChange={(event) => setDraftSubject(event.target.value)}
                    />
                  </div>

                  <div className="followup-field">
                    <label
                      id="followup-body-label"
                      onClick={() => draftEditorRef.current?.focus()}
                    >
                      Message
                    </label>
                    <div
                      id="followup-body"
                      ref={draftEditorRef}
                      className="followup-editor"
                      contentEditable
                      role="textbox"
                      aria-multiline="true"
                      aria-labelledby="followup-body-label"
                      spellCheck
                      suppressContentEditableWarning
                      onPaste={(event) => {
                        event.preventDefault();
                        document.execCommand(
                          "insertText",
                          false,
                          event.clipboardData.getData("text/plain"),
                        );
                      }}
                    />
                  </div>

                  <div className="followup-actions">
                    <span
                      className={`followup-copy-status ${copyStatus}`}
                      role="status"
                      aria-live="polite"
                    >
                      {copyStatus === "copied" &&
                        "Copied to clipboard. Nothing has been sent."}
                      {copyStatus === "error" &&
                        "Couldn't access the clipboard. Select the text and copy it manually."}
                    </span>

                    <button
                      type="button"
                      className="followup-copy-button"
                      onClick={copyDraft}
                      aria-label="Copy email subject and message to clipboard"
                    >
                      {copyStatus === "copied" ? (
                        <>
                          <span aria-hidden="true">✓</span> Copied
                        </>
                      ) : (
                        "Copy Email"
                      )}
                    </button>
                  </div>
                </section>
              )}

              <section className="drawer-section">
                <h3>
                  Requirements
                  <span className="drawer-count">
                    {receivedCount} of {trackedRequirements.length} received
                  </span>
                </h3>

                {trackedRequirements.length === 0 ? (
                  <p className="drawer-empty">No requirements on file.</p>
                ) : (
                  <ul className="requirement-list">
                    {trackedRequirements.map((requirement) => {
                      const state = getRequirementState(requirement.status);
                      const isDone = state === "done";

                      return (
                        <li
                          key={requirement.requirementId}
                          className={`requirement-item ${state} ${
                            isDone ? "compact" : ""
                          } ${
                            requirement.blocksNextStage && !isDone
                              ? "blocking"
                              : ""
                          }`}
                        >
                          <span
                            className="requirement-icon"
                            aria-hidden="true"
                          >
                            <Icon name={isDone ? "doc-ok" : "doc"} size="lg" />
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
                            {!isDone && (
                              <div className="requirement-meta">
                                Requested {formatDate(requirement.requestedAt)}
                              </div>
                            )}
                          </div>

                          <div className="requirement-tags">
                            <span className={`requirement-status ${state}`}>
                              {formatStatus(requirement.status)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="drawer-section">
                <h3>Last interaction</h3>

                {sortedInteractions.length === 0 ? (
                  <p className="drawer-empty">No interactions recorded yet.</p>
                ) : (
                  <>
                    <ol className="interaction-list" id="interaction-list">
                      {(showAllInteractions
                        ? sortedInteractions
                        : sortedInteractions.slice(0, 1)
                      ).map((interaction) => (
                        <li
                          key={interaction.interactionId}
                          className="interaction-item"
                        >
                          <Icon
                            size="lg"
                            name={
                              interaction.type === "PHONE_CALL"
                                ? "phone"
                                : interaction.type.startsWith("DOCUMENT")
                                  ? "doc"
                                  : interaction.type === "INTERNAL_NOTE"
                                    ? "talk"
                                    : "envelope"
                            }
                          />
                          <div>
                          <div className="interaction-meta">
                            <time dateTime={interaction.timestamp}>
                              {formatDate(interaction.timestamp)}
                            </time>
                            <span>·</span>
                            <span className="interaction-type">
                              {formatStatus(interaction.type)}
                            </span>
                          </div>
                          <p className="interaction-summary">
                            {interaction.summary}
                          </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    {sortedInteractions.length > 1 && (
                      <button
                        type="button"
                        className="drawer-link-button"
                        aria-expanded={showAllInteractions}
                        aria-controls="interaction-list"
                        onClick={() => setShowAllInteractions((v) => !v)}
                      >
                        {showAllInteractions
                          ? "Show less"
                          : `Show all (${sortedInteractions.length})`}
                      </button>
                    )}
                  </>
                )}
              </section>

              <section className="drawer-section">
                <h3>Contact</h3>

                <div className="contact-compact">
                  {(() => {
                    const prefersPhone =
                      detail.client.preferredContactMethod?.toUpperCase() ===
                      "PHONE";
                    const value = prefersPhone
                      ? detail.client.phone
                      : detail.client.email;
                    const href = prefersPhone
                      ? `tel:${detail.client.phone}`
                      : `mailto:${detail.client.email}`;
                    return (
                      <p className="contact-row">
                        <Icon name={prefersPhone ? "phone" : "envelope"} />
                        <span>
                          Prefers{" "}
                          <strong>{prefersPhone ? "phone" : "email"}</strong>
                          {value && (
                            <>
                              {" · "}
                              <a href={href}>{value}</a>
                            </>
                          )}
                        </span>
                      </p>
                    );
                  })()}

                  {detail.client.communicationPreference && (
                    <p className="contact-preference">
                      “{detail.client.communicationPreference}”
                    </p>
                  )}

                  {detail.client.relationshipNotes && (
                    <p className="contact-note">
                      Note: {detail.client.relationshipNotes}
                    </p>
                  )}
                </div>
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
            <>
              <div className="footer-progress">
                <button
                  type="button"
                  className="footer-link"
                  onClick={scrollToAnalysis}
                  aria-label="Analysis complete. Jump to AI analysis"
                >
                  <span aria-hidden="true">✓</span> Analysis complete
                </button>
                {followUpStatus === "success" && (
                  <span className="footer-link-static">
                    <span aria-hidden="true">✓</span> Draft ready
                  </span>
                )}
              </div>

              {followUpStatus === "loading" && (
                <div className="ai-status" role="status" aria-live="polite">
                  <span className="drawer-spinner small" aria-hidden="true" />
                  <span>
                    <strong>Creating advisor-reviewed draft…</strong>
                    <span className="ai-status-detail">
                      Using transfer context and firm procedures
                    </span>
                  </span>
                </div>
              )}

              {followUpStatus === "error" && (
                <div className="ai-error" role="alert">
                  <strong>The follow-up draft couldn't be created.</strong>{" "}
                  {followUpError}
                </div>
              )}

              {followUpStatus === "success" ? (
                <button
                  type="button"
                  className="drawer-complete-button"
                  onClick={scrollToFollowUp}
                  aria-label="Follow-up draft ready. Jump to draft for review"
                >
                  Review follow-up draft
                </button>
              ) : (
                <button
                  type="button"
                  className="drawer-primary-button"
                  onClick={generateFollowUp}
                  disabled={followUpStatus === "loading"}
                  aria-busy={followUpStatus === "loading"}
                  aria-label={
                    followUpStatus === "loading"
                      ? "Creating advisor-reviewed draft"
                      : followUpStatus === "error"
                        ? "Retry generating follow-up draft"
                        : "Generate follow-up draft for advisor review"
                  }
                >
                  {followUpStatus === "loading" ? (
                    "Creating advisor-reviewed draft…"
                  ) : followUpStatus === "error" ? (
                    "Retry follow-up"
                  ) : (
                    <>
                      <Icon name="talk" onDark /> Generate Follow-Up
                    </>
                  )}
                </button>
              )}
            </>
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
              {analysisStatus === "loading" ? (
                "Analyzing transfer…"
              ) : analysisStatus === "error" ? (
                "Retry analysis"
              ) : (
                <>
                  <Icon name="idea" onDark /> Analyze with AI
                </>
              )}
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
}

type ReportsViewProps = {
  reports: ReportsData | null;
  status: ReportsStatus;
  error: string;
  onRetry: () => void;
  onOpenTransfer: (transfer: Transfer, trigger: HTMLElement) => void;
};

function ReportsView({
  reports,
  status,
  error,
  onRetry,
  onOpenTransfer,
}: ReportsViewProps) {
  const riskTotal = reports
    ? RISK_ORDER.reduce((sum, level) => sum + reports.byRisk[level], 0)
    : 0;
  const statusMax = reports
    ? Math.max(0, ...STATUS_ORDER.map((key) => reports.byStatus[key] ?? 0))
    : 0;
  const completionPercent = reports
    ? clampPercent(reports.completionRate * 100)
    : 0;
  const atRiskShare = reports
    ? Math.round(
        shareOf(reports.atRiskTransferAmount, reports.totalTransferAmount),
      )
    : 0;

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">TRANSFER INTELLIGENCE</p>
          <h1>Transfer reports</h1>
          <p className="header-copy">
            Portfolio-level visibility into transfer risk, delays, and assets
            requiring attention.
          </p>
        </div>

        <div className="system-status">
          <span className="status-dot" />
          Live data
        </div>
      </header>

      {(status === "idle" || status === "loading") && !reports && (
        <div className="reports-state" role="status" aria-live="polite">
          <span className="drawer-spinner" aria-hidden="true" />
          Loading transfer reports…
        </div>
      )}

      {status === "error" && !reports && (
        <div className="reports-state reports-error" role="alert">
          <strong>We couldn't load transfer reports.</strong>
          <span>{error}</span>
          <button
            type="button"
            className="drawer-secondary-button"
            onClick={onRetry}
            aria-label="Retry loading transfer reports"
          >
            Try again
          </button>
        </div>
      )}

      {reports && (
        <>
          <section className="metrics-grid" aria-label="Key transfer metrics">
            <article className="metric-card">
              <div className="metric-label">Total transfer assets</div>
              <div className="metric-value metric-currency">
                {formatCurrency(reports.totalTransferAmount)}
              </div>
              <div className="metric-caption">
                Across {reports.totalTransfers}{" "}
                {reports.totalTransfers === 1 ? "transfer" : "transfers"}
              </div>
            </article>

            <article className="metric-card danger-card">
              <div className="metric-label">Assets at risk</div>
              <div className="metric-value metric-currency">
                {formatCurrency(reports.atRiskTransferAmount)}
              </div>
              <div className="metric-caption danger-text">
                {atRiskShare}% of assets · high-risk transfers
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-label">Blocked transfers</div>
              <div className="metric-value">{reports.blockedCount}</div>
              <div className="metric-caption">
                Missing a required item that blocks the next stage
              </div>
            </article>

            <article className="metric-card">
              <div className="metric-label">Stalled transfers</div>
              <div className="metric-value">{reports.stalledCount}</div>
              <div className="metric-caption">
                Open with no activity in 5+ days
              </div>
            </article>
          </section>

          <section className="reports-secondary" aria-label="Pipeline health">
            <div className="reports-secondary-item">
              <span className="reports-secondary-label">
                Avg. days since activity
              </span>
              <strong className="reports-secondary-value">
                {reports.avgDaysSinceActivity}
              </strong>
              <span className="reports-secondary-caption">
                Across open transfers
              </span>
            </div>

            <div className="reports-secondary-item">
              <span className="reports-secondary-label">Completion rate</span>
              <strong className="reports-secondary-value">
                {completionPercent}%
              </strong>
              <span className="reports-secondary-caption">
                {reports.byStatus.COMPLETE ?? 0} of {reports.totalTransfers}{" "}
                transfers complete
              </span>
            </div>
          </section>

          <div className="reports-grid">
            <section
              className="report-card"
              aria-labelledby="risk-distribution-title"
            >
              <header className="report-card-header">
                <h2 id="risk-distribution-title">Risk distribution</h2>
                <p>Current risk level across all transfers</p>
              </header>

              <div className="risk-stack" aria-hidden="true">
                {RISK_ORDER.map((level) =>
                  reports.byRisk[level] > 0 ? (
                    <span
                      key={level}
                      className={`risk-stack-segment ${level.toLowerCase()}`}
                      style={{
                        width: `${shareOf(reports.byRisk[level], riskTotal)}%`,
                      }}
                    />
                  ) : null,
                )}
              </div>

              <ul className="risk-legend">
                {RISK_ORDER.map((level) => (
                  <li key={level} className="risk-legend-row">
                    <span className={`risk-badge ${level.toLowerCase()}`}>
                      <span className="risk-dot" aria-hidden="true" />
                      {RISK_LABELS[level]}
                    </span>
                    <span className="risk-legend-count">
                      <strong>{reports.byRisk[level]}</strong>
                      <span>
                        {Math.round(shareOf(reports.byRisk[level], riskTotal))}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section
              className="report-card"
              aria-labelledby="status-breakdown-title"
            >
              <header className="report-card-header">
                <h2 id="status-breakdown-title">Transfer status</h2>
                <p>Where each transfer sits in the pipeline today</p>
              </header>

              <ul className="status-bars">
                {STATUS_ORDER.map((key) => {
                  const count = reports.byStatus[key] ?? 0;

                  return (
                    <li
                      key={key}
                      className={`status-bar-row ${
                        key === "COMPLETE" ? "complete" : ""
                      }`}
                    >
                      <span className="status-bar-label">
                        {formatStatus(key)}
                      </span>
                      <span className="status-bar-track" aria-hidden="true">
                        <span
                          className="status-bar-fill"
                          style={{ width: `${shareOf(count, statusMax)}%` }}
                        />
                      </span>
                      <strong className="status-bar-count">{count}</strong>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <section
            className="transfer-section"
            aria-labelledby="attention-needed-title"
          >
            <div className="section-heading">
              <div>
                <h2 id="attention-needed-title">Attention needed</h2>
                <p>
                  High and medium risk transfers, longest without activity
                  first. Open a client to review the full transfer.
                </p>
              </div>

              <div className="result-count">
                {reports.attentionNeeded.length}{" "}
                {reports.attentionNeeded.length === 1 ? "client" : "clients"}
              </div>
            </div>

            {reports.attentionNeeded.length === 0 ? (
              <div className="empty-state">
                No transfers currently need attention.
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Assets</th>
                      <th>Status</th>
                      <th>Risk</th>
                      <th>Inactive</th>
                      <th />
                    </tr>
                  </thead>

                  <tbody>
                    {reports.attentionNeeded.map((transfer) => (
                      <tr key={transfer.transferId}>
                        <td>
                          <div className="client-cell">
                            <div className="client-avatar" aria-hidden="true">
                              {getInitials(transfer.clientName)}
                            </div>

                            <div>
                              <button
                                type="button"
                                className="client-link"
                                onClick={(event) =>
                                  onOpenTransfer(transfer, event.currentTarget)
                                }
                              >
                                {transfer.clientName}
                              </button>
                              <div className="transfer-id">
                                {transfer.accountType}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="amount-cell">
                          {formatCurrency(transfer.transferAmount)}
                        </td>

                        <td>
                          <span className="status-badge">
                            {formatStatus(transfer.status)}
                          </span>
                        </td>

                        <td>
                          <div className="risk-cell attention-risk">
                            <span
                              className={`risk-badge ${transfer.riskLevel.toLowerCase()}`}
                            >
                              <span className="risk-dot" aria-hidden="true" />
                              {transfer.riskLevel}
                            </span>

                            {transfer.riskReasons[0] && (
                              <span className="attention-reason">
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
                            {formatDays(transfer.daysSinceActivity)}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="row-action"
                            aria-label={`Open transfer details for ${transfer.clientName}`}
                            onClick={(event) =>
                              onOpenTransfer(transfer, event.currentTarget)
                            }
                          >
                            →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
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
  const [view, setView] = useState<View>("dashboard");
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [reportsStatus, setReportsStatus] = useState<ReportsStatus>("idle");
  const [reportsError, setReportsError] = useState("");
  const reportsInFlightRef = useRef(false);
  const transferSectionRef = useRef<HTMLElement>(null);

  // Loaded once per session; the report is only refetched after a failure.
  const loadReports = useCallback(() => {
    if (reportsInFlightRef.current) {
      return;
    }

    reportsInFlightRef.current = true;
    setReportsStatus("loading");
    setReportsError("");

    fetch(`${API_BASE}/api/reports`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `The reports service responded with status ${response.status}.`,
          );
        }

        return response.json() as Promise<ReportsData>;
      })
      .then((data) => {
        setReports(data);
        setReportsStatus("success");
      })
      .catch((err: unknown) => {
        setReportsError(
          err instanceof Error && err.message
            ? err.message
            : "Please check your connection and try again.",
        );
        setReportsStatus("error");
      })
      .finally(() => {
        reportsInFlightRef.current = false;
      });
  }, []);

  useEffect(() => {
    if (view === "reports" && reportsStatus === "idle") {
      loadReports();
    }
  }, [view, reportsStatus, loadReports]);

  useEffect(() => {
    if (view === "transfers") {
      transferSectionRef.current?.scrollIntoView({ block: "start" });
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [view]);

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
      <IconSprite />
      <aside className="sidebar">
        <div>
          <div className="brand">
            <LplMark />
            <span className="brand-lpl">LPL Financial</span>
          </div>
          <div className="product">
            <div className="brand-name">NorthStar</div>
            <div className="brand-subtitle">Advisor Intelligence</div>
          </div>

          <nav className="nav" aria-label="Main">
            {(
              [
                { id: "dashboard", icon: "pie", label: "Dashboard" },
                { id: "transfers", icon: "exchange", label: "Transfers" },
                { id: "reports", icon: "bar", label: "Reports" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${view === item.id ? "active" : ""}`}
                aria-current={view === item.id ? "page" : undefined}
                onClick={() => setView(item.id)}
              >
                <Icon name={item.icon} onDark />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-advisor">
            <div className="advisor-avatar">
              {getInitials(CURRENT_ADVISOR.name)}
            </div>

            <div>
              <div className="advisor-name">{CURRENT_ADVISOR.name}</div>
              <div className="advisor-role">{CURRENT_ADVISOR.role}</div>
            </div>
          </div>
          <div className="sidebar-legal">Member FINRA/SIPC</div>
        </div>
      </aside>

      <main className="main-content">
        {view === "reports" ? (
          <ReportsView
            reports={reports}
            status={reportsStatus}
            error={reportsError}
            onRetry={loadReports}
            onOpenTransfer={openTransfer}
          />
        ) : (
          <>
            <header className="page-header hero">
              <div className="hero-copy">
                <p className="eyebrow">TRANSFER OPERATIONS</p>
                <h1>Good evening, {CURRENT_ADVISOR.firstName}.</h1>
                <p className="header-copy">
                  Here's where your client transfers need attention today.
                </p>
                <div className="hero-rule" aria-hidden="true" />
                <p className="hero-date">
                  {new Intl.DateTimeFormat("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date())}
                </p>
              </div>

              <div className="system-status">
                <span className="status-dot" />
                Live data
              </div>

              <HeroChevrons />
            </header>

            <section className="metrics-grid">
              <article className="metric-card">
                <div className="metric-head">
                  <div className="metric-label">Total transfers</div>
                  <Icon name="exchange" size="lg" />
                </div>
                <div className="metric-value">{transfers.length}</div>
                <div className="metric-caption">Active transfer book</div>
              </article>

              <article className="metric-card danger-card">
                <div className="metric-head">
                  <div className="metric-label">High risk</div>
                  <Icon name="alert" size="lg" />
                </div>
                <div className="metric-value">{metrics.highRisk}</div>
                <div className="metric-caption danger-text">
                  Immediate attention recommended
                </div>
              </article>

              <article className="metric-card">
                <div className="metric-head">
                  <div className="metric-label">Needs attention</div>
                  <Icon name="time" size="lg" />
                </div>
                <div className="metric-value">{metrics.needsAttention}</div>
                <div className="metric-caption">High + medium risk</div>
              </article>

              <article className="metric-card">
                <div className="metric-head">
                  <div className="metric-label">Transfer assets</div>
                  <Icon name="dollar" size="lg" />
                </div>
                <div className="metric-value metric-currency">
                  {formatCurrency(metrics.assets)}
                </div>
                <div className="metric-caption">
                  {metrics.complete} of {transfers.length} transfers complete
                </div>
              </article>
            </section>

            <section className="transfer-section" ref={transferSectionRef}>
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
                  <span className="search-icon">
                    <Icon name="search" />
                  </span>
                  <input
                    type="search"
                    aria-label="Search clients or account types"
                    placeholder="Search clients or account types..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>

                <div className="filter-group">
                  {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      aria-pressed={riskFilter === level}
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
                                {formatStatus(transfer.riskLevel)}
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
                              <Icon name="arrow" size="lg" />
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
          </>
        )}
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
