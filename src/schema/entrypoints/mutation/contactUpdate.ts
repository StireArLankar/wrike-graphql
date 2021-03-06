import { ContactTC } from 'app/schema/entities/ContactTC';
import { FieldConfig } from 'app/schema/definitions';
import { ContactID } from 'app/schema/types/Scalars';
import { contactUpdate, ContactUpdateArgs } from 'app/vendor/contact/contactUpdate';
import { KeyValueInput } from 'app/schema/types/inputs/KeyValueInput';

export default {
  type: ContactTC,
  args: {
    id: ContactID.NonNull,
    metadata: KeyValueInput.NonNull.List.NonNull,
  },
  resolve: (_, args, context) => {
    return contactUpdate(args, context);
  },
} as FieldConfig<ContactUpdateArgs>;
