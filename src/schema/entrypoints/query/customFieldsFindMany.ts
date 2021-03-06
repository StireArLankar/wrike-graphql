import { FieldConfig } from 'app/schema/definitions';
import { CustomFieldTC } from 'app/schema/entities/CustomFieldTC';
import { customFieldFindMany } from 'app/vendor/customFields/customFieldFindMany';

export default {
  type: CustomFieldTC.NonNull.List,
  resolve: (_, __, context) => {
    return customFieldFindMany({}, context);
  },
  extensions: {
    complexity: ({ childComplexity }) => childComplexity * 10,
  },
} as FieldConfig<{ ids: string[] }>;
