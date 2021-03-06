import client from '../client';
import { splitRequestBy100 } from '../_helpers/splitRequestBy100';
import { AxiosRequestConfig } from 'axios';

export type FindByIdsArgs = {
  ids: ReadonlyArray<string>;
  versions?: boolean;
};

// https://developers.wrike.com/api/v4/attachments/#get-attachments
export async function attachmentFindByIds(opts: FindByIdsArgs, context: AxiosRequestConfig) {
  const { ids, versions } = opts || {};

  const params = {} as Record<string, any>;
  if (versions) params.versions = true;

  return splitRequestBy100(ids, async (preparedIds) => {
    const res = await client.get(`/attachments/${preparedIds}`, { ...context, params });
    return res?.data?.data;
  });
}
