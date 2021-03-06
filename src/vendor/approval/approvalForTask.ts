import client from '../client';
import { AxiosRequestConfig } from 'axios';

export type FindManyOpts = {
  taskId: string;
};

// https://developers.wrike.com/api/v4/approvals/#get-approvals
export async function approvalForTask(opts: FindManyOpts, context: AxiosRequestConfig) {
  const { taskId } = opts || {};
  const res = await client.get(`/tasks/${taskId}/approvals`, context);
  return res?.data?.data;
}
