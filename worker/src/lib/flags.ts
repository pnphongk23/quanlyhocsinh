import type { Env } from '../types';

/**
 * Cờ THỬ NGHIỆM "tiêu chí 3 mức" (`levels`/`skill_levels` của phiếu, "Hôm nay học" của buổi).
 * `"1"` = bật (dev); không đặt = tắt (local, staging/prod) và máy chủ chỉ chặn GHI, không chặn ĐỌC.
 * Hợp đồng: plans/20261104-criteria-levels/contract.md mục 0.
 */
export const criteriaLevelsEnabled = (env: Pick<Env, 'CRITERIA_LEVELS'>): boolean =>
  env.CRITERIA_LEVELS === '1';
