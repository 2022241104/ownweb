import type { SidebarLayoutConfig } from "../types/sidebarConfig";

/**
 * 侧边栏布局配置
 */
export const sidebarLayoutConfig: SidebarLayoutConfig = {
	// 是否启用侧边栏功能
	enable: true,

	// 侧边栏位置：
	// left: 仅显示左侧边栏
	// right: 仅显示右侧边栏
	// both: 双侧边栏，1280px以上同时显示左右，769-1279px根据tabletSidebar配置显示其中一侧
	position: "right",

	// 平板端(769-1279px)显示哪侧侧边栏，仅position为both时生效
	tabletSidebar: "left",

	// 文章详情页隐藏侧边栏，设为 true 则只在首页等非文章页显示
	hideSidebarOnPostPage: false,

	// 本页没有侧栏列时，内容栏占「侧栏 + 内容栏」总宽的比例（0–1），不设置或 ≥1 则铺满
	noSidebarContentWidth: 0.6,

	leftComponents: [
		{
			type: "profile",
			enable: false,
			position: "top",
			showOnPostPage: true,
		},
		{
			type: "announcement",
			enable: false,
			position: "top",
			showOnPostPage: true,
		},
		{
			type: "music",
			enable: false,
			position: "top",
			showOnPostPage: true,
		},
		{
			type: "categories",
			enable: false,
			position: "sticky",
			showOnPostPage: true,
			specificConfig: {
				collapseThreshold: 5,
			},
		},
		{
			type: "tags",
			enable: false,
			position: "sticky",
			showOnPostPage: true,
			specificConfig: {
				collapseThreshold: 10,
			},
		},
	],

	rightComponents: [
		{
			type: "profile",
			enable: true,
			position: "top",
			showOnPostPage: true,
		},
		{
			type: "categories",
			enable: true,
			position: "sticky",
			showOnPostPage: true,
			specificConfig: {
				collapseThreshold: 12,
			},
		},
		{
			type: "dynamic",
			enable: false,
			position: "top",
			showOnPostPage: true,
			specificConfig: {
				dynamic: {
					limit: 2,
				},
			},
		},
		{
			type: "stats",
			enable: false,
			position: "top",
			showOnPostPage: false,
		},
		{
			type: "siteInfo",
			enable: false,
			position: "top",
			showOnPostPage: false,
			specificConfig: {
				siteInfo: {
					unknownBuildPlatform: "Unknown CI",
				},
			},
		},
		{
			type: "calendar",
			enable: false,
			showTitle: false,
			position: "sticky",
			showOnPostPage: false,
			specificConfig: {
				calendar: {
					showHeatmap: true,
				},
			},
		},
		{
			type: "sidebarToc",
			enable: true,
			position: "sticky",
			showOnPostPage: true,
			hideOnNonPostPage: true,
		},
		{
			type: "advertisement",
			enable: false,
			showTitle: false,
			position: "sticky",
			showOnPostPage: true,
			specificConfig: {
				ad: {
					image: {
						src: "/assets/images/ad/ad1.webp",
						alt: "广告横幅",
						link: "https://haoka.lot-ml.com/plugreg.html?agentid=1423316",
						external: true,
					},
					closable: false,
					displayCount: -1,
					padding: {
						all: "1rem",
					},
				},
			},
		},
		{
			type: "advertisement",
			enable: false,
			position: "sticky",
			showOnPostPage: true,
			specificConfig: {
				ad: {
					title: "支持博主",
					content:
						"如果您觉得本站内容对您有帮助，欢迎支持我们的创作！您的支持是我们持续更新的动力。",
					link: {
						text: "支持一下",
						url: "about/",
						external: false,
					},
					closable: false,
					displayCount: -1,
				},
			},
		},
	],

	mobileBottomComponents: [
		{
			type: "profile",
			enable: true,
			showOnPostPage: true,
		},
		{
			type: "announcement",
			enable: false,
			showOnPostPage: true,
		},
		{
			type: "categories",
			enable: true,
			showOnPostPage: true,
			specificConfig: {
				collapseThreshold: 12,
			},
		},
		{
			type: "tags",
			enable: false,
			showOnPostPage: true,
			specificConfig: {
				collapseThreshold: 10,
			},
		},
		{
			type: "dynamic",
			enable: false,
			showOnPostPage: true,
			specificConfig: {
				dynamic: {
					limit: 2,
				},
			},
		},
		{
			type: "stats",
			enable: false,
			showOnPostPage: true,
		},
		{
			type: "siteInfo",
			enable: false,
			showOnPostPage: true,
			specificConfig: {
				siteInfo: {
					unknownBuildPlatform: "Unknown CI",
				},
			},
		},
	],
};
