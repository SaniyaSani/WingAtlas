/*
 * GitHub Pages serves EntoWing from a sub-folder (https://<user>.github.io/<repo>/), but the app
 * refers to its local files with root paths such as "/reference-wings/x.svg" (correct on the
 * ChatGPT Sites host). This shim, loaded only by the GitHub Pages entry, prefixes those paths
 * with the folder the page is served from. It touches nothing else.
 */
const BASE = new URL(".", document.baseURI).pathname.replace(/\/$/, ""); // "" at a domain root, "/WingAtlas" on Pages
const LOCAL = /^\/(reference-wings|plate-vectors|plate-reviews|journal|fonts|idlab-benchmark\.json|favicon\.svg|file\.svg|globe\.svg|window\.svg)(\/|$|\?|#)/;

export function withBase(value: string) {
  return BASE && LOCAL.test(value) && !value.startsWith(BASE + "/") ? BASE + value : value;
}

if (BASE) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => originalFetch(typeof input === "string" ? withBase(input) : input, init)) as typeof window.fetch;

  const originalSetAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function setAttribute(name: string, value: string) {
    if ((name === "src" || name === "href" || name === "xlink:href") && typeof value === "string") value = withBase(value);
    return originalSetAttribute.call(this, name, value);
  };
  const originalSetAttributeNS = Element.prototype.setAttributeNS;
  Element.prototype.setAttributeNS = function setAttributeNS(namespace: string | null, name: string, value: string) {
    if ((name === "href" || name === "xlink:href") && typeof value === "string") value = withBase(value);
    return originalSetAttributeNS.call(this, namespace, name, value);
  };

  const imageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src");
  if (imageSrc?.set) {
    Object.defineProperty(HTMLImageElement.prototype, "src", {
      ...imageSrc,
      set(value: string) { imageSrc.set!.call(this, typeof value === "string" ? withBase(value) : value); },
    });
  }
  const anchorHref = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, "href");
  if (anchorHref?.set) {
    Object.defineProperty(HTMLAnchorElement.prototype, "href", {
      ...anchorHref,
      set(value: string) { anchorHref.set!.call(this, typeof value === "string" ? withBase(value) : value); },
    });
  }
}
