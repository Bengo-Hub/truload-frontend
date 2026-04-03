"use client";

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PermissionActionButton } from '@/components/ui/permission-action-button';
import { RichTextDisplay } from '@/components/ui/rich-text-editor';
import {
  useSubfilesByCaseId, useSubfileCompletion, useSubfileTypes, useDeleteSubfile,
} from '@/hooks/queries';
import type { CaseSubfileDto, SubfileTypeDto } from '@/lib/api/caseSubfile';
import {
  EvidenceFileForm,
  ExpertReportForm,
  WitnessStatementForm,
  AccusedStatementForm,
  DiaryEntryForm,
  CourtDocumentForm,
  AccusedRecordsForm,
  CoveringReportForm,
  MinuteSheetForm,
  GenericSubfileForm,
} from './subfiles/SubfileEntryForms';
import { getSubfileConfig } from './subfiles/SubfileTypeConfig';
import type { SubfileEntryMode } from './subfiles/SubfileTypeConfig';
import {
  ChevronDown, ChevronRight, Edit, ExternalLink, FileStack,
  FileText, Loader2, Plus, Trash2,
} from 'lucide-react';
import { useHasPermission } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d?: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Parse metadata JSON safely. */
function parseMeta(raw?: string): Record<string, string> {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

// ─── EntryFormRouter ─────────────────────────────────────────────────────────

/**
 * Renders the appropriate type-specific form based on entry mode.
 */
interface EntryFormRouterProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: SubfileEntryMode;
  subfileType: SubfileTypeDto;
  caseId: string;
  caseNo: string;
  existing?: CaseSubfileDto;
}

function EntryFormRouter({ open, onOpenChange, mode, subfileType, caseId, caseNo, existing }: EntryFormRouterProps) {
  const props = { open, onOpenChange, subfileType, caseId, caseNo, existing };
  switch (mode) {
    case 'evidence':     return <EvidenceFileForm {...props} />;
    case 'expert':       return <ExpertReportForm {...props} />;
    case 'witness':      return <WitnessStatementForm {...props} />;
    case 'accused-stmt': return <AccusedStatementForm {...props} />;
    case 'diary':        return <DiaryEntryForm {...props} />;
    case 'court-doc':    return <CourtDocumentForm {...props} />;
    case 'accused-rec':  return <AccusedRecordsForm {...props} />;
    case 'covering':     return <CoveringReportForm {...props} />;
    case 'minute':       return <MinuteSheetForm {...props} />;
    default:             return <GenericSubfileForm {...props} />;
  }
}

// ─── EntryCard ───────────────────────────────────────────────────────────────

/**
 * Renders a single subfile entry in a compact card.
 * The display adapts to the mode — shows structured metadata fields
 * and uses RichTextDisplay for HTML content.
 */
interface EntryCardProps {
  sf: CaseSubfileDto;
  mode: SubfileEntryMode;
  canEdit: boolean;
  onEdit: (sf: CaseSubfileDto) => void;
  onDelete: (sf: CaseSubfileDto) => void;
}

function EntryCard({ sf, mode, canEdit, onEdit, onDelete }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = parseMeta(sf.metadata);
  const hasRichContent = sf.content && sf.content !== '<p></p>';
  const hasStructuredMeta = Object.keys(meta).filter(k => meta[k]).length > 0;

  const metaFields: [string, string][] = [];
  if (mode === 'witness') {
    if (meta.role) metaFields.push(['Role', meta.role]);
    if (meta.phone) metaFields.push(['Phone', meta.phone]);
    if (meta.email) metaFields.push(['Email', meta.email]);
  }
  if (mode === 'diary') {
    if (meta.entryDate) metaFields.push(['Date', new Date(meta.entryDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })]);
    if (meta.obRef) metaFields.push(['OB Ref', meta.obRef]);
    if (meta.officerName) metaFields.push(['Officer', meta.officerName]);
  }
  if (mode === 'court-doc') {
    if (meta.docType) metaFields.push(['Type', meta.docType]);
    if (meta.dateIssued) metaFields.push(['Issued', formatDate(meta.dateIssued)]);
    if (meta.dateExecuted) metaFields.push(['Executed', formatDate(meta.dateExecuted)]);
  }
  if (mode === 'minute') {
    if (meta.targetParty) metaFields.push(['To', meta.targetParty]);
    if (meta.minuteDate) metaFields.push(['Date', formatDate(meta.minuteDate)]);
  }
  if (mode === 'accused-rec') {
    if (meta.docKind) metaFields.push(['Type', meta.docKind]);
  }
  if (mode === 'evidence') {
    if (meta.markedAsExhibit === 'true') metaFields.push(['Status', 'Marked as Exhibit']);
  }

  const canExpand = hasRichContent || (sf.content && mode !== 'evidence' && mode !== 'expert' && mode !== 'accused-rec');

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <div className="flex items-start gap-3 p-3">
        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {sf.subfileName || 'Untitled'}
              </p>
              {/* Inline meta chips */}
              {metaFields.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {metaFields.map(([k, v]) => (
                    <span key={k} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      <span className="font-medium">{k}:</span> {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {canExpand && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
                >
                  {expanded ? 'Less' : 'Read'}
                </button>
              )}
              {canEdit && (
                <>
                  <PermissionActionButton permission="case.update" icon={Edit} label="Edit" onClick={() => onEdit(sf)} />
                  <PermissionActionButton permission="case.delete" icon={Trash2} label="Delete" onClick={() => onDelete(sf)} destructive />
                </>
              )}
            </div>
          </div>

          {/* File link */}
          {sf.fileUrl && (
            <a
              href={sf.fileUrl}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
            >
              <ExternalLink className="h-3 w-3" />
              {sf.mimeType?.startsWith('image/') ? 'View image' : 'Open file'}
              {sf.fileSizeBytes ? ` · ${formatBytes(sf.fileSizeBytes)}` : ''}
            </a>
          )}

          {/* Footer */}
          <p className="text-xs text-muted-foreground mt-1">
            {sf.uploadedByName || 'Unknown'} · {formatDate(sf.createdAt)}
          </p>
        </div>
      </div>

      {/* Expandable rich content */}
      {expanded && hasRichContent && (
        <div className="border-t px-4 py-3 bg-muted/20">
          <RichTextDisplay html={sf.content} className="text-sm" />
        </div>
      )}
    </div>
  );
}

// ─── SubfileTypeSection ───────────────────────────────────────────────────────

interface SubfileTypeSectionProps {
  subfileType: SubfileTypeDto;
  entries: CaseSubfileDto[];
  caseId: string;
  caseNo: string;
  canEdit: boolean;
}

function SubfileTypeSection({ subfileType, entries, caseId, caseNo, canEdit }: SubfileTypeSectionProps) {
  const config = getSubfileConfig(subfileType.code, subfileType.name);
  const mode = config.mode;
  const isAuto = mode === 'auto';

  // Start expanded if empty and not auto, or if it's a singleton (covering report)
  const [expanded, setExpanded] = useState(entries.length === 0 && !isAuto);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editEntry, setEditEntry] = useState<CaseSubfileDto | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<CaseSubfileDto | null>(null);
  const deleteMutation = useDeleteSubfile();

  const handleDelete = async () => {
    if (!deleteEntry) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteEntry.id, caseId });
      toast.success('Entry deleted');
      setDeleteEntry(null);
    } catch { toast.error('Failed to delete entry'); }
  };

  // Covering report: only one entry (the report itself), add = edit if exists
  const isCovering = mode === 'covering';
  const existingCovering = isCovering ? entries[0] : undefined;

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        {/* Section header */}
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {expanded
              ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            }
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {subfileType.code && (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                    {subfileType.code}
                  </span>
                )}
                <span className="font-semibold text-sm truncate">{subfileType.name}</span>
                {isAuto && <Badge variant="secondary" className="text-xs flex-shrink-0">Auto</Badge>}
              </div>
              {subfileType.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px] sm:max-w-md">{subfileType.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {entries.length > 0
              ? <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700 flex-shrink-0">{entries.length}</Badge>
              : !isAuto && <Badge variant="outline" className="text-xs text-muted-foreground flex-shrink-0">Empty</Badge>
            }
          </div>
        </button>

        {/* Section body */}
        {expanded && (
          <div className="p-4 space-y-3">
            {/* Hint */}
            {config.hint && (
              <p className="text-xs text-muted-foreground border-l-2 border-muted pl-2">{config.hint}</p>
            )}

            {isAuto ? (
              <p className="text-sm text-muted-foreground italic">
                Automatically populated from the case register when this case was logged. No manual entry required.
              </p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No entries yet.</p>
            ) : (
              <div className="space-y-2">
                {entries.map(sf => (
                  <EntryCard
                    key={sf.id}
                    sf={sf}
                    mode={mode}
                    canEdit={canEdit}
                    onEdit={setEditEntry}
                    onDelete={setDeleteEntry}
                  />
                ))}
              </div>
            )}

            {/* Add / Edit button */}
            {!isAuto && canEdit && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => {
                  if (isCovering && existingCovering) {
                    setEditEntry(existingCovering);
                  } else {
                    setShowAddForm(true);
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {isCovering && existingCovering ? 'Edit Covering Report' : config.addLabel || 'Add Entry'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add form */}
      <EntryFormRouter
        open={showAddForm}
        onOpenChange={setShowAddForm}
        mode={mode}
        subfileType={subfileType}
        caseId={caseId}
        caseNo={caseNo}
      />

      {/* Edit form */}
      {editEntry && (
        <EntryFormRouter
          open={!!editEntry}
          onOpenChange={(v) => { if (!v) setEditEntry(null); }}
          mode={mode}
          subfileType={subfileType}
          caseId={caseId}
          caseNo={caseNo}
          existing={editEntry}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteEntry} onOpenChange={(v) => { if (!v) setDeleteEntry(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>
              Delete &quot;{deleteEntry?.subfileName || 'this entry'}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEntry(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── CaseSubfileList (main export) ───────────────────────────────────────────

interface Props {
  caseId: string;
  caseNo: string;
}

export function CaseSubfileList({ caseId, caseNo }: Props) {
  const canEdit = useHasPermission('case.update');
  const { data: subfiles = [], isLoading } = useSubfilesByCaseId(caseId);
  const { data: completion } = useSubfileCompletion(caseId);
  const { data: subfileTypes = [], isLoading: loadingTypes } = useSubfileTypes();

  const completionPct = completion
    ? Math.round((completion.completedTypes / completion.totalTypes) * 100)
    : 0;

  // Group subfiles by type
  const subfilesByType = subfiles.reduce<Record<string, CaseSubfileDto[]>>((acc, sf) => {
    const key = sf.subfileTypeId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(sf);
    return acc;
  }, {});

  // Sort types: single-letter codes (A-J) first, then alphabetically
  const sortedTypes = [...subfileTypes].sort((a, b) => {
    const ca = (a.code ?? '').toUpperCase();
    const cb = (b.code ?? '').toUpperCase();
    const la = /^[A-Z]$/.test(ca), lb = /^[A-Z]$/.test(cb);
    if (la && lb) return ca.localeCompare(cb);
    if (la) return -1;
    if (lb) return 1;
    return ca.localeCompare(cb);
  });

  // Orphan entries (type removed from taxonomy)
  const knownTypeIds = new Set(subfileTypes.map(t => t.id));
  const orphans = subfiles.filter(sf => !knownTypeIds.has(sf.subfileTypeId));

  return (
    <div className="space-y-4">
      {/* Completion summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileStack className="h-5 w-5 text-indigo-500" />
            Case Subfiles
            <span className="text-sm font-normal text-muted-foreground">
              {subfiles.length} {subfiles.length === 1 ? 'entry' : 'entries'} across {sortedTypes.length} types
            </span>
          </CardTitle>
        </CardHeader>
        {completion && (
          <CardContent className="pt-0 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{completion.completedTypes}/{completion.totalTypes} types populated</span>
            </div>
            <Progress value={completionPct} className="h-2" />
            {completionPct === 100 && (
              <p className="text-xs text-green-600 font-medium">All subfile types have at least one entry.</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Per-type sections */}
      {isLoading || loadingTypes ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {sortedTypes.map(type => (
            <SubfileTypeSection
              key={type.id}
              subfileType={type}
              entries={subfilesByType[type.id] ?? []}
              caseId={caseId}
              caseNo={caseNo}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {/* Orphan entries */}
      {orphans.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Other Documents ({orphans.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orphans.map(sf => (
              <div key={sf.id} className="flex items-start gap-2 p-2 rounded border text-sm">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{sf.subfileName || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">
                    {sf.subfileTypeName || 'Unknown type'} · {formatDate(sf.createdAt)}
                  </p>
                  {sf.fileUrl && (
                    <a href={sf.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> View file
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
