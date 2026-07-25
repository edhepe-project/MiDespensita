# MiDespensita

Tu lista de compras favorita - ¡haz que sea divertido!

## Características

- **Lista de compras** con precios y marcas
- **Comparar semanas**: ¿realmente ahorraste o solo compraste menos?
- **Predicciones**: tendencias de precio y cuándo comprar
- **Precios normalizados**: compara por litro, kg, etc.
- **Offline**: funciona sin internet
- **PWA**: se instala como app en tu celular

## Instalación

### Opción 1: Usar en tu celular (recomendado)

1. Abre https://tuousuario.github.io/midespensita
2. Toca el menú del navegador → **Agregar a pantalla de inicio**
3. ¡Listo! Tendrás MiDespensita como app nativa

### Opción 2: Ejecutar localmente

```bash
# Clonar el repositorio
git clone https://github.com/tuousuario/midespensita.git
cd midespensita

# Ejecutar servidor
python serve.py

# Abrir en navegador
http://localhost:8000
```

## Uso

1. **Productos**: Agrega los productos que compras regularmente
2. **Comprar**: Selecciona productos y registra precio, marca y tienda
3. **Precios**: Compara entre tiendas y marcas
4. **Comparar Semanas**: Analiza si realmente ahorraste
5. **Predicciones**: Ve tendencias y cuándo comprar

## Tecnologías

- HTML5, CSS3, JavaScript vanilla
- IndexedDB (Dexie.js) para almacenamiento local
- PWA con Service Worker
- Sin dependencias externas (excepto Dexie.js)

## Licencia

MIT
