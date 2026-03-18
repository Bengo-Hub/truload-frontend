"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useCreatePermit, 
  usePermitTypes 
} from '@/hooks/queries/useWeighingQueries';
import { CreatePermitRequest, PermitStatus } from '@/types/weighing';
import { Loader2, FilePlus, Calendar, ShieldCheck, Truck } from 'lucide-react';
import { toast } from 'sonner';

const permitSchema = z.object({
  permitNo: z.string().min(3, 'Permit number must be at least 3 characters'),
  permitTypeId: z.string().min(1, 'Permit type is required'),
  validFrom: z.string().min(1, 'Valid from date is required'),
  validTo: z.string().min(1, 'Valid to date is required'),
  issuingAuthority: z.string().optional(),
  axleExtensionKg: z.coerce.number().min(0).optional(),
  gvwExtensionKg: z.coerce.number().min(0).optional(),
});

type PermitFormValues = z.infer<typeof permitSchema>;

interface ApplyPermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleRegNo: string;
}

export function ApplyPermitModal({
  isOpen,
  onClose,
  vehicleId,
  vehicleRegNo,
}: ApplyPermitModalProps) {
  const { data: permitTypes, isLoading: isTypesLoading } = usePermitTypes();
  const createPermit = useCreatePermit();

  const form = useForm<PermitFormValues>({
    resolver: zodResolver(permitSchema),
    defaultValues: {
      permitNo: '',
      permitTypeId: '',
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      issuingAuthority: 'National Transport and Safety Authority',
      axleExtensionKg: 0,
      gvwExtensionKg: 0,
    },
  });

  const selectedTypeId = form.watch('permitTypeId');
  const selectedType = permitTypes?.find(t => t.id === selectedTypeId);

  // Update defaults when type changes
  React.useEffect(() => {
    if (selectedType) {
      form.setValue('axleExtensionKg', selectedType.axleExtensionKg);
      form.setValue('gvwExtensionKg', selectedType.gvwExtensionKg);
      
      if (selectedType.validityDays) {
        const from = new Date(form.getValues('validFrom'));
        const to = new Date(from.getTime() + selectedType.validityDays * 24 * 60 * 60 * 1000);
        form.setValue('validTo', to.toISOString().split('T')[0]);
      }
    }
  }, [selectedType, form]);

  async function onSubmit(values: PermitFormValues) {
    try {
      const request: CreatePermitRequest = {
        ...values,
        vehicleId,
        status: 'active' as PermitStatus,
        validFrom: new Date(values.validFrom).toISOString(),
        validTo: new Date(values.validTo).toISOString(),
      };

      await createPermit.mutateAsync(request);
      toast.success('Permit applied successfully');
      form.reset();
      onClose();
    } catch (error) {
      console.error('Failed to apply permit:', error);
      toast.error('Failed to apply permit. Please try again.');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FilePlus className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Apply New Permit</DialogTitle>
              <p className="text-blue-100 text-sm flex items-center gap-1 mt-1">
                <Truck className="h-3 w-3" />
                Vehicle: <span className="font-bold border-b border-blue-300 ml-1">{vehicleRegNo}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6 bg-white">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="permitNo"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel className="text-gray-700 font-semibold">Permit Number</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. PRM-2024-001" className="uppercase font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="permitTypeId"
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <FormLabel className="text-gray-700 font-semibold">Permit Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isTypesLoading ? "Loading types..." : "Select type"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {permitTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 grid grid-cols-2 gap-4">
              <div className="col-span-2 mb-1 flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5" />
                Allowances & Extensions
              </div>
              
              <FormField
                control={form.control}
                name="axleExtensionKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">Axle Extension (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gvwExtensionKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-600">GVW Extension (kg)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="bg-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 mb-1 flex items-center gap-2 text-gray-500 font-bold text-xs uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5" />
                Validity Period
              </div>

              <FormField
                control={form.control}
                name="validFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-semibold text-sm">Valid From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-semibold text-sm">Valid To</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="issuingAuthority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700 font-semibold text-sm">Issuing Authority</FormLabel>
                  <FormControl>
                    <Input placeholder="Authority name..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={createPermit.isPending}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 min-w-[120px]" disabled={createPermit.isPending}>
                {createPermit.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Apply Permit'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
