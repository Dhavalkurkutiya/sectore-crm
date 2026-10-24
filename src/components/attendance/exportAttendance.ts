import * as XLSX from 'xlsx';
import type { EmployeeAttendanceRow } from './types';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function exportAttendanceToExcel(rows: EmployeeAttendanceRow[], currentDate: Date) {
  try {
    if (rows.length === 0) {
      toast.error('No attendance records to export');
      return;
    }

    // Construct export data rows
    const data = rows.map((row) => {
      const rowObj: Record<string, string | number> = {
        'Employee Name': row.name,
        'Designation': row.role,
        'Department': row.department,
      };

      for (const day of row.days) {
        const colTitle = `${day.dayName} (${day.dayNumber})`;

        if (day.status === 'weekend') {
          rowObj[colTitle] = 'Week Off';
        } else if (day.status === 'upcoming') {
          rowObj[colTitle] = '—';
        } else if (day.status === 'leave') {
          rowObj[colTitle] = 'On Leave';
        } else if (day.status === 'absent') {
          rowObj[colTitle] = 'Absent';
        } else if (day.status === 'active') {
          rowObj[colTitle] = `Active (In: ${day.checkInTime || '—'})`;
        } else {
          // If worked on weekend, clearly indicate Weekend Duty with hours
          const hrs = day.hoursFormatted || `${day.hoursNumeric || 8}h`;
          rowObj[colTitle] = day.isWeekend ? `${hrs} (Weekend Duty)` : hrs;
        }
      }

      rowObj['Total Week Hours'] = `${row.weekTotalHours.toFixed(1)}h`;
      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Matrix');

    const fileName = `Employee_Attendance_${format(currentDate, 'yyyy_MM_dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast.success(`Exported ${rows.length} employee records to Excel!`, {
      description: fileName,
    });
  } catch (error) {
    console.error('Failed to export attendance to excel:', error);
    toast.error('Failed to download Excel file');
  }
}
