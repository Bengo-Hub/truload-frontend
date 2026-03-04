'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { getMediaUrl, uploadMedia } from '@/lib/api/media';
import { getCurrentOrganization, updateCurrentOrganizationBranding } from '@/lib/api/setup';
import type { UpdateOrganizationBrandingRequest } from '@/types/setup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Upload } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const FALLBACK_LOGO = '/images/logos/kuraweigh-logo.png';
const ACCEPT_IMAGES = 'image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml';

export function BrandSettingsTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', 'current'],
    queryFn: getCurrentOrganization,
  });
  const [logoUrl, setLogoUrl] = useState('');
  const [platformLogoUrl, setPlatformLogoUrl] = useState('');
  const [loginPageImageUrl, setLoginPageImageUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const platformLogoInputRef = useRef<HTMLInputElement>(null);
  const loginImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (org) {
      setLogoUrl(org.logoUrl ?? '');
      setPlatformLogoUrl(org.platformLogoUrl ?? '');
      setLoginPageImageUrl(org.loginPageImageUrl ?? '');
      setPrimaryColor(org.primaryColor ?? '');
      setSecondaryColor(org.secondaryColor ?? '');
    }
  }, [org]);

  const updateBranding = useMutation({
    mutationFn: (payload: UpdateOrganizationBrandingRequest) => updateCurrentOrganizationBranding(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'current'] });
      toast.success('Brand settings saved. Logos and colours will appear on login and tenant pages.');
    },
    onError: () => toast.error('Failed to save brand settings'),
  });

  const handleFile = async (file: File, field: 'logoUrl' | 'platformLogoUrl' | 'loginPageImageUrl') => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, GIF, WebP, SVG).');
      return;
    }
    setUploading(field);
    try {
      const url = await uploadMedia(file);
      if (url) {
        if (field === 'logoUrl') setLogoUrl(url);
        else if (field === 'platformLogoUrl') setPlatformLogoUrl(url);
        else setLoginPageImageUrl(url);
        toast.success('Image uploaded. Click Save to apply.');
      } else toast.error('Upload failed');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const handleSave = () => {
    updateBranding.mutate({
      logoUrl: logoUrl.trim() || null,
      platformLogoUrl: platformLogoUrl.trim() || null,
      loginPageImageUrl: loginPageImageUrl.trim() || null,
      primaryColor: primaryColor.trim() || null,
      secondaryColor: secondaryColor.trim() || null,
    });
  };

  const hasChanges =
    org &&
    ((logoUrl !== (org.logoUrl ?? '')) ||
      (platformLogoUrl !== (org.platformLogoUrl ?? '')) ||
      (loginPageImageUrl !== (org.loginPageImageUrl ?? '')) ||
      (primaryColor !== (org.primaryColor ?? '')) ||
      (secondaryColor !== (org.secondaryColor ?? '')));

  if (isLoading || !org) {
    return (
      <Card className="p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="mt-4 h-10 w-48" />
        <Skeleton className="mt-4 h-10 w-48" />
      </Card>
    );
  }

  const renderFileField = (
    label: string,
    description: string,
    value: string,
    setValue: (v: string) => void,
    field: 'logoUrl' | 'platformLogoUrl' | 'loginPageImageUrl',
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => (
    <div>
      <Label>{label}</Label>
      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {canEdit && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT_IMAGES}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f, field);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={!!uploading}
            >
              {uploading === field ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </Button>
          </>
        )}
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Or paste URL"
          disabled={!canEdit}
          className="flex-1 min-w-[200px]"
        />
      </div>
      {(value || (field === 'logoUrl' && org.logoUrl) || (field === 'platformLogoUrl' && org.platformLogoUrl) || (field === 'loginPageImageUrl' && org.loginPageImageUrl)) && (
        <div className="mt-2 relative h-16 w-40 overflow-hidden rounded border bg-gray-50">
          <Image
            src={getMediaUrl(value || (field === 'logoUrl' ? org.logoUrl : field === 'platformLogoUrl' ? org.platformLogoUrl : org.loginPageImageUrl)) || FALLBACK_LOGO}
            alt=""
            fill
            className="object-contain"
            unoptimized
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900">Organisation branding</h3>
        <p className="mt-1 text-sm text-gray-500">
          Two logos and an optional login page image. Use Upload or paste a URL. Defaults are used when not set.
        </p>
        <div className="mt-6 space-y-6">
          {renderFileField(
            'Tenant platform logo',
            'Shown on the login form (left panel), e.g. KURA Weigh.',
            platformLogoUrl,
            setPlatformLogoUrl,
            'platformLogoUrl',
            platformLogoInputRef
          )}
          {renderFileField(
            'Organisation logo',
            'Overlays the login page image (bottom-right of right panel).',
            logoUrl,
            setLogoUrl,
            'logoUrl',
            logoInputRef
          )}
          {renderFileField(
            'Login page image',
            'Background image for the right panel on the login page.',
            loginPageImageUrl,
            setLoginPageImageUrl,
            'loginPageImageUrl',
            loginImageInputRef
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="primaryColor">Primary colour (hex)</Label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={primaryColor || '#0a9f3d'}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  disabled={!canEdit}
                  className="h-10 w-14 cursor-pointer rounded border border-gray-200 disabled:pointer-events-none"
                />
                <Input
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#0a9f3d"
                  disabled={!canEdit}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondaryColor">Secondary colour (hex)</Label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  value={secondaryColor || '#065f27'}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  disabled={!canEdit}
                  className="h-10 w-14 cursor-pointer rounded border border-gray-200 disabled:pointer-events-none"
                />
                <Input
                  id="secondaryColor"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#065f27"
                  disabled={!canEdit}
                  className="flex-1 font-mono text-sm"
                />
              </div>
            </div>
          </div>
          {canEdit && (
            <Button onClick={handleSave} disabled={!hasChanges || updateBranding.isPending}>
              {updateBranding.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save brand settings
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
