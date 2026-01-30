import React, { useEffect, useRef, useState } from 'react';
import './SearchOverlay.css';
import { Game } from '../../../types/game';
import { Search } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    games: Game[];
    onLaunch: (game: Game) => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, games, onLaunch }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Game[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-focus when opened
    useEffect(() => {
        if (isOpen) {
            // Tiny delay to ensure DOM is ready and animation started
            setTimeout(() => {
                inputRef.current?.focus();
            }, 50);
        } else {
            setQuery(''); // Reset on close
        }
    }, [isOpen]);

    // Listen for virtual keyboard updates (real-time search)
    useEffect(() => {
        if (!isOpen) return;

        const handleVirtualKeyboardUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            setQuery(customEvent.detail);
        };

        window.addEventListener('virtual-keyboard-text-change', handleVirtualKeyboardUpdate);
        return () => window.removeEventListener('virtual-keyboard-text-change', handleVirtualKeyboardUpdate);
    }, [isOpen]);

    // Search Logic
    useEffect(() => {
        if (query.trim() === '') {
            setResults([]);
            return;
        }
        const lowerQuery = query.toLowerCase();
        const filtered = games.filter(g => g.title.toLowerCase().includes(lowerQuery)).slice(0, 5);
        setResults(filtered);
    }, [query, games]);

    if (!isOpen) return null;

    return (
        <div className="search-overlay" onClick={(e) => {
            // Close if clicking backend (backdrop)
            if (e.target === e.currentTarget) onClose();
        }}>
            <div className="search-container">
                <div className="search-input-wrapper">
                    <Search className="search-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="search-input"
                        placeholder="Search Games..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') onClose();
                        }}
                    />
                </div>

                <div className="search-results">
                    {results.map((game) => (
                        <div
                            key={game.id}
                            className="result-item"
                            onClick={() => onLaunch(game)}
                        >
                            <img
                                src={game.image ? (game.image.startsWith('http') ? game.image : convertFileSrc(game.image)) : ''}
                                alt=""
                                className="result-thumbnail"
                            />
                            <div className="result-info">
                                <h3>{game.title}</h3>
                                <span>{game.source}</span>
                            </div>
                        </div>
                    ))}
                    {query && results.length === 0 && (
                        <div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>No matches found</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchOverlay;
