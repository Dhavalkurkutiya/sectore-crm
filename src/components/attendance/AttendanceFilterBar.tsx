import React, { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  X,
  RotateCcw,
  Check,
  Building2,
} from 'lucide-react';
import type { QuickFilterTag } from './types';
import { format, subDays } from 'date-fns';

interface AttendanceFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeTags: QuickFilterTag[];
  onToggleTag: (tag: QuickFilterTag) => void;
  currentDate: Date;
  onDateChange?: (date: Date) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  onExport: () => void;
  viewMode: 'matrix' | 'list';
  onViewModeChange: (mode: 'matrix' | 'list') => void;
  totalFiltered: number;
  availableDepartments?: string[];
  selectedDepartment?: string;
  onDepartmentChange?: (dept: string) => void;
}

export function AttendanceFilterBar({
  searchQuery,
  onSearchChange,
  activeTags,
  onToggleTag,
  currentDate,
  onDateChange,
  onPrevWeek,
  onNextWeek,
  onToday,
  onExport,
  viewMode,
  onViewModeChange,
  totalFiltered,
  availableDepartments = [],
  selectedDepartment = 'all',
  onDepartmentChange,
}: AttendanceFilterBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);

  // Shortcut Cmd+S / Ctrl+S to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isTagActive = (tag: QuickFilterTag) => activeTags.includes(tag);

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      if (onDateChange) {
        onDateChange(date);
      }
      setIsCalendarOpen(false);
    }
  };

  // Count active filter criteria
  const activeFilterCount =
    activeTags.length + (selectedDepartment !== 'all' ? 1 : 0) + (searchQuery.trim() ? 1 : 0);

  return (
    <div className="space-y-2.5">
      {/* 
        Main Toolbar Bar:
        - On Desktop / Laptop (md: and above): Everything is strictly in ONE row.
        - On Mobile (< md): Organised in clean rows without awkward line breaks.
      */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[180px] max-w-full md:max-w-xs xl:max-w-sm">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            size={16}
          />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search anything ..."
            className="pl-9 pr-14 h-10 w-full rounded-2xl bg-card border-border/80 text-xs sm:text-sm focus-visible:ring-1 focus-visible:ring-primary shadow-xs"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              title="Clear search"
            >
              <X size={13} />
            </button>
          ) : null}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] font-medium text-muted-foreground/70 bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 select-none pointer-events-none">
            <span>⌘ S</span>
          </div>
        </div>

        {/* Right Controls Container:
            On md+: shrink-0 flex items-center gap-2 flex-nowrap (NEVER wraps download down alone!)
            On mobile (< md): flex-wrap with equal gap
        */}
        <div className="flex items-center flex-wrap md:flex-nowrap gap-2 shrink-0">
          {/* View Switcher (Matrix vs Feed) */}
          <div className="flex items-center bg-muted/60 p-1 rounded-2xl border border-border/60 shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('matrix')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                viewMode === 'matrix'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Weekly Timesheet Matrix View"
            >
              <LayoutGrid size={14} />
              <span>Matrix</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Employee Attendance Feed"
            >
              <List size={14} />
              <span>Feed</span>
            </button>
          </div>

          {/* Filter Popover Button ("Filter 03") */}
          <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-10 px-3 rounded-2xl border-border/80 bg-card hover:bg-muted/50 gap-1.5 text-xs font-medium transition-all shrink-0 ${
                  activeFilterCount > 0 ? 'border-primary/50 text-foreground' : 'text-foreground'
                }`}
              >
                <Filter size={14} className={activeFilterCount > 0 ? 'text-primary' : 'text-muted-foreground'} />
                <span>
                  Filter {activeFilterCount > 0 ? `0${activeFilterCount}` : '03'}
                </span>
              </Button>
            </PopoverTrigger>

            <PopoverContent
              className="w-[calc(100vw-32px)] sm:w-72 max-w-sm p-3.5 rounded-2xl border border-border shadow-xl z-50 bg-card"
              align="start"
              side="bottom"
              sideOffset={6}
              collisionPadding={16}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-semibold text-foreground">Filter Attendance</span>
                  {(activeTags.length > 0 || selectedDepartment !== 'all' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        onSearchChange('');
                        if (activeTags.length > 0) {
                          activeTags.forEach((t) => onToggleTag(t));
                        }
                        if (onDepartmentChange) onDepartmentChange('all');
                      }}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Reset all
                    </button>
                  )}
                </div>

                {/* Status Filter Options */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Quick Status Tags
                  </p>
                  <div className="space-y-1.5">
                    {[
                      { id: 'leave' as QuickFilterTag, label: 'Leave', color: 'text-purple-600' },
                      { id: 'absent' as QuickFilterTag, label: 'Absent', color: 'text-rose-600' },
                      { id: 'active' as QuickFilterTag, label: 'Active', color: 'text-teal-600' },
                    ].map((item) => {
                      const active = isTagActive(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onToggleTag(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            active
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${item.color.replace('text-', 'bg-')}`} />
                            {item.label}
                          </span>
                          {active && <Check size={13} className="text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Department Filter (if departments available) */}
                {availableDepartments.length > 0 && onDepartmentChange && (
                  <div className="pt-2 border-t border-border/60">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Building2 size={12} />
                      <span>Department</span>
                    </p>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => onDepartmentChange('all')}
                        className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs transition-all ${
                          selectedDepartment === 'all'
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <span>All Departments</span>
                        {selectedDepartment === 'all' && <Check size={12} />}
                      </button>
                      {availableDepartments.map((dept) => (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => onDepartmentChange(dept)}
                          className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs transition-all ${
                            selectedDepartment === dept
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span className="truncate">{dept}</span>
                          {selectedDepartment === dept && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Date Navigator + Interactive Popover Calendar */}
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <div className="flex items-center rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden h-10 px-1 shrink-0">
              {/* Previous Date/Week Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl"
                onClick={onPrevWeek}
                title="Previous Week"
              >
                <ChevronLeft size={16} />
              </Button>

              {/* Date button that opens calendar on click */}
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-semibold text-foreground hover:bg-muted/60 hover:text-primary transition-colors whitespace-nowrap focus:outline-none cursor-pointer"
                  title="Click to open interactive calendar"
                >
                  <CalendarIcon size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="hidden sm:inline">{format(currentDate, 'dd. MMMM yyyy')}</span>
                  <span className="sm:hidden">{format(currentDate, 'dd. MMM yyyy')}</span>
                </button>
              </PopoverTrigger>

              {/* Next Date/Week Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-xl"
                onClick={onNextWeek}
                title="Next Week"
              >
                <ChevronRight size={16} />
              </Button>
            </div>

            {/* Calendar Popover Content */}
            <PopoverContent
              className="w-[calc(100vw-32px)] sm:w-auto p-0 rounded-2xl border border-border shadow-2xl z-50 bg-card"
              align="center"
              side="bottom"
              sideOffset={8}
              collisionPadding={16}
            >
              <div className="p-3 border-b border-border/60 flex items-center justify-between bg-muted/20 rounded-t-2xl">
                <div>
                  <p className="text-xs font-bold text-foreground">Select Date</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(currentDate, 'EEEE, dd MMMM yyyy')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onToday();
                    setIsCalendarOpen(false);
                  }}
                  className="h-7 px-2.5 text-xs text-blue-600 border-blue-200 dark:border-blue-900 font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl"
                >
                  Today
                </Button>
              </div>

              <div className="p-2 flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={currentDate}
                  onSelect={handleSelectDate}
                  initialFocus
                  className="rounded-xl border-none"
                />
              </div>

              {/* Quick Jump Buttons Footer */}
              <div className="p-2.5 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-1.5 rounded-b-2xl">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (onDateChange) onDateChange(subDays(new Date(), 1));
                    setIsCalendarOpen(false);
                  }}
                  className="h-7 px-2 text-[11px] rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Yesterday
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onToday();
                    setIsCalendarOpen(false);
                  }}
                  className="h-7 px-2 text-[11px] rounded-lg font-medium text-foreground hover:bg-muted"
                >
                  Jump to Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCalendarOpen(false)}
                  className="h-7 px-2 text-[11px] rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Done
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Download Button (Matching reference blue button) */}
          <Button
            onClick={onExport}
            className="h-10 px-3 sm:px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm gap-1.5 shadow-sm transition-all shrink-0"
            title="Download Attendance Report as Excel"
          >
            <Download size={14} />
            <span>Download</span>
          </Button>
        </div>
      </div>

      {/* Tag pills row: Leave ✕, Absent ✕, Active ✕ */}
      <div className="flex items-center flex-wrap gap-2 pt-0.5">
        {/* Leave tag */}
        <button
          type="button"
          onClick={() => onToggleTag('leave')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal border transition-all cursor-pointer ${
            isTagActive('leave')
              ? 'bg-purple-50 border-purple-300 text-purple-800 dark:bg-purple-950/70 dark:border-purple-800 dark:text-purple-300 shadow-xs font-medium'
              : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40 shadow-2xs'
          }`}
          title="Toggle Leave Filter"
        >
          <span>Leave</span>
          <X size={12} className={isTagActive('leave') ? 'opacity-100 text-purple-700' : 'opacity-40'} />
        </button>

        {/* Absent tag */}
        <button
          type="button"
          onClick={() => onToggleTag('absent')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal border transition-all cursor-pointer ${
            isTagActive('absent')
              ? 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/70 dark:border-rose-800 dark:text-rose-300 shadow-xs font-medium'
              : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40 shadow-2xs'
          }`}
          title="Toggle Absent Filter"
        >
          <span>Absent</span>
          <X size={12} className={isTagActive('absent') ? 'opacity-100 text-rose-700' : 'opacity-40'} />
        </button>

        {/* Active tag */}
        <button
          type="button"
          onClick={() => onToggleTag('active')}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal border transition-all cursor-pointer ${
            isTagActive('active')
              ? 'bg-teal-50 border-teal-300 text-teal-800 dark:bg-teal-950/70 dark:border-teal-800 dark:text-teal-300 shadow-xs font-medium'
              : 'bg-card border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40 shadow-2xs'
          }`}
          title="Toggle Active Filter"
        >
          <span>Active</span>
          <X size={12} className={isTagActive('active') ? 'opacity-100 text-teal-700' : 'opacity-40'} />
        </button>

        {/* Clear filter button if any active */}
        {(activeTags.length > 0 || searchQuery || selectedDepartment !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSearchChange('');
              if (activeTags.length > 0) {
                activeTags.forEach((t) => onToggleTag(t));
              }
              if (onDepartmentChange) onDepartmentChange('all');
            }}
            className="h-7 px-2.5 text-[11px] text-muted-foreground hover:text-foreground gap-1 rounded-full border border-dashed border-border"
          >
            <RotateCcw size={11} />
            <span>Reset filters ({totalFiltered} shown)</span>
          </Button>
        )}
      </div>
    </div>
  );
}
