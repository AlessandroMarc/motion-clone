'use client';

import { useState, useEffect } from 'react';
import {
  TaskCreateForm,
  QuickTaskCreateCard,
} from '@/components/Tasks/TaskCreateForm';
import { TaskList } from '@/components/Tasks/TaskList';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, Circle, Plus, Loader2 } from 'lucide-react';
import type { Task } from '@/../../../shared/types';
import { taskService } from '@/services/taskService';

export default function Home() {
  const [apiMessage, setApiMessage] = useState<string>('');
  const [isApiConnected, setIsApiConnected] = useState<boolean>(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Test API connection with retry logic
    const testConnection = async () => {
      try {
        const response = await fetch('/api/health');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        setApiMessage(data.message);
        setIsApiConnected(true);
      } catch (error) {
        console.error('API connection failed:', error);
        setApiMessage(
          `API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        setIsApiConnected(false);

        // Retry after 2 seconds
        setTimeout(() => {
          testConnection();
        }, 2000);
      }
    };

    testConnection();
  }, []);

  const handleTaskCreate = async (
    taskData: Omit<
      Task,
      'id' | 'createdAt' | 'updatedAt' | 'status' | 'dependencies' | 'projectId'
    >
  ) => {
    setIsCreatingTask(true);
    try {
      await taskService.createTask({
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        priority: taskData.priority,
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to create task:', error);
      // You could add a toast notification here
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleTaskUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!isApiConnected) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Connection Error</CardTitle>
            <CardDescription className="text-center">
              Unable to connect to the backend API
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Make sure the backend server is running on port 3003
            </p>
            <Button onClick={() => window.location.reload()}>
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Task Manager
            </h1>
            <p className="text-muted-foreground">
              Organize your tasks and boost your productivity
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span>API Connected: {apiMessage}</span>
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="tasks" className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <Circle className="h-4 w-4" />
                All Tasks
              </TabsTrigger>
              <TabsTrigger value="create" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Task
              </TabsTrigger>
              <TabsTrigger value="quick" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Quick Add
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Your Tasks</h2>
                <TaskCreateForm
                  onTaskCreate={handleTaskCreate}
                  isLoading={isCreatingTask}
                />
              </div>
              <TaskList
                refreshTrigger={refreshTrigger}
                onTaskUpdate={handleTaskUpdate}
              />
            </TabsContent>

            <TabsContent value="create" className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Create New Task</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Task Details</CardTitle>
                    <CardDescription>
                      Fill in the details below to create a new task
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TaskCreateForm
                      onTaskCreate={handleTaskCreate}
                      isLoading={isCreatingTask}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="quick" className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Quick Add Task</h2>
                <QuickTaskCreateCard
                  onTaskCreate={handleTaskCreate}
                  isLoading={isCreatingTask}
                />
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4">Recent Tasks</h3>
                  <TaskList
                    refreshTrigger={refreshTrigger}
                    onTaskUpdate={handleTaskUpdate}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
