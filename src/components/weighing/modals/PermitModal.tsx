"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  usePermitsByVehicle, 
  useRevokePermit,
  useExtendPermit
} from '@/hooks/queries/useWeighingQueries';
import { Permit, ExtendPermitRequest } from '@/types/weighing';
import { 
  FileText, 
  Calendar, 
  ShieldCheck, 
  Truck, 
  History, 
  Eye, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PdfPreviewModal } from '@/components/common/PdfPreviewModal';
import { toast } from 'sonner';

interface PermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleRegNo: string;
}

export function PermitModal({
  isOpen,
  onClose,
  vehicleId,
  vehicleRegNo,
}: PermitModalProps) {
  const permitsQuery = usePermitsByVehicle(vehicleId);
  const permits = permitsQuery.data;
  const isLoading = permitsQuery.isLoading;
  const revokePermit = useRevokePermit();
  const extendPermit = useExtendPermit();
  const [selectedPermit, setSelectedPermit] = React.useState<Permit | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [isExtending, setIsExtending] = React.useState(false);
  const [newValidTo, setNewValidTo] = React.useState('');

  const activePermit = permits?.find(p => p.status === 'active');
  const pastPermits = permits?.filter(p => p.status !== 'active') || [];

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this permit? This action cannot be undone.')) return;
    
    try {
      await revokePermit.mutateAsync(id);
      toast.success('Permit revoked successfully');
    } catch (error) {
      toast.error('Failed to revoke permit');
    }
  };
  
  const handleExtend = async (id: string) => {
    if (!newValidTo) {
      toast.error('Please select a new validity date');
      return;
    }

    try {
      const request: ExtendPermitRequest = {
        newValidTo: new Date(newValidTo).toISOString(),
        comment: 'Extended via Permit Management UI'
      };
      await extendPermit.mutateAsync({ id, request });
      toast.success('Permit extended successfully');
      setIsExtending(false);
      setNewValidTo('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to extend permit');
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'expired': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'revoked': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="p-6 bg-slate-900 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Permit History</DialogTitle>
                <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
                  <Truck className="h-3 w-3" />
                  Vehicle: <span className="font-bold text-white ml-1">{vehicleRegNo}</span>
                </p>
              </div>
            </div>
            {activePermit && (
              <div className="hidden sm:flex bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider items-center gap-1.5">
                 <CheckCircle2 className="h-3.5 w-3.5" />
                 Active Permit Found
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
          {/* Active Permit Card */}
          {activePermit && (
            <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
               <div className="bg-green-50 px-4 py-2 border-b border-green-100 flex items-center justify-between">
                 <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Currently Active</span>
                 <span className="text-[10px] font-medium text-green-600">Valid until {format(new Date(activePermit.validTo), 'PP')}</span>
               </div>
               <div className="p-5">
                 <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                   <div>
                     <h3 className="text-2xl font-black text-slate-800 tracking-tight">{activePermit.permitNo}</h3>
                     <p className="text-slate-500 font-medium">{activePermit.permitTypeName}</p>
                   </div>
                   <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={() => { setSelectedPermit(activePermit); setIsPreviewOpen(true); }} className="bg-white hover:bg-slate-50 border-slate-200 shadow-sm">
                        <Eye className="h-4 w-4 mr-2 text-blue-600" />
                        Preview PDF
                     </Button>
                   </div>
                 </div>

                 </div>
                 
                 {isExtending ? (
                   <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                     <div className="flex items-center justify-between">
                       <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">New Validity Date</span>
                       <Button variant="ghost" size="sm" onClick={() => setIsExtending(false)} className="h-6 text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase">Cancel</Button>
                     </div>
                     <div className="flex gap-2">
                       <input 
                         type="date" 
                         value={newValidTo}
                         onChange={(e) => setNewValidTo(e.target.value)}
                         min={new Date(activePermit.validTo).toISOString().split('T')[0]}
                         className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                       />
                       <Button 
                         size="sm" 
                         onClick={() => handleExtend(activePermit.id)} 
                         disabled={extendPermit.isPending}
                         className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-auto py-2"
                        >
                         {extendPermit.isPending ? 'Saving...' : 'Confirm'}
                       </Button>
                     </div>
                     <p className="text-[10px] text-blue-500 font-medium">Extension will update the Permit's end date.</p>
                   </div>
                 ) : (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Axle Allowance</p>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-blue-500" />
                            <span className="text-lg font-bold text-slate-700">+{activePermit.axleExtensionKg?.toLocaleString()} kg</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">GVW Allowance</p>
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-blue-500" />
                            <span className="text-lg font-bold text-slate-700">+{activePermit.gvwExtensionKg?.toLocaleString()} kg</span>
                          </div>
                        </div>
                    </div>
                 )}

                 <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                   <div className="flex items-center gap-2 text-xs text-slate-500">
                     <Calendar className="h-3.5 w-3.5" />
                     Issued by: {activePermit.issuingAuthority}
                   </div>
                   <div className="flex items-center gap-2">
                    {!isExtending && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        setNewValidTo(new Date(activePermit.validTo).toISOString().split('T')[0]);
                        setIsExtending(true);
                       }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 h-8 text-xs font-bold">
                        <Calendar className="h-3.5 w-3.5 mr-1" />
                        EXTEND
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleRevoke(activePermit.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 px-2 h-8 text-xs font-bold">
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      REVOKE PERMIT
                    </Button>
                   </div>
                 </div>
            </div>
          )}

          {!activePermit && !isLoading && (
            <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center space-y-3">
              <div className="p-4 bg-slate-50 rounded-full w-fit mx-auto">
                <AlertTriangle className="h-10 w-10 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">No Active Permit</h3>
              <p className="text-slate-500 text-sm max-w-[280px] mx-auto">This vehicle does not have an active permit for the current session.</p>
            </div>
          )}

          {/* Past Permits Table */}
          {pastPermits.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                <History className="h-3.5 w-3.5" />
                Historical Records
              </h4>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Permit Info</th>
                        <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px]">Validity Period</th>
                        <th className="px-4 py-3 font-bold text-slate-600 uppercase tracking-wider text-[10px] text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pastPermits.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{p.permitNo}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{p.permitTypeName}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-medium">
                            {format(new Date(p.validFrom), 'MMM d, yyyy')} - {format(new Date(p.validTo), 'MMM d, yyyy')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                               <StatusIcon status={p.status} />
                               <span className={cn(
                                 "text-[10px] font-black uppercase tracking-wider",
                                 p.status === 'expired' ? "text-yellow-600" : "text-red-500"
                               )}>
                                 {p.status}
                               </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-white border-t flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
           <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500 hover:bg-slate-100">
             Close
           </Button>
        </DialogFooter>

        <PdfPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={`Permit: ${selectedPermit?.permitNo}`}
          pdfUrl={selectedPermit?.id ? `/api/Permits/${selectedPermit.id}/pdf` : undefined}
          downloadFileName={`Permit_${selectedPermit?.permitNo}.pdf`}
        />
      </DialogContent>
    </Dialog>
  );
}
