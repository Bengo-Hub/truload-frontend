"use client";

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PermissionActionButton } from '@/components/ui/permission-action-button';
import {
  useSubfilesByCaseId, useSubfileCompletion, useSubfileTypes,
  useCreateSubfile, useUpdateSubfile, useDeleteSubfile,
} from '@/hooks/queries';
import type { CaseSubfileDto } from '@/lib/api/caseSubfile';
import { uploadSubfileDocument } from '@/lib/api/fileUpload';
import { Edit, ExternalLink, FileStack, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useHasPermission } from '@/hooks/useAuth';
import { toast } from 'sonner';

const createSubfileSchema = z.object({
  subfileTypeId: z.string().min(1, 'Document category is required'),
  subfileName: z.string().min(1, 'Document name is required'),
  documentType: z.string().optional(),
  fileUrl: z.string().optional(),
  content: z.string().optional(),
});

type CreateSubfileFormValues = z.infer<typeof createSubfileSchema>;

const editSubfileSchema = z.object({
  subfileName: z.string().optional(),
  fileUrl: z.string().optional(),
  content: z.string().optional(),
});

type EditSubfileFormValues = z.infer<typeof editSubfileSchema>;

function formatBytes(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  caseId: string;
  caseNo: string;
}

export function CaseSubfileList({ caseId, caseNo }: Props) {
  const canEdit = useHasPermission('case.update');
  const { data: subfiles = [], isLoading } = useSubfilesByCaseId(caseId);
  const { data: completion } = useSubfileCompletion(caseId);
  const { data: subfileTypes = [] } = useSubfileTypes();
  const createMutation = useCreateSubfile();
  const updateMutation = useUpdateSubfile();
  const deleteMutation = useDeleteSubfile();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSubfile, setSelectedSubfile] = useState<CaseSubfileDto | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Create form
  const createForm = useForm<CreateSubfileFormValues>({
    resolver: zodResolver(createSubfileSchema),
    defaultValues: {
      subfileTypeId: '',
      subfileName: '',
      documentType: '',
      fileUrl: '',
      content: '',
    },
  });

  const watchedCreateTypeId = createForm.watch('subfileTypeId');

  // Edit form
  const editForm = useForm<EditSubfileFormValues>({
    resolver: zodResolver(editSubfileSchema),
    defaultValues: {
      subfileName: '',
      fileUrl: '',
      content: '',
    },
  });

  const handleCreate = async (data: CreateSubfileFormValues) => {
    try {
      let filePath: string | undefined;
      let fileUrl: string | undefined = data.fileUrl || undefined;
      let mimeType: string | undefined;
      let fileSizeBytes: number | undefined;

      // Upload file if selected
      if (selectedFile) {
        setIsUploading(true);
        setUploadProgress(30);
        try {
          const uploadResult = await uploadSubfileDocument(caseId, selectedFile);
          filePath = uploadResult.filePath;
          fileUrl = uploadResult.fileUrl;
          mimeType = uploadResult.mimeType;
          fileSizeBytes = uploadResult.fileSizeBytes;
          setUploadProgress(80);
        } catch {
          toast.error('File upload failed');
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }
      }

      await createMutation.mutateAsync({
        caseRegisterId: caseId,
        subfileTypeId: data.subfileTypeId,
        subfileName: data.subfileName || undefined,
        documentType: data.documentType || undefined,
        content: data.content || undefined,
        filePath,
        fileUrl,
        mimeType,
        fileSizeBytes,
      });
      setUploadProgress(100);
      toast.success('Document added');
      setShowCreateModal(false);
      createForm.reset();
      setSelectedFile(null);
      setUploadProgress(0);
    } catch {
      toast.error('Failed to add document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = async (data: EditSubfileFormValues) => {
    if (!selectedSubfile) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedSubfile.id,
        caseId,
        request: {
          subfileName: data.subfileName || undefined,
          content: data.content || undefined,
          fileUrl: data.fileUrl || undefined,
        },
      });
      toast.success('Document updated');
      setShowEditModal(false);
    } catch {
      toast.error('Failed to update document');
    }
  };

  const handleDelete = async () => {
    if (!selectedSubfile) return;
    try {
      await deleteMutation.mutateAsync({ id: selectedSubfile.id, caseId });
      toast.success('Document deleted');
      setShowDeleteConfirm(false);
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const openEdit = (sf: CaseSubfileDto) => {
    setSelectedSubfile(sf);
    editForm.reset({
      subfileName: sf.subfileName ?? '',
      content: sf.content ?? '',
      fileUrl: sf.fileUrl ?? '',
    });
    setShowEditModal(true);
  };

  const openDelete = (sf: CaseSubfileDto) => {
    setSelectedSubfile(sf);
    setShowDeleteConfirm(true);
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  const completionPct = completion ? Math.round((completion.completedTypes / completion.totalTypes) * 100) : 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5 text-indigo-500" />
            Case Subfiles ({subfiles.length})
          </CardTitle>
          {canEdit && (
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Document
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Completion Progress */}
          {completion && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subfile completion</span>
                <span className="font-medium">{completion.completedTypes}/{completion.totalTypes} types</span>
              </div>
              <Progress value={completionPct} className="h-2" />
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : subfiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileStack className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subfiles.map((sf) => (
                    <TableRow key={sf.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{sf.subfileName || sf.documentType || 'Untitled'}</p>
                          {sf.fileUrl && (
                            <a href={sf.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" /> View file
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sf.subfileTypeName || 'Unknown'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{sf.uploadedByName || '-'}</TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(sf.createdAt)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{formatBytes(sf.fileSizeBytes)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <PermissionActionButton
                            permission="case.update"
                            icon={Edit}
                            label="Edit"
                            onClick={() => openEdit(sf)}
                          />
                          <PermissionActionButton
                            permission="case.delete"
                            icon={Trash2}
                            label="Delete"
                            onClick={() => openDelete(sf)}
                            destructive
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => { setShowCreateModal(open); if (!open) createForm.reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
            <DialogDescription>Upload a document to case {caseNo}</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Document Category *</Label>
                <Select
                  value={watchedCreateTypeId}
                  onValueChange={(v) => createForm.setValue('subfileTypeId', v, { shouldValidate: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {subfileTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.subfileTypeId && <p className="text-sm text-red-500">{createForm.formState.errors.subfileTypeId.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Document Name *</Label>
                <Input {...createForm.register('subfileName')} placeholder="Document name" />
                {createForm.formState.errors.subfileName && <p className="text-sm text-red-500">{createForm.formState.errors.subfileName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Input {...createForm.register('documentType')} placeholder="e.g. PDF, Photo, Scanned" />
              </div>
              <div className="space-y-2">
                <Label>Upload File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx,.csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedFile(file);
                      if (file) {
                        const ext = file.name.split('.').pop()?.toUpperCase() || '';
                        if (!createForm.getValues('documentType')) {
                          createForm.setValue('documentType', ext);
                        }
                      }
                    }}
                    className="text-sm"
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Upload className="h-3 w-3" />
                    <span>{selectedFile.name}</span>
                    <span>({formatBytes(selectedFile.size)})</span>
                  </div>
                )}
                {isUploading && (
                  <Progress value={uploadProgress} className="h-1.5" />
                )}
              </div>
              {!selectedFile && (
                <div className="space-y-2">
                  <Label>Or enter File URL</Label>
                  <Input {...createForm.register('fileUrl')} placeholder="https://..." />
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes / Content</Label>
                <Textarea {...createForm.register('content')} placeholder="Description or notes..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || isUploading}>
                {(createMutation.isPending || isUploading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isUploading ? 'Uploading...' : 'Add Document'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Document Name</Label>
                <Input {...editForm.register('subfileName')} />
              </div>
              <div className="space-y-2">
                <Label>File URL</Label>
                <Input {...editForm.register('fileUrl')} />
              </div>
              <div className="space-y-2">
                <Label>Notes / Content</Label>
                <Textarea {...editForm.register('content')} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedSubfile?.subfileName || 'this document'}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
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
