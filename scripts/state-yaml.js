#!/usr/bin/env node
'use strict';

// Minimal YAML round-trip utilities for Spec-Forge state.yaml files.
// Supported:
// - Objects via `key: value` and indented blocks
// - Arrays via `key: []` or `key:` + indented `- ...`
// - Scalars: null, booleans, numbers, strings (quoted or bare)
// - Comments (`# ...`) and blank lines are ignored
//
// Not supported (intentionally): anchors, complex multiline strings, flow maps,
// custom tags. The live state.yaml is expected to stay within this subset.

function isoNowNoMillis() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function stripInlineComment(line) {
  let inDouble = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') inDouble = !inDouble;
    if (ch === '#' && !inDouble) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line.trimEnd();
}

function parseScalar(raw) {
  const s = raw.trim();
  if (s === '') return '';
  if (s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === '[]') return [];
  if (s === '{}') return {};
  if (s[0] === '"' && s[s.length - 1] === '"') {
    // Very small unescape set; enough for our state files.
    return s
      .slice(1, -1)
      .replaceAll('\\"', '"')
      .replaceAll('\\\\', '\\')
      .replaceAll('\\n', '\n')
      .replaceAll('\\t', '\t');
  }
  if (/^-?\d+$/.test(s)) return Number.parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return Number.parseFloat(s);
  return s;
}

function parseYaml(yamlText) {
  const root = {};
  const stack = [{ indent: -1, kind: 'object', value: root, parent: null, key: null }];

  const lines = yamlText.split(/\r?\n/);
  for (let rawLine of lines) {
    rawLine = stripInlineComment(rawLine);
    if (!rawLine.trim()) continue;

    const indent = rawLine.match(/^\s*/)[0].length;
    const line = rawLine.trim();

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const top = stack[stack.length - 1];

    // Array item
    if (line.startsWith('- ')) {
      if (top.kind !== 'array') {
        // Convert placeholder object to array when first child is an array item.
        if (top.kind === 'object' && top.parent && top.key != null && top.parent[top.key] && typeof top.parent[top.key] === 'object' && !Array.isArray(top.parent[top.key])) {
          top.parent[top.key] = [];
          top.kind = 'array';
          top.value = top.parent[top.key];
        } else {
          throw new Error(`YAML parse error: unexpected array item at indent ${indent}`);
        }
      }

      const itemText = line.slice(2).trim();
      if (!itemText) {
        top.value.push(null);
        continue;
      }

      const kv = itemText.match(/^([^:]+):\s*(.*)$/);
      if (kv) {
        const key = kv[1].trim();
        const valueRaw = kv[2];
        const obj = {};
        obj[key] = valueRaw === '' ? {} : parseScalar(valueRaw);
        top.value.push(obj);
        // Allow additional keys for this array item on subsequent indented lines.
        stack.push({ indent, kind: 'object', value: obj, parent: top.value, key: top.value.length - 1 });
        // If the first key opened a nested block, descend into it.
        if (valueRaw === '') {
          stack.push({ indent: indent + 2, kind: 'object', value: obj[key], parent: obj, key });
        }
      } else {
        top.value.push(parseScalar(itemText));
      }
      continue;
    }

    // Key/value
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) throw new Error(`YAML parse error: expected key/value, got: ${line}`);

    const key = m[1].trim();
    const valueRaw = m[2];

    if (top.kind !== 'object') {
      throw new Error(`YAML parse error: key/value inside array requires object item`);
    }

    if (valueRaw === '') {
      // Placeholder object; may be converted to array if children are '- ' items.
      top.value[key] = {};
      stack.push({ indent, kind: 'object', value: top.value[key], parent: top.value, key });
    } else {
      top.value[key] = parseScalar(valueRaw);
    }
  }

  return root;
}

function needsQuotes(str) {
  if (str === '') return true;
  if (/[\n\r\t]/.test(str)) return true;
  if (/^\s|\s$/.test(str)) return true;
  if (str.includes('#')) return true;
  if (str.includes(':')) return true;
  if (str.startsWith('- ')) return true;
  if (['null', 'true', 'false', '[]', '{}', '~'].includes(str)) return true;
  if (/^-?\d+(\.\d+)?$/.test(str)) return true;
  return false;
}

function escapeString(str) {
  return str
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\n', '\\n')
    .replaceAll('\t', '\\t');
}

function formatScalar(v) {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    return needsQuotes(v) ? `"${escapeString(v)}"` : v;
  }
  if (Array.isArray(v)) return '[]';
  if (typeof v === 'object') return '{}';
  return `"${escapeString(String(v))}"`;
}

function dumpYaml(value, indent = 0) {
  const pad = ' '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]\n`;
    let out = '';
    for (const item of value) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        // object item
        const keys = Object.keys(item);
        if (keys.length === 0) {
          out += `${pad}- {}\n`;
          continue;
        }
        // First key inline if scalar, else start block
        const firstKey = keys[0];
        const firstVal = item[firstKey];
        if (firstVal && typeof firstVal === 'object') {
          out += `${pad}- ${firstKey}:\n`;
          out += dumpYaml(firstVal, indent + 4);
        } else {
          out += `${pad}- ${firstKey}: ${formatScalar(firstVal)}\n`;
        }
        for (const k of keys.slice(1)) {
          const v = item[k];
          if (v && typeof v === 'object') {
            out += `${pad}  ${k}:\n`;
            out += dumpYaml(v, indent + 4);
          } else {
            out += `${pad}  ${k}: ${formatScalar(v)}\n`;
          }
        }
      } else if (Array.isArray(item)) {
        out += `${pad}-\n`;
        out += dumpYaml(item, indent + 2);
      } else {
        out += `${pad}- ${formatScalar(item)}\n`;
      }
    }
    return out;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) return `${pad}{}\n`;
    let out = '';
    for (const k of keys) {
      const v = value[k];
      if (Array.isArray(v)) {
        if (v.length === 0) out += `${pad}${k}: []\n`;
        else {
          out += `${pad}${k}:\n`;
          out += dumpYaml(v, indent + 2);
        }
      } else if (v && typeof v === 'object') {
        if (Object.keys(v).length === 0) out += `${pad}${k}: {}\n`;
        else {
          out += `${pad}${k}:\n`;
          out += dumpYaml(v, indent + 2);
        }
      } else {
        out += `${pad}${k}: ${formatScalar(v)}\n`;
      }
    }
    return out;
  }

  return `${pad}${formatScalar(value)}\n`;
}

function setByDotPath(obj, dotPath, value) {
  const parts = dotPath.split('.').filter(Boolean);
  if (parts.length === 0) throw new Error('field path is required');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const seg = parts[i];
    const isIndex = /^\d+$/.test(seg);
    if (isIndex) {
      const idx = Number.parseInt(seg, 10);
      if (!Array.isArray(cur)) throw new Error(`path segment ${seg} expects array`);
      if (cur[idx] == null) cur[idx] = {};
      cur = cur[idx];
    } else {
      if (cur[seg] == null || typeof cur[seg] !== 'object') cur[seg] = {};
      cur = cur[seg];
    }
  }

  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last)) {
    const idx = Number.parseInt(last, 10);
    if (!Array.isArray(cur)) throw new Error(`path segment ${last} expects array`);
    cur[idx] = value;
    return;
  }
  cur[last] = value;
}

function getByDotPath(obj, dotPath) {
  const parts = dotPath.split('.').filter(Boolean);
  let cur = obj;
  for (const seg of parts) {
    if (cur == null) return undefined;
    if (/^\d+$/.test(seg)) {
      if (!Array.isArray(cur)) return undefined;
      cur = cur[Number.parseInt(seg, 10)];
    } else {
      cur = cur[seg];
    }
  }
  return cur;
}

function appendByDotPath(obj, dotPath, item) {
  const arr = getByDotPath(obj, dotPath);
  if (arr == null) {
    setByDotPath(obj, dotPath, []);
  } else if (!Array.isArray(arr)) {
    throw new Error(`target at ${dotPath} is not an array`);
  }
  getByDotPath(obj, dotPath).push(item);
}

module.exports = {
  isoNowNoMillis,
  parseYaml,
  dumpYaml,
  setByDotPath,
  getByDotPath,
  appendByDotPath,
};

