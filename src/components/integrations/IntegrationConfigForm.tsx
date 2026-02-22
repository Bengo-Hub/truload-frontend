'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import type { IntegrationConfigDto, TestConnectivityResult, UpsertIntegrationConfigRequest } from '@/lib/api/integration';
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Save,
  Shield,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConnectionTestButton } from './ConnectionTestButton';
import { WebhookUrlDisplay } from './WebhookUrlDisplay';

// ---------------------------------------------------------------------------
// Credential field definitions per provider
// ---------------------------------------------------------------------------

export interface CredentialFieldDef {
  key: string;
  label: string;
  placeholder: string;
  sensitive?: boolean;
}

const ECITIZEN_CREDENTIALS: CredentialFieldDef[] = [
  { key: 'ApiKey', label: 'API Key', placeholder: 'Your Pesaflow API Key', sensitive: true },
  { key: 'ApiSecret', label: 'API Secret', placeholder: 'Your Pesaflow API Secret', sensitive: true },
  { key: 'ApiClientId', label: 'API Client ID', placeholder: 'e.g. 588' },
];

const TWILIO_CREDENTIALS: CredentialFieldDef[] = [
  { key: 'AccountSid', label: 'Account SID', placeholder: 'AC...', sensitive: true },
  { key: 'AuthToken', label: 'Auth Token', placeholder: 'Token', sensitive: true },
  { key: 'FromNumber', label: 'From Number', placeholder: 'e.g. +1234567890' },
];

const AFRICASTALKING_CREDENTIALS: CredentialFieldDef[] = [
  { key: 'Username', label: 'Username', placeholder: 'sandbox or production username' },
  { key: 'ApiKey', label: 'API Key', placeholder: 'ATS...', sensitive: true },
  { key: 'SenderId', label: 'Sender ID / Shortcode', placeholder: 'e.g. TRULOAD' },
];

const SMTP_CREDENTIALS: CredentialFieldDef[] = [
  { key: 'SmtpHost', label: 'SMTP Host', placeholder: 'e.g. smtp.gmail.com' },
  { key: 'SmtpPort', label: 'SMTP Port', placeholder: 'e.g. 587' },
  { key: 'SmtpUser', label: 'SMTP User', placeholder: 'Username/Email' },
  { key: 'SmtpPass', label: 'SMTP Password', placeholder: 'Password', sensitive: true },
  { key: 'FromName', label: 'From Name', placeholder: 'e.g. TruLoad Notifications' },
  { key: 'FromEmail', label: 'From Email', placeholder: 'e.g. no-reply@truload.com' },
];

// Default values for first-time setup per provider
const PROVIDER_DEFAULTS: Record<string, { displayName: string; baseUrl: string; environment: string }> = {
  ecitizen_pesaflow: {
    displayName: 'eCitizen Pesaflow',
    baseUrl: 'https://test.pesaflow.com',
    environment: 'test',
  },
  sms_twilio: {
    displayName: 'Twilio SMS',
    baseUrl: 'https://api.twilio.com',
    environment: 'production',
  },
  sms_africastalking: {
    displayName: "Africa's Talking SMS",
    baseUrl: 'https://api.africastalking.com',
    environment: 'production',
  },
  email_smtp: {
    displayName: 'SMTP Email',
    baseUrl: 'smtp://localhost',
    environment: 'production',
  },
};

const DEFAULT_CREDENTIALS: CredentialFieldDef[] = [
  { key: 'ApiKey', label: 'API Key', placeholder: 'API Key', sensitive: true },
  { key: 'ApiSecret', label: 'API Secret', placeholder: 'API Secret', sensitive: true },
];

export function getCredentialFields(providerName: string): CredentialFieldDef[] {
  switch (providerName) {
    case 'ecitizen_pesaflow':
      return ECITIZEN_CREDENTIALS;
    case 'sms_twilio':
      return TWILIO_CREDENTIALS;
    case 'sms_africastalking':
      return AFRICASTALKING_CREDENTIALS;
    case 'email_smtp':
      return SMTP_CREDENTIALS;
    default:
      return DEFAULT_CREDENTIALS;
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IntegrationConfigFormProps {
  config: IntegrationConfigDto | null;
  providerName: string;
  isLoading?: boolean;
  canEdit?: boolean;
  onSave: (request: UpsertIntegrationConfigRequest) => Promise<void>;
  isSaving?: boolean;
  onTestConnection: (providerName: string) => Promise<TestConnectivityResult>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IntegrationConfigForm({
  config,
  providerName,
  isLoading,
  canEdit = false,
  onSave,
  isSaving,
  onTestConnection,
}: IntegrationConfigFormProps) {
  const credentialFields = getCredentialFields(providerName);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [appBaseUrl, setAppBaseUrl] = useState('');
  const [environment, setEnvironment] = useState('test');
  const [description, setDescription] = useState('');
  const [endpointsJson, setEndpointsJson] = useState('{}');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Reset form when config changes; pre-fill defaults for unconfigured providers
  useEffect(() => {
    if (config) {
      setDisplayName(config.displayName ?? '');
      setBaseUrl(config.baseUrl ?? '');
      setAppBaseUrl(config.appBaseUrl ?? '');
      setEnvironment(config.environment ?? 'test');
      setDescription(config.description ?? '');
      setEndpointsJson(config.endpointsJson ?? '{}');
      // Credentials are never returned from the API - initialize empty
      setCredentials({});
      setIsEditing(false);
      setIsActive(config.isActive ?? true);
    } else {
      // Pre-fill defaults for first-time setup
      const defaults = PROVIDER_DEFAULTS[providerName];
      if (defaults) {
        setDisplayName(defaults.displayName);
        setBaseUrl(defaults.baseUrl);
        setEnvironment(defaults.environment);
        setIsEditing(true); // Start in edit mode for new configs
        setIsActive(true);
      }
    }
  }, [config, providerName]);

  const handleSave = async () => {
    // Only include credentials if they were actually filled in
    const filteredCreds: Record<string, string> = {};
    for (const [key, val] of Object.entries(credentials)) {
      if (val.trim()) filteredCreds[key] = val;
    }

    await onSave({
      providerName,
      displayName,
      baseUrl,
      credentials: filteredCreds,
      endpointsJson,
      appBaseUrl: appBaseUrl || undefined,
      environment: environment || undefined,
      description: description || undefined,
      isActive,
    });
    setIsEditing(false);
    setCredentials({});
  };

  const toggleSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10" />
            </div>
          ))}
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  const isConfigured = !!config;
  const readOnly = !canEdit || !isEditing;

  return (
    <div className="space-y-6">
      {/* Edit Toggle */}
      {canEdit && isConfigured && (
        <div className="flex items-center justify-end">
          {isEditing ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                // Reset to original values
                if (config) {
                  setDisplayName(config.displayName);
                  setBaseUrl(config.baseUrl);
                  setAppBaseUrl(config.appBaseUrl ?? '');
                  setEnvironment(config.environment ?? 'test');
                  setDescription(config.description ?? '');
                }
              }}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-1.5"
            >
              Edit Configuration
            </Button>
          )}
        </div>
      )}

      {/* Enabled toggle — always visible so users can activate even on first setup */}
      <div className="flex items-center justify-between gap-4 p-2 border rounded-md bg-muted/50">
        <div>
          <div className="text-sm font-medium">Integration status</div>
          <div className="text-xs text-muted-foreground">Enable or disable this provider</div>
        </div>
        <div>
          <Switch
            checked={isActive}
            onCheckedChange={(val) => setIsActive(Boolean(val))}
            disabled={!canEdit}
          />
        </div>
      </div>

      {/* Connection Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Display Name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={readOnly}
            placeholder="e.g. eCitizen Pesaflow"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Base URL</Label>
          <Input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            disabled={readOnly}
            placeholder="https://test.pesaflow.com"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">App Base URL</Label>
          <Input
            value={appBaseUrl}
            onChange={(e) => setAppBaseUrl(e.target.value)}
            disabled={readOnly}
            placeholder="https://your-app.example.com"
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Environment</Label>
          <Select
            value={environment}
            onValueChange={setEnvironment}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="test">Test</SelectItem>
              <SelectItem value="sandbox">Sandbox</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Description</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={readOnly}
          placeholder="Optional description"
        />
      </div>

      {/* Credentials Section */}
      {(isEditing || !isConfigured) && (
        <Card className="border-dashed border-amber-300 bg-amber-50/50 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-600" />
            <h4 className="text-sm font-medium text-amber-900">
              {isConfigured ? 'Update Credentials' : 'Credentials'}
            </h4>
          </div>
          {isConfigured && (
            <p className="text-xs text-amber-700 -mt-2">
              Leave fields empty to keep existing credentials unchanged.
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {credentialFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{field.label}</Label>
                <div className="relative">
                  <Input
                    value={credentials[field.key] ?? ''}
                    onChange={(e) =>
                      setCredentials((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    type={field.sensitive && !showSecrets[field.key] ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    className="font-mono text-sm pr-10"
                  />
                  {field.sensitive && (
                    <button
                      type="button"
                      onClick={() => toggleSecret(field.key)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                    >
                      {showSecrets[field.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Webhook URLs (read-only display) */}
      {isConfigured && config && (
        <WebhookUrlDisplay
          webhookUrl={config.webhookUrl}
          callbackUrl={config.callbackUrl}
        />
      )}

      {/* Security Info */}
      {isConfigured && config?.credentialsRotatedAt && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          Credentials last rotated: {new Date(config.credentialsRotatedAt).toLocaleString()}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t">
        {(isEditing || !isConfigured) && (
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!canEdit || isSaving || !displayName.trim() || !baseUrl.trim()}
            className="gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {isConfigured ? 'Update Configuration' : 'Save Configuration'}
          </Button>
        )}

        {isConfigured && (
          <ConnectionTestButton
            onTest={() => onTestConnection(providerName)}
            disabled={!canEdit}
          />
        )}
      </div>
    </div>
  );
}
