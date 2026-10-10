import { describe, expect, it } from 'vitest';
import { moduleMastery } from '../../src/engine/mastery.ts';
import { deriveMemory, type MemoryContent } from '../../src/engine/memory.ts';
import { E2E_NOW, readyModuleEvents } from '../fixtures/ready-module.ts';

const IDS = ['c-made-up-a', 'c-made-up-b', 'c-made-up-c', 'c-made-up-d', 'c-made-up-e', 'c-made-up-f'];

const content: MemoryContent = {
  concepts: new Map(
    IDS.map(
      (id) => [id, { module: 3, tested: true, confusableWith: [], splitFrom: null, tasks: ['3.1'] }] as const,
    ),
  ),
  aliases: new Map(),
  questionVersions: new Map(IDS.map((id) => [`q-${id}-1`, 2] as const)),
  examTasks: new Map(),
  coreLabs: new Map(),
  keptMissions: new Set(),
};

describe('readyModuleEvents', () => {
  it('brings a made-up module to mastery 60 or more at the e2e clock', () => {
    const events = readyModuleEvents({
      module: 3,
      lessons: ['made-up-one', 'made-up-two'],
      questions: IDS.flatMap((id) => [
        { id: `q-${id}-1`, version: 2, concept: id },
        { id: `q-${id}-2`, version: 1, concept: id },
      ]),
      now: E2E_NOW,
    });
    const mastery = moduleMastery(deriveMemory(events, content), content, new Date(E2E_NOW)).get(3) ?? 0;
    expect(mastery).toBeGreaterThanOrEqual(60);
  });

  it('marks every lesson of the module read', () => {
    const events = readyModuleEvents({ module: 3, lessons: ['made-up-one'], questions: [], now: E2E_NOW });
    expect(
      events.filter((e) => e.t === 'lesson.done').map((e) => (e.t === 'lesson.done' ? e.note : '')),
    ).toEqual(['m03/made-up-one']);
  });
});
