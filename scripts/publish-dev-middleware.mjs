import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { publishNote } from "./publish-post.js";

const require = createRequire(import.meta.url);

async function refreshContent() {
	const astroPkg = require.resolve("astro/package.json");
	const instanceUrl = pathToFileURL(
		path.join(path.dirname(astroPkg), "dist/content/instance.js"),
	).href;
	const load = new Function("url", "return import(url)");
	const { globalContentLayer } = await load(instanceUrl);
	const layer = globalContentLayer.get();
	if (!layer) return;
	await layer.sync();
}

function readBody(req, limit) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		let size = 0;
		req.on("data", (chunk) => {
			size += chunk.length;
			if (size > limit) {
				reject(new Error("文件太大，请换一张更小的封面"));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}

function publishPost(req, res, next) {
	const pathname = req.url?.split("?")[0];
	if (pathname !== "/api/publish-post" && pathname !== "/api/publish-post/") {
		next();
		return;
	}
	if (req.method !== "POST") {
		res.statusCode = 405;
		res.setHeader("content-type", "application/json; charset=utf-8");
		res.end(JSON.stringify({ error: "只接受 POST" }));
		return;
	}
	readBody(req, 12 * 1024 * 1024)
		.then(async (raw) => {
			const payload = JSON.parse(raw.toString("utf8"));
			const result = publishNote({
				category: payload.category,
				title: payload.title,
				published: payload.published,
				markdown: payload.markdown,
				imageBuffer: payload.imageBase64
					? Buffer.from(payload.imageBase64, "base64")
					: undefined,
				imageName: payload.imageName,
			});
			await refreshContent();
			res.statusCode = 200;
			res.setHeader("content-type", "application/json; charset=utf-8");
			res.end(JSON.stringify(result));
		})
		.catch((error) => {
			if (res.writableEnded) return;
			res.statusCode = 400;
			res.setHeader("content-type", "application/json; charset=utf-8");
			res.end(
				JSON.stringify({
					error: error instanceof Error ? error.message : String(error),
				}),
			);
		});
}

export function attachPublishMiddleware(server) {
	const install = () => {
		if (server.middlewares.stack.some((item) => item.handle === publishPost)) return;
		server.middlewares.stack.unshift({ route: "", handle: publishPost });
	};
	install();
	server.httpServer?.once("listening", install);
}
