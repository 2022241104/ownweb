import type { TaxonomyNode } from "@/types/taxonomyConfig";
import { getCategoryUrl } from "@/utils/url-utils";

export const CATEGORY_SEPARATOR = "/";

export type Category = {
	name: string;
	path: string;
	count: number;
	ownCount: number;
	url: string;
	children: Category[];
};

type MutableCategory = {
	name: string;
	path: string;
	ownCount: number;
	order: number;
	children: Map<string, MutableCategory>;
};

export function parseCategoryPath(
	category: string | null | undefined,
): string[] {
	if (!category) return [];
	return category
		.split(CATEGORY_SEPARATOR)
		.map((part) => part.trim())
		.filter(Boolean);
}

export function joinCategoryPath(parts: string[]): string {
	return parts.join(CATEGORY_SEPARATOR);
}

/** 文章属于该块，或其子块 */
export function categoryMatches(
	postCategory: string,
	filter: string,
): boolean {
	if (!filter) return false;
	return (
		postCategory === filter ||
		postCategory.startsWith(`${filter}${CATEGORY_SEPARATOR}`)
	);
}

export function categoryLeafName(category: string): string {
	const parts = parseCategoryPath(category);
	return parts[parts.length - 1] || category;
}

function createNode(
	name: string,
	path: string,
	order: number,
): MutableCategory {
	return {
		name,
		path,
		ownCount: 0,
		order,
		children: new Map(),
	};
}

function seedPredefined(
	nodes: TaxonomyNode[],
	parentMap: Map<string, MutableCategory>,
	parentParts: string[],
	startOrder: number,
): number {
	let order = startOrder;
	for (const node of nodes) {
		const name = node.name.trim();
		if (!name) continue;
		const parts = [...parentParts, name];
		const path = joinCategoryPath(parts);
		const existing = parentMap.get(name);
		if (!existing) {
			parentMap.set(name, createNode(name, path, order));
		} else if (existing.order > order) {
			existing.order = order;
		}
		order += 1;
		const current = parentMap.get(name);
		if (current && node.children?.length) {
			order = seedPredefined(node.children, current.children, parts, order);
		}
	}
	return order;
}

function ensurePath(
	root: Map<string, MutableCategory>,
	parts: string[],
	discoveredOrderStart: number,
): MutableCategory {
	let map = root;
	let node: MutableCategory | undefined;
	const walked: string[] = [];
	for (const part of parts) {
		walked.push(part);
		node = map.get(part);
		if (!node) {
			node = createNode(
				part,
				joinCategoryPath(walked),
				discoveredOrderStart + map.size,
			);
			map.set(part, node);
		}
		map = node.children;
	}
	if (!node) {
		throw new Error("ensurePath called with empty parts");
	}
	return node;
}

function toCategoryList(map: Map<string, MutableCategory>): Category[] {
	return [...map.values()]
		.sort(
			(a, b) => a.order - b.order || a.name.localeCompare(b.name, "zh-CN"),
		)
		.map((node) => {
			const children = toCategoryList(node.children);
			const childCount = children.reduce((sum, child) => sum + child.count, 0);
			return {
				name: node.name,
				path: node.path,
				ownCount: node.ownCount,
				count: node.ownCount + childCount,
				url: getCategoryUrl(node.path),
				children,
			};
		});
}

export function flattenCategories(nodes: Category[]): Category[] {
	const result: Category[] = [];
	for (const node of nodes) {
		result.push(node);
		if (node.children.length > 0) {
			result.push(...flattenCategories(node.children));
		}
	}
	return result;
}

export function buildCategoryTree(
	postCategories: Array<string | null | undefined>,
	predefined: TaxonomyNode[],
	uncategorizedLabel: string,
): Category[] {
	const root = new Map<string, MutableCategory>();
	seedPredefined(predefined, root, [], 0);

	let uncategorizedCount = 0;
	for (const raw of postCategories) {
		const parts = parseCategoryPath(raw);
		if (parts.length === 0) {
			uncategorizedCount += 1;
			continue;
		}
		ensurePath(root, parts, 10_000).ownCount += 1;
	}

	const tree = toCategoryList(root);
	if (uncategorizedCount > 0) {
		tree.push({
			name: uncategorizedLabel,
			path: uncategorizedLabel,
			ownCount: uncategorizedCount,
			count: uncategorizedCount,
			url: getCategoryUrl(uncategorizedLabel),
			children: [],
		});
	}
	return tree;
}
