// "Your tool" (decision D1 of Project 1): the tool the participant writes in specs/my-tool.json (a copy of
// specs/my-tool.example.json). gen.mjs validates it and generates tools/my-01/ (spec.md and tool.test.js, like the
// others), plan.mjs puts it in the plan and the shell shows it. Without specs/my-tool.json nothing changes.
//
//   readMyTool(root, specs) -> { exists, tool, errors }
//     tool    the tool in the same shape as an entry of specs/tools.json (null if there are errors)
//     errors  short messages in the project language: which field, what is wrong, an example
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const MY_TOOL_ID = 'my-01';
export const MY_TOOL_FILE = 'specs/my-tool.json';
export const MY_TOOL_EXAMPLE = 'specs/my-tool.example.json';
export const DEFAULT_CATEGORY = 'daily';
const TEMPLATES = ['calc', 'convert', 'text', 'generate'];
const TYPES = ['number', 'integer', 'text', 'multiline', 'date', 'choice', 'list'];
const OUTPUTS = ['number', 'text', 'fields', 'list'];
const FIELDS = ['title', 'concept', 'template', 'category', 'inputs', 'output', 'rules', 'examples', 'errors'];

const TEXTS = {
  pt: {
    problems: `${MY_TOOL_FILE} tem problemas:`,
    fixAndRun: 'Corrige e volta a correr: node tools/gen.mjs',
    notJson: (line, col) => `não é JSON válido: há um erro na linha ${line}, coluna ${col}. Cada texto vai entre aspas "…" e não há vírgula depois do último campo. Compara com ${MY_TOOL_EXAMPLE}.`,
    notObject: `tem de ser um objeto { … }, como em ${MY_TOOL_EXAMPLE}.`,
    missing: (f, ex) => `falta o campo "${f}" (por exemplo "${f}": ${ex}).`,
    text: (f, min, max, ex) => `o campo "${f}" tem de ser um texto com ${min} a ${max} caracteres (por exemplo "${f}": ${ex}).`,
    template: `o campo "template" tem de ser um destes: ${TEMPLATES.join(', ')} (por exemplo "template": "calc").`,
    category: (list) => `o campo "category" tem de ser um destes: ${list} (por exemplo "category": "${DEFAULT_CATEGORY}").`,
    unknown: (k) => `campo desconhecido "${k}": corrige o nome ou apaga-o (os campos são: ${FIELDS.join(', ')}).`,
    inputs: 'o campo "inputs" tem de ser uma lista de 1 a 4 entradas { "name", "type", "label" } (por exemplo "inputs": [{ "name": "minutes", "type": "integer", "label": "Minutos" }]).',
    inputName: (i) => `a entrada ${i + 1} precisa de um "name" curto, em minúsculas, letras, números ou _, diferente dos outros (por exemplo "name": "minutes").`,
    inputType: (i) => `a entrada ${i + 1} tem de ter "type" igual a um destes: ${TYPES.join(', ')}.`,
    inputLabel: (i) => `a entrada ${i + 1} precisa de um "label" com 1 a 40 caracteres (por exemplo "label": "Minutos").`,
    inputOptions: (i) => `a entrada ${i + 1} é uma escolha: precisa de "options": [{ "value": "a", "label": "…" }, …] com 2 ou mais opções.`,
    output: `o campo "output" tem de ser { "type": ${OUTPUTS.map((o) => `"${o}"`).join(', ')}, "label": "…" }; com "fields", também "fields": [{ "name": "hours", "label": "Horas" }, …].`,
    rules: 'o campo "rules" tem de ser uma lista de 1 a 6 regras em texto (por exemplo "rules": ["As horas são os minutos a dividir por 60, sem casas."]).',
    examples: 'o campo "examples" tem de ser uma lista de 2 a 5 exemplos { "in": { … }, "out": … } (por exemplo { "in": { "minutes": "125" }, "out": { "hours": 2, "minutes": 5 } }).',
    exampleIn: (i) => `o exemplo ${i + 1} precisa de "in" com as entradas em texto, só com nomes de "inputs" (por exemplo "in": { "minutes": "125" }).`,
    exampleOut: (i) => `o exemplo ${i + 1} precisa de "out" com o resultado esperado (num gerador, "seed": 1 e "check": { "length": 1 }).`,
    errors: 'o campo "errors" (opcional) tem de ser uma lista { "in": { … }, "error": "mensagem" }.',
  },
  en: {
    problems: `${MY_TOOL_FILE} has problems:`,
    fixAndRun: 'Fix them and run again: node tools/gen.mjs',
    notJson: (line, col) => `is not valid JSON: there is an error at line ${line}, column ${col}. Every text goes between quotes "…" and there is no comma after the last field. Compare it with ${MY_TOOL_EXAMPLE}.`,
    notObject: `must be an object { … }, like in ${MY_TOOL_EXAMPLE}.`,
    missing: (f, ex) => `the field "${f}" is missing (for example "${f}": ${ex}).`,
    text: (f, min, max, ex) => `the field "${f}" must be a text with ${min} to ${max} characters (for example "${f}": ${ex}).`,
    template: `the field "template" must be one of: ${TEMPLATES.join(', ')} (for example "template": "calc").`,
    category: (list) => `the field "category" must be one of: ${list} (for example "category": "${DEFAULT_CATEGORY}").`,
    unknown: (k) => `unknown field "${k}": fix its name or delete it (the fields are: ${FIELDS.join(', ')}).`,
    inputs: 'the field "inputs" must be a list of 1 to 4 inputs { "name", "type", "label" } (for example "inputs": [{ "name": "minutes", "type": "integer", "label": "Minutes" }]).',
    inputName: (i) => `input ${i + 1} needs a short "name", lower case, letters, digits or _, different from the others (for example "name": "minutes").`,
    inputType: (i) => `input ${i + 1} must have a "type" equal to one of: ${TYPES.join(', ')}.`,
    inputLabel: (i) => `input ${i + 1} needs a "label" with 1 to 40 characters (for example "label": "Minutes").`,
    inputOptions: (i) => `input ${i + 1} is a choice: it needs "options": [{ "value": "a", "label": "…" }, …] with 2 or more options.`,
    output: `the field "output" must be { "type": ${OUTPUTS.map((o) => `"${o}"`).join(', ')}, "label": "…" }; with "fields", also "fields": [{ "name": "hours", "label": "Hours" }, …].`,
    rules: 'the field "rules" must be a list of 1 to 6 rules as text (for example "rules": ["The hours are the minutes divided by 60, with no decimals."]).',
    examples: 'the field "examples" must be a list of 2 to 5 examples { "in": { … }, "out": … } (for example { "in": { "minutes": "125" }, "out": { "hours": 2, "minutes": 5 } }).',
    exampleIn: (i) => `example ${i + 1} needs "in" with the inputs as text, using only names from "inputs" (for example "in": { "minutes": "125" }).`,
    exampleOut: (i) => `example ${i + 1} needs "out" with the expected result (in a generator, "seed": 1 and "check": { "length": 1 }).`,
    errors: 'the field "errors" (optional) must be a list { "in": { … }, "error": "message" }.',
  },
};

const isText = (v, min, max) => typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;
const EX = { title: '"Minutos em horas"', concept: '"Diz quantas horas e minutos são um número de minutos."' };

function position(text, err) {
  const m = /position (\d+)/.exec(err?.message || '');
  const i = m ? Number(m[1]) : text.length;
  const before = text.slice(0, i);
  return [before.split('\n').length, i - before.lastIndexOf('\n')];
}

export function validate(t, specs, X) {
  const errors = [];
  if (!t || typeof t !== 'object' || Array.isArray(t)) return [X.notObject];
  for (const k of Object.keys(t)) if (!FIELDS.includes(k)) errors.push(X.unknown(k));
  for (const [f, min, max] of [['title', 3, 60], ['concept', 10, 240]]) {
    if (t[f] === undefined) errors.push(X.missing(f, EX[f]));
    else if (!isText(t[f], min, max)) errors.push(X.text(f, min, max, EX[f]));
  }
  if (!TEMPLATES.includes(t.template)) errors.push(X.template);
  const cats = (specs?.categories || []).map((c) => c.id);
  if (t.category !== undefined && !cats.includes(t.category)) errors.push(X.category(cats.join(', ')));
  const names = new Set();
  if (!Array.isArray(t.inputs) || t.inputs.length < 1 || t.inputs.length > 4) errors.push(X.inputs);
  else
    t.inputs.forEach((d, i) => {
      if (!d || !/^[a-z][a-z0-9_]{0,24}$/.test(d.name || '') || names.has(d.name)) errors.push(X.inputName(i));
      names.add(d?.name);
      if (!TYPES.includes(d?.type)) errors.push(X.inputType(i));
      if (!isText(d?.label, 1, 40)) errors.push(X.inputLabel(i));
      if (d?.type === 'choice' && !(Array.isArray(d.options) && d.options.length >= 2 && d.options.every((o) => typeof o?.value === 'string' && typeof o?.label === 'string'))) errors.push(X.inputOptions(i));
    });
  const o = t.output;
  if (!o || !OUTPUTS.includes(o.type) || !isText(o.label ?? (o.type === 'fields' ? 'x' : ''), 1, 40) || (o.type === 'fields' && !(Array.isArray(o.fields) && o.fields.length && o.fields.every((f) => /^[a-z][a-z0-9_]*$/.test(f?.name || '') && isText(f?.label, 1, 40))))) errors.push(X.output);
  if (!Array.isArray(t.rules) || t.rules.length < 1 || t.rules.length > 6 || !t.rules.every((r) => isText(r, 3, 300))) errors.push(X.rules);
  if (!Array.isArray(t.examples) || t.examples.length < 2 || t.examples.length > 5) errors.push(X.examples);
  else
    t.examples.forEach((ex, i) => {
      if (!ex?.in || typeof ex.in !== 'object' || Object.keys(ex.in).some((k) => !names.has(k)) || Object.values(ex.in).some((v) => typeof v !== 'string')) errors.push(X.exampleIn(i));
      if (t.template === 'generate' ? !(Number.isInteger(ex?.seed) && ex?.check) : ex?.out === undefined) errors.push(X.exampleOut(i));
    });
  if (t.errors !== undefined && !(Array.isArray(t.errors) && t.errors.every((e) => e?.in && typeof e.in === 'object' && isText(e.error, 1, 200)))) errors.push(X.errors);
  return errors;
}

export function readMyTool(root, specs) {
  const X = TEXTS[specs?.lang === 'en' ? 'en' : 'pt'];
  const f = join(root, MY_TOOL_FILE);
  if (!existsSync(f)) return { exists: false, tool: null, errors: [] };
  const text = readFileSync(f, 'utf8').replace(/^﻿/, '');
  let t;
  try {
    t = JSON.parse(text);
  } catch (e) {
    return { exists: true, tool: null, errors: [X.notJson(...position(text, e))] };
  }
  const errors = validate(t, specs, X);
  if (errors.length) return { exists: true, tool: null, errors };
  return {
    exists: true,
    errors: [],
    tool: {
      id: MY_TOOL_ID,
      category: t.category || DEFAULT_CATEGORY,
      template: t.template,
      title: t.title.trim(),
      concept: t.concept.trim(),
      inputs: t.inputs,
      output: t.output,
      rules: t.rules,
      examples: t.examples,
      errors: t.errors || [],
      mine: true,
    },
  };
}

export function myToolReport(errors, lang = 'pt') {
  const X = TEXTS[lang === 'en' ? 'en' : 'pt'];
  return [X.problems, ...errors.map((e) => `  - ${e}`), X.fixAndRun].join('\n');
}
