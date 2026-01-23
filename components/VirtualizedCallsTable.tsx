"use client";

import React, { useMemo, useCallback, memo } from 'react';
// @ts-ignore - react-window types issue
import { FixedSizeList as List } from 'react-window';
// @ts-ignore - AutoSizer doesn't have proper TypeScript definitions
import AutoSizer from 'react-virtualized-auto-sizer';
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatDuration } from "@/lib/utils";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Trash2,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";

interface Call {
  id: string;
  customer_name: string | null;
  sales_rep: string | null;
  call_date: string;
  duration: number | null;
  sentiment_type: string | null;
  sentiment_score: number | null;
  status: string;
  created_at: string;
}

interface VirtualizedCallsTableProps {
  calls: Call[];
  selectedCallIds: string[];
  onSelectCall: (callId: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onDeleteCall: (callId: string) => void;
  isAllSelected: boolean;
  isSomeSelected: boolean;
}

// Memoized row component for better performance
const CallRow = memo(({
  data,
  index,
  style
}: {
  data: {
    calls: Call[],
    selectedCallIds: string[],
    onSelectCall: (id: string, checked: boolean) => void,
    onDeleteCall: (id: string) => void
  },
  index: number,
  style: React.CSSProperties
}) => {
  const { calls, selectedCallIds, onSelectCall, onDeleteCall } = data;
  const call = calls[index];
  const isSelected = selectedCallIds.includes(call.id);

  return (
    <div
      style={style}
      className="flex items-center border-b border-slate-100 hover:bg-gradient-to-r hover:from-violet-50/30 hover:to-transparent transition-all duration-200"
    >
      <div className="px-6 py-5 w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectCall(call.id, checked as boolean)}
          className="rounded border-slate-300"
        />
      </div>

      <div className="flex-1 flex items-center">
        <div className="w-[200px] px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-violet-600">
                {call.customer_name ? call.customer_name.charAt(0) : '?'}
              </span>
            </div>
            <div className="truncate">
              <p className="font-semibold text-slate-900 truncate">
                {call.customer_name || 'Unknown Customer'}
              </p>
            </div>
          </div>
        </div>

        <div className="w-[150px] px-6 text-sm font-medium text-slate-600 truncate">
          {call.sales_rep || 'Unknown Rep'}
        </div>

        <div className="w-[150px] px-6">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            {formatDate(call.call_date || call.created_at)}
          </div>
        </div>

        <div className="w-[120px] px-6 text-sm font-medium text-slate-600">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            {call.duration ? formatDuration(call.duration) : 'N/A'}
          </div>
        </div>

        <div className="w-[150px] px-6">
          {call.status === "completed" && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg font-medium text-sm border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </div>
          )}
          {(call.status === "processing" ||
            call.status === "transcribing" ||
            call.status === "extracting") && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg font-medium text-sm border border-amber-200">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing
            </div>
          )}
          {call.status === "failed" && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg font-medium text-sm border border-red-200">
              <AlertCircle className="w-4 h-4" />
              Failed
            </div>
          )}
        </div>

        <div className="w-[120px] px-6 text-right">
          <div className="flex items-center justify-end gap-2">
            <Link href={`/calls/${call.id}`}>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-violet-100 rounded-lg"
              >
                <Eye className="w-4 h-4" />
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <Link href={`/calls/${call.id}`}>
                  <DropdownMenuItem className="rounded-lg cursor-pointer">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  className="rounded-lg cursor-pointer text-red-600"
                  onClick={() => onDeleteCall(call.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
});

CallRow.displayName = 'CallRow';

export const VirtualizedCallsTable = memo(({
  calls,
  selectedCallIds,
  onSelectCall,
  onSelectAll,
  onDeleteCall,
  isAllSelected,
  isSomeSelected,
}: VirtualizedCallsTableProps) => {
  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo(
    () => ({
      calls,
      selectedCallIds,
      onSelectCall,
      onDeleteCall,
    }),
    [calls, selectedCallIds, onSelectCall, onDeleteCall]
  );

  // Fixed row height for better performance
  const ITEM_HEIGHT = 80;

  return (
    <div className="overflow-hidden">
      {/* Table Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
        <div className="flex items-center px-6 py-4">
          <div className="w-12">
            <Checkbox
              checked={isAllSelected || isSomeSelected}
              onCheckedChange={onSelectAll}
              className="rounded border-slate-300"
            />
          </div>
          <div className="flex-1 flex items-center">
            <div className="w-[200px] px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
              Customer
            </div>
            <div className="w-[150px] px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
              Sales Rep
            </div>
            <div className="w-[150px] px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
              Date
            </div>
            <div className="w-[120px] px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
              Duration
            </div>
            <div className="w-[150px] px-6 text-xs font-bold text-slate-700 uppercase tracking-wider">
              Status
            </div>
            <div className="w-[120px] px-6 text-xs font-bold text-slate-700 uppercase tracking-wider text-right">
              Actions
            </div>
          </div>
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div className="h-[600px]">
        <AutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <List
              height={height}
              itemCount={calls.length}
              itemSize={ITEM_HEIGHT}
              width={width}
              itemData={itemData}
              overscanCount={5} // Render 5 extra rows for smoother scrolling
            >
              {CallRow}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
});

VirtualizedCallsTable.displayName = 'VirtualizedCallsTable';

/**
 * Performance optimization tips:
 * 1. Use React.memo to prevent unnecessary re-renders
 * 2. Use useMemo and useCallback for expensive computations
 * 3. Keep row height fixed for better performance
 * 4. Use overscanCount to pre-render nearby rows
 * 5. Minimize the number of DOM nodes per row
 * 6. Use CSS transforms instead of changing layout properties
 */