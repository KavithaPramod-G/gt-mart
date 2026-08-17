import { CategoryParentGroup, ShopCategory } from '@/types';

const OTHER_GROUP: CategoryParentGroup = {
  id: 'other',
  label: 'More',
  sortOrder: 999,
};

export interface GroupedCategories {
  group: CategoryParentGroup;
  categories: ShopCategory[];
}

export function groupCategoriesByParent(
  categories: ShopCategory[],
  parentGroups: CategoryParentGroup[],
): GroupedCategories[] {
  if (parentGroups.length === 0) {
    return categories.length > 0
      ? [{ group: OTHER_GROUP, categories }]
      : [];
  }

  const groupMap = new Map(parentGroups.map((group) => [group.id, group]));
  const buckets = new Map<string, ShopCategory[]>();

  for (const category of categories) {
    const groupId = category.parentGroupId && groupMap.has(category.parentGroupId)
      ? category.parentGroupId
      : OTHER_GROUP.id;
    const list = buckets.get(groupId) ?? [];
    list.push(category);
    buckets.set(groupId, list);
  }

  const grouped = parentGroups
    .filter((group) => (buckets.get(group.id)?.length ?? 0) > 0)
    .map((group) => ({
      group,
      categories: buckets.get(group.id) ?? [],
    }));

  const otherCategories = buckets.get(OTHER_GROUP.id);
  if (otherCategories?.length) {
    grouped.push({ group: OTHER_GROUP, categories: otherCategories });
  }

  return grouped;
}
