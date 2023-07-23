import { atom } from 'jotai';
import { getCurrentFileIdFromLocal } from './localstorage';
import { RevenoteFile } from '../types/file';

export const currentFileIdAtom = atom<string | undefined | null>(getCurrentFileIdFromLocal());

export const currentFileAtom = atom<RevenoteFile | undefined>(undefined);

export const workspaceLoadedAtom = atom(false);
