/** SlateDrop file reference returned by the project file picker. */
export type SlateDropPickerFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  folderId: string;
};

export type SlateDropPickerFolder = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  children: SlateDropPickerFolder[];
};
