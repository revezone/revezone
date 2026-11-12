import { atom } from 'jotai';
import type { IJsonModel, Model } from 'flexlayout-react';
import { RevezoneFile, RevezoneFolder, RevezoneFileTree } from '@renderer/types/file';
import {
  getCurrentFileFromLocal,
  getLangCodeFromLocal,
  getOpenKeysFromLocal,
  getSelectedKeysFromLocal,
  getTabJsonModelFromLocal
} from './localstorage';

import { DEFAULT_LANG_CODE } from '@renderer/utils/constant';

type Theme = 'light' | 'dark';

export const fileTreeAtom = atom<RevezoneFileTree>({});

export const currentFileAtom = atom<RevezoneFile | undefined | null>(getCurrentFileFromLocal());

export const workspaceLoadedAtom = atom(false);

export const folderListAtom = atom<RevezoneFolder[]>([]);

export const currentFolderIdAtom = atom<string | undefined>(undefined);

export const siderbarCollapsedAtom = atom(false);

export const langCodeAtom = atom(getLangCodeFromLocal() || DEFAULT_LANG_CODE);

export const themeAtom = atom<Theme>('light');

export const tabJsonModelAtom = atom<IJsonModel>(getTabJsonModelFromLocal());
export const tabModelAtom = atom<Model | undefined>(undefined);

export const selectedKeysAtom = atom<string[]>(getSelectedKeysFromLocal());

export const openKeysAtom = atom<string[]>(getOpenKeysFromLocal());

export const focusItemAtom = atom<string>('');
