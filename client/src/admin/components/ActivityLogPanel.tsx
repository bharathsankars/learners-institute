import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BookOpen,
  CalendarClock,
  CreditCard,
  FileText,
  GraduationCap,
  History,
  RefreshCw,
  Settings,
  UserCog,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { fetchActivity, type ActivityEntityType, type ActivityEntry } from "../../api/adminTools";

const TIME_ZONE = "Asia/Kolkata";

const typeIcons: Record<ActivityEntityType, LucideIcon> = {
  student: GraduationCap,
  enquiry: FileText,
  course: BookOpen,
  batch: CalendarClock,
  fee: Wallet,
  payment: CreditCard,
  user: UserCog,
  settings: Settings,
};

const typeOptions: { value: ActivityEntityType | ""; label: string }[] = [
  { value: "", label: "Everything" },
  { value: "student", label: "Students & admissions" },
  { value: "enquiry", label: "Enquiries" },
  { value: "course", label: "Courses" },
  { value: "batch", label: "Batches" },
  { value: "fee", label: "Fees" },
  { value: "payment", label: "Payments" },
  { value: "user", label: "People & access" },
  { value: "settings", label: "Settings & exports" },
];

const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });
const dayLabel = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" });
const timeLabel = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true });

function groupByDay(entries: ActivityEntry[]) {
  const today = dayKey.format(new Date());
  const yesterday = dayKey.format(new Date(Date.now() - 86_400_000));
  const groups = new Map<string, { label: string; entries: ActivityEntry[] }>();

  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    const key = dayKey.format(date);
    const label = key === today ? "Today" : key === yesterday ? "Yesterday" : dayLabel.format(date);

    if (!groups.has(key)) groups.set(key, { label, entries: [] });
    groups.get(key)!.entries.push(entry);
  }

  return [...groups.values()];
}

export function ActivityLogPanel() {
  const [entityType, setEntityType] = useState<ActivityEntityType | "">("");

  const query = useInfiniteQuery({
    queryKey: ["activity", entityType],
    queryFn: ({ pageParam }) => fetchActivity({ entityType, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (page.hasMore ? page.entries[page.entries.length - 1]?.createdAt : undefined),
  });

  const entries = query.data?.pages.flatMap((page) => page.entries) ?? [];

  return (
    <section className="records-panel" aria-labelledby="activity-title">
      <div className="records-toolbar settings-activity__toolbar">
        <div className="settings-tools__card-head">
          <h2 id="activity-title">Activity log</h2>
          <p>Who changed what in the admin, newest first. Times are in IST.</p>
        </div>

        <label className="records-select">
          <span className="records-sr-only">Show</span>
          <select value={entityType} onChange={(event) => setEntityType(event.target.value as ActivityEntityType | "")}>
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="records-button records-button--icon"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          aria-label="Refresh activity"
          title="Refresh"
        >
          <RefreshCw size={16} aria-hidden="true" className={query.isFetching ? "records-spin" : undefined} />
        </button>
      </div>

      {query.isPending ? (
        <div className="records-list" role="status" aria-label="Loading activity">
          {Array.from({ length: 5 }, (_, row) => (
            <div key={row} className="settings-activity__row">
              <span className="records-skeleton records-skeleton--avatar records-skeleton--square" />
              <span className="records-skeleton" style={{ width: "55%" }} />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <div className="records-empty">
          <History size={28} aria-hidden="true" />
          <h3>Activity could not be loaded</h3>
          <p>{query.error.message}</p>
        </div>
      ) : !entries.length ? (
        <div className="records-empty">
          <History size={28} aria-hidden="true" />
          <h3>No activity yet</h3>
          <p>Changes made in the admin from now on will appear here.</p>
        </div>
      ) : (
        <div className="settings-activity">
          {groupByDay(entries).map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h3 className="settings-activity__day">{group.label}</h3>
              <ul>
                {group.entries.map((entry) => {
                  const Icon = typeIcons[entry.entityType] ?? History;

                  return (
                    <li key={entry.id} className="settings-activity__row">
                      <span className={`settings-activity__icon settings-activity__icon--${entry.entityType}`} aria-hidden="true">
                        <Icon size={16} />
                      </span>
                      <div>
                        <p>{entry.summary}</p>
                        <span>
                          {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : "A removed user"} ·{" "}
                          <time dateTime={entry.createdAt}>{timeLabel.format(new Date(entry.createdAt))}</time>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {query.hasNextPage && (
        <footer className="records-pagination">
          <span>Showing the latest {entries.length} changes</span>
          <button
            type="button"
            className="records-button"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load older"}
          </button>
        </footer>
      )}
    </section>
  );
}
