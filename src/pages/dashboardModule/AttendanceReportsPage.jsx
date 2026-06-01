import React, { useState } from "react";
import { useAuth } from "../../context/auth-context.jsx";
import {
    useAbsenceAnalysisQuery,
    useAnomalyReportQuery,
    useBranchComparisonQuery,
    useDailySummaryQuery,
    useOvertimeReportQuery,
    useWeeklyReportQuery,
} from "../../hooks/useAttendanceService";
import {
    EmptyState,
    Field,
    MetricCard,
    PageHeading,
    formatDate,
    formatMinutes,
    hasPermission,
    inputClassName,
    todayInputValue,
    weekStartValue,
} from "./attendance-shared.jsx";

export default function AttendanceReportsPage() {
    const { user } = useAuth();
    const canViewCompany = hasPermission(user, "attendance.view_company");
    const [range, setRange] = useState({ from: weekStartValue(), to: todayInputValue() });
    const summary = useDailySummaryQuery({ date: todayInputValue() }, canViewCompany);
    const weekly = useWeeklyReportQuery(range, canViewCompany);
    const overtime = useOvertimeReportQuery(range, canViewCompany);
    const anomalies = useAnomalyReportQuery(range, canViewCompany);
    const absence = useAbsenceAnalysisQuery(range, canViewCompany);
    const branches = useBranchComparisonQuery(range, canViewCompany);

    if (!canViewCompany) {
        return (
            <div className="space-y-5">
                <PageHeading eyebrow="Reports" title="Attendance reports" text="Company-level reporting is limited to authorized users." />
                <EmptyState title="Access required" text="You need company attendance reporting permission to open this workspace." />
            </div>
        );
    }

    const daily = summary.data?.data;
    const weeklyRows = weekly.data?.data || [];

    return (
        <div className="space-y-5">
            <PageHeading
                eyebrow="Reports"
                title="Attendance intelligence"
                text="Daily signals, anomalies, overtime, and branch performance for workforce review."
            />

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Today's entries" value={daily?.totalEntries ?? 0} />
                <MetricCard label="Open shifts" value={daily?.open ?? 0} tone="emerald" />
                <MetricCard label="Late arrivals" value={daily?.late ?? 0} tone="amber" />
                <MetricCard label="Worked today" value={formatMinutes(daily?.workedMinutes ?? 0)} />
            </section>

            <section className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="From date">
                        <input type="date" value={range.from} onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))} className={inputClassName} />
                    </Field>
                    <Field label="To date">
                        <input type="date" value={range.to} onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))} className={inputClassName} />
                    </Field>
                </div>
            </section>

            <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="overflow-hidden rounded-[1.4rem] border border-blue-100 bg-white/85 shadow-lg shadow-blue-500/5">
                    <div className="border-b border-blue-100 px-5 py-4">
                        <h2 className="text-lg font-black text-slate-950">Weekly records</h2>
                    </div>
                    <div className="max-h-[430px] divide-y divide-blue-100 overflow-auto">
                        {weeklyRows.length === 0 && <div className="p-5"><EmptyState title="No rows in range" text="Attendance entries will appear here once recorded." /></div>}
                        {weeklyRows.map((row) => (
                            <div key={row.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_0.8fr_0.8fr_0.7fr] sm:items-center">
                                <div>
                                    <p className="font-black text-slate-950">{row.employee_code || row.user_id}</p>
                                    <p className="text-xs font-medium text-slate-500">{formatDate(row.date)}</p>
                                </div>
                                <p className="text-sm font-medium text-slate-600">{formatMinutes(row.worked_minutes)}</p>
                                <p className="text-sm font-medium text-slate-600">{formatMinutes(row.overtime_minutes)} OT</p>
                                <p className="text-sm font-black capitalize text-blue-600">{row.status}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-5">
                    <div className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5">
                        <h2 className="text-lg font-black text-slate-950">Risk signals</h2>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <MetricCard label="Overtime rows" value={(overtime.data?.data || []).length} tone="amber" />
                            <MetricCard label="Anomalies" value={(anomalies.data?.data || []).length} tone="rose" />
                        </div>
                    </div>

                    <div className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5">
                        <h2 className="text-lg font-black text-slate-950">Absence mix</h2>
                        <div className="mt-4 space-y-3">
                            {Object.entries(absence.data?.data?.byType || {}).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                                    <span className="text-sm font-black capitalize text-slate-700">{key}</span>
                                    <span className="text-sm font-black text-blue-600">{value}</span>
                                </div>
                            ))}
                            {!Object.keys(absence.data?.data?.byType || {}).length && <EmptyState title="No absence data" text="No absence categories found for this range." />}
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-[1.4rem] border border-blue-100 bg-white/85 p-5 shadow-lg shadow-blue-500/5">
                <h2 className="text-lg font-black text-slate-950">Branch comparison</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(branches.data?.data || []).map((branch) => (
                        <div key={branch.branchId} className="rounded-3xl bg-blue-50/50 p-4">
                            <p className="truncate text-sm font-black text-slate-950">{branch.branchId}</p>
                            <p className="mt-3 text-sm font-medium text-slate-500">{branch.totalEntries} entries</p>
                            <p className="mt-1 text-sm font-medium text-slate-500">{formatMinutes(branch.workedMinutes)} worked</p>
                            <p className="mt-1 text-sm font-medium text-slate-500">{formatMinutes(branch.overtimeMinutes)} overtime</p>
                        </div>
                    ))}
                    {(branches.data?.data || []).length === 0 && <EmptyState title="No branch rows" text="Branch comparison appears when records include branch assignments." />}
                </div>
            </section>
        </div>
    );
}
