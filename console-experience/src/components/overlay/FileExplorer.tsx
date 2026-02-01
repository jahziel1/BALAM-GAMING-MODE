import './FileExplorer.css';

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ArrowLeft, File, Folder, HardDrive, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import ButtonHint from '../ui/ButtonHint/ButtonHint';

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  extension: string | null;
}

interface FileExplorerProps {
  onClose: () => void;
  onSelectGame: (path: string, title: string) => void;
  controllerType: 'XBOX' | 'PLAYSTATION' | 'SWITCH' | 'KEYBOARD' | 'GENERIC';
}

const FileExplorer = ({ onClose, onSelectGame, controllerType }: FileExplorerProps) => {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [drives, setDrives] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial: Get Drives
    void invoke<string[]>('get_system_drives').then(setDrives);
  }, []);

  const loadDirectory = useCallback(async (path: string) => {
    try {
      const data = await invoke<FileEntry[]>('list_directory', { path });
      setEntries(data);
      setCurrentPath(path);
      setFocusedIndex(0);
    } catch (err) {
      console.error('Failed to list dir:', err);
    }
  }, []);

  const handleSelect = useCallback(
    (entry: FileEntry | string) => {
      if (typeof entry === 'string') {
        // It's a drive
        void loadDirectory(entry);
      } else if (entry.is_dir) {
        void loadDirectory(entry.path);
      } else if (entry.extension?.toLowerCase() === 'exe') {
        const title = entry.name.replace('.exe', '');
        onSelectGame(entry.path, title);
      }
    },
    [loadDirectory, onSelectGame]
  );

  const goBack = useCallback(() => {
    if (!currentPath) {
      onClose();
      return;
    }

    // Is it a root drive? (e.g. C:\)
    if (currentPath.length <= 3) {
      setCurrentPath(null);
      setEntries([]);
      setFocusedIndex(0);
    } else {
      // Go up
      const parent = currentPath.substring(0, currentPath.lastIndexOf('\\'));
      void loadDirectory(parent || currentPath.substring(0, 3));
    }
  }, [currentPath, loadDirectory, onClose]);

  // Handle Keyboard/Gamepad navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const max = currentPath ? entries.length : drives.length;

      if (e.key === 'ArrowDown') {
        setFocusedIndex((prev) => (prev + 1) % max);
      } else if (e.key === 'ArrowUp') {
        setFocusedIndex((prev) => (prev - 1 + max) % max);
      } else if (e.key === 'Enter') {
        if (currentPath) {
          handleSelect(entries[focusedIndex]);
        } else {
          handleSelect(drives[focusedIndex]);
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        goBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPath, entries, drives, focusedIndex, handleSelect, goBack]);

  // Handle Gamepad (Native Nav events)
  useEffect(() => {
    let lastNavTime = 0;
    const unlisten = listen<string>('nav', (e) => {
      const now = Date.now();
      if (now - lastNavTime < 150) return; // Debounce
      lastNavTime = now;

      const navAction = e.payload;
      const max = currentPath ? entries.length : drives.length;

      if (navAction === 'DOWN') {
        setFocusedIndex((prev) => (prev + 1) % max);
      } else if (navAction === 'UP') {
        setFocusedIndex((prev) => (prev - 1 + max) % max);
      } else if (navAction === 'CONFIRM') {
        if (currentPath) {
          handleSelect(entries[focusedIndex]);
        } else {
          handleSelect(drives[focusedIndex]);
        }
      } else if (navAction === 'BACK' || navAction === 'MENU') {
        goBack();
      }
    });

    return () => {
      void unlisten.then((f: () => void) => f());
    };
  }, [currentPath, entries, drives, focusedIndex, handleSelect, goBack]);

  // Auto-scroll focused item
  useEffect(() => {
    const focusedEl = listRef.current?.children[focusedIndex] as HTMLElement;
    if (focusedEl) {
      focusedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [focusedIndex]);

  return (
    <div className="file-explorer-overlay">
      <div className="file-explorer-container">
        <header className="explorer-header">
          <button className="explorer-back-btn" onClick={goBack}>
            <ArrowLeft />
          </button>
          <div className="explorer-path">{currentPath ?? 'Select Drive'}</div>
        </header>

        <div className="explorer-list" ref={listRef}>
          {!currentPath
            ? drives.map((drive, index) => (
                <div
                  key={drive}
                  className={`explorer-item ${focusedIndex === index ? 'focused' : ''}`}
                  onClick={() => handleSelect(drive)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <HardDrive className="item-icon drive" />
                  <span>{drive}</span>
                </div>
              ))
            : entries.map((entry, index) => (
                <div
                  key={entry.path}
                  className={`explorer-item ${focusedIndex === index ? 'focused' : ''} ${entry.extension === 'exe' ? 'is-exe' : ''}`}
                  onClick={() => handleSelect(entry)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  {entry.is_dir ? (
                    <Folder className="item-icon folder" />
                  ) : (
                    <File className="item-icon file" />
                  )}
                  <span className="item-name">{entry.name}</span>
                  {entry.extension === 'exe' && <Plus className="item-add-icon" size={16} />}
                </div>
              ))}
        </div>

        <footer className="explorer-footer">
          <ButtonHint action="CONFIRM" type={controllerType} label="Select" />
          <ButtonHint action="BACK" type={controllerType} label="Back" />
        </footer>
      </div>
    </div>
  );
};

export default FileExplorer;
