export interface RevenoteFolder {
  id: string;
  name: string;
  gmtCreate: string;
  gmtModified: string;
}

export interface RevenoteFolderFileMapping {
  folderId: string;
  fileId: string;
  gmtCreate: string;
  gmtModified: string;
}

export type RevenoteFileType = 'note' | 'board';

export interface RevenoteFile {
  id: string;
  name: string;
  type: RevenoteFileType;
  gmtCreate: string;
  gmtModified: string;
}

export interface RevenoteFolder {
  id: string;
  name: string;
  gmtCreate: string;
  gmtModified: string;
}

export type FileTreeItem = RevenoteFolder & { children: RevenoteFile[] };

export type FileTree = FileTreeItem[];

export interface OnFolderOrFileAddProps {
  fileId?: string;
  folderId: string;
  type: 'folder' | 'file';
}
