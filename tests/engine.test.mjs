import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  reducir,
  numeroDeVida,
  anioPersonal,
  esFechaValida,
  calcularResultado,
  componerResultado,
  limpiarNombre,
  validarQuiz,
} from '../web/js/engine.js';

const cargarQuiz = (id) => JSON.parse(readFileSync(new URL(`../web/quizzes/${id}.json`, import.meta.url)));

test('reducir conserva los números maestros', () => {
  assert.equal(reducir(11), 11);
  assert.equal(reducir(22), 22);
  assert.equal(reducir(33), 33);
  assert.equal(reducir(44), 8);
  assert.equal(reducir(29), 11);
  assert.equal(reducir(38), 11);
  assert.equal(reducir(19), 1);
  assert.equal(reducir(7), 7);
});

test('Número de Vida: casos conocidos', () => {
  assert.equal(numeroDeVida({ dia: 14, mes: 3, anio: 1985 }), 4); // 31 → 4
  assert.equal(numeroDeVida({ dia: 1, mes: 1, anio: 2000 }), 4); // 1+1+2 = 4
  assert.equal(numeroDeVida({ dia: 29, mes: 9, anio: 1999 }), 3); // 48 → 12 → 3
  assert.equal(numeroDeVida({ dia: 11, mes: 11, anio: 1990 }), 5); // 23 → 5
  assert.equal(numeroDeVida({ dia: 29, mes: 9, anio: 1980 }), 11); // 2+9+9+1+9+8+0 = 38 → 11
});

test('Número de Vida: los 12 resultados son alcanzables y cada uno tiene un ejemplo verificado', () => {
  const ejemplos = {};
  for (let anio = 1930; anio <= 2010; anio++) {
    for (let mes = 1; mes <= 12; mes++) {
      for (let dia = 1; dia <= 31; dia++) {
        const fecha = { dia, mes, anio };
        if (!esFechaValida(fecha)) continue;
        const n = numeroDeVida(fecha);
        ejemplos[n] ??= fecha;
      }
    }
  }
  const esperados = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];
  assert.deepEqual(Object.keys(ejemplos).map(Number).sort((a, b) => a - b), esperados);

  // Comprobación manual independiente de cada ejemplo encontrado.
  for (const [n, f] of Object.entries(ejemplos)) {
    const suma = `${f.dia}${f.mes}${f.anio}`.split('').reduce((t, d) => t + Number(d), 0);
    assert.equal(reducir(suma), Number(n), `ejemplo ${f.dia}/${f.mes}/${f.anio}`);
  }
});

test('Año Personal 2027', () => {
  assert.equal(anioPersonal({ dia: 14, mes: 3, anio: 1985 }, 2027), 1); // 1+4+3+2+0+2+7 = 19 → 10 → 1
  assert.equal(anioPersonal({ dia: 29, mes: 9, anio: 1980 }, 2027), 4); // 2+9+9+2+0+2+7 = 31 → 4
});

test('fechas no válidas', () => {
  assert.equal(esFechaValida({ dia: 31, mes: 2, anio: 1990 }), false);
  assert.equal(esFechaValida({ dia: 29, mes: 2, anio: 1991 }), false);
  assert.equal(esFechaValida({ dia: 29, mes: 2, anio: 1992 }), true);
  assert.throws(() => numeroDeVida({ dia: 0, mes: 1, anio: 1990 }));
});

test('puntuación por respuestas y desempate', () => {
  const quiz = {
    calculo: { tipo: 'puntuacion', desempate: ['a', 'b'] },
    resultados: { a: {}, b: {} },
    preguntas: [
      { id: 'p1', tipo: 'opciones', opciones: [{ id: 'x', puntos: { a: 1 } }, { id: 'y', puntos: { b: 2 } }] },
      { id: 'p2', tipo: 'opciones', opciones: [{ id: 'x', puntos: { a: 1 } }, { id: 'y', puntos: { b: 1 } }] },
    ],
  };
  assert.equal(calcularResultado(quiz, { p1: 'y', p2: 'y' }), 'b');
  assert.equal(calcularResultado(quiz, { p1: 'x', p2: 'x' }), 'a');
  assert.equal(calcularResultado(quiz, { p1: 'y', p2: 'x' }), 'b'); // b=2, a=1
  // empate 1-1 → gana el primero del desempate
  quiz.preguntas[0].opciones[1].puntos = { b: 1 };
  assert.equal(calcularResultado(quiz, { p1: 'y', p2: 'x' }), 'a');
});

test('limpiarNombre', () => {
  assert.equal(limpiarNombre('  maría josé  '), 'María josé');
  assert.equal(limpiarNombre('<script>alert(1)</script>'), 'Scriptalertscript');
  assert.equal(limpiarNombre(''), '');
});

test('todos los cuestionarios están completos', () => {
  const dir = new URL('../web/quizzes/', import.meta.url);
  for (const archivo of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const quiz = JSON.parse(readFileSync(new URL(archivo, dir)));
    assert.deepEqual(validarQuiz(quiz), [], archivo);
  }
});

test('Número de Vida: cada resultado se compone con todos sus bloques', () => {
  const quiz = cargarQuiz('numero-de-vida');
  assert.deepEqual(Object.keys(quiz.resultados).sort(), ['1', '11', '2', '22', '3', '33', '4', '5', '6', '7', '8', '9']);
  const area = quiz.preguntas.find((p) => p.id === 'area');
  const animo = quiz.preguntas.find((p) => p.id === 'animo');
  const fechas = { 4: { dia: 14, mes: 3, anio: 1985 }, 3: { dia: 29, mes: 9, anio: 1999 } };
  for (const [esperado, fecha] of Object.entries(fechas)) {
    for (const a of area.opciones) {
      for (const m of animo.opciones) {
        const { id, bloques } = componerResultado(quiz, { fecha, area: a.id, animo: m.id, repetidos: 'no' });
        assert.equal(id, esperado);
        assert.ok(bloques.length >= 3, `bloques para ${id}/${a.id}/${m.id}`);
      }
    }
  }
});

test('números del nombre (pitagórico, sin acentos, ñ = n)', async () => {
  const { normalizarNombre, numeroExpresion, numeroAlma, numeroPersonalidad, primerNombre } = await import('../web/js/engine.js');
  assert.equal(normalizarNombre('  María José Núñez-Peña '), 'maria jose nunezpena');
  // vocales a,i,a,o,e,u,e,e,a = 36 → 9 · consonantes m,r,j,s,n,n,z,p,n = 45 → 9 · total 81 → 9
  assert.equal(numeroAlma('María José Núñez Peña'), 9);
  assert.equal(numeroPersonalidad('María José Núñez Peña'), 9);
  assert.equal(numeroExpresion('María José Núñez Peña'), 9);
  // "ana" → a+n+a = 1+5+1 = 7; alma a+a = 2; personalidad n = 5
  assert.equal(numeroExpresion('Ana'), 7);
  assert.equal(numeroAlma('Ana'), 2);
  assert.equal(numeroPersonalidad('Ana'), 5);
  // Conserva números maestros: "kk" → 2+2 = 4; "ss" + "t"… usamos un caso que sume 11: "ai" = 1+9 = 10 → 1; "bi" = 2+9 = 11
  assert.equal(numeroExpresion('Bi'), 11);
  assert.equal(numeroExpresion('123'), null);
  assert.equal(primerNombre('  maría josé lópez'), 'María');
});

test('meses personales y mes clave', async () => {
  const { mesPersonal, proximosMeses, mesClave, cartaNumerologica, numeroCumpleanos } = await import('../web/js/engine.js');
  const fecha = { dia: 14, mes: 3, anio: 1985 }; // año personal 2026 = 9
  assert.equal(mesPersonal(fecha, 2026, 10), 1); // 9 + 10 = 19 → 1
  assert.equal(mesPersonal(fecha, 2027, 5), 6); // año 2027 = 1 → 1 + 5 = 6
  const hoy = new Date('2026-09-28T12:00:00');
  const meses = proximosMeses(fecha, hoy);
  assert.equal(meses.length, 12);
  assert.deepEqual(meses[0], { anio: 2026, mes: 10, numero: 1 });
  assert.deepEqual(mesClave(fecha, 'amor', hoy), { anio: 2027, mes: 5, numero: 6 });
  assert.equal(mesClave(fecha, 'inexistente', hoy), null);
  assert.equal(numeroCumpleanos({ dia: 29 }), 11);
  assert.equal(numeroCumpleanos({ dia: 28 }), 1);
  const carta = cartaNumerologica(fecha, '', hoy);
  assert.equal(carta.alma, null);
  assert.equal(carta.vida, 4);
  assert.equal(carta.anio_personal, 9);
  assert.equal(carta.anio_personal_siguiente, 1);
});

test('arquetipo combinado', async () => {
  const { arquetipoCombinado } = await import('../web/js/engine.js');
  const quiz = cargarQuiz('numero-de-vida');
  assert.equal(arquetipoCombinado(quiz, { vida: 4, alma: 9 }), 'La Constructora con alma de sanadora');
  assert.equal(arquetipoCombinado(quiz, { vida: 11, alma: null }), 'La Iluminadora');
  assert.equal(Object.keys(quiz.almas).length, 12);
});
