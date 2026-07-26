/**
 * Markdown Generator — Generates VitePress-compatible reference markdown from
 * TypeScript type definitions parsed via ts-morph.
 *
 * Emits one page per channel (common, root, session, terminal, changeset)
 * plus error-codes and a flat messages overview. Each per-channel page has
 * sections in this fixed order, only emitting sections with content:
 *
 * 1. State Types  — interfaces, type aliases, and const enums declared in
 *    the channel's `state.ts` (plus a few cross-cutting types on the common
 *    page).
 * 2. Actions      — interfaces and type aliases declared in `actions.ts`.
 * 3. Commands     — every `*Params` interface in `commands.ts` whose method
 *    appears in `CommandMap` (or carries a `@method` JSDoc tag).
 * 4. Notifications — every `*Params` interface in `notifications.ts` that
 *    appears in `ServerNotificationMap`.
 */

import {
  Project,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  EnumDeclaration,
  PropertySignature,
  VariableDeclaration,
  SourceFile,
  Node,
} from 'ts-morph';
import fs from 'fs';
import path from 'path';
import { findProtocolSourceFiles } from './find-protocol-sources.js';

const GENERATED_HEADER = '<!-- 由 types/*.ts 產生 — 請勿編輯 -->\n\n';

const GITHUB_REF = process.env.GITHUB_SHA || 'main';
const GITHUB_BASE = `https://github.com/microsoft/agent-host-protocol/blob/${GITHUB_REF}`;
const SCHEMA_BASE = '/schema';

function schemaLink(schemaFile: string): string {
  return `<a href="${SCHEMA_BASE}/${schemaFile}" target="_blank">JSON Schema: <code>${schemaFile}</code></a>\n`;
}

// ─── Type → Page Mapping ─────────────────────────────────────────────────────

/**
 * Maps a canonical source directory (under `types/`) to the doc page slug.
 * Used to build cross-page anchor links so a type declared in
 * `channels-session/state.ts` becomes `/reference/session#sessionstate`.
 */
const DIR_TO_PAGE: Record<string, string> = {
  'common': 'common',
  'channels-root': 'root',
  'channels-session': 'session',
  'channels-chat': 'chat',
  'channels-terminal': 'terminal',
  'channels-changeset': 'changeset',
  'channels-annotations': 'annotations',
  'channels-otlp': 'otlp',
};

/**
 * Files whose contained types should resolve to a non-default page. By
 * default a file's types are linked to its directory's page; entries here
 * override that (e.g. types in `common/errors.ts` link to
 * `/reference/error-codes` rather than `/reference/common`).
 */
const BASENAME_PAGE_OVERRIDE: Record<string, string> = {
  'errors.ts': 'error-codes',
};

/** Set of every known declared type name (for cross-link detection). */
let knownTypes = new Set<string>();

/** Maps each known type name to the doc page slug where it's defined. */
const typeToPage: Record<string, string> = {};

/** The page currently being generated; same-page links omit the slug. */
let currentPage = '';

/** Built lazily from `knownTypes`, longest-name-first so prefixes don't shadow. */
let knownTypesRegex: RegExp | null = null;

function isCanonicalSourceFile(sf: SourceFile): boolean {
  const dir = path.basename(path.dirname(sf.getFilePath()));
  return dir in DIR_TO_PAGE;
}

function pageForSourceFile(sf: SourceFile): string | undefined {
  const dir = path.basename(path.dirname(sf.getFilePath()));
  const dirPage = DIR_TO_PAGE[dir];
  if (!dirPage) return undefined;
  const baseName = sf.getBaseName();
  return BASENAME_PAGE_OVERRIDE[baseName] ?? dirPage;
}

function populateKnownTypes(project: Project): void {
  knownTypes = new Set<string>();
  for (const key of Object.keys(typeToPage)) delete typeToPage[key];

  for (const sf of project.getSourceFiles()) {
    if (!isCanonicalSourceFile(sf)) continue;
    const page = pageForSourceFile(sf);
    if (!page) continue;
    for (const iface of sf.getInterfaces()) {
      const name = iface.getName();
      knownTypes.add(name);
      typeToPage[name] = page;
    }
    for (const ta of sf.getTypeAliases()) {
      const name = ta.getName();
      knownTypes.add(name);
      typeToPage[name] = page;
    }
    for (const en of sf.getEnums()) {
      const name = en.getName();
      knownTypes.add(name);
      typeToPage[name] = page;
    }
  }

  const sorted = Array.from(knownTypes).sort((a, b) => b.length - a.length);
  const escaped = sorted.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  knownTypesRegex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'g');
}

function typeAnchor(name: string): string {
  return name.toLowerCase();
}

/**
 * VitePress slugifies headings like `\`root/sessionAdded\`` by lowercasing
 * and stripping non-alphanumerics. Mirror that here so cross-links land on
 * the right anchor for notification and namespaced command methods.
 */
function methodAnchor(method: string): string {
  return method.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function linkifyType(typeText: string): string {
  if (!knownTypesRegex) return typeText;
  return typeText.replace(knownTypesRegex, (match) => {
    const page = typeToPage[match];
    if (page && page !== currentPage) {
      return `[${match}](/reference/${page}#${typeAnchor(match)})`;
    }
    return `[${match}](#${typeAnchor(match)})`;
  });
}

// ─── Source Link & JSDoc Helpers ─────────────────────────────────────────────

type DocNode =
  | InterfaceDeclaration
  | TypeAliasDeclaration
  | EnumDeclaration
  | VariableDeclaration;

function renderHeading(name: string, _node: DocNode, level = 3): string {
  const hashes = '#'.repeat(level);
  return `${hashes} \`${name}\`\n`;
}

function getJsDocDescription(node: InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration): string {
  const jsDocs = node.getJsDocs();
  if (jsDocs.length === 0) return '';
  return jsDocs[0].getDescription().trim();
}

function getJsDocTag(node: InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration, tagName: string): string | undefined {
  const jsDocs = node.getJsDocs();
  for (const doc of jsDocs) {
    for (const tag of doc.getTags()) {
      if (tag.getTagName() === tagName) {
        return tag.getCommentText()?.trim();
      }
    }
  }
  return undefined;
}

function hasJsDocTag(node: InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration, tagName: string): boolean {
  return getJsDocTag(node, tagName) !== undefined;
}

function getJsDocExamples(node: InterfaceDeclaration | TypeAliasDeclaration): string[] {
  const examples: string[] = [];
  for (const doc of node.getJsDocs()) {
    for (const tag of doc.getTags()) {
      if (tag.getTagName() === 'example') {
        const text = tag.getCommentText()?.trim();
        if (text) examples.push(text);
      }
    }
  }
  return examples;
}

function getPropertyDescription(prop: PropertySignature): string {
  const jsDocs = prop.getJsDocs();
  if (jsDocs.length === 0) return '';
  return jsDocs[0].getDescription().trim();
}

function getPropertyType(prop: PropertySignature): string {
  const typeNode = prop.getTypeNode();
  if (typeNode) return typeNode.getText();
  return prop.getType().getText(prop);
}

function isOptional(prop: PropertySignature): boolean {
  return prop.hasQuestionToken();
}

function formatType(typeText: string): string {
  return typeText
    .replace(/import\([^)]+\)\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s*\|\s*/, '')
    .trim();
}

/** Strip JSDoc-style block comments (`/** ... *\/`) from a type text. */
function stripJsDocBlocks(text: string): string {
  return text.replace(/\/\*\*[\s\S]*?\*\//g, '');
}

/**
 * Pretty-print a TypeScript type that contains nested object literals into
 * multi-line form with brace-depth indentation. Used for inline anonymous
 * object types (e.g. `FileEdit.before`) that would otherwise be unreadable
 * crammed into a single cell.
 */
function prettyPrintNestedType(typeText: string): string {
  const stripped = stripJsDocBlocks(typeText).replace(/\s+/g, ' ').trim();
  let out = '';
  let depth = 0;
  const indent = (n: number) => '  '.repeat(n);

  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === '{') {
      out += '{\n' + indent(++depth);
      // Skip any whitespace immediately after the brace so we don't
      // double-indent the first property.
      while (i + 1 < stripped.length && stripped[i + 1] === ' ') i++;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
      out = out.replace(/[ \t]+$/, '');
      if (!out.endsWith('\n')) out += '\n';
      out += indent(depth) + '}';
    } else if (ch === ';' || ch === ',') {
      out += ch;
      let j = i + 1;
      while (j < stripped.length && stripped[j] === ' ') j++;
      if (j < stripped.length && stripped[j] !== '}') {
        out += '\n' + indent(depth);
        i = j - 1;
      }
    } else {
      out += ch;
    }
  }
  return out.trim();
}

/** HTML-escape `&`, `<`, `>` (and nothing else). */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Like {@link linkifyType} but emits HTML `<a>` tags. Used inside `<pre>`
 * blocks where markdown link syntax wouldn't be processed.
 */
function linkifyTypeAsHtml(typeText: string): string {
  const escaped = escapeHtml(typeText);
  if (!knownTypesRegex) return escaped;
  return escaped.replace(knownTypesRegex, (match) => {
    const page = typeToPage[match];
    const href = page && page !== currentPage
      ? `/reference/${page}#${typeAnchor(match)}`
      : `#${typeAnchor(match)}`;
    return `<a href="${href}">${match}</a>`;
  });
}

function escapeMarkdown(text: string): string {
  return text
    // Collapse paragraph breaks (blank lines) to a `<br><br>` so the cell
    // keeps visual separation without spilling onto a new markdown row.
    .replace(/\r?\n\s*\r?\n+/g, '<br><br>')
    // Soft-wrap newlines become a single space so a multi-line JSDoc
    // description renders on one logical line inside the table.
    .replace(/\r?\n+/g, ' ')
    .replace(/\|/g, '\\|')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Un-escape the `<br>` separators we introduced above (they're literal
    // HTML, not user content).
    .replace(/&lt;br&gt;/g, '<br>');
}

function escapeTypeForTable(typeText: string): string {
  const stripped = stripJsDocBlocks(typeText);
  // Nested object literal (anonymous record) → pretty-print into a `<pre>`
  // code block so the structure is readable inside a one-line table cell.
  // Cross-references are emitted as HTML `<a>` tags (markdown link syntax
  // isn't processed inside `<pre>` blocks).
  if (stripped.includes('{')) {
    const pretty = prettyPrintNestedType(stripped);
    const html = linkifyTypeAsHtml(pretty).replace(/\n/g, '&#10;');
    return `<pre><code class="language-ts">${html}</code></pre>`;
  }
  const formatted = formatType(stripped).replace(/\|/g, '\\|');
  const linked = linkifyType(formatted);
  if (linked !== formatted) {
    // Has markdown links → can't wrap the cell in backticks. Escape any
    // remaining `<`/`>` (e.g. inside `Record<string, X>`) as HTML entities so
    // Vue's template parser doesn't treat them as unclosed HTML tags.
    return linked.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  return '`' + formatted + '`';
}

// ─── Table Rendering ─────────────────────────────────────────────────────────

interface TableRow {
  field: string;
  type: string;
  required?: string;
  description: string;
}

function renderTable(rows: TableRow[], includeRequired: boolean): string {
  const lines: string[] = [];
  if (includeRequired) {
    lines.push('| 欄位 | 類型 | 必要 | 說明 |');
    lines.push('|---|---|---|---|');
    for (const row of rows) {
      lines.push(`| \`${row.field}\` | ${escapeTypeForTable(row.type)} | ${row.required || '是'} | ${escapeMarkdown(row.description)} |`);
    }
  } else {
    lines.push('| 欄位 | 類型 | 說明 |');
    lines.push('|---|---|---|');
    for (const row of rows) {
      lines.push(`| \`${row.field}\` | ${escapeTypeForTable(row.type)} | ${escapeMarkdown(row.description)} |`);
    }
  }
  return lines.join('\n');
}

function interfaceToRows(iface: InterfaceDeclaration): TableRow[] {
  return iface.getProperties().map((prop) => {
    const name = prop.getName();
    const typeText = getPropertyType(prop);
    let description = getPropertyDescription(prop);
    if (!description && (name === 'type' || name === 'kind') && typeText.startsWith("'")) {
      description = '判別欄位';
    }
    return {
      field: name,
      type: typeText,
      required: isOptional(prop) ? '否' : '是',
      description,
    };
  });
}

function hasOptionalProperties(iface: InterfaceDeclaration): boolean {
  return iface.getProperties().some((p) => isOptional(p));
}

function renderInterfaceTable(iface: InterfaceDeclaration): string {
  const rows = interfaceToRows(iface);
  const showRequired = hasOptionalProperties(iface);
  return renderTable(rows, showRequired);
}

function renderInterfaceBlock(iface: InterfaceDeclaration): string {
  const lines: string[] = [];
  lines.push(renderHeading(iface.getName(), iface));
  const desc = getJsDocDescription(iface);
  if (desc) lines.push(desc + '\n');
  if (iface.getProperties().length > 0) {
    lines.push(renderInterfaceTable(iface) + '\n');
  }
  return lines.join('\n');
}

/**
 * Render a type alias as a heading + its definition. String-literal unions
 * become a single backticked line; unions over interfaces are linkified so
 * the constituents become clickable cross-references.
 */
function renderTypeAliasBlock(ta: TypeAliasDeclaration): string {
  const lines: string[] = [];
  const name = ta.getName();
  const desc = getJsDocDescription(ta);
  const typeText = formatType(ta.getTypeNode()?.getText() || '');
  lines.push(renderHeading(name, ta));
  if (desc) lines.push(desc + '\n');
  const linkedType = linkifyType(typeText);
  if (linkedType.includes('[')) {
    // Linkified — angle brackets inside the original type (e.g. `Record<string, X>`)
    // would otherwise be parsed as unclosed HTML tags by Vue's template
    // compiler. Escape them as HTML entities.
    lines.push(linkedType.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '\n');
  } else {
    lines.push(`\`${typeText}\`\n`);
  }
  return lines.join('\n');
}

/**
 * Render a const enum as a heading + a `Member | Value` table. Each member's
 * leading JSDoc (`/** ... *\/`) becomes the description.
 */
function renderEnumBlock(en: EnumDeclaration): string {
  const lines: string[] = [];
  lines.push(renderHeading(en.getName(), en));
  const desc = getJsDocDescription(en);
  if (desc) lines.push(desc + '\n');
  const members = en.getMembers();
  if (members.length === 0) return lines.join('\n');
  const showDesc = members.some((m) => m.getJsDocs().length > 0);
  if (showDesc) {
    lines.push('| 成員 | 值 | 說明 |');
    lines.push('|---|---|---|');
  } else {
    lines.push('| 成員 | 值 |');
    lines.push('|---|---|');
  }
  for (const member of members) {
    const name = member.getName();
    const initText = member.getInitializer()?.getText() ?? '';
    // Escape pipes inside the value text so they don't terminate the table column
    const escapedInit = initText.replace(/\|/g, '\\|');
    const value = initText.length > 0 ? `\`${escapedInit}\`` : '';
    if (showDesc) {
      const memberDesc = member.getJsDocs()[0]?.getDescription().trim() ?? '';
      lines.push(`| \`${name}\` | ${value} | ${escapeMarkdown(memberDesc)} |`);
    } else {
      lines.push(`| \`${name}\` | ${value} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

// ─── Source File Lookup ──────────────────────────────────────────────────────

function findChannelSourceFile(project: Project, dirName: string, baseName: string): SourceFile | undefined {
  for (const sf of project.getSourceFiles()) {
    if (sf.getBaseName() !== baseName) continue;
    const dir = path.basename(path.dirname(sf.getFilePath()));
    if (dir === dirName) return sf;
  }
  return undefined;
}

function getInterfaceMaybe(project: Project, name: string): InterfaceDeclaration | undefined {
  for (const sf of project.getSourceFiles()) {
    if (!isCanonicalSourceFile(sf)) continue;
    const iface = sf.getInterface(name);
    if (iface) return iface;
  }
  return undefined;
}

// ─── Registry Parsing ────────────────────────────────────────────────────────

interface RegistryEntry {
  /** JSON-RPC method name as it appears on the wire. */
  method: string;
  /** Identifier of the params interface (or full type text if it's not a bare reference). */
  paramsType: string;
  /** Identifier or text of the result type; `null` for notifications. */
  resultType: string | null;
}

/**
 * Parse a registry interface like `CommandMap` whose members each carry an
 * inline `{ params: X; result: Y }` type literal. Used to derive the wire
 * method ↔ params/result type mappings without duplicating them in tables.
 */
function parseRegistryInterface(project: Project, ifaceName: string, hasResult: boolean): RegistryEntry[] {
  const iface = getInterfaceMaybe(project, ifaceName);
  if (!iface) return [];
  const entries: RegistryEntry[] = [];
  for (const prop of iface.getProperties()) {
    const rawName = prop.getName();
    const method = rawName.replace(/^['"`]|['"`]$/g, '');
    const typeNode = prop.getTypeNode();
    if (!typeNode || !Node.isTypeLiteral(typeNode)) continue;
    let paramsType = '';
    let resultType: string | null = null;
    for (const member of typeNode.getMembers()) {
      if (!Node.isPropertySignature(member)) continue;
      const memberName = member.getName();
      const memberTypeText = member.getTypeNode()?.getText() ?? '';
      if (memberName === 'params') paramsType = memberTypeText;
      else if (memberName === 'result') resultType = memberTypeText;
    }
    if (paramsType) entries.push({ method, paramsType, resultType: hasResult ? resultType : null });
  }
  return entries;
}

// ─── Section Emitters ────────────────────────────────────────────────────────

/**
 * Emit a "State Types" section: every interface, type alias, and const enum
 * declared in the given source files, in declaration order, with cross-links
 * to other channel pages.
 */
function emitStateTypesSection(sourceFiles: SourceFile[]): string {
  const lines: string[] = [];
  for (const sf of sourceFiles) {
    for (const stmt of sf.getStatements()) {
      if (Node.isInterfaceDeclaration(stmt) && stmt.isExported()) {
        lines.push(renderInterfaceBlock(stmt));
      } else if (Node.isTypeAliasDeclaration(stmt) && stmt.isExported()) {
        lines.push(renderTypeAliasBlock(stmt));
      } else if (Node.isEnumDeclaration(stmt) && stmt.isExported()) {
        lines.push(renderEnumBlock(stmt));
      }
    }
  }
  return lines.join('\n');
}

/**
 * Emit an "Actions" section: every exported interface or type alias whose
 * name ends in `Action`. Each action is rendered with its action-type
 * discriminant value, a "Client-dispatchable" marker (if `@clientDispatchable`
 * is set), and a fields table.
 */
function emitActionsSection(sourceFiles: SourceFile[]): string {
  const lines: string[] = [];
  for (const sf of sourceFiles) {
    for (const stmt of sf.getStatements()) {
      if (Node.isInterfaceDeclaration(stmt) && stmt.isExported() && stmt.getName().endsWith('Action')) {
        lines.push(renderActionInterfaceBlock(stmt));
      } else if (Node.isTypeAliasDeclaration(stmt) && stmt.isExported() && stmt.getName().endsWith('Action')) {
        lines.push(renderTypeAliasBlock(stmt));
      }
    }
  }
  return lines.join('\n');
}

function renderActionInterfaceBlock(iface: InterfaceDeclaration): string {
  const lines: string[] = [];
  const name = iface.getName();
  const typeValue = getActionTypeValue(iface);
  // Disambiguate variants that share an ActionType discriminant (e.g.
  // `SessionToolCallApprovedAction` and `SessionToolCallDeniedAction` both
  // use `session/toolCallConfirmed`). Append `(approved)` / `(denied)` when
  // an `approved: true|false` literal is present on the interface.
  const approvedProp = iface.getProperty('approved');
  const approvedType = approvedProp?.getTypeNode()?.getText().trim();
  const variantSuffix =
    approvedType === 'true' ? '（已核准）'
    : approvedType === 'false' ? '（已拒絕）'
    : '';
  const labelBase = typeValue ?? name;
  // Emit an explicit anchor matching the interface name so cross-links from
  // other pages (e.g. references to `SessionToolCallApprovedAction` in union
  // types) resolve, even when the heading text differs from the type name.
  if (typeValue && labelBase !== name) {
    lines.push(`<a id="${name.toLowerCase()}"></a>\n`);
  }
  const heading = `### \`${labelBase}${variantSuffix}\``;
  lines.push(heading + '\n');
  const isClientDispatchable = hasJsDocTag(iface, 'clientDispatchable');
  const desc = getJsDocDescription(iface);
  const prefix = isClientDispatchable ? '**用戶端可分派。** ' : '';
  if (desc || isClientDispatchable) lines.push(prefix + desc + '\n');
  if (iface.getProperties().length > 0) {
    lines.push(renderInterfaceTable(iface) + '\n');
  }
  return lines.join('\n');
}

/**
 * Extract the action's wire-level `type` value from a `type: ActionType.Foo`
 * property signature. Returns `undefined` for action interfaces whose type
 * isn't a simple enum reference (such as discriminated-union variants
 * `SessionToolCallApprovedAction` / `SessionToolCallDeniedAction` which both
 * use `ActionType.SessionToolCallConfirmed`; their interface name is shown
 * instead).
 */
function getActionTypeValue(iface: InterfaceDeclaration): string | undefined {
  const typeProp = iface.getProperty('type');
  if (!typeProp) return undefined;
  const typeText = typeProp.getTypeNode()?.getText() ?? '';
  // Expect `ActionType.Foo` — map to the enum member's value.
  const match = typeText.match(/^ActionType\.(\w+)$/);
  if (!match) return undefined;
  const memberName = match[1];
  const sf = iface.getSourceFile().getProject().getSourceFiles();
  for (const file of sf) {
    const en = file.getEnum('ActionType');
    if (!en) continue;
    const member = en.getMember(memberName);
    if (!member) continue;
    const initText = member.getInitializer()?.getText();
    if (initText) return initText.replace(/^['"`]|['"`]$/g, '');
  }
  return undefined;
}

/**
 * Emit a "Commands" section: every exported `*Params` interface in the given
 * source files whose method name appears in `CommandMap` (or whose JSDoc
 * carries `@method`). Each entry renders the direction/type, parameters
 * table, and a result table looked up from the registry.
 */
function emitCommandsSection(project: Project, sourceFiles: SourceFile[]): string {
  const commandMap = parseRegistryInterface(project, 'CommandMap', true);
  const methodByParams = new Map<string, RegistryEntry>();
  for (const entry of commandMap) methodByParams.set(entry.paramsType, entry);

  // Client → Server notification methods that also live in commands.ts
  // (subscribe/unsubscribe/dispatchAction). They have no result.
  const clientNotificationMap = parseRegistryInterface(project, 'ClientNotificationMap', false);
  for (const entry of clientNotificationMap) {
    if (!methodByParams.has(entry.paramsType)) methodByParams.set(entry.paramsType, entry);
  }

  const lines: string[] = [];
  for (const sf of sourceFiles) {
    for (const stmt of sf.getStatements()) {
      if (!Node.isInterfaceDeclaration(stmt) || !stmt.isExported()) continue;
      const name = stmt.getName();
      const entry = methodByParams.get(name);
      // Fallback: any *Params interface with a @method tag we missed.
      if (!entry) {
        if (!name.endsWith('Params')) continue;
        const method = getJsDocTag(stmt, 'method');
        if (!method) continue;
        lines.push(emitCommandBlock(project, { method, paramsType: name, resultType: null }, stmt));
        continue;
      }
      lines.push(emitCommandBlock(project, entry, stmt));
    }
  }
  return lines.join('\n');
}

function emitCommandBlock(project: Project, entry: RegistryEntry, paramsIface: InterfaceDeclaration): string {
  const lines: string[] = [];
  const desc = getJsDocDescription(paramsIface);
  const direction = getJsDocTag(paramsIface, 'direction') || '用戶端 → 伺服器';
  const messageType = getJsDocTag(paramsIface, 'messageType') || 'Request';
  const messageTypeLabel = messageType === 'Request' ? '請求'
    : messageType === 'Notification' ? '通知'
    : messageType === 'Response' ? '回應'
    : messageType;

  lines.push(`## \`${entry.method}\`\n`);
  if (desc) lines.push(desc + '\n');
  lines.push('| 屬性 | 值 |');
  lines.push('|---|---|');
  lines.push(`| 方向 | ${direction} |`);
  lines.push(`| 類型 | ${messageTypeLabel} |\n`);

  lines.push('**參數：**\n');
  if (paramsIface.getProperties().length > 0) {
    lines.push(renderInterfaceTable(paramsIface) + '\n');
  } else {
    lines.push('_無參數。_\n');
  }

  // Result handling
  if (entry.method === 'reconnect') {
    const replay = getInterfaceMaybe(project, 'ReconnectReplayResult');
    const snapshot = getInterfaceMaybe(project, 'ReconnectSnapshotResult');
    if (replay) {
      lines.push('**結果（重播）：** 當伺服器可從請求的序列重播時：\n');
      lines.push(renderInterfaceTable(replay) + '\n');
    }
    if (snapshot) {
      lines.push('**結果（快照）：** 當間距超過重播緩衝區時：\n');
      lines.push(renderInterfaceTable(snapshot) + '\n');
    }
  } else if (entry.resultType) {
    const t = entry.resultType.trim();
    if (t === 'null') {
      lines.push('**結果：** 成功時為 `null`。\n');
    } else {
      const resultIface = getInterfaceMaybe(project, t);
      if (resultIface) {
        lines.push('**結果：**\n');
        if (resultIface.getProperties().length > 0) {
          lines.push(renderInterfaceTable(resultIface) + '\n');
        } else {
          lines.push('_（空物件）_\n');
        }
      } else {
        // Fallback: render type as code
        lines.push(`**結果：** ${escapeTypeForTable(t)}\n`);
      }
    }
  } else if (messageType !== 'Notification') {
    lines.push('**結果：** 成功時為 `null`。\n');
  }

  // @see link
  const seeTag = getJsDocTag(paramsIface, 'see');
  if (seeTag) {
    const seeMatch = seeTag.match(/\{@link\s+([^|}]+)(?:\|([^}]+))?\}/);
    if (seeMatch) {
      const target = seeMatch[1].trim();
      const label = (seeMatch[2] ?? target).trim();
      lines.push(`詳見 [${label}](${target})。\n`);
    }
  }

  // @example blocks
  const examples = getJsDocExamples(paramsIface);
  for (const example of examples) {
    lines.push('**範例：**\n');
    lines.push(example + '\n');
  }

  lines.push('---\n');
  return lines.join('\n');
}

/**
 * Emit a "Notifications" section: every exported `*Params` interface in the
 * given source files whose method name appears in `ServerNotificationMap`.
 * Each entry renders the direction/type, fields table, and any `@example`
 * blocks attached to the params interface.
 */
function emitNotificationsSection(project: Project, sourceFiles: SourceFile[]): string {
  const serverNotifMap = parseRegistryInterface(project, 'ServerNotificationMap', false);
  const methodByParams = new Map<string, RegistryEntry>();
  for (const entry of serverNotifMap) methodByParams.set(entry.paramsType, entry);

  const lines: string[] = [];
  for (const sf of sourceFiles) {
    for (const stmt of sf.getStatements()) {
      if (!Node.isInterfaceDeclaration(stmt) || !stmt.isExported()) continue;
      const name = stmt.getName();
      const entry = methodByParams.get(name);
      if (!entry) continue;
      lines.push(emitNotificationBlock(entry, stmt));
    }
  }
  return lines.join('\n');
}

function emitNotificationBlock(entry: RegistryEntry, paramsIface: InterfaceDeclaration): string {
  const lines: string[] = [];
  const desc = getJsDocDescription(paramsIface);
  const direction = getJsDocTag(paramsIface, 'direction') || '伺服器 → 用戶端';
  const messageType = getJsDocTag(paramsIface, 'messageType') || 'Notification';
  const messageTypeLabel = messageType === 'Request' ? '請求'
    : messageType === 'Notification' ? '通知'
    : messageType === 'Response' ? '回應'
    : messageType;

  lines.push(`### \`${entry.method}\`\n`);
  if (desc) lines.push(desc + '\n');
  lines.push('| 屬性 | 值 |');
  lines.push('|---|---|');
  lines.push(`| 方向 | ${direction} |`);
  lines.push(`| 類型 | ${messageTypeLabel} |\n`);

  if (paramsIface.getProperties().length > 0) {
    lines.push('**參數：**\n');
    lines.push(renderInterfaceTable(paramsIface) + '\n');
  }

  for (const example of getJsDocExamples(paramsIface)) {
    lines.push('**範例：**\n');
    lines.push(example + '\n');
  }
  return lines.join('\n');
}

/**
 * Render a single interface as a code-fenced TypeScript block. Used on the
 * common page for the JSON-RPC wire-type registries (`CommandMap`,
 * `ServerCommandMap`, `ClientNotificationMap`, `ServerNotificationMap`)
 * where the literal definition is the most useful documentation form.
 */
function renderInterfaceCodeBlock(iface: InterfaceDeclaration): string {
  const lines: string[] = [];
  lines.push(renderHeading(iface.getName(), iface));
  const desc = getJsDocDescription(iface);
  if (desc) lines.push(desc + '\n');
  lines.push('```ts');
  lines.push(iface.getText());
  lines.push('```\n');
  return lines.join('\n');
}

// ─── Per-Channel Page Generators ─────────────────────────────────────────────

function generateCommonPage(project: Project): string {
  currentPage = 'common';
  const lines: string[] = [GENERATED_HEADER];
  lines.push('# 通用類型\n');
  lines.push('跨通道共用、適用於代理主機協定每個通道的橫切型別定義 — 基本別名、操作信封、基礎指令形狀、跨通道 `auth/required` 通知，以及 JSON-RPC 線路類型。\n');
  lines.push(schemaLink('state.schema.json'));

  const stateSf = findChannelSourceFile(project, 'common', 'state.ts');
  const actionsSf = findChannelSourceFile(project, 'common', 'actions.ts');
  const commandsSf = findChannelSourceFile(project, 'common', 'commands.ts');
  const notificationsSf = findChannelSourceFile(project, 'common', 'notifications.ts');
  const messagesSf = findChannelSourceFile(project, 'common', 'messages.ts');

  // ─── State Types ────────────────────────────────────────────────────────
  const stateFiles: SourceFile[] = [];
  if (stateSf) stateFiles.push(stateSf);
  if (stateFiles.length > 0) {
    lines.push('## 狀態類型\n');
    lines.push(emitStateTypesSection(stateFiles));
  }

  // ─── Action Envelope & Discriminant Enum ────────────────────────────────
  if (actionsSf) {
    lines.push('## 操作信封\n');
    lines.push('每個會變動狀態的訊息都包裝在 `ActionEnvelope` 中，並依其 `channel` 欄位路由。操作酬載的完整判別聯集為 `StateAction`；個別操作變體記錄於各通道頁面。\n');
    for (const name of ['ActionType', 'ActionOrigin', 'ActionEnvelope', 'StateAction']) {
      const iface = actionsSf.getInterface(name);
      if (iface) { lines.push(renderInterfaceBlock(iface)); continue; }
      const ta = actionsSf.getTypeAlias(name);
      if (ta) { lines.push(renderTypeAliasBlock(ta)); continue; }
      const en = actionsSf.getEnum(name);
      if (en) { lines.push(renderEnumBlock(en)); }
    }
  }

  // ─── Base Params ────────────────────────────────────────────────────────
  if (commandsSf) {
    const baseParams = commandsSf.getInterface('BaseParams');
    if (baseParams) {
      lines.push('## 基礎參數\n');
      lines.push('每個指令的 `params` 物件都會擴充 `BaseParams`，確保頂層一定帶有 `channel: URI`。\n');
      lines.push(renderInterfaceBlock(baseParams));
    }
  }

  // ─── Commands ───────────────────────────────────────────────────────────
  if (commandsSf) {
    lines.push('## 指令\n');
    lines.push('跨通道指令與通知。通道專屬指令（`createSession`、`listSessions`、`createTerminal`、`invokeChangesetOperation` 等）記錄於對應的通道頁面。\n');
    lines.push(schemaLink('commands.schema.json'));
    lines.push(emitCommandsSection(project, [commandsSf]));
  }

  // ─── Notifications ──────────────────────────────────────────────────────
  if (notificationsSf) {
    lines.push('## 通知\n');
    lines.push('通知是短暫的廣播，**不屬於**狀態樹的一部分。它們不會被 reducer 處理，也不會在重新連線時重播。每個通知都帶有頂層 `channel: URI`，用來識別其所屬的訂閱。\n');
    lines.push(schemaLink('notifications.schema.json'));
    lines.push(emitNotificationsSection(project, [notificationsSf]));
  }

  // ─── JSON-RPC Wire Types ────────────────────────────────────────────────
  if (messagesSf) {
    lines.push('## JSON-RPC 線路類型\n');
    lines.push('基礎 JSON-RPC 訊息形狀，以及驅動判別聯集包裝器的具型別登錄檔（`AhpRequest`、`AhpResponse`、`AhpClientNotification`、`AhpServerNotification`、`AhpNotification`、`ProtocolMessage`）。\n');
    for (const name of ['JsonRpcRequest', 'JsonRpcSuccessResponse', 'JsonRpcErrorResponse', 'JsonRpcNotification', 'AhpErrorResponse']) {
      const iface = messagesSf.getInterface(name);
      if (iface) lines.push(renderInterfaceBlock(iface));
    }
    lines.push('### 登錄檔\n');
    lines.push('判別聯集包裝器是以這些登錄檔介面參數化。每個屬性都是一個 JSON-RPC 方法名稱；每個值都是一個 `{ params; result? }` 型別字面值。\n');
    for (const name of ['CommandMap', 'ServerCommandMap', 'ClientNotificationMap', 'ServerNotificationMap']) {
      const iface = messagesSf.getInterface(name);
      if (iface) lines.push(renderInterfaceCodeBlock(iface));
    }
    lines.push('### 具型別包裝器\n');
    for (const name of [
      'AhpRequest', 'AhpServerRequest',
      'AhpSuccessResponse', 'AhpResponse',
      'AhpServerSuccessResponse', 'AhpServerResponse',
      'AhpClientNotification', 'AhpServerNotification', 'AhpNotification',
      'ProtocolMessage',
    ]) {
      const ta = messagesSf.getTypeAlias(name);
      if (ta) lines.push(renderTypeAliasBlock(ta));
    }
  }

  return lines.join('\n');
}

function generateRootChannelPage(project: Project): string {
  currentPage = 'root';
  const stateSf = findChannelSourceFile(project, 'channels-root', 'state.ts');
  const actionsSf = findChannelSourceFile(project, 'channels-root', 'actions.ts');
  const commandsSf = findChannelSourceFile(project, 'channels-root', 'commands.ts');
  const notificationsSf = findChannelSourceFile(project, 'channels-root', 'notifications.ts');

  const lines: string[] = [GENERATED_HEADER];
  lines.push('# 根通道\n');
  lines.push('`ahp-root://` 通道的參考資料 — 每個用戶端最先訂閱的單一主機層級通道。線路層級的概觀請參閱[根通道規格](/specification/root-channel)。\n');
  lines.push(schemaLink('state.schema.json'));

  if (stateSf) {
    lines.push('## 狀態類型\n');
    lines.push(emitStateTypesSection([stateSf]));
  }
  if (actionsSf) {
    lines.push('## 操作\n');
    lines.push('變動 `RootState`。所有根操作僅限伺服器端。\n');
    lines.push(schemaLink('actions.schema.json'));
    lines.push(emitActionsSection([actionsSf]));
  }
  if (commandsSf) {
    lines.push('## 指令\n');
    lines.push(schemaLink('commands.schema.json'));
    lines.push(emitCommandsSection(project, [commandsSf]));
  }
  if (notificationsSf) {
    lines.push('## 通知\n');
    lines.push(schemaLink('notifications.schema.json'));
    lines.push(emitNotificationsSection(project, [notificationsSf]));
  }
  return lines.join('\n');
}

function generateSessionChannelPage(project: Project): string {
  currentPage = 'session';
  const stateSf = findChannelSourceFile(project, 'channels-session', 'state.ts');
  const actionsSf = findChannelSourceFile(project, 'channels-session', 'actions.ts');
  const commandsSf = findChannelSourceFile(project, 'channels-session', 'commands.ts');

  const lines: string[] = [GENERATED_HEADER];
  lines.push('# 工作階段通道\n');
  lines.push('`ahp-session:/<uuid>` 通道的參考資料 — 每個工作階段的狀態、回合生命週期、工具呼叫狀態機、附件、待處理訊息、輸入請求，以及每個工作階段的自訂項目。線路層級的概觀請參閱[工作階段通道規格](/specification/session-channel)。\n');
  lines.push(schemaLink('state.schema.json'));

  if (stateSf) {
    lines.push('## 狀態類型\n');
    lines.push(emitStateTypesSection([stateSf]));
  }
  if (actionsSf) {
    lines.push('## 操作\n');
    lines.push('變動 `SessionState`。透過外層的 `ActionEnvelope.channel` 限定於某個工作階段 URI。\n');
    lines.push(schemaLink('actions.schema.json'));
    lines.push(emitActionsSection([actionsSf]));
  }
  if (commandsSf) {
    lines.push('## 指令\n');
    lines.push(schemaLink('commands.schema.json'));
    lines.push(emitCommandsSection(project, [commandsSf]));
  }
  return lines.join('\n');
}

function generateChatChannelPage(project: Project): string {
  currentPage = 'chat';
  const stateSf = findChannelSourceFile(project, 'channels-chat', 'state.ts');
  const actionsSf = findChannelSourceFile(project, 'channels-chat', 'actions.ts');
  const commandsSf = findChannelSourceFile(project, 'channels-chat', 'commands.ts');

  const lines: string[] = [GENERATED_HEADER];
  lines.push('# 聊天通道\n');
  lines.push('`ahp-chat:/<uuid>` 通道的參考資料 — 每個聊天的狀態、回合生命週期、工具呼叫狀態機、附件、待處理訊息與輸入請求。聊天隸屬於某個工作階段（請參閱[工作階段通道](/reference/session)）；一個工作階段可包含多個聊天。線路層級的概觀請參閱[聊天通道規格](/specification/chat-channel)。\n');
  lines.push(schemaLink('state.schema.json'));

  if (stateSf) {
    lines.push('## 狀態類型\n');
    lines.push(emitStateTypesSection([stateSf]));
  }
  if (actionsSf) {
    lines.push('## 操作\n');
    lines.push('變動 `ChatState`。透過外層的 `ActionEnvelope.channel` 限定於某個聊天 URI。\n');
    lines.push(schemaLink('actions.schema.json'));
    lines.push(emitActionsSection([actionsSf]));
  }
  if (commandsSf) {
    lines.push('## 指令\n');
    lines.push(schemaLink('commands.schema.json'));
    lines.push(emitCommandsSection(project, [commandsSf]));
  }
  return lines.join('\n');
}

function generateTerminalChannelPage(project: Project): string {
  currentPage = 'terminal';
  const stateSf = findChannelSourceFile(project, 'channels-terminal', 'state.ts');
  const actionsSf = findChannelSourceFile(project, 'channels-terminal', 'actions.ts');
  const commandsSf = findChannelSourceFile(project, 'channels-terminal', 'commands.ts');

  const lines: string[] = [GENERATED_HEADER];
  lines.push('# 終端機通道\n');
  lines.push('`ahp-terminal:/<id>` 通道的參考資料 — 可連結至用戶端及/或工作階段的長生命週期偽終端機。線路層級的概觀請參閱[終端機通道規格](/specification/terminal-channel)。\n');
  lines.push(schemaLink('state.schema.json'));

  if (stateSf) {
    lines.push('## 狀態類型\n');
    lines.push(emitStateTypesSection([stateSf]));
  }
  if (actionsSf) {
    lines.push('## 操作\n');
    lines.push('變動 `TerminalState`。透過外層的 `ActionEnvelope.channel` 限定於某個終端機 URI。\n');
    lines.push(schemaLink('actions.schema.json'));
    lines.push(emitActionsSection([actionsSf]));
  }
  if (commandsSf) {
    lines.push('## 指令\n');
    lines.push(schemaLink('commands.schema.json'));
    lines.push(emitCommandsSection(project, [commandsSf]));
  }
  return lines.join('\n');
}

function generateChangesetChannelPage(project: Project): string {
  currentPage = 'changeset';
  const stateSf = findChannelSourceFile(project, 'channels-changeset', 'state.ts');
  const actionsSf = findChannelSourceFile(project, 'channels-changeset', 'actions.ts');
  const commandsSf = findChannelSourceFile(project, 'channels-changeset', 'commands.ts');

  const lines: string[] = [GENERATED_HEADER];
  lines.push('# 變更集通道\n');
  lines.push('`ahp-changeset:/<id>` 通道的參考資料 — 伺服器端持有的檔案變更檢視（未提交、工作階段範圍、每回合等），用戶端可訂閱並對其叫用操作。模型概觀請參閱[變更集指南](/guide/changesets)。\n');
  lines.push(schemaLink('state.schema.json'));

  if (stateSf) {
    lines.push('## 狀態類型\n');
    lines.push(emitStateTypesSection([stateSf]));
  }
  if (actionsSf) {
    lines.push('## 操作\n');
    lines.push('變動 `ChangesetState`。透過外層的 `ActionEnvelope.channel` 限定於某個變更集 URI。\n');
    lines.push(schemaLink('actions.schema.json'));
    lines.push(emitActionsSection([actionsSf]));
  }
  if (commandsSf) {
    lines.push('## 指令\n');
    lines.push(schemaLink('commands.schema.json'));
    lines.push(emitCommandsSection(project, [commandsSf]));
  }
  return lines.join('\n');
}

function generateAnnotationsChannelPage(project: Project): string {
  currentPage = 'annotations';
  const stateSf = findChannelSourceFile(project, 'channels-annotations', 'state.ts');
  const actionsSf = findChannelSourceFile(project, 'channels-annotations', 'actions.ts');
  const commandsSf = findChannelSourceFile(project, 'channels-annotations', 'commands.ts');

  const lines: string[] = [GENERATED_HEADER];
  lines.push('# 註解通道\n');
  lines.push('`ahp-session:/<uuid>/annotations` 通道的參考資料 — 工作階段回合內錨定於檔案範圍的每個工作階段註解。用戶端（以及代理主機）透過分派用戶端可分派的 `annotations/*` 狀態操作來變動註解，預寫入 reducer 會在兩端對等地套用這些操作。\n');
  lines.push(schemaLink('state.schema.json'));

  if (stateSf) {
    lines.push('## 狀態類型\n');
    lines.push(emitStateTypesSection([stateSf]));
  }
  if (actionsSf) {
    lines.push('## 操作\n');
    lines.push('變動 `AnnotationsState`。透過外層的 `ActionEnvelope.channel` 限定於某個註解通道 URI。\n');
    lines.push(schemaLink('actions.schema.json'));
    lines.push(emitActionsSection([actionsSf]));
  }
  if (commandsSf) {
    lines.push('## 指令\n');
    lines.push(schemaLink('commands.schema.json'));
    lines.push(emitCommandsSection(project, [commandsSf]));
  }
  return lines.join('\n');
}

function generateOtlpChannelPage(project: Project): string {
  currentPage = 'otlp';
  const stateSf = findChannelSourceFile(project, 'channels-otlp', 'state.ts');
  const notificationsSf = findChannelSourceFile(project, 'channels-otlp', 'notifications.ts');

  const lines: string[] = [GENERATED_HEADER];
  lines.push('# 遙測通道\n');
  lines.push('`ahp-otlp:` 通道的參考資料 — 無狀態通道，以 [OTLP/JSON](https://github.com/open-telemetry/opentelemetry-proto) 有效負載的形式，將 OpenTelemetry 的日誌、追蹤與指標從代理主機傳遞給已訂閱的用戶端。線路層級的概觀（包含 URI 範本與嚴重性篩選）請參閱[遙測通道規格](/specification/telemetry-channel)。\n');
  lines.push(schemaLink('state.schema.json'));

  if (stateSf) {
    lines.push('## 狀態類型\n');
    lines.push('`ahp-otlp:` 通道為無狀態；唯一的狀態類型是主機在 `InitializeResult.telemetry` 上公告的能力描述元。\n');
    lines.push(emitStateTypesSection([stateSf]));
  }
  if (notificationsSf) {
    lines.push('## 通知\n');
    lines.push(schemaLink('notifications.schema.json'));
    lines.push(emitNotificationsSection(project, [notificationsSf]));
  }
  return lines.join('\n');
}

// ─── Error Codes Page ────────────────────────────────────────────────────────

function generateErrorCodesPage(project: Project): string {
  currentPage = 'error-codes';
  const lines: string[] = [GENERATED_HEADER];
  lines.push('# 錯誤碼\n');
  lines.push('AHP 使用 [JSON-RPC 2.0](https://www.jsonrpc.org/specification) 錯誤碼。除了標準 JSON-RPC 錯誤碼外，AHP 另在 `-32000` 到 `-32099` 的範圍內定義了應用程式專屬錯誤碼。\n');
  lines.push(schemaLink('errors.schema.json'));

  const errorsFile = findProtocolSourceFiles(project, 'errors.ts').find((sf) =>
    path.basename(path.dirname(sf.getFilePath())) === 'common',
  );
  if (!errorsFile) throw new Error('common/errors.ts not found');

  // Standard JSON-RPC Codes
  lines.push('## 標準 JSON-RPC 錯誤碼\n');
  lines.push('這些錯誤碼由 JSON-RPC 2.0 規格所定義：\n');
  lines.push('| 代碼 | 名稱 | 說明 |');
  lines.push('|---|---|---|');
  const jsonRpcCodes: Array<{ code: number; name: string; description: string }> = [
    { code: -32700, name: '剖析錯誤', description: '無效的 JSON' },
    { code: -32600, name: '無效請求', description: '不是有效的 JSON-RPC 請求' },
    { code: -32601, name: '找不到方法', description: '未知的方法名稱' },
    { code: -32602, name: '無效參數', description: '無效的方法參數' },
    { code: -32603, name: '內部錯誤', description: '未指定的伺服器錯誤' },
  ];
  for (const c of jsonRpcCodes) {
    lines.push(`| \`${c.code}\` | ${c.name} | ${c.description} |`);
  }
  lines.push('');

  // AHP Application Codes — extract from the source
  lines.push('## AHP 應用程式錯誤碼\n');
  lines.push('| 代碼 | 名稱 | 說明 |');
  lines.push('|---|---|---|');
  const ahpCodesVar = errorsFile.getVariableDeclaration('AhpErrorCodes');
  if (ahpCodesVar) {
    let initializer = ahpCodesVar.getInitializer();
    if (initializer && Node.isAsExpression(initializer)) {
      initializer = initializer.getExpression();
    }
    if (initializer && Node.isObjectLiteralExpression(initializer)) {
      for (const prop of initializer.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
          const name = prop.getName();
          const value = prop.getInitializer()?.getText();
          const fullText = prop.getFullText();
          let description = '';
          // Match single- or multi-line `/** ... */` JSDoc preceding the
          // property. Use `[\s\S]` so the body can span newlines.
          const commentMatch = fullText.match(/\/\*\*([\s\S]+?)\*\//);
          if (commentMatch) {
            description = commentMatch[1]
              .split('\n')
              .map((line) => line.replace(/^\s*\*\s?/, '').trim())
              .filter((line) => line.length > 0 && !line.startsWith('@'))
              .join(' ');
          }
          lines.push(`| \`${value}\` | \`${name}\` | ${description} |`);
        }
      }
    }
  }
  lines.push('');

  // Error Response Format
  lines.push('## 錯誤回應格式\n');
  lines.push('所有錯誤回應都遵循 JSON-RPC 2.0 的錯誤格式：\n');
  lines.push('```json');
  lines.push('{');
  lines.push('  "jsonrpc": "2.0",');
  lines.push('  "id": 1,');
  lines.push('  "error": {');
  lines.push('    "code": -32002,');
  lines.push('    "message": "沒有為提供者 \'unknown\' 註冊的代理程式",');
  lines.push('    "data": {}');
  lines.push('  }');
  lines.push('}');
  lines.push('```\n');
  lines.push('`data` 欄位為 OPTIONAL，且 MAY 包含關於該錯誤的額外結構化資訊。其形狀不由協定定義。\n');

  // Typed error-data shapes
  lines.push('## 具型別錯誤資料\n');
  lines.push('少數錯誤碼會帶有具型別的 `data` 酬載。此對應關係由 `AhpErrorDetailsMap` 捕捉；具型別的 `AhpError<C>` 聯集會依據代碼縮窄 `data`。\n');
  for (const name of ['AuthRequiredErrorData', 'PermissionDeniedErrorData', 'UnsupportedProtocolVersionErrorData', 'AhpErrorDetailsMap']) {
    const iface = errorsFile.getInterface(name);
    if (iface) lines.push(renderInterfaceBlock(iface));
  }
  for (const name of ['AhpErrorCode', 'JsonRpcErrorCode', 'AhpErrorCodeWithData', 'AhpError']) {
    const ta = errorsFile.getTypeAlias(name);
    if (ta) lines.push(renderTypeAliasBlock(ta));
  }

  // Version Introduction
  lines.push('## 版本引入\n');
  lines.push('上述所有錯誤碼皆於協定版本 **1** 引入。\n');
  return lines.join('\n');
}

// ─── Messages Page ───────────────────────────────────────────────────────────

/**
 * Pick the channel doc page for a given JSON-RPC method by inspecting the
 * source file that declares its params type. Returns `undefined` if the
 * method has no params or its params type can't be located.
 */
function pageForMethod(project: Project, paramsType: string): string | undefined {
  const iface = getInterfaceMaybe(project, paramsType);
  if (!iface) return undefined;
  return pageForSourceFile(iface.getSourceFile());
}

function generateMessagesPage(project: Project): string {
  currentPage = 'messages';
  const lines: string[] = [GENERATED_HEADER];
  lines.push('# 訊息參考\n');
  lines.push('代理主機協定中每個 JSON-RPC 方法的完整參考，依方向與類型編排。每個方法都會連結到記錄其參數與結果的通道參考頁面。\n');

  const commandMap = parseRegistryInterface(project, 'CommandMap', true);
  const serverCommandMap = parseRegistryInterface(project, 'ServerCommandMap', true);
  const clientNotifMap = parseRegistryInterface(project, 'ClientNotificationMap', false);
  const serverNotifMap = parseRegistryInterface(project, 'ServerNotificationMap', false);

  const refLink = (entry: RegistryEntry): string => {
    const page = pageForMethod(project, entry.paramsType);
    if (!page) return '_（無參數）_';
    const channelLabel = page === 'common' ? '通用'
      : page === 'root' ? '根通道'
      : page === 'session' ? '工作階段通道'
      : page === 'chat' ? '聊天通道'
      : page === 'terminal' ? '終端機通道'
      : page === 'changeset' ? '變更集通道'
      : page === 'annotations' ? '註解通道'
      : page === 'otlp' ? '遙測通道'
      : page;
    return `[${channelLabel}](/reference/${page}#${methodAnchor(entry.method)})`;
  };

  const briefDescription = (entry: RegistryEntry): string => {
    const iface = getInterfaceMaybe(project, entry.paramsType);
    if (!iface) return '';
    const desc = getJsDocDescription(iface);
    if (!desc) return '';
    // First non-empty line, stripped of trailing punctuation.
    const firstLine = desc.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
    return firstLine.replace(/[.,;:]+$/, '');
  };

  lines.push('## 用戶端 → 伺服器 請求\n');
  lines.push('帶有 `id` 且預期會收到回應的方法。伺服器端的處理常式位於「參考」欄所指示的通道頁面上。\n');
  lines.push('| 方法 | 說明 | 參考 |');
  lines.push('|---|---|---|');
  for (const entry of commandMap) {
    lines.push(`| \`${entry.method}\` | ${escapeMarkdown(briefDescription(entry))} | ${refLink(entry)} |`);
  }
  lines.push('');

  if (clientNotifMap.length > 0) {
    lines.push('## 用戶端 → 伺服器 通知\n');
    lines.push('不帶 `id` 且不預期收到回應的方法。每個通知都帶有頂層 `channel: URI`。\n');
    lines.push('| 方法 | 說明 | 參考 |');
    lines.push('|---|---|---|');
    for (const entry of clientNotifMap) {
      lines.push(`| \`${entry.method}\` | ${escapeMarkdown(briefDescription(entry))} | ${refLink(entry)} |`);
    }
    lines.push('');
  }

  if (serverCommandMap.length > 0) {
    lines.push('## 伺服器 → 用戶端 請求\n');
    lines.push('由伺服器發起、用戶端必須回應的方法。\n');
    lines.push('| 方法 | 說明 | 參考 |');
    lines.push('|---|---|---|');
    for (const entry of serverCommandMap) {
      lines.push(`| \`${entry.method}\` | ${escapeMarkdown(briefDescription(entry))} | ${refLink(entry)} |`);
    }
    lines.push('');
  }

  lines.push('## 伺服器 → 用戶端 通知\n');
  lines.push('由伺服器推送、且沒有前置請求的方法。每個通知都帶有頂層 `channel: URI`。\n');
  lines.push('| 方法 | 說明 | 參考 |');
  lines.push('|---|---|---|');
  for (const entry of serverNotifMap) {
    // `action` has params `ActionEnvelope` which lives in common/actions.ts.
    const refPage = pageForMethod(project, entry.paramsType) ?? 'common';
    const channelLabel = refPage === 'common' ? '通用'
      : refPage === 'root' ? '根通道'
      : refPage === 'session' ? '工作階段通道'
      : refPage === 'chat' ? '聊天通道'
      : refPage === 'terminal' ? '終端機通道'
      : refPage === 'changeset' ? '變更集通道'
      : refPage === 'annotations' ? '註解通道'
      : refPage === 'otlp' ? '遙測通道'
      : refPage;
    const ref = entry.method === 'action'
      ? `[通用](/reference/common#actionenvelope)`
      : `[${channelLabel}](/reference/${refPage}#${methodAnchor(entry.method)})`;
    lines.push(`| \`${entry.method}\` | ${escapeMarkdown(briefDescription(entry))} | ${ref} |`);
  }
  lines.push('');

  lines.push('## 版本引入\n');
  lines.push('上述所有訊息皆於協定版本 **1** 引入。\n');
  return lines.join('\n');
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateMarkdownDocs(project: Project, outDir: string): void {
  fs.mkdirSync(outDir, { recursive: true });

  // Single shared crawl: build the global type → page map for cross-page links.
  populateKnownTypes(project);

  const pages: Array<{ filename: string; generator: (project: Project) => string }> = [
    { filename: 'common.md', generator: generateCommonPage },
    { filename: 'root.md', generator: generateRootChannelPage },
    { filename: 'session.md', generator: generateSessionChannelPage },
    { filename: 'chat.md', generator: generateChatChannelPage },
    { filename: 'terminal.md', generator: generateTerminalChannelPage },
    { filename: 'changeset.md', generator: generateChangesetChannelPage },
    { filename: 'annotations.md', generator: generateAnnotationsChannelPage },
    { filename: 'otlp.md', generator: generateOtlpChannelPage },
    { filename: 'messages.md', generator: generateMessagesPage },
    { filename: 'error-codes.md', generator: generateErrorCodesPage },
  ];

  for (const page of pages) {
    const content = page.generator(project);
    fs.writeFileSync(path.join(outDir, page.filename), content, 'utf-8');
    console.log(`  • ${page.filename}`);
  }
}
