'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { googleCalendarService } from '@/services/googleCalendarService';
import type {
  GoogleCalendarStatus,
  SyncResult,
} from '@/services/googleCalendarService';
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
import { Calendar, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { toast } from 'sonner';

export function GoogleCalendarSettings() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

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

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Check for OAuth callback parameters
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('google_calendar_connected');
    const error = params.get('google_calendar_error');

    if (connected === 'true') {
      toast.success('Google Calendar connected successfully!');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      toast.error(
        `Failed to connect Google Calendar: ${decodeURIComponent(error)}`
      );
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    loadStatus();
  }, [user?.id, loadStatus]);

  const handleConnect = () => {
    if (!user?.id) return;

    const authUrl = googleCalendarService.getAuthUrl(user.id);
    window.location.href = authUrl;
  };

  const handleSync = async () => {
    if (!user?.id) return;

    try {
      setSyncing(true);
      const result: SyncResult = await googleCalendarService.sync(user.id);
      toast.success(
        `Successfully synced ${result.synced} events${
          result.errors.length > 0
            ? `. ${result.errors.length} errors occurred`
            : ''
        }`
      );
      if (result.errors.length > 0) {
        console.error('Sync errors:', result.errors);
      }
      await loadStatus();
    } catch (error) {
      console.error('Failed to sync:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to sync events'
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnectClick = () => {
    setDisconnectDialogOpen(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!user?.id) return;

    setDisconnectDialogOpen(false);

    try {
      setDisconnecting(true);
      await googleCalendarService.disconnect(user.id);
      toast.success('Google Calendar disconnected successfully');
      setStatus({ connected: false, last_synced_at: null });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to disconnect'
      );
    } finally {
      setDisconnecting(false);
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
    <Card className="p-4 gap-4">
      <CardHeader className="px-0">
        <CardTitle>Google Calendar Integration</CardTitle>
        <CardDescription>
          Sync your Google Calendar events with this application. Events will be
          automatically synced every 15 minutes.
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

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={handleSync}
                disabled={syncing}
                variant="outline"
                className="w-full sm:flex-1"
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </>
                )}
              </Button>
              <Button
                onClick={handleDisconnectClick}
                disabled={disconnecting}
                variant="destructive"
                className="w-full sm:flex-1"
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink className="mr-2 h-4 w-4" />
                    Disconnect
                  </>
                )}
              </Button>
            </div>

            <AlertDialog
              open={disconnectDialogOpen}
              onOpenChange={setDisconnectDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Disconnect Google Calendar
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to disconnect Google Calendar? Your
                    synced events will remain, but automatic sync will stop.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmDisconnect}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : (
          <div className="text-center py-4 sm:py-6">
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              Connect Google Calendar
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Connect your Google Calendar to automatically sync events.
              You&apos;ll be redirected to Google to authorize access.
            </p>
            <Button
              onClick={handleConnect}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Connect Google Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
