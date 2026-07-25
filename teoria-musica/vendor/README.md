# vendor/

Librerías de terceros copiadas al repositorio con versión congelada.
No se cargan desde CDN: el material debe seguir funcionando sin red y
dentro de varios años. Ver MUSIC_GUIDE.md §2.

| Fichero | Librería | Versión | Licencia | Origen |
|---|---|---|---|---|
| `abcjs-basic-min.js` | abcjs | 6.6.4 | MIT | `npm pack abcjs@6.6.4` → `dist/abcjs-basic-min.js` |

Actualizar una versión es un cambio explícito: hay que volver a pasar los
tests de las herramientas que la usan y comprobar visualmente que las
partituras siguen dibujándose bien.
