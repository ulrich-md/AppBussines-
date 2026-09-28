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
