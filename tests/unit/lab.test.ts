import { describe, expect, it } from 'vitest';
import {
  CREDITS_NOTE,
  ENGINE_LABEL,
  goalWord,
  hintLine,
  labCheckLine,
  labDoneLine,
  labLede,
  placedLine,
  RESET_ASK,
  returnedLine,
  TRAY_EMPTY,
} from '../../src/app/lab.ts';

describe('lab copy', () => {
  it('names the engines and says how long a lab takes', () => {
    expect(ENGINE_LABEL).toEqual({ sort: 'Sort', configure: 'Configure', simulate: 'Simulate' });
    expect(labLede('sort', 6)).toBe('Sort lab, about 6 minutes');
    expect(labLede('configure', 8)).toBe('Configure lab, about 8 minutes');
    expect(labLede('simulate', 1)).toBe('Simulate lab, about 1 minute');
  });

  it('labels prices and asks before a reset', () => {
    expect(CREDITS_NOTE).toBe('Prices are in lab credits, a made-up unit, not AWS prices.');
    expect(RESET_ASK).toBe('Reset this lab? Your work is cleared; hints you opened still count.');
    expect(TRAY_EMPTY).toBe('Every card is placed.');
  });

  it('words a goal before and after a check', () => {
    expect(goalWord(null)).toBe('Not checked');
    expect(goalWord({ goalId: 'g1', pass: true, message: '2 of 2 right' })).toBe('Met');
    expect(goalWord({ goalId: 'g1', pass: false, message: '1 of 2 right' })).toBe('Not met');
  });

  it('announces a check, with the XP only when the completion paid some', () => {
    expect(labCheckLine(1, 3, 0)).toBe('1 of 3 goals met.');
    expect(labCheckLine(0, 2, 0)).toBe('0 of 2 goals met.');
    expect(labCheckLine(3, 3, 0)).toBe('All 3 goals met.');
    expect(labCheckLine(3, 3, 40)).toBe('All 3 goals met. Plus 40 XP.');
    expect(labCheckLine(2, 2, 30)).toBe('All 2 goals met. Plus 30 XP.');
  });

  it('joins a goal hint with what the board says now', () => {
    expect(hintLine('Shared kitchens bill by the hour.', '1 card still in the tray.')).toBe(
      'Shared kitchens bill by the hour. 1 card still in the tray.',
    );
  });

  it('says when a lab was done, and what card moved where', () => {
    expect(labDoneLine('2026-10-19')).toBe('Done on Oct 19; a rerun pays no XP.');
    expect(placedLine('Rye for the market', 'Shared kitchen')).toBe(
      'Placed Rye for the market in Shared kitchen.',
    );
    expect(returnedLine('Rye for the market')).toBe('Rye for the market is back in the tray.');
  });
});
