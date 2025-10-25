import { format, addDays, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? format(dateObj, 'MMM dd, yyyy') : '';
}

export function formatShortDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? format(dateObj, 'MM/dd') : '';
}

export function addDaysToDate(date: string | Date, days: number): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return addDays(dateObj, days).toISOString();
}

export function calculateGerminationDate(seedStartDate: string, daysToGermination: number): string {
  return addDaysToDate(seedStartDate, daysToGermination);
}

export function calculateTransplantDate(seedStartDate: string, daysToTransplant: number): string {
  return addDaysToDate(seedStartDate, daysToTransplant);
}

export function getMonthDays(date: Date): Date[] {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return eachDayOfInterval({ start, end });
}

export function isSameDateMonth(date1: Date, date2: Date): boolean {
  return isSameMonth(date1, date2);
}

export function isSameDateDay(date1: Date, date2: Date): boolean {
  return isSameDay(date1, date2);
}

export function getTodayISO(): string {
  return new Date().toISOString();
}
