/**
 * TransferReady — Synthetic seed dataset (source of truth for the live tables).
 *
 * Reference "now": 2026-10-02T10:00:00Z. lastActivityAt values are chosen so the
 * rules-based risk engine (section 11) reproduces the levels in section 12.
 *
 * `hasUnresolvedClientQuestion` is an explicit boolean on each transfer, read
 * directly by the risk engine (+1) instead of being inferred from interactions.
 */

export const NOW = "2026-10-02T10:00:00Z";

function daysAgo(n, hour = 10) {
  const base = new Date(NOW);
  base.setUTCDate(base.getUTCDate() - n);
  base.setUTCHours(hour, 0, 0, 0);
  return base.toISOString().replace(".000Z", "Z");
}

const A1 = "ADVISOR#001";
const A2 = "ADVISOR#002";

export const clients = [
  { clientId: "CLIENT#001", name: "Maria Rodriguez",  email: "maria.rodriguez@example.com",  phone: "(555) 555-1024", advisorId: A1, preferredContactMethod: "EMAIL", communicationPreference: "Prefers concise email reminders",             relationshipNotes: "Long-term client. Generally responds quickly to email.", createdAt: daysAgo(30) },
  { clientId: "CLIENT#002", name: "James Lee",        email: "james.lee@example.com",        phone: "(555) 555-2048", advisorId: A1, preferredContactMethod: "PHONE", communicationPreference: "Prefers a quick phone call for anything urgent",  relationshipNotes: "Detail-oriented. Likes status confirmations.",            createdAt: daysAgo(45) },
  { clientId: "CLIENT#003", name: "Aisha Patel",      email: "aisha.patel@example.com",      phone: "(555) 555-3072", advisorId: A2, preferredContactMethod: "EMAIL", communicationPreference: "Email is fine; no phone calls during work hours",  relationshipNotes: "Highly responsive. Transfer went smoothly.",              createdAt: daysAgo(60) },
  { clientId: "CLIENT#004", name: "Robert Chen",      email: "robert.chen@example.com",      phone: "(555) 555-4096", advisorId: A2, preferredContactMethod: "EMAIL", communicationPreference: "Prefers written summaries he can review later",    relationshipNotes: "Travels frequently; can be slow to return signatures.",   createdAt: daysAgo(40) },
  { clientId: "CLIENT#005", name: "Sarah Johnson",    email: "sarah.johnson@example.com",    phone: "(555) 555-5120", advisorId: A1, preferredContactMethod: "EMAIL", communicationPreference: "Appreciates proactive updates",                    relationshipNotes: "New-ish client. Transfer progressing well.",              createdAt: daysAgo(25) },
  { clientId: "CLIENT#006", name: "David Kim",        email: "david.kim@example.com",        phone: "(555) 555-6144", advisorId: A2, preferredContactMethod: "PHONE", communicationPreference: "Call for anything requiring a decision",           relationshipNotes: "High-net-worth. Multiple accounts consolidating.",        createdAt: daysAgo(35) },
  { clientId: "CLIENT#007", name: "Emily Davis",      email: "emily.davis@example.com",      phone: "(555) 555-7168", advisorId: A1, preferredContactMethod: "EMAIL", communicationPreference: "Asks a lot of questions; appreciates patience",     relationshipNotes: "First transfer with us. Has an open question pending.",    createdAt: daysAgo(20) },
  { clientId: "CLIENT#008", name: "Michael Thompson", email: "michael.thompson@example.com", phone: "(555) 555-8192", advisorId: A2, preferredContactMethod: "PHONE", communicationPreference: "Prefers phone; quick to respond",                  relationshipNotes: "Spoke yesterday; comfortable with current progress.",      createdAt: daysAgo(50) },
  { clientId: "CLIENT#009", name: "Olivia Brown",     email: "olivia.brown@example.com",     phone: "(555) 555-9216", advisorId: A1, preferredContactMethod: "EMAIL", communicationPreference: "Email only; checks sporadically",                  relationshipNotes: "Transfer stuck in internal review for a week.",            createdAt: daysAgo(33) },
  { clientId: "CLIENT#010", name: "Daniel Wilson",    email: "daniel.wilson@example.com",    phone: "(555) 555-0240", advisorId: A2, preferredContactMethod: "EMAIL", communicationPreference: "Prefers concise updates",                          relationshipNotes: "Just started transfer. No blockers yet.",                 createdAt: daysAgo(5)  },
  { clientId: "CLIENT#011", name: "Grace Nguyen",     email: "grace.nguyen@example.com",     phone: "(555) 555-1264", advisorId: A1, preferredContactMethod: "EMAIL", communicationPreference: "Responsive; prefers email with clear action items", relationshipNotes: "Identity verification outstanding; otherwise on track.",   createdAt: daysAgo(28) },
  { clientId: "CLIENT#012", name: "Carlos Martinez",  email: "carlos.martinez@example.com",  phone: "(555) 555-2288", advisorId: A2, preferredContactMethod: "PHONE", communicationPreference: "Prefers phone updates in the evening",             relationshipNotes: "Completed transfer last week. Very satisfied.",            createdAt: daysAgo(55) },
  { clientId: "CLIENT#013", name: "Hannah Wright",    email: "hannah.wright@example.com",    phone: "(555) 555-3312", advisorId: A1, preferredContactMethod: "EMAIL", communicationPreference: "Likes detailed written explanations",              relationshipNotes: "Custodian processing; documents all complete.",            createdAt: daysAgo(38) },
  { clientId: "CLIENT#014", name: "Ethan Scott",      email: "ethan.scott@example.com",      phone: "(555) 555-4336", advisorId: A2, preferredContactMethod: "EMAIL", communicationPreference: "Minimal contact; only when action needed",         relationshipNotes: "Two accounts; one form missing, long inactivity.",         createdAt: daysAgo(42) },
];

export const accounts = [
  { accountId: "ACCOUNT#001", clientId: "CLIENT#001", accountType: "Traditional IRA", estimatedAssets: 420000, institution: "Example Custodian", createdAt: daysAgo(30) },
  { accountId: "ACCOUNT#002", clientId: "CLIENT#002", accountType: "Brokerage",        estimatedAssets: 180000, institution: "Example Custodian", createdAt: daysAgo(45) },
  { accountId: "ACCOUNT#003", clientId: "CLIENT#003", accountType: "Roth IRA",         estimatedAssets: 310000, institution: "Example Custodian", createdAt: daysAgo(60) },
  { accountId: "ACCOUNT#004", clientId: "CLIENT#004", accountType: "Brokerage",        estimatedAssets: 720000, institution: "Example Custodian", createdAt: daysAgo(40) },
  { accountId: "ACCOUNT#005", clientId: "CLIENT#005", accountType: "Traditional IRA",  estimatedAssets: 265000, institution: "Example Custodian", createdAt: daysAgo(25) },
  { accountId: "ACCOUNT#006", clientId: "CLIENT#006", accountType: "Traditional IRA",  estimatedAssets: 600000, institution: "Example Custodian", createdAt: daysAgo(35) },
  { accountId: "ACCOUNT#007", clientId: "CLIENT#006", accountType: "Brokerage",        estimatedAssets: 500000, institution: "Example Custodian", createdAt: daysAgo(35) },
  { accountId: "ACCOUNT#008", clientId: "CLIENT#007", accountType: "Traditional IRA",  estimatedAssets: 195000, institution: "Example Custodian", createdAt: daysAgo(20) },
  { accountId: "ACCOUNT#009", clientId: "CLIENT#008", accountType: "Brokerage",        estimatedAssets: 540000, institution: "Example Custodian", createdAt: daysAgo(50) },
  { accountId: "ACCOUNT#010", clientId: "CLIENT#009", accountType: "Roth IRA",         estimatedAssets: 150000, institution: "Example Custodian", createdAt: daysAgo(33) },
  { accountId: "ACCOUNT#011", clientId: "CLIENT#010", accountType: "Traditional IRA",  estimatedAssets: 390000, institution: "Example Custodian", createdAt: daysAgo(5)  },
  { accountId: "ACCOUNT#012", clientId: "CLIENT#011", accountType: "Roth IRA",         estimatedAssets: 230000, institution: "Example Custodian", createdAt: daysAgo(28) },
  { accountId: "ACCOUNT#013", clientId: "CLIENT#012", accountType: "Traditional IRA",  estimatedAssets: 410000, institution: "Example Custodian", createdAt: daysAgo(55) },
  { accountId: "ACCOUNT#014", clientId: "CLIENT#013", accountType: "Brokerage",        estimatedAssets: 480000, institution: "Example Custodian", createdAt: daysAgo(38) },
  { accountId: "ACCOUNT#015", clientId: "CLIENT#014", accountType: "Traditional IRA",  estimatedAssets: 350000, institution: "Example Custodian", createdAt: daysAgo(42) },
  { accountId: "ACCOUNT#016", clientId: "CLIENT#014", accountType: "Brokerage",        estimatedAssets: 220000, institution: "Example Custodian", createdAt: daysAgo(42) },
];

export const transfers = [
  { transferId: "TRANSFER#001", clientId: "CLIENT#001", accountId: "ACCOUNT#001", status: "WAITING_ON_CLIENT",    stage: "DOCUMENTATION", startedAt: daysAgo(12), lastActivityAt: daysAgo(9),  completionPercent: 80,  transferAmount: 420000,  assignedAdvisorId: A1, hasUnresolvedClientQuestion: true  },
  { transferId: "TRANSFER#002", clientId: "CLIENT#002", accountId: "ACCOUNT#002", status: "CUSTODIAN_PROCESSING", stage: "CUSTODIAN",     startedAt: daysAgo(20), lastActivityAt: daysAgo(5),  completionPercent: 90,  transferAmount: 180000,  assignedAdvisorId: A1, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#003", clientId: "CLIENT#003", accountId: "ACCOUNT#003", status: "COMPLETE",             stage: "COMPLETION",    startedAt: daysAgo(40), lastActivityAt: daysAgo(14), completionPercent: 100, transferAmount: 310000,  assignedAdvisorId: A2, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#004", clientId: "CLIENT#004", accountId: "ACCOUNT#004", status: "WAITING_ON_CLIENT",    stage: "DOCUMENTATION", startedAt: daysAgo(15), lastActivityAt: daysAgo(10), completionPercent: 60,  transferAmount: 720000,  assignedAdvisorId: A2, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#005", clientId: "CLIENT#005", accountId: "ACCOUNT#005", status: "CUSTODIAN_PROCESSING", stage: "CUSTODIAN",     startedAt: daysAgo(18), lastActivityAt: daysAgo(1),  completionPercent: 92,  transferAmount: 265000,  assignedAdvisorId: A1, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#006", clientId: "CLIENT#006", accountId: "ACCOUNT#006", status: "IN_PROGRESS",          stage: "DOCUMENTATION", startedAt: daysAgo(14), lastActivityAt: daysAgo(6),  completionPercent: 40,  transferAmount: 1100000, assignedAdvisorId: A2, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#007", clientId: "CLIENT#007", accountId: "ACCOUNT#008", status: "IN_PROGRESS",          stage: "DOCUMENTATION", startedAt: daysAgo(16), lastActivityAt: daysAgo(5),  completionPercent: 50,  transferAmount: 195000,  assignedAdvisorId: A1, hasUnresolvedClientQuestion: true  },
  { transferId: "TRANSFER#008", clientId: "CLIENT#008", accountId: "ACCOUNT#009", status: "INTERNAL_REVIEW",      stage: "REVIEW",        startedAt: daysAgo(22), lastActivityAt: daysAgo(1),  completionPercent: 70,  transferAmount: 540000,  assignedAdvisorId: A2, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#009", clientId: "CLIENT#009", accountId: "ACCOUNT#010", status: "INTERNAL_REVIEW",      stage: "REVIEW",        startedAt: daysAgo(16), lastActivityAt: daysAgo(7),  completionPercent: 65,  transferAmount: 150000,  assignedAdvisorId: A1, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#010", clientId: "CLIENT#010", accountId: "ACCOUNT#011", status: "IN_PROGRESS",          stage: "INITIATION",    startedAt: daysAgo(1),  lastActivityAt: daysAgo(1),  completionPercent: 10,  transferAmount: 390000,  assignedAdvisorId: A2, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#011", clientId: "CLIENT#011", accountId: "ACCOUNT#012", status: "WAITING_ON_CLIENT",    stage: "DOCUMENTATION", startedAt: daysAgo(10), lastActivityAt: daysAgo(2),  completionPercent: 55,  transferAmount: 230000,  assignedAdvisorId: A1, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#012", clientId: "CLIENT#012", accountId: "ACCOUNT#013", status: "COMPLETE",             stage: "COMPLETION",    startedAt: daysAgo(30), lastActivityAt: daysAgo(7),  completionPercent: 100, transferAmount: 410000,  assignedAdvisorId: A2, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#013", clientId: "CLIENT#013", accountId: "ACCOUNT#014", status: "CUSTODIAN_PROCESSING", stage: "CUSTODIAN",     startedAt: daysAgo(21), lastActivityAt: daysAgo(2),  completionPercent: 88,  transferAmount: 480000,  assignedAdvisorId: A1, hasUnresolvedClientQuestion: false },
  { transferId: "TRANSFER#014", clientId: "CLIENT#014", accountId: "ACCOUNT#015", status: "WAITING_ON_CLIENT",    stage: "DOCUMENTATION", startedAt: daysAgo(18), lastActivityAt: daysAgo(11), completionPercent: 45,  transferAmount: 570000,  assignedAdvisorId: A2, hasUnresolvedClientQuestion: false },
];

export const requirements = [
  { requirementId: "REQ#001", transferId: "TRANSFER#001", type: "BENEFICIARY_FORM",      displayName: "Beneficiary designation form", status: "MISSING",   required: true, blocksNextStage: true,  requestedAt: daysAgo(10), completedAt: null },
  { requirementId: "REQ#002", transferId: "TRANSFER#001", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(12), completedAt: daysAgo(11) },
  { requirementId: "REQ#003", transferId: "TRANSFER#001", type: "IDENTITY_VERIFICATION", displayName: "Identity verification",         status: "VERIFIED",  required: true, blocksNextStage: false, requestedAt: daysAgo(12), completedAt: daysAgo(11) },
  { requirementId: "REQ#004", transferId: "TRANSFER#002", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(20), completedAt: daysAgo(18) },
  { requirementId: "REQ#005", transferId: "TRANSFER#002", type: "ACCOUNT_STATEMENT",     displayName: "Recent account statement",      status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(20), completedAt: daysAgo(17) },
  { requirementId: "REQ#006", transferId: "TRANSFER#002", type: "CUSTODIAN_APPROVAL",    displayName: "Custodian approval",            status: "REQUESTED", required: true, blocksNextStage: false, requestedAt: daysAgo(6),  completedAt: null },
  { requirementId: "REQ#007", transferId: "TRANSFER#003", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(40), completedAt: daysAgo(38) },
  { requirementId: "REQ#008", transferId: "TRANSFER#003", type: "BENEFICIARY_FORM",      displayName: "Beneficiary designation form", status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(40), completedAt: daysAgo(37) },
  { requirementId: "REQ#009", transferId: "TRANSFER#003", type: "CUSTODIAN_APPROVAL",    displayName: "Custodian approval",            status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(30), completedAt: daysAgo(20) },
  { requirementId: "REQ#010", transferId: "TRANSFER#004", type: "SIGNATURE",             displayName: "Account holder signature",      status: "MISSING",   required: true, blocksNextStage: true,  requestedAt: daysAgo(11), completedAt: null },
  { requirementId: "REQ#011", transferId: "TRANSFER#004", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "RECEIVED",  required: true, blocksNextStage: false, requestedAt: daysAgo(14), completedAt: daysAgo(13) },
  { requirementId: "REQ#012", transferId: "TRANSFER#005", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(18), completedAt: daysAgo(16) },
  { requirementId: "REQ#013", transferId: "TRANSFER#005", type: "BENEFICIARY_FORM",      displayName: "Beneficiary designation form", status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(18), completedAt: daysAgo(15) },
  { requirementId: "REQ#014", transferId: "TRANSFER#006", type: "BENEFICIARY_FORM",      displayName: "Beneficiary designation form", status: "MISSING",   required: true, blocksNextStage: true,  requestedAt: daysAgo(8),  completedAt: null },
  { requirementId: "REQ#015", transferId: "TRANSFER#006", type: "ACCOUNT_STATEMENT",     displayName: "Recent account statement",      status: "MISSING",   required: true, blocksNextStage: true,  requestedAt: daysAgo(8),  completedAt: null },
  { requirementId: "REQ#016", transferId: "TRANSFER#006", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "RECEIVED",  required: true, blocksNextStage: false, requestedAt: daysAgo(14), completedAt: daysAgo(13) },
  { requirementId: "REQ#017", transferId: "TRANSFER#007", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "RECEIVED",  required: true, blocksNextStage: false, requestedAt: daysAgo(16), completedAt: daysAgo(15) },
  { requirementId: "REQ#018", transferId: "TRANSFER#007", type: "IDENTITY_VERIFICATION", displayName: "Identity verification",         status: "VERIFIED",  required: true, blocksNextStage: false, requestedAt: daysAgo(16), completedAt: daysAgo(14) },
  { requirementId: "REQ#019", transferId: "TRANSFER#008", type: "INTERNAL_REVIEW",       displayName: "Internal compliance review",    status: "REQUESTED", required: true, blocksNextStage: true,  requestedAt: daysAgo(3),  completedAt: null },
  { requirementId: "REQ#020", transferId: "TRANSFER#008", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(22), completedAt: daysAgo(20) },
  { requirementId: "REQ#021", transferId: "TRANSFER#009", type: "INTERNAL_REVIEW",       displayName: "Internal compliance review",    status: "REQUESTED", required: true, blocksNextStage: true,  requestedAt: daysAgo(7),  completedAt: null },
  { requirementId: "REQ#022", transferId: "TRANSFER#009", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(16), completedAt: daysAgo(14) },
  { requirementId: "REQ#023", transferId: "TRANSFER#010", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "REQUESTED", required: true, blocksNextStage: false, requestedAt: daysAgo(1),  completedAt: null },
  { requirementId: "REQ#024", transferId: "TRANSFER#011", type: "IDENTITY_VERIFICATION", displayName: "Identity verification",         status: "MISSING",   required: true, blocksNextStage: true,  requestedAt: daysAgo(4),  completedAt: null },
  { requirementId: "REQ#025", transferId: "TRANSFER#011", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "RECEIVED",  required: true, blocksNextStage: false, requestedAt: daysAgo(10), completedAt: daysAgo(9) },
  { requirementId: "REQ#026", transferId: "TRANSFER#012", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(30), completedAt: daysAgo(28) },
  { requirementId: "REQ#027", transferId: "TRANSFER#012", type: "CUSTODIAN_APPROVAL",    displayName: "Custodian approval",            status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(20), completedAt: daysAgo(8) },
  { requirementId: "REQ#028", transferId: "TRANSFER#013", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "COMPLETE",  required: true, blocksNextStage: false, requestedAt: daysAgo(21), completedAt: daysAgo(19) },
  { requirementId: "REQ#029", transferId: "TRANSFER#013", type: "CUSTODIAN_APPROVAL",    displayName: "Custodian approval",            status: "REQUESTED", required: true, blocksNextStage: false, requestedAt: daysAgo(5),  completedAt: null },
  { requirementId: "REQ#030", transferId: "TRANSFER#014", type: "BENEFICIARY_FORM",      displayName: "Beneficiary designation form", status: "MISSING",   required: true, blocksNextStage: true,  requestedAt: daysAgo(13), completedAt: null },
  { requirementId: "REQ#031", transferId: "TRANSFER#014", type: "TRANSFER_FORM",         displayName: "Transfer request form",         status: "RECEIVED",  required: true, blocksNextStage: false, requestedAt: daysAgo(18), completedAt: daysAgo(17) },
];

export const interactions = [
  { interactionId: "INTERACTION#001", clientId: "CLIENT#001", transferId: "TRANSFER#001", timestamp: daysAgo(12), type: "DOCUMENT_REQUEST",  direction: "OUTBOUND", summary: "Requested beneficiary designation form from client.",                              createdBy: A1 },
  { interactionId: "INTERACTION#002", clientId: "CLIENT#001", transferId: "TRANSFER#001", timestamp: daysAgo(9),  type: "CLIENT_EMAIL",      direction: "INBOUND",  summary: "Client asked whether spouse must be listed on the beneficiary form.",             createdBy: "CLIENT" },
  { interactionId: "INTERACTION#003", clientId: "CLIENT#002", transferId: "TRANSFER#002", timestamp: daysAgo(8),  type: "DOCUMENT_RECEIVED", direction: "INBOUND",  summary: "Received signed transfer form and account statement.",                            createdBy: A1 },
  { interactionId: "INTERACTION#004", clientId: "CLIENT#002", transferId: "TRANSFER#002", timestamp: daysAgo(5),  type: "STATUS_UPDATE",     direction: "OUTBOUND", summary: "Notified client the transfer moved to custodian processing.",                      createdBy: A1 },
  { interactionId: "INTERACTION#005", clientId: "CLIENT#003", transferId: "TRANSFER#003", timestamp: daysAgo(14), type: "STATUS_UPDATE",     direction: "OUTBOUND", summary: "Confirmed transfer completed and assets settled.",                                 createdBy: A2 },
  { interactionId: "INTERACTION#006", clientId: "CLIENT#004", transferId: "TRANSFER#004", timestamp: daysAgo(11), type: "DOCUMENT_REQUEST",  direction: "OUTBOUND", summary: "Requested account holder signature on transfer paperwork.",                        createdBy: A2 },
  { interactionId: "INTERACTION#007", clientId: "CLIENT#004", transferId: "TRANSFER#004", timestamp: daysAgo(10), type: "ADVISOR_EMAIL",     direction: "OUTBOUND", summary: "Follow-up email reminding client that the signature is still outstanding.",        createdBy: A2 },
  { interactionId: "INTERACTION#008", clientId: "CLIENT#005", transferId: "TRANSFER#005", timestamp: daysAgo(1),  type: "STATUS_UPDATE",     direction: "OUTBOUND", summary: "Sent proactive update: documents verified, now with custodian.",                  createdBy: A1 },
  { interactionId: "INTERACTION#009", clientId: "CLIENT#006", transferId: "TRANSFER#006", timestamp: daysAgo(8),  type: "DOCUMENT_REQUEST",  direction: "OUTBOUND", summary: "Requested beneficiary form and recent account statement for both accounts.",       createdBy: A2 },
  { interactionId: "INTERACTION#010", clientId: "CLIENT#006", transferId: "TRANSFER#006", timestamp: daysAgo(6),  type: "PHONE_CALL",        direction: "OUTBOUND", summary: "Left voicemail requesting the two missing documents.",                             createdBy: A2 },
  { interactionId: "INTERACTION#011", clientId: "CLIENT#007", transferId: "TRANSFER#007", timestamp: daysAgo(4),  type: "CLIENT_EMAIL",      direction: "INBOUND",  summary: "Client asked how long custodian processing usually takes. Awaiting advisor reply.", createdBy: "CLIENT" },
  { interactionId: "INTERACTION#012", clientId: "CLIENT#008", transferId: "TRANSFER#008", timestamp: daysAgo(1),  type: "PHONE_CALL",        direction: "OUTBOUND", summary: "Called client to confirm internal review is underway; client comfortable.",        createdBy: A2 },
  { interactionId: "INTERACTION#013", clientId: "CLIENT#009", transferId: "TRANSFER#009", timestamp: daysAgo(7),  type: "INTERNAL_NOTE",     direction: "OUTBOUND", summary: "Submitted to internal review queue; awaiting compliance sign-off.",                createdBy: A1 },
  { interactionId: "INTERACTION#014", clientId: "CLIENT#010", transferId: "TRANSFER#010", timestamp: daysAgo(1),  type: "STATUS_UPDATE",     direction: "OUTBOUND", summary: "Transfer initiated; sent welcome and initial document checklist.",                 createdBy: A2 },
  { interactionId: "INTERACTION#015", clientId: "CLIENT#011", transferId: "TRANSFER#011", timestamp: daysAgo(2),  type: "ADVISOR_EMAIL",     direction: "OUTBOUND", summary: "Followed up requesting identity verification documents.",                          createdBy: A1 },
  { interactionId: "INTERACTION#016", clientId: "CLIENT#012", transferId: "TRANSFER#012", timestamp: daysAgo(7),  type: "STATUS_UPDATE",     direction: "OUTBOUND", summary: "Confirmed transfer complete; closed out with client by phone.",                    createdBy: A2 },
  { interactionId: "INTERACTION#017", clientId: "CLIENT#013", transferId: "TRANSFER#013", timestamp: daysAgo(2),  type: "STATUS_UPDATE",     direction: "OUTBOUND", summary: "Informed client the custodian is processing; expect settlement soon.",             createdBy: A1 },
  { interactionId: "INTERACTION#018", clientId: "CLIENT#014", transferId: "TRANSFER#014", timestamp: daysAgo(13), type: "DOCUMENT_REQUEST",  direction: "OUTBOUND", summary: "Requested beneficiary designation form.",                                          createdBy: A2 },
  { interactionId: "INTERACTION#019", clientId: "CLIENT#014", transferId: "TRANSFER#014", timestamp: daysAgo(11), type: "ADVISOR_EMAIL",     direction: "OUTBOUND", summary: "Second reminder about the outstanding beneficiary form. No response yet.",          createdBy: A2 },
];
