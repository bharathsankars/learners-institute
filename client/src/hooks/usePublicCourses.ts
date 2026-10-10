import { useQuery } from "@tanstack/react-query";
import { fetchPublicCourses } from "../api/courses";

// Both public sections share one cache and the admin mutation invalidates it.
export function usePublicCourses() {
  return useQuery({
    queryKey: ["public-courses"],
    queryFn: fetchPublicCourses,
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
