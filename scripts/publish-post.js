/**
 * 把一篇 Obsidian 笔记发布到博客分块。
 *
 * 双击仓库根目录的「发布文章.bat」，或在项目目录执行：
 *   node scripts/publish-post.js
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { taxonomyTree } from "../src/config/taxonomyConfig.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POSTS_DIR = path.join(ROOT, "src", "content", "posts");
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/i;

let rl;

function today() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function powershellString(value) {
	return `'${String(value).replaceAll("'", "''")}'`;
}

function flattenCategories(nodes, prefix = []) {
	const paths = [];
	for (const node of nodes) {
		const name = node.name?.trim();
		if (!name) continue;
		const parts = [...prefix, name];
		paths.push(parts.join("/"));
		if (node.children?.length) {
			paths.push(...flattenCategories(node.children, parts));
		}
	}
	return paths;
}

function normalizeCategory(value) {
	const parts = String(value)
		.split("/")
		.map((part) => part.trim())
		.filter(Boolean);
	if (
		parts.length === 0 ||
		parts.some((part) => part === "." || part === ".." || part.includes("\\"))
	) {
		throw new Error(`分块无效：${value}`);
	}
	return parts.join("/");
}

function parseArgs(argv) {
	const args = {};
	for (let i = 0; i < argv.length; i++) {
		const key = argv[i];
		if (!key.startsWith("--")) continue;
		const name = key.slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith("--")) {
			args[name] = true;
		} else {
			args[name] = next;
			i++;
		}
	}
	return args;
}

function pickFile(title, filter) {
	const outFile = path.join(
		os.tmpdir(),
		`firefly-publish-${process.pid}-${Date.now()}.txt`,
	);
	const command = `
Add-Type -AssemblyName System.Windows.Forms
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$owner.ShowInTaskbar = $false
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = ${powershellString(title)}
$dialog.Filter = ${powershellString(filter)}
$dialog.CheckFileExists = $true
$result = $dialog.ShowDialog($owner)
$owner.Dispose()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  [System.IO.File]::WriteAllText(${powershellString(outFile)}, $dialog.FileName, (New-Object System.Text.UTF8Encoding $false))
}
`;
	const result = spawnSync(
		"powershell.exe",
		["-NoProfile", "-STA", "-Command", command],
		{ stdio: "inherit" },
	);
	if (result.status !== 0) {
		throw new Error("无法打开文件选择窗口");
	}
	if (!fs.existsSync(outFile)) return "";
	const picked = fs.readFileSync(outFile, "utf8").replace(/^\uFEFF/, "").trim();
	fs.unlinkSync(outFile);
	return picked;
}

async function ask(question) {
	const answer = await rl.question(question);
	return answer.trim();
}

async function chooseCategory(preset) {
	if (preset) return normalizeCategory(preset);
	const paths = flattenCategories(taxonomyTree);
	console.log("\n选择文章发布到哪个块：");
	paths.forEach((category, index) => {
		console.log(`  ${index + 1}. ${category}`);
	});
	console.log("  0. 手动输入新块，例如 数学/微分几何");
	const answer = await ask("\n输入序号：");
	if (answer === "0") {
		const custom = await ask("新块路径：");
		return normalizeCategory(custom);
	}
	const index = Number(answer);
	if (!Number.isInteger(index) || index < 1 || index > paths.length) {
		throw new Error("没有这个序号");
	}
	return paths[index - 1];
}

function chooseMarkdown(preset) {
	if (preset) return path.resolve(preset);
	console.log("\n请在弹出的窗口里选择 Obsidian 笔记（.md）");
	const picked = pickFile(
		"选择要发布的 Obsidian 笔记",
		"Markdown (*.md)|*.md|所有文件 (*.*)|*.*",
	);
	if (!picked) throw new Error("没有选择笔记，已取消");
	return picked;
}

function chooseImage(preset) {
	if (preset) return path.resolve(preset);
	console.log("请在弹出的窗口里选择文章封面图");
	const picked = pickFile(
		"选择文章界面图片",
		"图片 (*.png;*.jpg;*.jpeg;*.webp;*.gif;*.avif)|*.png;*.jpg;*.jpeg;*.webp;*.gif;*.avif",
	);
	return picked ? picked : "";
}

function normalizeTags(value) {
	if (Array.isArray(value)) {
		return value.map((tag) => String(tag).trim()).filter(Boolean);
	}
	if (typeof value === "string") {
		return value
			.split(/[,，]/)
			.map((tag) => tag.trim())
			.filter(Boolean);
	}
	return [];
}

function firstHeading(body) {
	const match = body.match(/^#\s+(.+)$/m);
	return match ? match[1].trim() : "";
}

function excerpt(body) {
	const chunks = [];
	for (const line of body.replaceAll("\r\n", "\n").split("\n")) {
		const text = line.trim();
		if (!text) {
			if (chunks.length > 0) break;
			continue;
		}
		if (/^#{1,6}\s/.test(text) || text.startsWith("```") || text.startsWith("!")) {
			continue;
		}
		chunks.push(text.replace(/[*_`]/g, ""));
		if (chunks.join("").length >= 80) break;
	}
	let text = chunks.join(" ").replace(/\s+/g, " ").trim();
	if (text.length > 80) text = `${text.slice(0, 80).trim()}…`;
	return text;
}

function yamlValue(value) {
	const text = String(value);
	if (text === "") return '""';
	if (/[:#{}[\],&*!|>'"%@`]|^\s|\s$/.test(text) || text.includes("\n")) {
		return JSON.stringify(text);
	}
	return text;
}

function buildFrontmatter({ title, published, description, image, tags, category }) {
	const tagsBlock =
		tags.length > 0
			? `tags:\n${tags.map((tag) => `  - ${yamlValue(tag)}`).join("\n")}`
			: "tags: []";
	return `---
title: ${yamlValue(title)}
published: ${published}
description: ${yamlValue(description)}
image: ${yamlValue(image)}
${tagsBlock}
category: ${yamlValue(category)}
draft: false
---`;
}

function safeFileName(name) {
	const cleaned = name
		.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/[. ]+$/g, "");
	return (cleaned || "untitled").slice(0, 80);
}

function findBeside(sourceDir, relativeName) {
	const candidates = [
		path.resolve(sourceDir, relativeName),
		path.resolve(sourceDir, "attachments", relativeName),
		path.resolve(sourceDir, "assets", relativeName),
		path.resolve(sourceDir, path.basename(relativeName)),
	];
	return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function copyBodyImages(body, sourceDir, targetDir) {
	const warnings = [];
	const imagesDir = path.join(targetDir, "images");
	const rewritten = body.replace(
		/!\[\[([^\]|#]+)(?:\|([^\]]*))?\]\]/g,
		(full, target, alt) => {
			const name = target.trim();
			if (!IMAGE_EXT.test(name)) return full;
			const found = findBeside(sourceDir, name);
			if (!found) {
				warnings.push(name);
				return full;
			}
			fs.mkdirSync(imagesDir, { recursive: true });
			const base = path.basename(found);
			fs.copyFileSync(found, path.join(imagesDir, base));
			const label = alt?.trim() || path.parse(base).name;
			return `![${label}](./images/${base})`;
		},
	);
	return { body: rewritten, warnings };
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const category = await chooseCategory(args.category);
	const markdownPath = chooseMarkdown(args.file);
	if (!fs.existsSync(markdownPath) || !markdownPath.toLowerCase().endsWith(".md")) {
		throw new Error(`找不到 Markdown 笔记：${markdownPath}`);
	}
	if (path.resolve(markdownPath).startsWith(POSTS_DIR)) {
		throw new Error("请选择 Obsidian 里的笔记，不要选网站目录里已经发布的文件");
	}

	const raw = fs.readFileSync(markdownPath, "utf8");
	const parsed = matter(raw);
	const detectedTitle =
		(typeof parsed.data.title === "string" && parsed.data.title.trim()) ||
		firstHeading(parsed.content) ||
		path.parse(markdownPath).name;
	const title = args.title || (args.yes ? detectedTitle : (await ask(`标题 [${detectedTitle}]：`)) || detectedTitle);
	const published =
		args.date || (args.yes ? today() : (await ask(`发布日期 [${today()}]：`)) || today());
	if (!/^\d{4}-\d{2}-\d{2}$/.test(published)) {
		throw new Error("日期需要写成 2026-10-13 这种格式");
	}

	let imagePath = chooseImage(args.image);
	if (!imagePath && !args.yes) {
		const again = await ask("没有选择封面。输入 r 重新选择，直接回车则不设置封面：");
		if (again.toLowerCase() === "r") imagePath = chooseImage();
	}
	if (imagePath) {
		if (!fs.existsSync(imagePath) || !IMAGE_EXT.test(imagePath)) {
			throw new Error("封面需要是 png、jpg、webp、gif 或 avif 图片");
		}
	}

	console.log("\n即将发布：");
	console.log(`  标题：${title}`);
	console.log(`  分块：${category}`);
	console.log(`  日期：${published}`);
	console.log(`  笔记：${markdownPath}`);
	console.log(`  封面：${imagePath || "（无）"}`);
	if (!args.yes) {
		const confirm = (await ask("确认发布？[Y/n] ")).toLowerCase();
		if (confirm === "n" || confirm === "no") {
			console.log("已取消");
			return;
		}
	}

	const result = publishNote({
		category,
		title,
		published,
		markdown: raw,
		imagePath,
		sourceDir: path.dirname(markdownPath),
	});
	console.log(`  写入：${result.relativeFile}`);
	console.log("\n已发布到博客。");
	console.log(`本地预览：http://localhost:4321${result.urlPath}`);
	console.log("线上页面要等这次文件推送到 GitHub 之后，才会出现在 https://moonxin.cn");
	if (result.warnings.length > 0) {
		console.log("这些 Obsidian 图片没有找到，正文里仍保留原写法：");
		for (const name of result.warnings) console.log(`  - ${name}`);
	}
}

export function publishNote({
	category,
	title,
	published,
	markdown,
	imagePath,
	imageBuffer,
	imageName,
	sourceDir,
}) {
	const normalizedCategory = normalizeCategory(category);
	const safeTitle = String(title || "").trim();
	if (!safeTitle) throw new Error("请填写标题");
	if (!/^\d{4}-\d{2}-\d{2}$/.test(String(published || ""))) {
		throw new Error("日期需要写成 2026-10-13 这种格式");
	}
	if (typeof markdown !== "string" || !markdown.trim()) {
		throw new Error("笔记是空的");
	}

	let coverName = "";
	if (imagePath) {
		if (!fs.existsSync(imagePath) || !IMAGE_EXT.test(imagePath)) {
			throw new Error("封面需要是 png、jpg、webp、gif 或 avif 图片");
		}
		coverName = `cover${path.extname(imagePath).toLowerCase()}`;
	} else if (imageBuffer) {
		const name = String(imageName || "");
		if (!IMAGE_EXT.test(name)) {
			throw new Error("封面需要是 png、jpg、webp、gif 或 avif 图片");
		}
		coverName = `cover${path.extname(name).toLowerCase()}`;
	}

	const parsed = matter(markdown);
	const fileName = `${safeFileName(safeTitle)}.md`;
	const targetDir = path.join(POSTS_DIR, ...normalizedCategory.split("/"));
	const targetFile = path.resolve(targetDir, fileName);
	const relativeToPosts = path.relative(POSTS_DIR, targetFile);
	if (relativeToPosts.startsWith("..") || path.isAbsolute(relativeToPosts)) {
		throw new Error("分块无效");
	}
	if (fs.existsSync(targetFile)) {
		throw new Error(`这个标题在「${normalizedCategory}」里已经有一篇：${fileName}`);
	}

	fs.mkdirSync(targetDir, { recursive: true });
	const copied = sourceDir
		? copyBodyImages(parsed.content, sourceDir, targetDir)
		: noteMissingEmbeds(parsed.content);
	if (imagePath) {
		fs.copyFileSync(imagePath, path.join(targetDir, coverName));
	} else if (imageBuffer) {
		fs.writeFileSync(path.join(targetDir, coverName), imageBuffer);
	}

	const description =
		(typeof parsed.data.description === "string" && parsed.data.description.trim()) ||
		excerpt(copied.body);
	const outputFile = `${buildFrontmatter({
		title: safeTitle,
		published,
		description,
		image: coverName ? `./${coverName}` : "",
		tags: normalizeTags(parsed.data.tags),
		category: normalizedCategory,
	})}\n${copied.body.trimStart()}\n`;
	fs.writeFileSync(targetFile, outputFile, "utf8");

	const urlPath = `/posts/${[...normalizedCategory.split("/"), safeFileName(safeTitle)].map(encodeURIComponent).join("/")}/`;
	return {
		urlPath,
		relativeFile: path.relative(ROOT, targetFile),
		warnings: copied.warnings,
	};
}

function noteMissingEmbeds(body) {
	const warnings = [];
	body.replace(/!\[\[([^\]|#]+)/g, (_full, target) => {
		const name = target.trim();
		if (IMAGE_EXT.test(name)) warnings.push(name);
		return _full;
	});
	return { body, warnings };
}

const isCli =
	process.argv[1] &&
	path.resolve(process.argv[1]).toLowerCase() ===
		fileURLToPath(import.meta.url).toLowerCase();

if (isCli) {
	rl = readline.createInterface({ input, output });
	main()
		.catch((error) => {
			console.error(`\n${error instanceof Error ? error.message : error}`);
			process.exitCode = 1;
		})
		.finally(() => {
			rl.close();
		});
}
