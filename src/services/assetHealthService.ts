/**
 * Asset Health Service
 * Sectore 360 — Phase 1 Final Enhancement
 *
 * Calculates a 0–100 health score for each asset based on:
 *  - Number of breakdown / repair tasks
 *  - Asset age (years since purchaseDate)
 *  - Repeated major component replacements
 *
 * Health Levels:
 *  90–100  Excellent
 *  70–89   Good
 *  50–69   Needs Attention
 *  < 50    Replacement Recommended
 *
 * Frequent Breakdown Alert: 4+ breakdown/repair tasks on the same asset.
 *
 * Smart Replacement Recommendation is generated when:
 *  - Health < 50, OR
 *  - 4+ breakdowns, OR
 *  - Age > 5 years AND health < 70
 */

import type { Asset } from '@/types/customer';
import type { Task } from '@/types/task';

/* ── Types ──────────────────────────────────────────────────── */
export type HealthLevel = 'Excellent' | 'Good' | 'Needs Attention' | 'Replacement Recommended';

export interface AssetHealth {
  assetId: string;
  score: number;                    // 0–100
  level: HealthLevel;
  breakdownCount: number;
  repairCount: number;
  totalServiceCalls: number;
  ageYears: number;
  frequentBreakdownAlert: boolean;  // true if breakdownCount >= 4
  replacementRecommended: boolean;  // true if score < 50 OR breakdownCount >= 4
  recommendations: ReplacementRecommendation[];
}

export interface ReplacementRecommendation {
  type: 'replace' | 'upgrade' | 'inspection' | 'major_repair';
  label: string;
  reason: string;
}

/* ── Breakdown-type task types ──────────────────────────────── */
const BREAKDOWN_TYPES = new Set([
  'Breakdown Support',
  'Warranty Service',
  'Chargeable Service',
]);

const REPAIR_TYPES = new Set([
  'Breakdown Support',
  'Warranty Service',
  'Chargeable Service',
  'Replacement',
  'Upgrade',
]);

/* ── Score deductions ───────────────────────────────────────── */
const BREAKDOWN_DEDUCTION = 10;   // per breakdown visit
const REPAIR_DEDUCTION    = 5;    // per non-breakdown repair
const AGE_DEDUCTION_PER_YEAR = 3; // per year over 3 years
const MAX_DEDUCTION       = 70;   // floor: score never < 30 from deductions alone

function calculateScore(breakdowns: number, repairs: number, ageYears: number): number {
  let score = 100;
  score -= Math.min(breakdowns * BREAKDOWN_DEDUCTION, 50);
  score -= Math.min(repairs * REPAIR_DEDUCTION, 20);
  const agePenalty = Math.max(0, (ageYears - 3)) * AGE_DEDUCTION_PER_YEAR;
  score -= Math.min(agePenalty, MAX_DEDUCTION - breakdowns * BREAKDOWN_DEDUCTION - repairs * REPAIR_DEDUCTION);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function levelFromScore(score: number): HealthLevel {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Attention';
  return 'Replacement Recommended';
}

function buildRecommendations(
  score: number, breakdowns: number, ageYears: number,
): ReplacementRecommendation[] {
  const recs: ReplacementRecommendation[] = [];

  if (score < 30 || breakdowns >= 6) {
    recs.push({
      type: 'replace',
      label: 'Replace Device',
      reason: score < 30
        ? `Health score is critically low (${score}%). Continued use is not cost-effective.`
        : `Asset has had ${breakdowns} breakdown incidents. Replacement is strongly advised.`,
    });
  } else if (score < 50 || breakdowns >= 4) {
    recs.push({
      type: 'upgrade',
      label: 'Upgrade Device',
      reason: `Asset performance is degraded (score: ${score}%). An upgrade will improve reliability.`,
    });
    recs.push({
      type: 'inspection',
      label: 'Perform Detailed Inspection',
      reason: `${breakdowns} breakdown(s) recorded. A thorough inspection can prevent further failures.`,
    });
  } else if (score < 70 || ageYears > 4) {
    recs.push({
      type: 'inspection',
      label: 'Schedule Preventive Maintenance',
      reason: `Asset is ${ageYears.toFixed(1)} years old. Regular servicing will extend its life.`,
    });
    recs.push({
      type: 'major_repair',
      label: 'Major Component Check',
      reason: 'Proactive component inspection recommended before further degradation.',
    });
  }

  return recs;
}

/* ── Public API ─────────────────────────────────────────────── */
export const assetHealthService = {
  /**
   * Calculate health for a given asset.
   * Pass the asset object + already-loaded tasks for age/task calculation.
   */
  getHealth(asset: Asset, tasks: Task[] = []): AssetHealth {
    const allTasks = tasks.filter((t) => t.assetId === asset.id && !t.deletedAt);

    const breakdownCount    = allTasks.filter((t) => BREAKDOWN_TYPES.has(t.taskType)).length;
    const repairCount       = allTasks.filter(
      (t) => REPAIR_TYPES.has(t.taskType) && !BREAKDOWN_TYPES.has(t.taskType),
    ).length;
    const totalServiceCalls = allTasks.length;

    // Age in years
    let ageYears = 0;
    if (asset.purchaseDate) {
      const purchased = new Date(asset.purchaseDate).getTime();
      ageYears = (Date.now() - purchased) / (1000 * 60 * 60 * 24 * 365.25);
    }

    const score = calculateScore(breakdownCount, repairCount, ageYears);
    const level = levelFromScore(score);
    const frequentBreakdownAlert = breakdownCount >= 4;
    const replacementRecommended = score < 50 || frequentBreakdownAlert;
    const recommendations = buildRecommendations(score, breakdownCount, ageYears);

    return {
      assetId: asset.id,
      score,
      level,
      breakdownCount,
      repairCount,
      totalServiceCalls,
      ageYears,
      frequentBreakdownAlert,
      replacementRecommended,
      recommendations,
    };
  },

  /** Convenience: get health by assetId only (no age calculation, no tasks needed) */
  getHealthById(assetId: string, tasks: Task[] = []): Omit<AssetHealth, 'ageYears'> & { ageYears: number } {
    const allTasks          = tasks.filter((t) => t.assetId === assetId && !t.deletedAt);
    const breakdownCount = allTasks.filter((t) => BREAKDOWN_TYPES.has(t.taskType)).length;
    const repairCount    = allTasks.filter(
      (t) => REPAIR_TYPES.has(t.taskType) && !BREAKDOWN_TYPES.has(t.taskType),
    ).length;
    const totalServiceCalls = allTasks.length;
    const score = calculateScore(breakdownCount, repairCount, 0);
    const level = levelFromScore(score);
    const frequentBreakdownAlert = breakdownCount >= 4;
    const replacementRecommended = score < 50 || frequentBreakdownAlert;
    const recommendations = buildRecommendations(score, breakdownCount, 0);
    return {
      assetId, score, level, breakdownCount, repairCount,
      totalServiceCalls, ageYears: 0, frequentBreakdownAlert,
      replacementRecommended, recommendations,
    };
  },

  levelColor(level: HealthLevel): string {
    switch (level) {
      case 'Excellent':                return 'text-green-600 dark:text-green-400';
      case 'Good':                     return 'text-blue-600 dark:text-blue-400';
      case 'Needs Attention':          return 'text-amber-600 dark:text-amber-400';
      case 'Replacement Recommended':  return 'text-red-600 dark:text-red-400';
    }
  },

  levelBg(level: HealthLevel): string {
    switch (level) {
      case 'Excellent':                return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800';
      case 'Good':                     return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
      case 'Needs Attention':          return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
      case 'Replacement Recommended':  return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
    }
  },

  scoreBarColor(score: number): string {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  },
};
