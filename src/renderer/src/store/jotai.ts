import { atom } from 'jotai';
import { IJsonModel, Layout, Model, ITabRenderValues } from 'flexlayout-react';
import { RevezoneFile, RevezoneFolder, RevezoneFileTree } from '@renderer/types/file';
import {
  getCurrentFileFromLocal,
  getOpenKeysFromLocal,
  getSelectedKeysFromLocal
} from './localstorage';

import { DEFAULT_TAB_JSON_MODEL } from '@renderer/utils/constant';

type Theme = 'light' | 'dark';

export const fileTreeAtom = atom<RevezoneFileTree>({});

export const currentFileAtom = atom<RevezoneFile | undefined | null>(getCurrentFileFromLocal());

export const workspaceLoadedAtom = atom(false);

export const folderListAtom = atom<RevezoneFolder[]>([]);

export const currentFolderIdAtom = atom<string | undefined>(undefined);

export const siderbarCollapsedAtom = atom(false);

export const langCodeAtom = atom('en');

export const themeAtom = atom<Theme>('light');

export const tabJsonModelAtom = atom<IJsonModel>(DEFAULT_TAB_JSON_MODEL);
export const tabModelAtom = atom<Model | undefined>(undefined);

export const selectedKeysAtom = atom<string[]>(getSelectedKeysFromLocal());

export const openKeysAtom = atom<string[]>(getOpenKeysFromLocal());

export const focusItemAtom = atom<string>('');
