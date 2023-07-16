import { atom } from 'jotai';
import { getCurrentFileIdFromLocal } from './localstorage';

export const currentFileIdAtom = atom(getCurrentFileIdFromLocal());
