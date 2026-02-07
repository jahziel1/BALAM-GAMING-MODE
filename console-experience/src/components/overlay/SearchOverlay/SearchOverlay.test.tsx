/* eslint-disable @typescript-eslint/no-empty-function */
import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import type { Game } from '../../../domain/entities/game';
import SearchOverlay from './SearchOverlay';

// Mock ResizeObserver for cmdk
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const mockGames: Game[] = [
  {
    id: '1',
    raw_id: 'steam_1',
    title: 'Test Game 1',
    source: 'Steam',
    path: '/path/to/game1',
    image: null,
    hero_image: null,
    logo: null,
    last_played: null,
  },
];

describe('SearchOverlay Component', () => {
  it('does not render when isOpen is false', () => {
    const { container } = render(
      <SearchOverlay isOpen={false} onClose={() => {}} games={mockGames} onLaunch={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });
});
