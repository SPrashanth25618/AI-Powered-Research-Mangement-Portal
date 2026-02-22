import Papa from "papaparse";
import csvText from "./hod_stats_clean_120.csv?raw";

// Parse CSV into JS objects
const parsed = Papa.parse(csvText, {
  header: true,
  skipEmptyLines: true,
});

const data = parsed.data;

// Safe formatter
function safeStatus(status) {
  if (!status) return "Draft";
  return status.replace("_", " ");
}

export async function loadHodStats() {

  // 1. Project Status Distribution
  const projectStatusData = Object.values(
    data.reduce((acc, row) => {
      const status = safeStatus(row.status);
      acc[status] = acc[status] || { name: status, value: 0 };
      acc[status].value++;
      return acc;
    }, {})
  );

  // 2. Pending Approvals
  const pendingApprovalsData = [
    { name: "Faculty Pending", count: data.filter(r => r.status === "SUBMITTED").length },
    { name: "HOD Pending", count: data.filter(r => r.status === "FACULTY_APPROVED").length },
  ];

  // 3. Monthly Submissions
  const monthlySubmissionsData = Object.values(
    data.reduce((acc, row) => {
      const month = row.month || "Unknown";
      acc[month] = acc[month] || { month, submissions: 0 };
      acc[month].submissions++;
      return acc;
    }, {})
  );

  // 4. Faculty Workload
  const facultyWorkloadData = Object.values(
    data.reduce((acc, row) => {
      const f = row.faculty || "Unknown";
      acc[f] = acc[f] || { faculty: f, reviewed: 0 };
      acc[f].reviewed++;
      return acc;
    }, {})
  );

  return {
    projectStatusData,
    pendingApprovalsData,
    monthlySubmissionsData,
    facultyWorkloadData
  };
}
