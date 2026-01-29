import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Game } from '../types/game';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const useGames = () => {
    const [games, setGames] = useState<Game[]>([]);
    const [isLaunching, setIsLaunching] = useState(false);
    const [activeRunningGame, setActiveRunningGame] = useState<Game | null>(null);

    const loadGames = useCallback(async () => {
        try {
            const g = await invoke<Game[]>('get_games');
            if (g.length) setGames(g);

            // Perform background scan to update cache
            const updated = await invoke<Game[]>('scan_games');
            if (updated.length) setGames(updated);
        } catch (error) {
            console.error('Failed to load games:', error);
        }
    }, []);

    const launchGame = useCallback(async (game: Game) => {
        if (!game || game.id === 'empty') return;

        try {
            setActiveRunningGame(game);
            setIsLaunching(true);
            await getCurrentWindow().hide();

            await invoke('launch_game', { id: game.id, path: game.path });
        } catch (error) {
            console.error('Launch failed:', error);
            await getCurrentWindow().show();
            setActiveRunningGame(null);
        } finally {
            setIsLaunching(false);
        }
    }, []);

    const killGame = useCallback(async (game: Game) => {
        if (!game) return;

        try {
            await invoke('kill_game', { path: game.path });
            setActiveRunningGame(null);
            const win = getCurrentWindow();
            await win.show();
            await win.setFocus();
        } catch (error) {
            console.error('Failed to kill game:', error);
        }
    }, []);

    useEffect(() => {
        loadGames();
    }, [loadGames]);

    return {
        games,
        isLaunching,
        activeRunningGame,
        setActiveRunningGame,
        launchGame,
        killGame,
        refreshGames: loadGames
    };
};
