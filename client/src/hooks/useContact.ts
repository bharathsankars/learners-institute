import { useQuery } from "@tanstack/react-query";

import { fetchPublicInstitute } from "../api/institute";
import { buildContact, type Contact } from "../data/contact";

// Contact details from the admin's institute profile, with the built-in
// details shown while loading or if the profile cannot be reached.
export function useContact(): Contact {
  const query = useQuery({
    queryKey: ["institute-public"],
    queryFn: fetchPublicInstitute,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  return buildContact(query.data);
}
