export type TaxonomyNode = {
	/** 块名称，对应文章 category 路径中的一段 */
	name: string;
	/** 子块，可继续嵌套 */
	children?: TaxonomyNode[];
};
