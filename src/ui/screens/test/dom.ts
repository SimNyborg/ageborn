/**
 * A tiny DOM for rendering Preact components in Vitest's Node environment (no jsdom in the
 * project). It covers what Preact and the WP9 components use: elements, text, attributes, style,
 * events with bubbling, focus, and simple selectors (tag, #id, .class, [attr], [attr="v"], and
 * descendant combinations of those). Not a browser: no layout, so geometry reads as zero.
 */

type Listener = (e: FakeEvent) => void;

export class FakeEvent {
  readonly type: string;
  readonly bubbles: boolean;
  target: FakeNode | null = null;
  currentTarget: FakeNode | null = null;
  defaultPrevented = false;
  propagationStopped = false;
  key = '';
  shiftKey = false;
  constructor(type: string, init: { bubbles?: boolean; key?: string; shiftKey?: boolean } = {}) {
    this.type = type;
    this.bubbles = init.bubbles ?? true;
    this.key = init.key ?? '';
    this.shiftKey = init.shiftKey ?? false;
  }
  preventDefault(): void {
    this.defaultPrevented = true;
  }
  stopPropagation(): void {
    this.propagationStopped = true;
  }
}

export class FakeNode {
  nodeType: number;
  parentNode: FakeElement | null = null;
  childNodes: FakeNode[] = [];
  ownerDocument: FakeDocument | null = null;
  private listeners: Record<string, { fn: Listener; capture: boolean }[]> = {};

  constructor(nodeType: number) {
    this.nodeType = nodeType;
  }
  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }
  get lastChild(): FakeNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null;
  }
  get nextSibling(): FakeNode | null {
    const p = this.parentNode;
    if (!p) return null;
    return p.childNodes[p.childNodes.indexOf(this) + 1] ?? null;
  }
  get previousSibling(): FakeNode | null {
    const p = this.parentNode;
    if (!p) return null;
    return p.childNodes[p.childNodes.indexOf(this) - 1] ?? null;
  }
  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join('');
  }
  appendChild<T extends FakeNode>(c: T): T {
    return this.insertBefore(c, null);
  }
  insertBefore<T extends FakeNode>(c: T, ref: FakeNode | null): T {
    if (c.parentNode) c.parentNode.removeChild(c);
    const i = ref ? this.childNodes.indexOf(ref) : -1;
    if (i < 0) this.childNodes.push(c);
    else this.childNodes.splice(i, 0, c);
    c.parentNode = this as unknown as FakeElement;
    return c;
  }
  removeChild<T extends FakeNode>(c: T): T {
    const i = this.childNodes.indexOf(c);
    if (i >= 0) this.childNodes.splice(i, 1);
    c.parentNode = null;
    return c;
  }
  replaceChild<T extends FakeNode>(n: FakeNode, old: T): T {
    this.insertBefore(n, old);
    return this.removeChild(old);
  }
  remove(): void {
    this.parentNode?.removeChild(this);
  }
  contains(n: FakeNode | null): boolean {
    for (let x: FakeNode | null = n; x; x = x.parentNode) if (x === this) return true;
    return false;
  }
  addEventListener(type: string, fn: Listener, capture: boolean | { capture?: boolean } = false): void {
    const c = typeof capture === 'boolean' ? capture : !!capture.capture;
    (this.listeners[type] ??= []).push({ fn, capture: c });
  }
  removeEventListener(type: string, fn: Listener, capture: boolean | { capture?: boolean } = false): void {
    const c = typeof capture === 'boolean' ? capture : !!capture.capture;
    this.listeners[type] = (this.listeners[type] ?? []).filter((l) => l.fn !== fn || l.capture !== c);
  }
  /** Capture phase down the path, then target and bubble phase up (no capture on target). */
  dispatchEvent(e: FakeEvent): boolean {
    e.target = this;
    const path: FakeNode[] = [this];
    for (;;) {
      const x: FakeNode = path[path.length - 1]!;
      const up: FakeNode | null = x.parentNode ?? (x instanceof FakeElement && x.isRoot ? x.ownerDocument : null);
      if (!up) break;
      path.push(up);
    }
    for (let i = path.length - 1; i > 0 && !e.propagationStopped; i--) path[i]!.fire(e, true);
    for (let i = 0; i < path.length && !e.propagationStopped; i++) {
      path[i]!.fire(e, false);
      if (!e.bubbles) break;
    }
    return !e.defaultPrevented;
  }
  private fire(e: FakeEvent, capture: boolean): void {
    e.currentTarget = this;
    for (const l of [...(this.listeners[e.type] ?? [])]) if (l.capture === capture) l.fn.call(this, e);
  }
}

export class FakeText extends FakeNode {
  private value = '';
  constructor(data: unknown) {
    super(3);
    this.data = data as string;
  }
  get data(): string {
    return this.value;
  }
  /** Preact passes numbers too; the DOM stores strings. */
  set data(v: string) {
    this.value = String(v);
  }
  override get textContent(): string {
    return this.data;
  }
}

class FakeStyle {
  [key: string]: unknown;
  setProperty(k: string, v: string): void {
    this[k] = v;
  }
  removeProperty(k: string): void {
    delete this[k];
  }
  getPropertyValue(k: string): string {
    return String(this[k] ?? '');
  }
  set cssText(_v: string) {
    for (const k of Object.keys(this)) delete this[k];
  }
}

const EVENT_PROPS = [
  'onclick',
  'onkeydown',
  'onkeyup',
  'oninput',
  'onchange',
  'onfocus',
  'onblur',
  'onpointerdown',
  'onpointerup',
  'onmousedown',
  'onsubmit',
];

export class FakeElement extends FakeNode {
  readonly localName: string;
  readonly namespaceURI: string;
  attributes: { name: string; value: string }[] = [];
  style = new FakeStyle();
  value = '';
  checked = false;
  /** Set on the render container so events bubble to the document. */
  isRoot = false;

  constructor(tag: string, ns = 'http://www.w3.org/1999/xhtml') {
    super(1);
    this.localName = tag.toLowerCase();
    this.namespaceURI = ns;
    for (const p of EVENT_PROPS) (this as unknown as Record<string, unknown>)[p] = null;
  }
  get tagName(): string {
    return this.localName.toUpperCase();
  }
  get nodeName(): string {
    return this.tagName;
  }
  get children(): FakeElement[] {
    return this.childNodes.filter((c): c is FakeElement => c instanceof FakeElement);
  }
  get id(): string {
    return this.getAttribute('id') ?? '';
  }
  get className(): string {
    return this.getAttribute('class') ?? '';
  }
  get offsetTop(): number {
    return 0;
  }
  setAttribute(rawName: string, value: unknown): void {
    // HTML attribute names are case-insensitive (Preact sets `tabIndex`); SVG ones are not.
    const name = this.namespaceURI === 'http://www.w3.org/1999/xhtml' ? rawName.toLowerCase() : rawName;
    const v = String(value);
    const a = this.attributes.find((x) => x.name === name);
    if (a) a.value = v;
    else this.attributes.push({ name, value: v });
  }
  getAttribute(name: string): string | null {
    return this.attributes.find((x) => x.name === name)?.value ?? null;
  }
  hasAttribute(name: string): boolean {
    return this.attributes.some((x) => x.name === name);
  }
  removeAttribute(name: string): void {
    this.attributes = this.attributes.filter((x) => x.name !== name);
  }
  focus(): void {
    const doc = this.ownerDocument;
    if (!doc) return;
    const prev = doc.activeElement;
    if (prev === this) return;
    doc.activeElement = this;
    if (prev && prev instanceof FakeElement) prev.dispatchEvent(new FakeEvent('blur', { bubbles: false }));
    this.dispatchEvent(new FakeEvent('focus', { bubbles: false }));
  }
  blur(): void {
    if (this.ownerDocument?.activeElement === this) this.ownerDocument.activeElement = this.ownerDocument.body;
  }
  click(): void {
    if (this.hasAttribute('disabled')) return;
    this.dispatchEvent(new FakeEvent('click'));
  }
  getBoundingClientRect() {
    return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
  matches(selector: string): boolean {
    return selector.split(',').some((s) => matchesChain(this, s.trim()));
  }
  closest(selector: string): FakeElement | null {
    if (this.matches(selector)) return this;
    for (let x = this.parentNode; x; x = x.parentNode) if (x.matches(selector)) return x;
    return null;
  }
  querySelectorAll<T = FakeElement>(selector: string): T[] {
    const out: FakeElement[] = [];
    const walk = (n: FakeNode) => {
      for (const c of n.childNodes) {
        if (c instanceof FakeElement) {
          if (c.matches(selector)) out.push(c);
          walk(c);
        }
      }
    };
    walk(this);
    return out as unknown as T[];
  }
  querySelector<T = FakeElement>(selector: string): T | null {
    return (this.querySelectorAll<T>(selector)[0] ?? null) as T | null;
  }
}

/** One compound selector: tag#id.class[attr][attr="v"]. */
function matchesCompound(el: FakeElement, sel: string): boolean {
  const re = /([a-zA-Z][\w-]*)|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:([~^$*]?=)"?([^"\]]*)"?)?\]|:not\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  let consumed = 0;
  while ((m = re.exec(sel))) {
    consumed += m[0].length;
    if (m[1] && el.localName !== m[1].toLowerCase()) return false;
    if (m[2] && el.getAttribute('id') !== m[2]) return false;
    if (m[3] && !(el.getAttribute('class') ?? '').split(/\s+/).includes(m[3])) return false;
    if (m[4]) {
      const v = el.getAttribute(m[4]);
      if (v === null) return false;
      if (m[5] === '=' && v !== m[6]) return false;
      if (m[5] === '^=' && !v.startsWith(m[6] ?? '')) return false;
    }
    if (m[7] && matchesCompound(el, m[7])) return false;
  }
  return consumed === sel.length;
}

function matchesChain(el: FakeElement, sel: string): boolean {
  const parts = sel.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  if (!matchesCompound(el, parts[parts.length - 1]!)) return false;
  let i = parts.length - 2;
  for (let x = el.parentNode; x && i >= 0; x = x.parentNode) if (matchesCompound(x, parts[i]!)) i--;
  return i < 0;
}

export class FakeDocument extends FakeNode {
  body: FakeElement;
  activeElement: FakeElement | null;
  constructor() {
    super(9);
    this.body = this.createElement('body');
    this.body.isRoot = true;
    this.activeElement = this.body;
  }
  createElement(tag: string): FakeElement {
    const el = new FakeElement(tag);
    el.ownerDocument = this;
    return el;
  }
  createElementNS(ns: string, tag: string): FakeElement {
    const el = new FakeElement(tag, ns);
    el.ownerDocument = this;
    return el;
  }
  createTextNode(text: string): FakeText {
    const t = new FakeText(text);
    t.ownerDocument = this;
    return t;
  }
  querySelector(sel: string): FakeElement | null {
    return this.body.querySelector(sel);
  }
  querySelectorAll(sel: string): FakeElement[] {
    return this.body.querySelectorAll(sel);
  }
}

/** Installs a fresh document on `globalThis` and returns it with a container in the body. */
export function installDom(): { document: FakeDocument; container: FakeElement } {
  const document = new FakeDocument();
  (globalThis as unknown as { document: FakeDocument }).document = document;
  const container = document.createElement('div');
  document.body.appendChild(container);
  return { document, container };
}

export function keydown(target: FakeElement, key: string, o: { shiftKey?: boolean } = {}): FakeEvent {
  const e = new FakeEvent('keydown', { key, shiftKey: o.shiftKey });
  target.dispatchEvent(e);
  return e;
}

export function input(target: FakeElement, value: string): void {
  target.value = value;
  target.dispatchEvent(new FakeEvent('input'));
}

export function change(target: FakeElement, value: string): void {
  target.value = value;
  target.dispatchEvent(new FakeEvent('change'));
}

/** Visible text of an element with whitespace collapsed. */
export function text(el: FakeNode): string {
  return el.textContent.replace(/\s+/g, ' ').trim();
}

/** Every text node under `el`. */
export function textNodes(el: FakeNode): string[] {
  const out: string[] = [];
  const walk = (n: FakeNode) => {
    if (n instanceof FakeText) {
      if (n.data.trim()) out.push(n.data);
      return;
    }
    for (const c of n.childNodes) walk(c);
  };
  walk(el);
  return out;
}
