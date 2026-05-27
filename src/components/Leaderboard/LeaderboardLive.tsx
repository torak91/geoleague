'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { refreshLeaderboardAction } from '@/app/leaderboard/actions';
import { t } from '@/lib/i18n';
import type { LeaderboardPeriodType, LeaderboardRow } from '@/types/leaderboard';

const DEBOUNCE_MS = 1200;

type Props = {
  periodType: LeaderboardPeriodType;
  periodStart: string;
  ownUserId: string;
  initialRows: LeaderboardRow[];
  initialOwnRow: LeaderboardRow | null;
};

export function LeaderboardLive({
  periodType,
  periodStart,
  ownUserId,
  initialRows,
  initialOwnRow,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [ownRow, setOwnRow] = useState(initialOwnRow);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  const refetch = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await refreshLeaderboardAction(periodType, periodStart);
      if (res.ok) {
        setRows(res.rows);
        setOwnRow(res.ownRow);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [periodType, periodStart]);

  useEffect(() => {
    // Re-sync state when navigating between weekly/monthly (initialRows changes).
    setRows(initialRows);
    setOwnRow(initialOwnRow);
  }, [initialRows, initialOwnRow]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`lb-${periodType}-${periodStart}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard_entries',
          // postgres_changes filters cannot combine multiple eq clauses.
          // We filter by period_type server-side and discard mismatching
          // period_start values in the client handler below.
          filter: `period_type=eq.${periodType}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as { period_start?: string } | undefined;
          if (!row || row.period_start !== periodStart) return;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => {
            void refetch();
          }, DEBOUNCE_MS);
        },
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [periodType, periodStart, refetch]);

  const ownInTop = rows.some((r) => r.user_id === ownUserId);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-600">
        {t['leaderboard.empty']}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div
        role="table"
        aria-label={t['leaderboard.title']}
        className="text-sm"
      >
        <div
          role="row"
          className="grid grid-cols-[3rem_1fr_4rem_5rem] gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs uppercase tracking-wide text-neutral-500"
        >
          <span role="columnheader" className="text-right font-medium">
            {t['leaderboard.col_rank']}
          </span>
          <span role="columnheader" className="text-left font-medium">
            {t['leaderboard.col_player']}
          </span>
          <span role="columnheader" className="text-right font-medium">
            {t['leaderboard.col_plays']}
          </span>
          <span role="columnheader" className="text-right font-medium">
            {t['leaderboard.col_score']}
          </span>
        </div>

        <AnimatePresence initial={false}>
          {rows.map((row) => (
            <Row key={row.user_id} row={row} isYou={row.user_id === ownUserId} />
          ))}
        </AnimatePresence>

        {!ownInTop && ownRow ? (
          <>
            <div
              role="row"
              className="border-t border-neutral-200 bg-neutral-50 px-3 py-1 text-center text-[10px] uppercase tracking-wide text-neutral-500"
            >
              {t['leaderboard.your_rank']}
            </div>
            <Row row={ownRow} isYou />
          </>
        ) : null}
      </div>
    </div>
  );
}

function Row({ row, isYou }: { row: LeaderboardRow; isYou: boolean }) {
  const name = row.display_name?.trim() || (isYou ? t['leaderboard.you'] : '—');
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      role="row"
      className={`grid grid-cols-[3rem_1fr_4rem_5rem] items-center gap-2 border-t border-neutral-100 px-3 py-2 ${
        isYou ? 'bg-blue-50' : ''
      }`}
    >
      <span role="cell" className="text-right font-mono text-neutral-700">
        {row.rank}
      </span>
      <span role="cell" className="truncate">
        <Link
          href={isYou ? '/profile' : `/profile/${row.user_id}`}
          className="font-medium hover:underline"
        >
          {name}
        </Link>
        {row.is_pro ? (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
            Pro
          </span>
        ) : null}
        {isYou ? (
          <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-800">
            {t['leaderboard.you']}
          </span>
        ) : null}
      </span>
      <span role="cell" className="text-right tabular-nums text-neutral-600">
        {row.plays_count}
      </span>
      <span role="cell" className="text-right font-semibold tabular-nums">
        {row.total_score.toLocaleString('it-IT')}
      </span>
    </motion.div>
  );
}
