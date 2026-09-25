import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import hljs from "highlight.js";
import { pathToSlug } from "./docs";
import { link } from "./routes";

// Lazy-loaded mermaid; only needed when a `mermaid` fence is present.
let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      m.default.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: 'ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif',
      });
      return m.default;
    });
  }
  return mermaidPromise;
}

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
  breaks: false,
  highlight(code: string, lang: string): string {
    if (lang === "mermaid") {
      // Pass through; renderer-side hook converts to <div class="mermaid">.
      const esc = md.utils.escapeHtml(code);
      return `<pre class="mermaid-source" data-mermaid="${encodeURIComponent(code)}"><code>${esc}</code></pre>`;
    }
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(code, { language: lang, ignoreIllegals: true }).value +
          "</code></pre>"
        );
      } catch {
        /* fall through */
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(code) + "</code></pre>";
  },
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/đ/g, "d")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

md.use(anchor, {
  permalink: anchor.permalink.linkInsideHeader({
    symbol: "#",
    placement: "before",
    class: "header-anchor",
  }),
  slugify,
});

// Rewrite internal links: relative .md paths -> site routes when known.
const defaultLinkRender =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const hrefIdx = token.attrIndex("href");
  if (hrefIdx >= 0) {
    const href = token.attrs![hrefIdx][1];
    const rewritten = rewriteHref(href, env?.docPath as string | undefined);
    token.attrs![hrefIdx][1] = rewritten;
    if (/^https?:\/\//.test(rewritten)) {
      const tgtIdx = token.attrIndex("target");
      if (tgtIdx < 0) {
        token.attrPush(["target", "_blank"]);
        token.attrPush(["rel", "noopener"]);
      }
    }
  }
  return defaultLinkRender(tokens, idx, options, env, self);
};

const REPO_BLOB = "https://github.com/stepanic/stadion-maksimir-natjecaj-2026/blob/main";

function rewriteHref(href: string, docPath?: string): string {
  if (!href) return href;
  // External, mailto — leave alone.
  if (/^(https?:|mailto:)/.test(href)) return href;
  // Sidro unutar dokumenta vodi na istu stranicu dokumenta (link() zna oblik rute).
  if (href.startsWith("#")) {
    const slug = docPath ? pathToSlug[normalizePath(docPath)] : undefined;
    // GitHub sidra zadržavaju dijakritike (#tko-što-vidi); ovdje ih slugify skida kao i u naslovima.
    const id = slugify(decodeURIComponent(href.slice(1)));
    return slug ? link(`${slug}#${id}`) : `#${id}`;
  }

  // Strip URL fragment, remember it for re-appending.
  const [pathPartRaw, hashPart] = href.split("#");
  let pathPart = pathPartRaw;

  // Resolve relative path against the current doc's directory.
  if (docPath) {
    const baseDir = docPath.includes("/") ? docPath.replace(/\/[^/]*$/, "") + "/" : "";
    pathPart = normalizePath(baseDir + pathPart);
  } else {
    pathPart = normalizePath(pathPart);
  }

  if (pathToSlug[pathPart]) {
    const h = hashPart ? `#${hashPart}` : "";
    return link(`${pathToSlug[pathPart]}${h}`);
  }
  // Nije u manifestu (skripta, JSON, mapa…): pokaži datoteku u javnom repou.
  if (docPath && !pathPart.startsWith("..")) {
    const h = hashPart ? `#${hashPart}` : "";
    return `${REPO_BLOB}/${pathPart.replace(/\/$/, "")}${h}`;
  }
  return href;
}

function normalizePath(p: string): string {
  const parts = p.split("/");
  const out: string[] = [];
  for (const seg of parts) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      out.pop();
      continue;
    }
    out.push(seg);
  }
  return out.join("/");
}

export function renderMarkdown(source: string, docPath?: string): string {
  return md.render(source, { docPath });
}

// After mounting rendered HTML into the DOM, convert mermaid sources to diagrams.
export async function renderMermaidIn(root: HTMLElement) {
  const sources = root.querySelectorAll<HTMLElement>("pre.mermaid-source");
  if (sources.length === 0) return;
  const mermaid = await loadMermaid();
  let i = 0;
  for (const node of Array.from(sources)) {
    const code = decodeURIComponent(node.dataset.mermaid || "");
    const id = `mermaid-${Date.now()}-${i++}`;
    try {
      const { svg } = await mermaid.render(id, code);
      const wrap = document.createElement("div");
      wrap.className = "mermaid";
      wrap.innerHTML = svg;
      node.replaceWith(wrap);
    } catch (err) {
      const errBlock = document.createElement("div");
      errBlock.className = "mermaid-error";
      errBlock.innerHTML =
        `<p><strong>Mermaid render error:</strong> ${(err as Error).message}</p>` +
        `<pre>${code.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</pre>`;
      node.replaceWith(errBlock);
    }
  }
}
