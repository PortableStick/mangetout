import { describe, it, expect } from '@jest/globals';
import { buildPlayerPlan, nextStep } from './player';

describe('buildPlayerPlan', () => {
  it('intercale des repos entre séries, pas après la dernière', () => {
    const plan = buildPlayerPlan([{ name: 'Squat', setCount: 2 }], { restSeconds: 60 });
    expect(plan.map((s) => s.kind)).toEqual(['exercise', 'rest', 'exercise']);
    expect(plan[0]).toMatchObject({ kind: 'exercise', exerciseIndex: 0, setIndex: 0, label: 'Squat' });
    expect(plan[1]).toMatchObject({ kind: 'rest', seconds: 60 });
  });

  it('repos entre deux exercices, pas de repos final', () => {
    const plan = buildPlayerPlan([{ name: 'A', setCount: 1 }, { name: 'B', setCount: 1 }]);
    expect(plan.map((s) => s.kind)).toEqual(['exercise', 'rest', 'exercise']);
  });

  it('ignore les exercices à 0 série ; défaut restSeconds 90', () => {
    const plan = buildPlayerPlan([{ name: 'A', setCount: 0 }, { name: 'B', setCount: 2 }]);
    expect(plan.map((s) => s.kind)).toEqual(['exercise', 'rest', 'exercise']);
    expect(plan.find((s) => s.kind === 'rest')?.seconds).toBe(90);
  });

  it('nextStep avance puis termine', () => {
    const plan = buildPlayerPlan([{ name: 'A', setCount: 1 }]);
    expect(nextStep(plan, 0)).toBe(null); // 1 seul step
    const plan2 = buildPlayerPlan([{ name: 'A', setCount: 2 }]);
    expect(nextStep(plan2, 0)).toBe(1);
    expect(nextStep(plan2, plan2.length - 1)).toBe(null);
  });

  it('plan vide → nextStep null', () => {
    expect(nextStep([], 0)).toBe(null);
  });
});
