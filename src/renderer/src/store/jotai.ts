import { atom } from 'jotai';
import { getCurrentFileIdFromLocal } from './localstorage';
import { RevenoteFile, RevenoteFolder, FileTree } from '../types/file';

export const currentFileIdAtom = atom<string | undefined | null>(getCurrentFileIdFromLocal());

export const currentFileAtom = atom<RevenoteFile | undefined | null>(undefined);

export const workspaceLoadedAtom = atom(false);

export const folderListAtom = atom<RevenoteFolder[]>([]);

export const fileTreeAtom = atom<FileTree>([]);

export const currentFolderIdAtom = atom<string | undefined>(undefined);

export const siderbarCollapsedAtom = atom(false);

export const langCodeAtom = atom('en');
