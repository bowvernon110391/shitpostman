import type { Collection, CollectionItem, SavedRequest } from '@shared/types'

/** Depth-first search for a node anywhere in a forest. */
export function findItem(items: CollectionItem[], id: string): CollectionItem | null {
  for (const item of items) {
    if (item.id === id) return item
    if (item.type === 'folder') {
      const found = findItem(item.items, id)
      if (found) return found
    }
  }
  return null
}

/** Locate a node across all collections, returning its collection + parent. */
export function locateItem(
  collections: Collection[],
  id: string
): { collectionId: string; parentId: string | null } | null {
  const search = (
    items: CollectionItem[],
    collectionId: string,
    parentId: string | null
  ): { collectionId: string; parentId: string | null } | null => {
    for (const item of items) {
      if (item.id === id) return { collectionId, parentId }
      if (item.type === 'folder') {
        const found = search(item.items, collectionId, item.id)
        if (found) return found
      }
    }
    return null
  }

  for (const collection of collections) {
    const found = search(collection.items, collection.id, null)
    if (found) return found
  }
  return null
}

/** Immutably replace a node via an updater callback. */
export function updateItem(
  items: CollectionItem[],
  id: string,
  updater: (item: CollectionItem) => CollectionItem
): CollectionItem[] {
  return items.map((item) => {
    if (item.id === id) return updater(item)
    if (item.type === 'folder') {
      return { ...item, items: updateItem(item.items, id, updater) }
    }
    return item
  })
}

/** Immutably remove a node and its subtree. */
export function removeItem(items: CollectionItem[], id: string): CollectionItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) =>
      item.type === 'folder' ? { ...item, items: removeItem(item.items, id) } : item
    )
}

/** Immutably append a node under `parentId` (or at the root when null). */
export function insertItem(
  items: CollectionItem[],
  parentId: string | null,
  node: CollectionItem
): CollectionItem[] {
  if (parentId === null) return [...items, node]

  return items.map((item) => {
    if (item.id === parentId && item.type === 'folder') {
      return { ...item, items: [...item.items, node], collapsed: false }
    }
    if (item.type === 'folder') {
      return { ...item, items: insertItem(item.items, parentId, node) }
    }
    return item
  })
}

/** Flatten every saved request in a forest. */
export function collectRequests(items: CollectionItem[]): SavedRequest[] {
  const out: SavedRequest[] = []
  for (const item of items) {
    if (item.type === 'request') out.push(item)
    else out.push(...collectRequests(item.items))
  }
  return out
}

/** Count nested requests, for the collection subtitle. */
export function countRequests(items: CollectionItem[]): number {
  return collectRequests(items).length
}
