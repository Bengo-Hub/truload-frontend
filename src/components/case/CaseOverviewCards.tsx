'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import type { CaseRegisterDto, SpecialReleaseDto } from '@/lib/api/caseRegister';
import {
  AlertTriangle,
  Car,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Scale,
  Shield,
  Weight,
  XCircle,
} from 'lucide-react';

interface CaseOverviewCardsProps {
  caseData: CaseRegisterDto;
  specialReleases?: SpecialReleaseDto[];
  /** When provided, renders "View Ticket" buttons that invoke this with the weighing id. */
  onViewWeightTicket?: (weighingId: string) => void;
  /** When provided, renders certificate download buttons for approved special releases. */
  onDownloadCertificate?: (releaseId: string, certificateNo: string) => void;
}

const formatWeight = (kg?: number) => (kg == null ? '-' : `${kg.toLocaleString()} kg`);

/**
 * Grouped case-overview cards (Violation, Overload, Vehicle & Driver, Special Releases).
 * Shared by the case detail page and the case-register View drawer to avoid duplicated layout.
 */
export function CaseOverviewCards({
  caseData,
  specialReleases = [],
  onViewWeightTicket,
  onDownloadCertificate,
}: CaseOverviewCardsProps) {
  return (
    <div className="space-y-6">
      {/* Violation Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Violation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Violation Type</Label>
              <p className="font-medium">{caseData.violationType}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Applicable Act</Label>
              <p className="font-medium">{caseData.actName || 'Not specified'}</p>
            </div>
          </div>
          {caseData.violationDetails && (
            <div>
              <Label className="text-sm text-gray-500">Details</Label>
              <p className="font-medium">{caseData.violationDetails}</p>
            </div>
          )}
          {caseData.weighingTicketNo && (
            <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
              <Scale className="h-5 w-5 text-blue-600" />
              <div>
                <Label className="text-sm text-gray-500">Weighing Ticket</Label>
                <p className="font-mono font-medium">{caseData.weighingTicketNo}</p>
              </div>
              {caseData.weighingId && onViewWeightTicket && (
                <Button variant="link" size="sm" onClick={() => onViewWeightTicket(caseData.weighingId!)}>
                  View Ticket
                </Button>
              )}
            </div>
          )}
          {caseData.prohibitionNo && (
            <div className="flex items-center gap-4 p-3 bg-red-50 rounded-lg">
              <FileText className="h-5 w-5 text-red-600" />
              <div>
                <Label className="text-sm text-gray-500">Prohibition Order</Label>
                <p className="font-mono font-medium">{caseData.prohibitionNo}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overload Analysis */}
      {caseData.weighingId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Weight className="h-5 w-5 text-orange-500" />
              Overload Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {caseData.actualWeightKg != null ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Actual Weight (GVW)</Label>
                    <p className="font-mono font-bold text-lg">{formatWeight(caseData.actualWeightKg)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Permissible Weight</Label>
                    <p className="font-mono font-medium text-lg">{formatWeight(caseData.permissibleWeightKg)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Tolerance Applied</Label>
                    <p className="font-mono font-medium">{formatWeight(caseData.toleranceAppliedKg)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Overload After Tolerance</Label>
                    <p className={`font-mono font-bold text-lg ${
                      (caseData.overloadAfterToleranceKg ?? 0) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {formatWeight(caseData.overloadAfterToleranceKg)}
                    </p>
                  </div>
                </div>
                {caseData.weighingId && onViewWeightTicket && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => onViewWeightTicket(caseData.weighingId!)}>
                    <Scale className="mr-2 h-4 w-4" />
                    View Full Weight Ticket
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <Scale className="h-5 w-5 text-gray-400 shrink-0" />
                  <p className="text-sm text-gray-600">Overload details are available on the weight ticket.</p>
                </div>
                {caseData.weighingId && onViewWeightTicket && (
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => onViewWeightTicket(caseData.weighingId!)}>
                    <Scale className="mr-2 h-4 w-4" />
                    View Weight Ticket
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vehicle & Driver */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-blue-500" />
            Vehicle & Driver
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-500">Vehicle Registration</Label>
              <p className="font-mono font-bold text-lg">{caseData.vehicleRegNumber}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Driver Name</Label>
              <p className="font-medium">{caseData.driverName || 'Not recorded'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Driver ID / Passport</Label>
              <p className="font-medium">{caseData.driverIdNumber || '-'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Driver License</Label>
              <p className="font-medium">{caseData.driverLicenseNo || '-'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Driver NTAC No</Label>
              <p className="font-medium">{caseData.driverNtacNo || '-'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Transporter</Label>
              <p className="font-medium">{caseData.transporterName || '-'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">Transporter NTAC No</Label>
              <p className="font-medium">{caseData.transporterNtacNo || '-'}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-500">OB Number</Label>
              <p className="font-medium">{caseData.obNo || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Special Releases */}
      {specialReleases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Special Releases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {specialReleases.map((release) => (
                <div
                  key={release.id}
                  className={`p-3 rounded-lg border ${
                    release.isApproved
                      ? 'bg-green-50 border-green-200'
                      : release.isRejected
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-medium">{release.certificateNo}</p>
                      <p className="text-sm text-gray-600">{release.releaseType}</p>
                    </div>
                    {release.isApproved ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />Approved
                      </Badge>
                    ) : release.isRejected ? (
                      <Badge className="bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />Rejected
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />Pending
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-500">{release.reason}</p>
                    {release.isApproved && release.certificateNo && onDownloadCertificate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDownloadCertificate(release.id, release.certificateNo)}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        View Certificate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
