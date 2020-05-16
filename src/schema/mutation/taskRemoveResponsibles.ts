import { TaskTC } from 'app/schema/entities/TaskTC';
import { FieldConfig } from 'app/schema/definitions';
import { TaskID, ContactID } from 'app/schema/types/Scalars';
import { update } from 'app/vendor/task/update';

export default {
  type: TaskTC,
  args: {
    id: TaskID.NonNull,
    responsibles: ContactID.NonNull.List.NonNull,
  },
  resolve: (_, args) => {
    return update({ id: args.id, task: { removeResponsibles: args.responsibles } });
  },
} as FieldConfig;