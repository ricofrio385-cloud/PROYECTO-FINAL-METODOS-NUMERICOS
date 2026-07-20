# RC NumLab — Proyecto web

Aplicación web interactiva para el trabajo final de Métodos Numéricos sobre la carga y descarga de un capacitor en un circuito RC.

## Archivos

- `index.html`: estructura principal.
- `styles.css`: diseño adaptable a celular y computadora.
- `script.js`: simulación, gráfica y métodos numéricos.
- `datos_rc.csv`: datos de prueba.

## Abrir en la computadora

Haz doble clic en `index.html`. La página funciona sin instalar programas.

## Publicar con GitHub Pages

1. Crea un repositorio nuevo en GitHub, por ejemplo `proyecto-rc-metodos-numericos`.
2. Sube los cuatro archivos manteniendo `index.html` en la raíz.
3. En el repositorio entra a **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Selecciona la rama `main`, carpeta `/ (root)` y presiona **Save**.
6. GitHub mostrará un enlace similar a:
   `https://TU-USUARIO.github.io/proyecto-rc-metodos-numericos/`

## Formato de CSV

La primera columna debe ser el tiempo en segundos y la segunda el voltaje en voltios. Se admite encabezado.

```csv
tiempo,voltaje
0,0
4,1.29
10,2.98
```

## Datos editables

Los nombres del equipo se encuentran cerca del final de `index.html`. Los datos predeterminados están al inicio de `script.js`, dentro de `PROJECT_DATA`.
