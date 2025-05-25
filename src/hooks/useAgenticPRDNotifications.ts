import { usePRDStore } from '@/store/prdStore';
import { determineCategory, analyzeSummary } from '@/lib/prdCategorization';
import { useEffect, useRef } from 'react';

export function useAgenticPRDNotifications() {
  const prds = usePRDStore((state) => state.prds);
  const addAgenticMessage = usePRDStore((state) => state.addAgenticMessage);
  const notifiedPrdIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    prds.forEach((prd) => {
      if (
        prd.metadata &&
        determineCategory(prd) === 'at-risk' &&
        !notifiedPrdIds.current.has(prd.id)
      ) {
        const summary = prd.metadata.open_questions_summary || '';
        const summaryAnalysis = analyzeSummary(summary);
        const openQuestions =
          summaryAnalysis.hasQuestions && summary
            ? summary.split(/[\n\r]+/).filter((line: string) => line.includes('?'))
            : [];
        addAgenticMessage({
          prdId: prd.id,
          prdTitle: prd.title,
          openQuestions,
        });
        notifiedPrdIds.current.add(prd.id);
      }
    });
  }, [prds, addAgenticMessage]);
} 