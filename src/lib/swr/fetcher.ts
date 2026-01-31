export const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
});

// SWRのキー
export const swrKeys = {
  wishes: (groupId: string) => `/api/groups/${groupId}/wishes`,
  members: (groupId: string) => `/api/groups/${groupId}/members`,
  settings: (groupId: string) => `/api/groups/${groupId}/settings`,
  userGroups: (lineUserId: string) => `/api/user-groups?lineUserId=${lineUserId}`,
  groupByLineId: (lineGroupId: string) => `/api/groups/by-line-id?lineGroupId=${lineGroupId}`,
  schedule: (wishId: string) => `/api/wishes/${wishId}/schedule`,
};
