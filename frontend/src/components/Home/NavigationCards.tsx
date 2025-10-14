'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare, ArrowRight, FolderOpen } from 'lucide-react';
import Link from 'next/link';

export function NavigationCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
      <Link href="/tasks">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer p-4">
          <CardHeader className="text-center">
            <CheckSquare className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Tasks</CardTitle>
            <CardDescription>
              Manage your daily tasks and stay organized
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button className="w-full">
              View Tasks
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </Link>
      <Link href="/projects">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer p-4">
          <CardHeader className="text-center">
            <FolderOpen className="h-12 w-12 text-primary mx-auto mb-2" />
            <CardTitle>Projects</CardTitle>
            <CardDescription>
              Track your larger goals and project progress
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button className="w-full">
              View Projects
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
