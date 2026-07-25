// Utilidades de unidades de medida
window.APP_Units = {
  // Convertir presentación a valor normalizado (por litro o por kg)
  normalizarPrecio(precio, presentacion) {
    if (!presentacion) return precio;

    const pres = presentacion.toLowerCase().trim();

    // Detectar volumen (litros)
    if (pres.includes('l')) {
      const litros = this.extraerNumero(pres);
      if (litros > 0) return precio / litros;
    }

    // Detectar mililitros
    if (pres.includes('ml')) {
      const ml = this.extraerNumero(pres);
      if (ml > 0) return precio / (ml / 1000);
    }

    // Detectar peso (kg)
    if (pres.includes('kg')) {
      const kg = this.extraerNumero(pres);
      if (kg > 0) return precio / kg;
    }

    // Detectar gramos
    if (pres.includes('g') && !pres.includes('kg')) {
      const gramos = this.extraerNumero(pres);
      if (gramos > 0) return precio / (gramos / 1000);
    }

    // Si no detecta unidad, devolver precio tal cual
    return precio;
  },

  // Extraer número de una cadena
  extraerNumero(cadena) {
    const match = cadena.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  },

  // Obtener unidad base (litro o kg)
  obtenerUnidadBase(presentacion) {
    if (!presentacion) return 'unidad';

    const pres = presentacion.toLowerCase();
    if (pres.includes('l') && !pres.includes('ml')) return 'litro';
    if (pres.includes('ml')) return 'litro';
    if (pres.includes('kg')) return 'kg';
    if (pres.includes('g') && !pres.includes('kg')) return 'kg';

    return 'unidad';
  },

  // Formatear precio por unidad
  formatearPrecioPorUnidad(precio, presentacion) {
    const precioNormalizado = this.normalizarPrecio(precio, presentacion);
    const unidad = this.obtenerUnidadBase(presentacion);

    if (unidad === 'unidad') return `$${precio.toFixed(2)}`;
    return `$${precioNormalizado.toFixed(2)}/${unidad}`;
  },

  // Comparar precios normalizados
  compararPrecios(precio1, presentacion1, precio2, presentacion2) {
    const norm1 = this.normalizarPrecio(precio1, presentacion1);
    const norm2 = this.normalizarPrecio(precio2, presentacion2);
    return norm1 - norm2;
  }
};
