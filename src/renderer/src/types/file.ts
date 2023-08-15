export interface RevezoneFolder {
  id: string;
  name: string;
  gmtCreate: string;
  gmtModified: string;
}

export interface RevezoneFolderFileMapping {
  folderId: string;
  fileId: string;
  gmtCreate: string;
  gmtModified: string;
}

export type RevezoneFileType = 'note' | 'board';

export interface RevezoneFile {
  id: string;
  name: string;
  type: RevezoneFileType;
  gmtCreate: string;
  gmtModified: string;
}

export interface RevezoneFolder {
  id: string;
  name: string;
  gmtCreate: string;
  gmtModified: string;
}

export type FileTreeItem = RevezoneFolder & { children: RevezoneFile[] };

export type FileTree = FileTreeItem[];

export interface OnFolderOrFileAddProps {
  fileId?: string;
  folderId: string;
  type: 'folder' | 'file';
}

export interface Font {
  name: string;
  nameWithSuffix: string;
  path: string;
}
