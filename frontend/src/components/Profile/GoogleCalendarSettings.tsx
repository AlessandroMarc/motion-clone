'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { googleCalendarService } from '@/services/googleCalendarService';
import type {
  GoogleCalendarStatus,
  SyncResult,
} from '@/services/googleCalendarService';
import { useOnboarding } from '@/hooks/useOnboarding';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Render Google Calendar integration settings and controls.
 *
 * Displays current connection status, last sync time, and actions to connect,
 * manually sync, or disconnect the user's Google Calendar. Handles the OAuth
 * callback once per user session (showing success/error toasts and advancing
 * onboarding when appropriate), loads and refreshes calendar status, and shows
 * progress states for sync and disconnect operations.
 *
 * @returns A JSX element containing the Google Calendar integration UI.
 */
export function GoogleCalendarSettings() {
  const [showReconnectDialog, setShowReconnectDialog] = useState(false);
  const [reconnectMessage, setReconnectMessage] = useState('');
  const { user } = useAuth();
  const { advanceToNextStep, status: onboardingStatus } = useOnboarding();
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const statusData = await googleCalendarService.getStatus(user.id);
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to load Google Calendar status:', error);
      toast.error('Failed to load Google Calendar status');
      // Set default status on error
      setStatus({ connected: false, last_synced_at: null });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load Google Calendar status whenever the user changes
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    loadStatus();
  }, [user?.id, loadStatus]);

  // Check OAuth callback URL params once per user session.
  // advanceToNextStep and onboardingStatus are intentionally omitted from deps:
  // URL params are read once on mount/user-change and do not need to re-run
  // when those values change (which would cause an infinite fetch loop).
  useEffect(() => {
    if (!user?.id) return;

    const params = new URLSearchParams(window.location.search);
    const connected = params.get('google_calendar_connected');
    const error = params.get('google_calendar_error');

    if (connected === 'true') {
      toast.success('Google Calendar connected successfully!');
      // Advance onboarding if on the calendar sync step
      if (
        onboardingStatus &&
        !onboardingStatus.completed &&
        onboardingStatus.step === 'scheduled'
      ) {
        advanceToNextStep('calendar_sync');
      }
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      toast.error(
        `Failed to connect Google Calendar: ${decodeURIComponent(error)}`
      );
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user?.id, advanceToNextStep, onboardingStatus]);

  const handleConnect = () => {
    if (!user?.id) return;

    const authUrl = googleCalendarService.getAuthUrl(user.id);
    window.location.href = authUrl;
  };

  const handleSync = async () => {
    if (!user?.id) return;

    try {
      setSyncing(true);
      const result = await googleCalendarService.sync(user.id);

      if (
        result.errors.length > 0 &&
        result.errors[0] === 'google_calendar_invalid_grant'
      ) {
        setReconnectMessage(
          result.errors[1] || 'Your Google Calendar authorization has expired.'
        );
        setShowReconnectDialog(true);
        return;
      }

      if (result.errors.length > 0) {
        toast.error(`Sync completed with errors: ${result.errors[0]}`);
      } else {
        toast.success(`Successfully synced ${result.synced} events`);
      }
      await loadStatus();
    } catch (error) {
      console.error('Failed to sync Google Calendar:', error);
      toast.error('Failed to sync Google Calendar');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.id) return;

    try {
      setDisconnecting(true);
      await googleCalendarService.disconnect(user.id);
      toast.success('Google Calendar disconnected successfully');
      await loadStatus();
    } catch (error) {
      console.error('Failed to disconnect Google Calendar:', error);
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setDisconnecting(false);
      setShowDisconnectConfirm(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 gap-4">
        <CardHeader className="px-0">
          <CardTitle>Google Calendar Integration</CardTitle>
          <CardDescription>
            Sync your Google Calendar events with this application
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="text-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected ?? false;
  const lastSynced = status?.last_synced_at
    ? new Date(status.last_synced_at)
    : null;

  return (
    <>
      <Card className="p-4 gap-4" data-onboarding-step="sync-calendar">
        <CardHeader className="px-0">
          <CardTitle>Google Calendar Integration</CardTitle>
          <CardDescription>
            Sync your Google Calendar events with this application. Events will
            be automatically synced every 15 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30 sm:gap-4 sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500 text-white sm:h-12 sm:w-12">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base">
                      Google Calendar Connected
                    </h3>
                    <Badge variant="default" className="bg-green-500">
                      Connected
                    </Badge>
                  </div>
                  {lastSynced ? (
                    <p className="text-sm text-muted-foreground">
                      Last synced:{' '}
                      {lastSynced.toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not synced yet
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sync Now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30 sm:gap-4 sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-white sm:h-12 sm:w-12">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base">
                      Google Calendar To Reconnect
                    </h3>
                    <Badge variant="default" className="bg-yellow-500">
                      To Reconnect
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Google Calendar authorization expired. Please reconnect to
                    resume syncing.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleConnect}
                className="w-full sm:w-auto"
              >
                Reconnect Google Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Dismissable dialog for reconnect error */}
      <AlertDialog
        open={showReconnectDialog}
        onOpenChange={setShowReconnectDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Google Calendar Authorization Expired
            </AlertDialogTitle>
            <AlertDialogDescription>{reconnectMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowReconnectDialog(false)}>
              Dismiss
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConnect}>
              Reconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={showDisconnectConfirm}
        onOpenChange={setShowDisconnectConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Google Calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop syncing your events. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
