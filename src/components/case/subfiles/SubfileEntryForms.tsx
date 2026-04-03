"use client";

/**
 * Type-specific subfile entry forms.
 *
 * Each form component handles one subfile entry type (B–J).
 * Structured per-type data is stored in `metadata` (JSON string).
 * Rich text content is stored in `content` (HTML string).
 * File attachments use the upload API and store `filePath` / `fileUrl`.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useCreateSubfile, useUpdateSubfile } from '@/hooks/queries';
import type { CaseSubfileDto, SubfileTypeDto } from '@/lib/api/caseSubfile';
import { uploadSubfileDocument } from '@/lib/api/fileUpload';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  EVIDENCE_FILE_TITLES, EXPERT_REPORT_TITLES,
  COURT_DOCUMENT_TYPES, WITNESS_ROLES,
} from './SubfileTypeConfig';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadState {
  file: File | null;
  isUploading: boolean;
  progress: number;
}

function useFileUpload() {
  const [state, setState] = useState<FileUploadState>({ file: null, isUploading: false, progress: 0 });

  const setFile = (file: File | null) => setState(s => ({ ...s, file }));

  const uploadFile = async (caseId: string) => {
    if (!state.file) return null;
    setState(s => ({ ...s, isUploading: true, progress: 30 }));
    try {
      const result = await uploadSubfileDocument(caseId, state.file);
      setState(s => ({ ...s, progress: 100 }));
      return result;
    } catch {
      toast.error('File upload failed');
      setState(s => ({ ...s, isUploading: false, progress: 0 }));
      return undefined;
    } finally {
      setState(s => ({ ...s, isUploading: false }));
    }
  };

  const reset = () => setState({ file: null, isUploading: false, progress: 0 });

  return { ...state, setFile, uploadFile, reset };
}

interface FilePickerProps {
  label?: string;
  optional?: boolean;
  onFileChange: (file: File | null) => void;
  file: File | null;
  isUploading?: boolean;
  progress?: number;
}

function FilePicker({ label = 'Attach File', optional, onFileChange, file, isUploading, progress }: FilePickerProps) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{optional ? <span className="text-muted-foreground ml-1 font-normal">(optional)</span> : ' *'}</Label>
      <Input
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.mov,.xls,.xlsx,.csv,.txt"
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        className="text-sm"
      />
      {file && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Upload className="h-3 w-3" />
          <span className="truncate max-w-[240px]">{file.name}</span>
          <span className="text-muted-foreground/60">{formatBytes(file.size)}</span>
          <button type="button" onClick={() => onFileChange(null)}>
            <X className="h-3 w-3 hover:text-destructive" />
          </button>
        </div>
      )}
      {isUploading && (
        <div className="w-full bg-muted rounded-full h-1.5">
          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress ?? 0}%` }} />
        </div>
      )}
    </div>
  );
}

// ─── Shared dialog wrapper ────────────────────────────────────────────────────

interface EntryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  size?: 'md' | 'lg' | 'xl';
}

function EntryDialog({
  open, onOpenChange, title, description, children, onSubmit,
  isSubmitting, submitLabel = 'Save', size = 'lg',
}: EntryDialogProps) {
  const maxW = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }[size];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxW}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          {children}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type B – Evidence Files
// ═══════════════════════════════════════════════════════════════════════════════

interface EvidenceFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subfileType: SubfileTypeDto;
  caseId: string;
  caseNo: string;
  existing?: CaseSubfileDto;
}

export function EvidenceFileForm({ open, onOpenChange, subfileType, caseId, caseNo, existing }: EvidenceFormProps) {
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const upload = useFileUpload();

  const [title, setTitle] = useState(existing?.subfileName ?? '');
  const [customTitle, setCustomTitle] = useState('');
  const [markedAsExhibit, setMarkedAsExhibit] = useState(
    existing ? (JSON.parse(existing.metadata ?? '{}').markedAsExhibit ?? false) : false
  );

  const isEditing = !!existing;
  const isBusy = createMutation.isPending || updateMutation.isPending || upload.isUploading;

  const handleSubmit = async () => {
    const effectiveTitle = title === 'Other' ? customTitle : title;
    if (!effectiveTitle) { toast.error('Please select or enter a file title'); return; }
    if (!isEditing && !upload.file) { toast.error('Please attach a file'); return; }

    let filePath = existing?.filePath;
    let fileUrl = existing?.fileUrl;
    let mimeType = existing?.mimeType;
    let fileSizeBytes = existing?.fileSizeBytes;

    if (upload.file) {
      const result = await upload.uploadFile(caseId);
      if (!result) return;
      filePath = result.filePath; fileUrl = result.fileUrl;
      mimeType = result.mimeType; fileSizeBytes = result.fileSizeBytes;
    }

    const metadata = JSON.stringify({ markedAsExhibit });

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: existing.id, caseId, request: { subfileName: effectiveTitle, filePath, fileUrl, metadata } });
      } else {
        await createMutation.mutateAsync({ caseRegisterId: caseId, subfileTypeId: subfileType.id, subfileName: effectiveTitle, filePath, fileUrl, mimeType, fileSizeBytes, metadata });
      }
      toast.success(isEditing ? 'Evidence updated' : 'Evidence file added');
      onOpenChange(false);
      upload.reset();
      setTitle(''); setCustomTitle(''); setMarkedAsExhibit(false);
    } catch { toast.error('Failed to save evidence file'); }
  };

  return (
    <EntryDialog
      open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Evidence File' : `Add Evidence – ${caseNo}`}
      description="Weight tickets, photographs, ANPR footage, permits, prohibition orders, etc."
      onSubmit={handleSubmit} isSubmitting={isBusy}
      submitLabel={isEditing ? 'Update' : 'Add Evidence'}
    >
      <div className="space-y-2">
        <Label>File Title *</Label>
        <Select value={title} onValueChange={setTitle}>
          <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
          <SelectContent>
            {EVIDENCE_FILE_TITLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {title === 'Other' && (
          <Input value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Describe the document" />
        )}
      </div>
      <FilePicker label="Evidence File" onFileChange={upload.setFile} file={upload.file} isUploading={upload.isUploading} progress={upload.progress} optional={isEditing} />
      <div className="flex items-center gap-2">
        <Checkbox id="exhibit" checked={markedAsExhibit} onCheckedChange={v => setMarkedAsExhibit(!!v)} />
        <Label htmlFor="exhibit" className="font-normal cursor-pointer">Mark as exhibit</Label>
      </div>
    </EntryDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type C – Expert Reports
// ═══════════════════════════════════════════════════════════════════════════════

interface ExpertReportFormProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  subfileType: SubfileTypeDto; caseId: string; caseNo: string; existing?: CaseSubfileDto;
}

export function ExpertReportForm({ open, onOpenChange, subfileType, caseId, caseNo, existing }: ExpertReportFormProps) {
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const upload = useFileUpload();
  const [reportType, setReportType] = useState(existing?.subfileName ?? '');
  const [customType, setCustomType] = useState('');
  const [notes, setNotes] = useState(existing?.content ?? '');

  const isEditing = !!existing;
  const isBusy = createMutation.isPending || updateMutation.isPending || upload.isUploading;

  const handleSubmit = async () => {
    const effectiveType = reportType === 'Other' ? customType : reportType;
    if (!effectiveType) { toast.error('Please select a report type'); return; }
    if (!isEditing && !upload.file) { toast.error('Please attach the report file'); return; }

    let filePath = existing?.filePath, fileUrl = existing?.fileUrl, mimeType = existing?.mimeType, fileSizeBytes = existing?.fileSizeBytes;
    if (upload.file) {
      const r = await upload.uploadFile(caseId);
      if (!r) return;
      filePath = r.filePath; fileUrl = r.fileUrl; mimeType = r.mimeType; fileSizeBytes = r.fileSizeBytes;
    }
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: existing.id, caseId, request: { subfileName: effectiveType, content: notes, filePath, fileUrl } });
      } else {
        await createMutation.mutateAsync({ caseRegisterId: caseId, subfileTypeId: subfileType.id, subfileName: effectiveType, content: notes || undefined, filePath, fileUrl, mimeType, fileSizeBytes });
      }
      toast.success(isEditing ? 'Report updated' : 'Expert report added');
      onOpenChange(false); upload.reset(); setReportType(''); setCustomType(''); setNotes('');
    } catch { toast.error('Failed to save expert report'); }
  };

  return (
    <EntryDialog open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Expert Report' : `Add Expert Report – ${caseNo}`}
      description="Engineering, forensic, calibration, and other professional technical reports."
      onSubmit={handleSubmit} isSubmitting={isBusy}
      submitLabel={isEditing ? 'Update' : 'Add Report'}
    >
      <div className="space-y-2">
        <Label>Report Type *</Label>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
          <SelectContent>
            {EXPERT_REPORT_TITLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {reportType === 'Other' && (
          <Input value={customType} onChange={e => setCustomType(e.target.value)} placeholder="Describe the report type" />
        )}
      </div>
      <FilePicker label="Report File" onFileChange={upload.setFile} file={upload.file} isUploading={upload.isUploading} progress={upload.progress} optional={isEditing} />
      <div className="space-y-2">
        <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Key findings, summary notes..." rows={3} />
      </div>
    </EntryDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type D – Witness Statements
// ═══════════════════════════════════════════════════════════════════════════════

interface WitnessFormProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  subfileType: SubfileTypeDto; caseId: string; caseNo: string; existing?: CaseSubfileDto;
}

export function WitnessStatementForm({ open, onOpenChange, subfileType, caseId, caseNo, existing }: WitnessFormProps) {
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const upload = useFileUpload();

  const parsedMeta = existing?.metadata ? JSON.parse(existing.metadata) : {};
  const [fullName, setFullName] = useState(parsedMeta.fullName ?? '');
  const [phone, setPhone] = useState(parsedMeta.phone ?? '');
  const [email, setEmail] = useState(parsedMeta.email ?? '');
  const [role, setRole] = useState(parsedMeta.role ?? '');
  const [statement, setStatement] = useState(existing?.content ?? '');

  const isEditing = !!existing;
  const isBusy = createMutation.isPending || updateMutation.isPending || upload.isUploading;

  const handleSubmit = async () => {
    if (!fullName.trim()) { toast.error('Full name is required'); return; }
    if (!role) { toast.error('Witness role is required'); return; }

    let filePath = existing?.filePath, fileUrl = existing?.fileUrl, mimeType = existing?.mimeType, fileSizeBytes = existing?.fileSizeBytes;
    if (upload.file) {
      const r = await upload.uploadFile(caseId);
      if (!r) return;
      filePath = r.filePath; fileUrl = r.fileUrl; mimeType = r.mimeType; fileSizeBytes = r.fileSizeBytes;
    }

    const metadata = JSON.stringify({ fullName, phone, email, role });

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: existing.id, caseId, request: { subfileName: fullName, content: statement || undefined, filePath, fileUrl, metadata } });
      } else {
        await createMutation.mutateAsync({ caseRegisterId: caseId, subfileTypeId: subfileType.id, subfileName: fullName, content: statement || undefined, filePath, fileUrl, mimeType, fileSizeBytes, metadata });
      }
      toast.success(isEditing ? 'Witness statement updated' : 'Witness statement added');
      onOpenChange(false); upload.reset();
      setFullName(''); setPhone(''); setEmail(''); setRole(''); setStatement('');
    } catch { toast.error('Failed to save witness statement'); }
  };

  return (
    <EntryDialog open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Witness Statement' : `Add Witness Statement – ${caseNo}`}
      description="Inspector, driver, vehicle owner, or bystander witness statement."
      onSubmit={handleSubmit} isSubmitting={isBusy} size="xl"
      submitLabel={isEditing ? 'Update' : 'Add Statement'}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Full Name *</Label>
          <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Witness full name" />
        </div>
        <div className="space-y-2">
          <Label>Role *</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {WITNESS_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+254..." type="tel" />
        </div>
        <div className="space-y-2">
          <Label>Email <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" type="email" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Statement Narrative <span className="text-muted-foreground font-normal">(or attach file below)</span></Label>
        <RichTextEditor value={statement} onChange={setStatement} placeholder="Type the witness statement here..." minHeight={180} />
      </div>
      <FilePicker label="Statement File" onFileChange={upload.setFile} file={upload.file} isUploading={upload.isUploading} progress={upload.progress} optional />
    </EntryDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type E – Accused Statement
// ═══════════════════════════════════════════════════════════════════════════════

interface AccusedStmtFormProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  subfileType: SubfileTypeDto; caseId: string; caseNo: string; existing?: CaseSubfileDto;
}

export function AccusedStatementForm({ open, onOpenChange, subfileType, caseId, caseNo, existing }: AccusedStmtFormProps) {
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const upload = useFileUpload();
  const [title, setTitle] = useState(existing?.subfileName ?? 'Accused Statement');
  const [content, setContent] = useState(existing?.content ?? '');

  const isEditing = !!existing;
  const isBusy = createMutation.isPending || updateMutation.isPending || upload.isUploading;

  const handleSubmit = async () => {
    if (!content && !upload.file && !existing?.fileUrl) { toast.error('Please provide a statement or attach a file'); return; }

    let filePath = existing?.filePath, fileUrl = existing?.fileUrl, mimeType = existing?.mimeType, fileSizeBytes = existing?.fileSizeBytes;
    if (upload.file) {
      const r = await upload.uploadFile(caseId);
      if (!r) return;
      filePath = r.filePath; fileUrl = r.fileUrl; mimeType = r.mimeType; fileSizeBytes = r.fileSizeBytes;
    }
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: existing.id, caseId, request: { subfileName: title, content: content || undefined, filePath, fileUrl } });
      } else {
        await createMutation.mutateAsync({ caseRegisterId: caseId, subfileTypeId: subfileType.id, subfileName: title, content: content || undefined, filePath, fileUrl, mimeType, fileSizeBytes });
      }
      toast.success(isEditing ? 'Statement updated' : 'Accused statement added');
      onOpenChange(false); upload.reset(); setContent('');
    } catch { toast.error('Failed to save accused statement'); }
  };

  return (
    <EntryDialog open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Accused Statement' : `Add Accused Statement – ${caseNo}`}
      description="Accused person's statement, reweigh documentation, and compliance records."
      onSubmit={handleSubmit} isSubmitting={isBusy} size="xl"
      submitLabel={isEditing ? 'Update' : 'Save Statement'}
    >
      <div className="space-y-2">
        <Label>Document Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Accused Statement – John Doe" />
      </div>
      <div className="space-y-2">
        <Label>Statement / Narrative <span className="text-muted-foreground font-normal">(or attach file below)</span></Label>
        <RichTextEditor value={content} onChange={setContent} placeholder="Type or paste the accused's statement here..." minHeight={200} />
      </div>
      <FilePicker label="Statement File" onFileChange={upload.setFile} file={upload.file} isUploading={upload.isUploading} progress={upload.progress} optional />
    </EntryDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type F – Investigation Diary
// ═══════════════════════════════════════════════════════════════════════════════

interface DiaryFormProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  subfileType: SubfileTypeDto; caseId: string; caseNo: string; existing?: CaseSubfileDto;
}

export function DiaryEntryForm({ open, onOpenChange, subfileType, caseId, caseNo, existing }: DiaryFormProps) {
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const upload = useFileUpload();

  const parsedMeta = existing?.metadata ? JSON.parse(existing.metadata) : {};
  const [entryType, setEntryType] = useState(parsedMeta.entryType ?? 'investigation');
  const [priority, setPriority] = useState(parsedMeta.priority ?? 'normal');
  const [status, setStatus] = useState(parsedMeta.status ?? 'open');
  const [entryDate, setEntryDate] = useState(parsedMeta.entryDate ?? new Date().toISOString().slice(0, 16));
  const [obRef, setObRef] = useState(parsedMeta.obRef ?? '');
  const [officerName, setOfficerName] = useState(parsedMeta.officerName ?? '');
  const [followUpDate, setFollowUpDate] = useState(parsedMeta.followUpDate ?? '');
  const [linkedHearingRef, setLinkedHearingRef] = useState(parsedMeta.linkedHearingRef ?? '');
  const [description, setDescription] = useState(existing?.content ?? '');

  const isEditing = !!existing;
  const isBusy = createMutation.isPending || updateMutation.isPending || upload.isUploading;

  const handleSubmit = async () => {
    if (!description || description === '<p></p>') { toast.error('Diary entry description is required'); return; }

    let filePath = existing?.filePath, fileUrl = existing?.fileUrl, mimeType = existing?.mimeType, fileSizeBytes = existing?.fileSizeBytes;
    if (upload.file) {
      const r = await upload.uploadFile(caseId);
      if (!r) return;
      filePath = r.filePath; fileUrl = r.fileUrl; mimeType = r.mimeType; fileSizeBytes = r.fileSizeBytes;
    }

    const entryTitle = `Diary – ${new Date(entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    const metadata = JSON.stringify({ entryDate, obRef, officerName, entryType, priority, status, followUpDate: followUpDate || undefined, linkedHearingRef: linkedHearingRef || undefined });

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: existing.id, caseId, request: { subfileName: entryTitle, content: description, filePath, fileUrl, metadata } });
      } else {
        await createMutation.mutateAsync({ caseRegisterId: caseId, subfileTypeId: subfileType.id, subfileName: entryTitle, content: description, filePath, fileUrl, mimeType, fileSizeBytes, metadata });
      }
      toast.success(isEditing ? 'Diary entry updated' : 'Diary entry added');
      onOpenChange(false); upload.reset(); setDescription('');
    } catch { toast.error('Failed to save diary entry'); }
  };

  return (
    <EntryDialog open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Diary Entry' : `Add Diary Entry – ${caseNo}`}
      description="Record investigation steps, findings, and timeline actions."
      onSubmit={handleSubmit} isSubmitting={isBusy} size="xl"
      submitLabel={isEditing ? 'Update' : 'Add Entry'}
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Entry Type *</Label>
          <Select value={entryType} onValueChange={setEntryType}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="investigation">Investigation</SelectItem>
              <SelectItem value="court_attendance">Court Attendance</SelectItem>
              <SelectItem value="witness_interview">Witness Interview</SelectItem>
              <SelectItem value="evidence_collection">Evidence Collection</SelectItem>
              <SelectItem value="correspondence">Correspondence</SelectItem>
              <SelectItem value="administrative">Administrative</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority *</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="important">Important</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status *</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="requires_follow_up">Requires Follow-up</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Entry Date & Time *</Label>
          <Input type="datetime-local" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>OB Reference <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input value={obRef} onChange={e => setObRef(e.target.value)} placeholder="e.g. OB/2026/001" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Investigating Officer <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input value={officerName} onChange={e => setOfficerName(e.target.value)} placeholder="Officer name" />
        </div>
        <div className="space-y-2">
          <Label>Follow-up Date <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Linked Hearing Reference <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input value={linkedHearingRef} onChange={e => setLinkedHearingRef(e.target.value)} placeholder="e.g. HRG/2026/001" />
      </div>
      <div className="space-y-2">
        <Label>Entry Description *</Label>
        <RichTextEditor value={description} onChange={setDescription} placeholder="Describe investigation actions, findings, steps taken..." minHeight={220} />
      </div>
      <FilePicker label="Extract File" onFileChange={upload.setFile} file={upload.file} isUploading={upload.isUploading} progress={upload.progress} optional />
    </EntryDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type G – Court Documents
// ═══════════════════════════════════════════════════════════════════════════════

interface CourtDocFormProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  subfileType: SubfileTypeDto; caseId: string; caseNo: string; existing?: CaseSubfileDto;
}

export function CourtDocumentForm({ open, onOpenChange, subfileType, caseId, caseNo, existing }: CourtDocFormProps) {
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const upload = useFileUpload();

  const parsedMeta = existing?.metadata ? JSON.parse(existing.metadata) : {};
  const [docType, setDocType] = useState(parsedMeta.docType ?? '');
  const [dateIssued, setDateIssued] = useState(parsedMeta.dateIssued ?? '');
  const [dateExecuted, setDateExecuted] = useState(parsedMeta.dateExecuted ?? '');
  const [comments, setComments] = useState(parsedMeta.comments ?? '');

  const isEditing = !!existing;
  const isBusy = createMutation.isPending || updateMutation.isPending || upload.isUploading;
  const needsDates = docType === 'Arrest Warrant';

  const handleSubmit = async () => {
    if (!docType) { toast.error('Please select a document type'); return; }
    if (!isEditing && !upload.file) { toast.error('Please attach the document file'); return; }

    let filePath = existing?.filePath, fileUrl = existing?.fileUrl, mimeType = existing?.mimeType, fileSizeBytes = existing?.fileSizeBytes;
    if (upload.file) {
      const r = await upload.uploadFile(caseId);
      if (!r) return;
      filePath = r.filePath; fileUrl = r.fileUrl; mimeType = r.mimeType; fileSizeBytes = r.fileSizeBytes;
    }

    const metadata = JSON.stringify({ docType, dateIssued, dateExecuted, comments });

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: existing.id, caseId, request: { subfileName: docType, content: comments || undefined, filePath, fileUrl, metadata } });
      } else {
        await createMutation.mutateAsync({ caseRegisterId: caseId, subfileTypeId: subfileType.id, subfileName: docType, content: comments || undefined, filePath, fileUrl, mimeType, fileSizeBytes, metadata });
      }
      toast.success(isEditing ? 'Document updated' : 'Court document added');
      onOpenChange(false); upload.reset();
      setDocType(''); setDateIssued(''); setDateExecuted(''); setComments('');
    } catch { toast.error('Failed to save court document'); }
  };

  return (
    <EntryDialog open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Court Document' : `Add Court Document – ${caseNo}`}
      description="Charge sheets, bonds, NTAC notices, arrest warrants, bail, court receipts, and court orders."
      onSubmit={handleSubmit} isSubmitting={isBusy} size="lg"
      submitLabel={isEditing ? 'Update' : 'Add Document'}
    >
      <div className="space-y-2">
        <Label>Document Type *</Label>
        <Select value={docType} onValueChange={setDocType}>
          <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
          <SelectContent>
            {COURT_DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {needsDates && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date Issued</Label>
            <Input type="date" value={dateIssued} onChange={e => setDateIssued(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date Executed <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input type="date" value={dateExecuted} onChange={e => setDateExecuted(e.target.value)} />
          </div>
        </div>
      )}
      <FilePicker label="Document File" onFileChange={upload.setFile} file={upload.file} isUploading={upload.isUploading} progress={upload.progress} optional={isEditing} />
      <div className="space-y-2">
        <Label>Comments <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Additional notes or comments..." rows={3} />
      </div>
    </EntryDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type H – Accused Records
// ═══════════════════════════════════════════════════════════════════════════════

interface AccusedRecFormProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  subfileType: SubfileTypeDto; caseId: string; caseNo: string; existing?: CaseSubfileDto;
}

export function AccusedRecordsForm({ open, onOpenChange, subfileType, caseId, caseNo, existing }: AccusedRecFormProps) {
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const upload = useFileUpload();

  const parsedMeta = existing?.metadata ? JSON.parse(existing.metadata) : {};
  const [docTitle, setDocTitle] = useState(existing?.subfileName ?? '');
  const [docKind, setDocKind] = useState(parsedMeta.docKind ?? '');
  const [notes, setNotes] = useState(existing?.content ?? '');

  const isEditing = !!existing;
  const isBusy = createMutation.isPending || updateMutation.isPending || upload.isUploading;

  const recordTypes = [
    'National ID',
    'Driving Licence',
    'Logbook',
    'NTS Documents',
    'Previous Conviction Record',
    'Criminal History Extract',
    'Other',
  ];

  const handleSubmit = async () => {
    if (!docTitle.trim()) { toast.error('Document title is required'); return; }
    if (!isEditing && !upload.file) { toast.error('Please attach the document'); return; }

    let filePath = existing?.filePath, fileUrl = existing?.fileUrl, mimeType = existing?.mimeType, fileSizeBytes = existing?.fileSizeBytes;
    if (upload.file) {
      const r = await upload.uploadFile(caseId);
      if (!r) return;
      filePath = r.filePath; fileUrl = r.fileUrl; mimeType = r.mimeType; fileSizeBytes = r.fileSizeBytes;
    }

    const metadata = JSON.stringify({ docKind });

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: existing.id, caseId, request: { subfileName: docTitle, content: notes || undefined, filePath, fileUrl, metadata } });
      } else {
        await createMutation.mutateAsync({ caseRegisterId: caseId, subfileTypeId: subfileType.id, subfileName: docTitle, content: notes || undefined, filePath, fileUrl, mimeType, fileSizeBytes, metadata });
      }
      toast.success(isEditing ? 'Record updated' : 'Accused record added');
      onOpenChange(false); upload.reset(); setDocTitle(''); setDocKind(''); setNotes('');
    } catch { toast.error('Failed to save accused record'); }
  };

  return (
    <EntryDialog open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Accused Record' : `Add Accused Record – ${caseNo}`}
      description="Prior offences, identification documents, criminal history, and other accused records."
      onSubmit={handleSubmit} isSubmitting={isBusy} size="lg"
      submitLabel={isEditing ? 'Update' : 'Add Record'}
    >
      <div className="space-y-2">
        <Label>Record Type <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Select value={docKind} onValueChange={setDocKind}>
          <SelectTrigger><SelectValue placeholder="Select record type" /></SelectTrigger>
          <SelectContent>
            {recordTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Document Title *</Label>
        <Input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="e.g. John Doe – National ID" />
      </div>
      <FilePicker label="Document File" onFileChange={upload.setFile} file={upload.file} isUploading={upload.isUploading} progress={upload.progress} optional={isEditing} />
      <div className="space-y-2">
        <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional context or notes about this record..." rows={3} />
      </div>
    </EntryDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type I – Covering Report
// ═══════════════════════════════════════════════════════════════════════════════

interface CoveringReportFormProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  subfileType: SubfileTypeDto; caseId: string; caseNo: string; existing?: CaseSubfileDto;
}

export function CoveringReportForm({ open, onOpenChange, subfileType, caseId, caseNo, existing }: CoveringReportFormProps) {
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const upload = useFileUpload();
  const [content, setContent] = useState(existing?.content ?? '');

  const isEditing = !!existing;
  const isBusy = createMutation.isPending || updateMutation.isPending || upload.isUploading;

  const handleSubmit = async () => {
    if (!content || content === '<p></p>') { toast.error('Report content is required'); return; }

    let filePath = existing?.filePath, fileUrl = existing?.fileUrl, mimeType = existing?.mimeType, fileSizeBytes = existing?.fileSizeBytes;
    if (upload.file) {
      const r = await upload.uploadFile(caseId);
      if (!r) return;
      filePath = r.filePath; fileUrl = r.fileUrl; mimeType = r.mimeType; fileSizeBytes = r.fileSizeBytes;
    }

    const title = `Covering Report – ${caseNo}`;
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: existing.id, caseId, request: { subfileName: title, content, filePath, fileUrl } });
      } else {
        await createMutation.mutateAsync({ caseRegisterId: caseId, subfileTypeId: subfileType.id, subfileName: title, content, filePath, fileUrl, mimeType, fileSizeBytes });
      }
      toast.success(isEditing ? 'Covering report updated' : 'Covering report saved');
      onOpenChange(false); upload.reset();
    } catch { toast.error('Failed to save covering report'); }
  };

  return (
    <EntryDialog open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Covering Report' : `Covering Report – ${caseNo}`}
      description="Prosecutorial summary memo covering case facts, evidence, and recommendations."
      onSubmit={handleSubmit} isSubmitting={isBusy} size="xl"
      submitLabel={isEditing ? 'Update Report' : 'Save Report'}
    >
      <div className="space-y-2">
        <Label>Report Content *</Label>
        <RichTextEditor value={content} onChange={setContent} placeholder="Write the prosecutorial covering report here. Include case facts, evidence summary, applicable statutes, and prosecution recommendations..." minHeight={320} />
      </div>
      <FilePicker label="Attach Report File" onFileChange={upload.setFile} file={upload.file} isUploading={upload.isUploading} progress={upload.progress} optional />
    </EntryDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type J – Minute Sheet & Correspondences
// ═══════════════════════════════════════════════════════════════════════════════

interface MinuteSheetFormProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  subfileType: SubfileTypeDto; caseId: string; caseNo: string; existing?: CaseSubfileDto;
}

export function MinuteSheetForm({ open, onOpenChange, subfileType, caseId, caseNo, existing }: MinuteSheetFormProps) {
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const upload = useFileUpload();

  const parsedMeta = existing?.metadata ? JSON.parse(existing.metadata) : {};
  const [targetParty, setTargetParty] = useState(parsedMeta.targetParty ?? '');
  const [subject, setSubject] = useState(existing?.subfileName ?? '');
  const [minuteDate, setMinuteDate] = useState(parsedMeta.minuteDate ?? new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState(existing?.content ?? '');

  const isEditing = !!existing;
  const isBusy = createMutation.isPending || updateMutation.isPending || upload.isUploading;

  const handleSubmit = async () => {
    if (!subject.trim()) { toast.error('Subject is required'); return; }
    if (!content || content === '<p></p>') { toast.error('Minute content is required'); return; }

    let filePath = existing?.filePath, fileUrl = existing?.fileUrl, mimeType = existing?.mimeType, fileSizeBytes = existing?.fileSizeBytes;
    if (upload.file) {
      const r = await upload.uploadFile(caseId);
      if (!r) return;
      filePath = r.filePath; fileUrl = r.fileUrl; mimeType = r.mimeType; fileSizeBytes = r.fileSizeBytes;
    }

    const metadata = JSON.stringify({ targetParty, minuteDate });

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: existing.id, caseId, request: { subfileName: subject, content, filePath, fileUrl, metadata } });
      } else {
        await createMutation.mutateAsync({ caseRegisterId: caseId, subfileTypeId: subfileType.id, subfileName: subject, content, filePath, fileUrl, mimeType, fileSizeBytes, metadata });
      }
      toast.success(isEditing ? 'Minute sheet updated' : 'Minute sheet added');
      onOpenChange(false); upload.reset();
      setTargetParty(''); setSubject(''); setContent('');
    } catch { toast.error('Failed to save minute sheet'); }
  };

  return (
    <EntryDialog open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Minute Sheet' : `Add Minute Sheet – ${caseNo}`}
      description="Court minutes, adjournment records, official correspondence, and court orders."
      onSubmit={handleSubmit} isSubmitting={isBusy} size="xl"
      submitLabel={isEditing ? 'Update' : 'Add Minute'}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Target Party <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Input value={targetParty} onChange={e => setTargetParty(e.target.value)} placeholder="e.g. Chief Magistrate, Court Registrar" />
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" value={minuteDate} onChange={e => setMinuteDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Subject *</Label>
        <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Adjournment – 18 March 2026, Court Minute #3" />
      </div>
      <div className="space-y-2">
        <Label>Content *</Label>
        <RichTextEditor value={content} onChange={setContent} placeholder="Record the court minute, correspondence content, or adjournment details here..." minHeight={220} />
      </div>
      <FilePicker label="Attach File" onFileChange={upload.setFile} file={upload.file} isUploading={upload.isUploading} progress={upload.progress} optional />
    </EntryDialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Generic fallback form
// ═══════════════════════════════════════════════════════════════════════════════

interface GenericFormProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  subfileType: SubfileTypeDto; caseId: string; caseNo: string; existing?: CaseSubfileDto;
}

export function GenericSubfileForm({ open, onOpenChange, subfileType, caseId, caseNo, existing }: GenericFormProps) {
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const upload = useFileUpload();
  const [name, setName] = useState(existing?.subfileName ?? '');
  const [content, setContent] = useState(existing?.content ?? '');

  const isEditing = !!existing;
  const isBusy = createMutation.isPending || updateMutation.isPending || upload.isUploading;

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Title is required'); return; }

    let filePath = existing?.filePath, fileUrl = existing?.fileUrl, mimeType = existing?.mimeType, fileSizeBytes = existing?.fileSizeBytes;
    if (upload.file) {
      const r = await upload.uploadFile(caseId);
      if (!r) return;
      filePath = r.filePath; fileUrl = r.fileUrl; mimeType = r.mimeType; fileSizeBytes = r.fileSizeBytes;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: existing.id, caseId, request: { subfileName: name, content: content || undefined, filePath, fileUrl } });
      } else {
        await createMutation.mutateAsync({ caseRegisterId: caseId, subfileTypeId: subfileType.id, subfileName: name, content: content || undefined, filePath, fileUrl, mimeType, fileSizeBytes });
      }
      toast.success(isEditing ? 'Entry updated' : 'Entry added');
      onOpenChange(false); upload.reset(); setName(''); setContent('');
    } catch { toast.error('Failed to save entry'); }
  };

  return (
    <EntryDialog open={open} onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Entry' : `Add to ${subfileType.name} – ${caseNo}`}
      onSubmit={handleSubmit} isSubmitting={isBusy}
      submitLabel={isEditing ? 'Update' : 'Add Entry'}
    >
      <div className="space-y-2">
        <Label>Title *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Document or entry title" />
      </div>
      <div className="space-y-2">
        <Label>Content / Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <RichTextEditor value={content} onChange={setContent} placeholder="Enter content or notes..." minHeight={160} />
      </div>
      <FilePicker label="Attach File" onFileChange={upload.setFile} file={upload.file} isUploading={upload.isUploading} progress={upload.progress} optional />
    </EntryDialog>
  );
}
