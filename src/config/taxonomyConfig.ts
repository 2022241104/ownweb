import type { TaxonomyNode } from "../types/taxonomyConfig";

/**
 * 文章分块树。
 *
 * 用法：
 * 1. 在这里加块（可以多层）：数学下面再加「微分几何」即可。
 * 2. 写文章时 category 用 / 分层，例如：数学/线性代数
 * 3. 文章里写了配置中没有的路径，也会自动出现成新块。
 */
export const taxonomyTree: TaxonomyNode[] = [
	{
		name: "数学",
		children: [{ name: "线性代数" }, { name: "复分析" }],
	},
	{
		name: "物理",
		children: [{ name: "经典力学" }],
	},
	{
		name: "计算机",
	},
	{
		name: "文学",
	},
];
