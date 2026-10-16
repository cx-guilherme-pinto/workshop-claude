// DOM seguro da app: so createElement, textContent e atributos de uma lista.
// Igual ao h() de templates/common.js, mais href (so caminhos deste servidor) e aria-current.
// Nunca HTML a partir de texto.
import { T } from '/lib/textos.js';

const PERMITIDOS = new Set([
  'class', 'id', 'role', 'type', 'name', 'value', 'tabindex', 'for', 'placeholder', 'title',
  'hidden', 'disabled', 'lang', 'autocomplete', 'spellcheck', 'maxlength', 'inputmode', 'href', 'datetime',
]);

// So ligacoes internas: "#/..." ou "/..." (nunca "//outro-sitio" nem esquemas).
function hrefSeguro(v) {
  const s = String(v);
  const interno = s.startsWith('#') || (s.startsWith('/') && !s.startsWith('//'));
  if (!interno) throw new Error(T.cartao.ligacaoProibida(s));
  return s;
}

function definir(no, nome, valor) {
  const ok = PERMITIDOS.has(nome) || /^aria-[a-z]+$/.test(nome) || /^data-[a-z][a-z0-9-]*$/.test(nome);
  if (!ok) throw new Error(T.cartao.atributoProibido(nome));
  no.setAttribute(nome, nome === 'href' ? hrefSeguro(valor) : String(valor));
}

// el('a', { class: 'x', href: '#/', on: { click: fn } }, 'texto', filho)
export function el(tag, props = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'on') {
      for (const [ev, fn] of Object.entries(v)) no.addEventListener(ev, fn);
    } else if (k === 'text') {
      no.textContent = String(v);
    } else if (k === 'attrs') {
      for (const [a, av] of Object.entries(v)) if (av !== undefined && av !== null && av !== false) definir(no, a, av === true ? '' : av);
    } else {
      definir(no, k, v === true ? '' : v);
    }
  }
  juntar(no, filhos);
  return no;
}

export function juntar(no, filhos) {
  for (const f of filhos.flat(Infinity)) {
    if (f === undefined || f === null || f === false) continue;
    no.appendChild(typeof f === 'string' || typeof f === 'number' ? document.createTextNode(String(f)) : f);
  }
  return no;
}

// Reinicia uma animacao CSS (troca de estado de um quadrado, por exemplo).
export function reanimar(no, classe) {
  no.classList.remove(classe);
  void no.offsetWidth;
  no.classList.add(classe);
}

export const ID_VALIDO = /^[a-z0-9][a-z0-9-]{0,63}$/;
