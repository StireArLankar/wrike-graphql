import { FolderTC } from 'app/schema/entities/FolderTC';
import { FieldConfig } from 'app/schema/definitions';
import { FolderID } from 'app/schema/types/Scalars';
import { folderUpdate, UpdateArgs } from 'app/vendor/folder/folderUpdate';
import { FolderInput } from '../types/inputs/FolderInput';

export const FolderUpdateInput = FolderInput.clone('FolderUpdateInput').removeField('shareds');

export default {
  type: FolderTC,
  args: {
    folderId: FolderID.NonNull,
    folder: FolderUpdateInput.NonNull,
  },
  resolve: (_, args) => {
    return folderUpdate(args);
  },
} as FieldConfig<UpdateArgs>;