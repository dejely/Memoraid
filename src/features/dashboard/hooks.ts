import { useQuery } from "@tanstack/react-query";

import { getDashboardData, getRecentStudyActivity } from "../../db/repositories/dashboard-repository";
import { getRecentTestAttempts } from "../../db/repositories/test-repository";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  activity: ["dashboard", "activity"] as const,
  tests: ["dashboard", "tests"] as const,
};

export function useDashboardData() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: getDashboardData,
  });
}

export function useActivityHistory() {
  return useQuery({
    queryKey: dashboardKeys.activity,
    queryFn: () => getRecentStudyActivity(20),
  });
}

export function useTestHistory() {
  return useQuery({
    queryKey: dashboardKeys.tests,
    queryFn: () => getRecentTestAttempts(30),
  });
}
