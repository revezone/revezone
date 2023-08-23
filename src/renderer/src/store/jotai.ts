import { atom } from 'jotai';
import { RevezoneFile, RevezoneFolder, RevezoneFileTree } from '@renderer/types/file';
import { TabItem } from '@renderer/types/tabs';
import {
  getCurrentFileFromLocal,
  getOpenKeysFromLocal,
  getSelectedKeysFromLocal
} from './localstorage';

type Theme = 'light' | 'dark';

export const fileTreeAtom = atom<RevezoneFileTree>({});

export const currentFileAtom = atom<RevezoneFile | undefined | null>(getCurrentFileFromLocal());

export const workspaceLoadedAtom = atom(false);

export const folderListAtom = atom<RevezoneFolder[]>([]);

export const currentFolderIdAtom = atom<string | undefined>(undefined);

export const siderbarCollapsedAtom = atom(false);

export const langCodeAtom = atom('en');

export const themeAtom = atom<Theme>('light');

export const tabListAtom = atom<TabItem[]>([]);

export const tabIndexAtom = atom<number>(0);

export const selectedKeysAtom = atom<string[]>(getSelectedKeysFromLocal());

export const openKeysAtom = atom<string[]>(getOpenKeysFromLocal());
