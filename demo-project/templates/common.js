// Base partilhada pelos 4 modelos de cartao.
// Regra de ouro: so textContent e atributos de uma lista permitida. Nunca HTML a partir de dados.
// Os textos (botoes, rotulos, erros) vem de ../lib/textos.js, na lingua da Arena.
import { T } from '../lib/textos.js';

export const TEXTOS = T.cartao;

const ATRIBUTOS_PERMITIDOS = new Set([
  'class', 'id', 'role', 'type', 'name', 'value', 'tabindex', 'for', 'placeholder', 'title',
  'draggable', 'disabled', 'hidden', 'lang', 'autocomplete', 'spellcheck', 'maxlength', 'inputmode',
]);

// h(doc, 'button', { class: 'x', on: { click: fn }, attrs: { 'aria-pressed': 'false' } }, 'texto', filho)
export function h(doc, tag, props = {}, ...filhos) {
  const el = doc.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'on') {
      for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    } else if (k === 'text') {
      el.textContent = String(v);
    } else if (k === 'attrs') {
      for (const [a, av] of Object.entries(v)) definirAtributo(el, a, av);
    } else {
      definirAtributo(el, k, v === true ? '' : v);
    }
  }
  for (const f of filhos.flat()) {
    if (f === undefined || f === null || f === false) continue;
    el.appendChild(typeof f === 'string' || typeof f === 'number' ? doc.createTextNode(String(f)) : f);
  }
  return el;
}

function definirAtributo(el, nome, valor) {
  const ok = ATRIBUTOS_PERMITIDOS.has(nome) || /^aria-[a-z]+$/.test(nome) || /^data-[a-z][a-z0-9-]*$/.test(nome);
  if (!ok) throw new Error(TEXTOS.atributoProibido(nome));
  el.setAttribute(nome, String(valor));
}

// Normaliza respostas de texto: minusculas, sem acentos, sem espacos a mais nem pontuacao nas pontas.
export function normalizar(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[\s"'.,;:!?()[\]{}]+|[\s"'.,;:!?()[\]{}]+$/g, '');
}

const CAMPOS_OBRIGATORIOS = ['id', 'title', 'category', 'difficulty', 'prompt', 'explanation'];

export function verificarDefinicao(def, template, extra = []) {
  for (const c of [...CAMPOS_OBRIGATORIOS, ...extra]) {
    if (def[c] === undefined || def[c] === null || def[c] === '') throw new Error(TEXTOS.faltaCampo(def.id ?? '?', template, c));
  }
  if (!/^[a-z0-9-]+$/.test(def.id)) throw new Error(TEXTOS.idInvalido(def.id));
}

// Constroi o objeto do contrato (ver cards/CONTRACT.md).
export function criarCartao(template, def, { render, validate }) {
  return Object.freeze({
    id: def.id,
    title: def.title,
    category: def.category,
    difficulty: def.difficulty,
    template,
    concept: def.concept ?? '',
    explanation: def.explanation,
    render,
    validate: (answer) => {
      try {
        return validate(answer) === true;
      } catch {
        return false;
      }
    },
  });
}

// Cabecalho comum a todos os cartoes.
export function cabecalho(doc, def) {
  return h(doc, 'header', { class: 'cartao-cabecalho' },
    h(doc, 'h2', { class: 'cartao-titulo', text: def.title }),
    h(doc, 'p', { class: 'cartao-enunciado', text: def.prompt }),
  );
}

// Cenario opcional: um email, um URL, um excerto de texto ou uma conversa, sempre como texto.
export function cenario(doc, sc) {
  if (!sc) return null;
  const linhas = Array.isArray(sc.lines) ? sc.lines : [String(sc.text ?? '')];
  return h(doc, 'figure', { class: `cenario cenario-${sc.kind || 'texto'}` },
    sc.label ? h(doc, 'figcaption', { class: 'cenario-rotulo', text: sc.label }) : null,
    h(doc, 'div', { class: 'cenario-corpo' }, ...linhas.map((l) => h(doc, 'p', { class: 'cenario-linha', text: l }))),
  );
}

export function botaoConfirmar(doc, aoConfirmar) {
  return h(doc, 'button', { class: 'botao botao-principal', type: 'button', on: { click: aoConfirmar } }, TEXTOS.confirmar);
}

export function bloquear(container) {
  for (const b of container.querySelectorAll('button, input')) b.disabled = true;
}
