/**
 * Subfile type configuration — maps subfile type codes to their display
 * properties and entry mode, based on the KenloadV2 reference model and FRD.
 */

export type SubfileEntryMode =
  | 'auto'          // A: auto-populated from case register, read-only
  | 'evidence'      // B: titled file uploads with exhibit flag
  | 'expert'        // C: expert report file uploads with type selector
  | 'witness'       // D: structured witness statement (name/role/contact + file)
  | 'accused-stmt'  // E: accused statement file + optional narrative
  | 'diary'         // F: rich-text investigation diary entries
  | 'court-doc'     // G: court documents (type + dates + file + comments)
  | 'accused-rec'   // H: accused records (exhibits, witnesses, ID docs)
  | 'covering'      // I: rich-text covering report + optional file
  | 'minute'        // J: rich-text minute sheets (target, subject, content, date)
  | 'generic';      // fallback

export interface SubfileTypeConfig {
  mode: SubfileEntryMode;
  /** Human-readable label for the "Add" button */
  addLabel: string;
  /** Short description shown inside the section */
  hint: string;
}

/** Codes that map to specific modes */
const CODE_MODE_MAP: Record<string, SubfileEntryMode> = {
  A: 'auto',
  B: 'evidence',
  C: 'expert',
  D: 'witness',
  E: 'accused-stmt',
  F: 'diary',
  G: 'court-doc',
  H: 'accused-rec',
  I: 'covering',
  J: 'minute',
};

/** Keywords used when code is not a single letter A-J (legacy DB codes) */
const NAME_MODE_MAP: Array<{ keywords: string[]; mode: SubfileEntryMode }> = [
  { keywords: ['INITIAL', 'CASE REGISTER', 'CASE DETAIL'], mode: 'auto' },
  { keywords: ['EVIDENCE', 'WEIGH', 'PHOTOGRAPH'], mode: 'evidence' },
  { keywords: ['EXPERT', 'FORENSIC', 'ENGINEER', 'CALIBR'], mode: 'expert' },
  { keywords: ['WITNESS', 'STATEMENT'], mode: 'witness' },
  { keywords: ['ACCUSED', 'REWEIGH', 'COMPLIANCE'], mode: 'accused-stmt' },
  { keywords: ['DIARY', 'INVESTIGATION'], mode: 'diary' },
  { keywords: ['CHARGE', 'WARRANT', 'BOND', 'NTAC', 'COURT DOC'], mode: 'court-doc' },
  { keywords: ['ACCUSED REC', 'PARTIES', 'EXHIBITS', 'RECORD'], mode: 'accused-rec' },
  { keywords: ['COVERING', 'COVER REPORT', 'PROSECUT'], mode: 'covering' },
  { keywords: ['MINUTE', 'CORRESPONDENCE', 'CORRESPOND'], mode: 'minute' },
];

const CONFIG_MAP: Record<SubfileEntryMode, SubfileTypeConfig> = {
  auto: {
    mode: 'auto',
    addLabel: '',
    hint: 'Auto-populated from the case register when the case was logged. No manual entries required.',
  },
  evidence: {
    mode: 'evidence',
    addLabel: 'Add Evidence File',
    hint: 'Weight tickets, photographs, ANPR footage, permits, prohibition orders, and other physical evidence.',
  },
  expert: {
    mode: 'expert',
    addLabel: 'Add Expert Report',
    hint: 'Engineering, forensic, calibration certificates, and other professional technical reports.',
  },
  witness: {
    mode: 'witness',
    addLabel: 'Add Witness Statement',
    hint: 'Statements from inspectors, drivers, vehicle owners, and bystander witnesses.',
  },
  'accused-stmt': {
    mode: 'accused-stmt',
    addLabel: 'Add Accused Statement',
    hint: "Accused person's statements, reweigh documentation, and compliance records.",
  },
  diary: {
    mode: 'diary',
    addLabel: 'Add Diary Entry',
    hint: 'Investigation steps, timelines, findings, and actions taken. Each entry is a separate diary record.',
  },
  'court-doc': {
    mode: 'court-doc',
    addLabel: 'Add Court Document',
    hint: 'Charge sheets, bonds, NTAC notices, arrest warrants, bail documents, court receipts, and court orders.',
  },
  'accused-rec': {
    mode: 'accused-rec',
    addLabel: 'Add Accused Record',
    hint: 'Prior offences, identification documents, criminal history, and other accused records.',
  },
  covering: {
    mode: 'covering',
    addLabel: 'Edit Covering Report',
    hint: 'Prosecutorial summary memo that covers the case facts, evidence, and recommendations.',
  },
  minute: {
    mode: 'minute',
    addLabel: 'Add Minute Sheet',
    hint: 'Court minutes, adjournment records, official correspondence, and court orders.',
  },
  generic: {
    mode: 'generic',
    addLabel: 'Add Document',
    hint: '',
  },
};

export function getSubfileModeByCode(code?: string): SubfileEntryMode {
  if (!code) return 'generic';
  const upper = code.toUpperCase().trim();
  if (CODE_MODE_MAP[upper]) return CODE_MODE_MAP[upper];
  return 'generic';
}

export function getSubfileModeByName(name?: string): SubfileEntryMode {
  if (!name) return 'generic';
  const upper = name.toUpperCase();
  for (const { keywords, mode } of NAME_MODE_MAP) {
    if (keywords.some(k => upper.includes(k))) return mode;
  }
  return 'generic';
}

export function getSubfileConfig(code?: string, name?: string): SubfileTypeConfig {
  const byCode = getSubfileModeByCode(code);
  const mode = byCode !== 'generic' ? byCode : getSubfileModeByName(name);
  return CONFIG_MAP[mode];
}

// ─── Predefined option lists (mirrored from KenloadV2) ───────────────────────

export const EVIDENCE_FILE_TITLES = [
  'Approximation by Volume Sheet',
  'Exemption Permit',
  'Exhibit Memo',
  'Dimension Sheet',
  'Photographs',
  'Prohibition Order',
  'Maps',
  'Transgression Form',
  'Weigh Ticket',
  'ANPR Footage',
  'Other',
];

export const EXPERT_REPORT_TITLES = [
  'Material Testing Report',
  'Certificate of Calibration',
  'Certificate of Photographic Evidence',
  'Engineer Report',
  'Certificate of Electronic Report',
  'Certificate of Verification',
  'Forensic Report',
  'Other',
];

export const COURT_DOCUMENT_TYPES = [
  'Arrest Warrant',
  'Bond Document',
  'Charge Sheet',
  'Bail Document',
  'Court Receipt',
  'NTAC Document',
  'Committal Document',
  'Court Order',
  'Other',
];

export const WITNESS_ROLES = [
  'Inspecting Officer',
  'Investigating Officer',
  'Driver',
  'Vehicle Owner',
  'Bystander Witness',
  'Expert Witness',
  'Other',
];
