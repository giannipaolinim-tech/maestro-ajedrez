# Credenciales

Acá van las claves que usan los scripts de la compu (nunca la app). **El repo es público:**
esta carpeta está en `.gitignore` y git solo sube este README.

## Token de Lichess (para `scripts/explore.js`)

El explorador de aperturas de Lichess pide estar autenticado.

1. Entrá a <https://lichess.org/account/oauth/token/create>.
2. Ponele una descripción (por ejemplo «Maestro explorador») y **no marques ningún permiso**:
   el explorador solo lee datos públicos.
3. Creá el token y copialo (empieza con `lip_`). Lichess lo muestra una sola vez.
4. Creá en esta carpeta el archivo **`lichess-token.txt`** y pegá el token adentro, solo, en una línea.

Para comprobar que git no lo va a subir:

```
git check-ignore -v credenciales/lichess-token.txt
```

Tiene que mostrar la regla de `.gitignore`. Si no muestra nada, no hagas commit.

En lugar del archivo también se puede usar la variable de entorno `LICHESS_TOKEN`.
Si el token se filtra, revocalo en <https://lichess.org/account/oauth/token> y creá otro.
