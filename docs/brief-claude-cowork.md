# Brief para Claude Cowork

> **Cómo usarlo:**
> 1. En Claude Desktop, crea un **Proyecto** en Cowork llamado "Número de Vida".
> 2. Dale acceso a una carpeta de tu ordenador, por ejemplo `Documentos/NumeroDeVida`.
> 3. Pega todo lo que hay debajo de la línea como primer mensaje.
> 4. Después ve pidiéndole las tareas en orden ("Haz la tarea 1", "Ahora la tarea 2", etc.).

---

Hola. Vas a ser mi socia de contenido para un negocio digital pequeño. **Quiero empezar a vender en 7–10 días.** Lee todo antes de empezar y guarda estas reglas en la memoria del proyecto.

## Contexto

- **Producto principal (se vende ya y todo el año):** guías en PDF "Tu Número de Vida". Hay 12 versiones: del 1 al 9 más los números maestros 11, 22 y 33. Precio: 9 USD, pago único, venta en Hotmart o Gumroad.
- **Después:** compatibilidad de pareja (semana 3) y una guía de temporada "Tu Año Personal 2027" (mediados de noviembre).
- **Público:** mujeres hispanohablantes de 30 a 55 años (México, Latinoamérica, EE. UU. hispano, España). Les interesa sobre todo el amor, el dinero, la familia, la paz interior y las "señales" (números repetidos como 111 o 11:11).
- **Canal:** solo TikTok orgánico, sin anuncios. Un cuestionario web gratis de 60 segundos (lo programa otro asistente, Claude Code) da a cada persona su Número de Vida y la lleva a la tienda.

## Cómo se calcula el Número de Vida

Se suman todos los dígitos de la fecha de nacimiento completa y se reduce el resultado. Si en algún paso sale 11, 22 o 33, se detiene ahí (son números maestros).
Ejemplo: 14/03/1985 → 1+4+0+3+1+9+8+5 = 31 → 3+1 = **4**.

## Tabla de referencia (úsala en TODO para que no haya contradicciones)

| Nº | Arquetipo | Esencia | En el amor | Con el dinero (tendencia) | Color de poder |
|---|---|---|---|---|---|
| 1 | La Líder | Iniciativa, independencia | Necesita admiración y espacio | Emprender, abrir camino | Rojo |
| 2 | La Diplomática | Sensibilidad, unión | Busca armonía y ternura | Crece en alianzas | Naranja |
| 3 | La Comunicadora | Alegría, creatividad | Necesita diversión y palabras | Gana con su voz y su talento | Amarillo |
| 4 | La Constructora | Orden, constancia | Leal, necesita estabilidad | Ahorro, paso a paso | Verde |
| 5 | La Aventurera | Libertad, cambio | Necesita novedad y confianza | Ingresos variados, movimiento | Turquesa |
| 6 | La Cuidadora | Amor, familia, hogar | Entrega total, debe cuidarse a sí misma | Gana ayudando a otros | Rosa |
| 7 | La Sabia | Intuición, espiritualidad | Necesita profundidad y silencio | Gana con su conocimiento | Violeta |
| 8 | La Poderosa | Abundancia, logro | Busca una pareja a su altura | Ambición, liderazgo | Dorado |
| 9 | La Compasiva | Generosidad, sanación | Ama sin condiciones, debe soltar | Gana con propósito | Blanco |
| 11 | La Iluminadora | Intuición elevada, inspiración | Almas gemelas, conexión espiritual | Gana inspirando a otros | Plateado |
| 22 | La Maestra Constructora | Grandes proyectos | Pareja compañera de misión | Construir a lo grande | Azul marino |
| 33 | La Maestra Sanadora | Amor incondicional, guía | Ama cuidando y enseñando | Gana sirviendo | Lavanda |

(Esta tabla es la convención de nuestra marca. Úsala siempre así.)

## Reglas de estilo y de ética (obligatorias)

- Tono cálido, cercano y **esperanzador**. Tutea. Español neutro que entiendan en México y en España.
- **Nunca** meter miedo ni hacer promesas ("vas a ganar dinero", "vas a encontrar pareja"). Habla de "energía", "tendencias" y "potencial".
- **Nunca** dar consejos médicos, legales ni de inversión.
- Todo es **entretenimiento y autoconocimiento**. Pon este aviso en las guías y en la tienda.
- La marca no se presenta como vidente real ni inventa títulos, años de experiencia o testimonios.
- Frases cortas y letra grande en todo lo visual. El público tiene más de 30 años.

## Tareas (hazlas en este orden y guarda todo en la carpeta)

### Tarea 1 — Marca (día 1) → `01-marca/`
- 10 nombres de marca cortos en español. **No los ates a un año concreto** porque el negocio es para todo el año. Comprueba si parecen libres en TikTok e Instagram.
- Para los 3 mejores: biografía de TikTok (80 caracteres o menos), paleta de colores (valores HEX), 2 tipografías de Google Fonts y la personalidad de la voz de la marca.
- **Espera a que yo elija antes de seguir.**

### Tarea 2 — 10 guiones para empezar a publicar YA (día 1) → `05-contenido/arranque.md`
- 10 guiones para mis primeros vídeos, aunque la guía todavía no esté a la venta. Mismo formato que la Tarea 6.
- Llamada a la acción: "comenta tu fecha y te digo tu número" o "sígueme para ver el tuyo".

### Tarea 3 — La guía del número 1 para aprobar (días 1–2) → `03-guias/`
Unas 15 páginas, en un Word (.docx) editable y en un PDF final con diseño:
1. Portada: "Tu Número de Vida [N] · [Arquetipo]" + marca.
2. Carta de bienvenida (media página).
3. Tu esencia: quién eres según tu número.
4. Tus dones y tus sombras (con cariño, sin juzgar).
5. Amor y pareja (con qué números fluyes mejor y con cuáles aprendes más).
6. Dinero y vocación (tendencias y talentos, sin promesas ni consejos de inversión).
7. Familia y relaciones.
8. Tu lado espiritual: tus números repetidos, tu color de poder y un ritual de luna llena.
9. 12 afirmaciones personales.
10. Ejercicio práctico: "Tu plan de 30 días" (un pequeño gesto al día).
11. Página final: aviso de entretenimiento y una invitación a seguir la cuenta.

**Espera a que la apruebe y después haz las 11 restantes (días 3–5).**

### Tarea 4 — Textos del cuestionario → `02-web/resultados.json`
Este archivo lo usa Claude Code en la web. Respeta **exactamente** este formato:

```json
{
  "marca": "Nombre elegido",
  "animo": {
    "estancada": "Una frase para quien se siente estancada",
    "cambio": "Una frase para quien tiene ganas de cambio",
    "cansada": "Una frase para quien está cansada",
    "ilusionada": "Una frase para quien está ilusionada"
  },
  "numeros": {
    "1": {
      "arquetipo": "La Líder",
      "teaser": "60 a 80 palabras que enganchen y dejen con ganas de más…",
      "areas": {
        "amor": "40 a 60 palabras sobre el amor para este número",
        "dinero": "40 a 60 palabras sobre dinero y trabajo",
        "paz": "40 a 60 palabras sobre paz interior",
        "familia": "40 a 60 palabras sobre la familia"
      },
      "color": "Rojo",
      "color_hex": "#C0392B",
      "texto_compartir": "Mensaje corto para WhatsApp invitando a hacer el cuestionario"
    }
  }
}
```

Incluye las 12 claves: "1" a "9", "11", "22" y "33".

### Tarea 5 — Textos de la tienda → `04-tienda/`
- Título, descripción y preguntas frecuentes de la guía (sirven para los 12 números, cambiando número y arquetipo).
- Texto de garantía y reembolso, y aviso legal de entretenimiento.
- Diseño de la portada (mockup) para la ficha de la tienda.

### Tarea 6 — Banco de contenido para TikTok → `05-contenido/`
- **60 guiones** para los próximos 30 días (2 al día). Cada guion lleva:
  - gancho (lo que se dice en los primeros 2 segundos)
  - texto en pantalla
  - lo que digo con mi voz (30–70 segundos)
  - llamada a la acción ("comenta tu número", "haz el cuestionario gratis en el enlace de mi perfil")
  - descripción del vídeo y 3–5 hashtags
  - **prompt para generar la imagen o el vídeo de fondo con IA** (estilo: celestial cálido, dorado y crema, luz de vela, elegante, sin texto en la imagen)
- Mezcla de formatos:
  - serie "Si tu Número de Vida es…" (los 12)
  - números repetidos (111, 222, 333, 11:11)
  - compatibilidad de parejas ("un 6 con un 8…")
  - "calcúlalo conmigo" con la fecha de un comentario
  - "los 3 números que…" (más fuertes, más intuitivos, más difíciles en el amor)
  - responder a comentarios
- Entrégalo en una hoja de cálculo (.xlsx) con una fila por vídeo y una columna de fecha.

### Tarea 7 (programada, cada lunes) — Revisión semanal
Crea una **tarea programada semanal**. Cada lunes te pegaré mis estadísticas de TikTok, las del cuestionario y mis ventas. Tú:
1. Dime los 3 vídeos que mejor funcionaron y **por qué** (gancho, tema, formato).
2. Dime qué no funcionó y en qué paso se pierde la gente (vídeo → perfil → cuestionario → compra).
3. Propón 14 guiones nuevos para la semana basados en lo que funcionó.
4. Avísame si aplica alguna regla de cambio: día 30 sin ningún vídeo de más de 10.000 vistas = cambiar formatos; día 45 con vistas y sin ventas = cambiar la oferta.

### Más adelante (solo cuando yo te lo pida)
- Semana 3: guía de compatibilidad de pareja.
- Mediados de noviembre: guía de temporada "Tu Año Personal 2027" con rituales de Año Nuevo según el número.

## Qué NO hacer

- No crear suscripciones, cobros recurrentes ni temporizadores falsos de "oferta que termina".
- No inventar testimonios, reseñas ni cifras de ventas.
- No usar imágenes de personas reales ni de famosos.
- No copiar textos de otras marcas.

Empieza por las **Tareas 1 y 2** a la vez.
