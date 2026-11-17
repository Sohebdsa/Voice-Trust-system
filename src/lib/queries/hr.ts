import { db } from "../data/store";
import { formatDate } from "../format";

export type HrData = {
  headcount: { total: number; active: number; exited: number; onNotice: number };
  byDepartment: { department: string; count: number }[];
  today: {
    date: string;
    rows: { status: string; label: string; count: number; percent: number }[];
    totalMarked: number;
  };
  leaveThisMonth: { type: string; days: number; pending: number }[];
  pendingLeave: { id: string; name: string; type: string; from: string; to: string; days: number }[];
  allocation: { project: string; staff: number; totalPct: number }[];
  birthdays: { name: string; date: string; daysAway: number }[];
};

const ATTENDANCE_LABELS: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  on_leave: "On leave",
  field_duty: "Field duty",
  half_day: "Half day",
  holiday: "Holiday",
};

function birthdaysAhead(employees: { fullName: string; dateOfBirth: string }[], withinDays = 14) {
  const today = new Date();
  return employees
    .map((employee) => {
      const dob = new Date(employee.dateOfBirth);
      const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (next.getTime() < new Date(today.toDateString()).getTime()) {
        next.setFullYear(today.getFullYear() + 1);
      }
      const daysAway = Math.round((next.getTime() - new Date(today.toDateString()).getTime()) / 864e5);
      return { name: employee.fullName, date: next.toISOString().slice(0, 10), daysAway };
    })
    .filter((row) => row.daysAway <= withinDays)
    .sort((a, b) => a.daysAway - b.daysAway);
}

export function getHrData(): HrData {
  const active = db.employees.filter((e) => e.employmentStatus === "active");
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayRows = db.attendance.filter((a) => a.attendanceDate === todayIso);

  const statusOrder = ["present", "field_duty", "on_leave", "absent", "half_day", "holiday"];
  const rows = statusOrder
    .map((status) => {
      const count = todayRows.filter((a) => a.status === status).length;
      return {
        status,
        label: ATTENDANCE_LABELS[status] ?? status,
        count,
        percent: todayRows.length === 0 ? 0 : Math.round((count / todayRows.length) * 100),
      };
    })
    .filter((row) => row.count > 0);

  const month = new Date().getMonth();
  const year = new Date().getFullYear();
  const leaveThisMonth = db.leaveTypes.map((type) => {
    const approved = db.leaveRequests.filter(
      (r) =>
        r.leaveTypeId === type.id &&
        r.status === "approved" &&
        new Date(r.fromDate).getMonth() === month &&
        new Date(r.fromDate).getFullYear() === year,
    );
    const pending = db.leaveRequests.filter(
      (r) => r.leaveTypeId === type.id && r.status === "pending",
    ).length;
    return {
      type: type.name,
      days: approved.reduce((sum, r) => sum + r.days, 0),
      pending,
    };
  });

  const pendingLeave = db.leaveRequests
    .filter((r) => r.status === "pending")
    .map((r) => ({
      id: r.id,
      name: db.employees.find((e) => e.id === r.employeeId)?.fullName ?? "—",
      type: db.leaveTypes.find((t) => t.id === r.leaveTypeId)?.name ?? "Leave",
      from: formatDate(r.fromDate),
      to: formatDate(r.toDate),
      days: r.days,
    }));

  // Summed across staff, project allocation naturally exceeds 100% (several people
  // each give part of their time), so the headline figure is the staff count.
  const allocation = db.projects
    .map((project) => {
      const rows = db.projectAllocations.filter((a) => a.projectId === project.id);
      return {
        project: project.name,
        staff: new Set(rows.map((a) => a.employeeId)).size,
        totalPct: rows.reduce((sum, a) => sum + a.allocationPct, 0),
      };
    })
    .filter((row) => row.staff > 0)
    .sort((a, b) => b.staff - a.staff);

  return {
    headcount: {
      total: db.employees.length,
      active: active.length,
      exited: db.employees.filter((e) => e.employmentStatus === "exited").length,
      onNotice: db.employees.filter((e) => e.employmentStatus === "on_notice").length,
    },
    byDepartment: Object.entries(
      active.reduce<Record<string, number>>((acc, employee) => {
        acc[employee.department] = (acc[employee.department] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count),
    today: { date: formatDate(todayIso), rows, totalMarked: todayRows.length },
    leaveThisMonth,
    pendingLeave,
    allocation,
    birthdays: birthdaysAhead(active),
  };
}
