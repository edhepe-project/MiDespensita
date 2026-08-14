// Constants - Global namespace
window.APP_CATEGORIAS = {
  frutas_verduras: { nombre: "Frutas y Verduras", icono: "🥬" },
  lacteos: { nombre: "Lácteos", icono: "🥛" },
  carnes: { nombre: "Carnes y Aves", icono: "🥩" },
  abarrotes: { nombre: "Abarrotes", icono: "🏪" },
  bebidas: { nombre: "Bebidas", icono: "🥤" },
  limpieza: { nombre: "Limpieza", icono: "🧹" },
  higiene: { nombre: "Higiene Personal", icono: "🧼" },
  panaderia: { nombre: "Panadería", icono: "🍞" },
  congelados: { nombre: "Congelados", icono: "🧊" },
  supermercados: { nombre: "Supermercados", icono: "🛒" },
  otros: { nombre: "Otros", icono: "📦" }
};

window.APP_UNIDADES = [
  "pieza", "kg", "litro", "paquete", "docena",
  "media docena", "manojo", "lata", "botella", "caja"
];

window.APP_LISTA_BASE = [
  // Despensa / Abarrotes - Granos y cereales
  { nombre: "Arroz", categoria: "abarrotes", unidad: "kg" },
  { nombre: "Frijol", categoria: "abarrotes", unidad: "kg" },
  { nombre: "Lentejas", categoria: "abarrotes", unidad: "kg" },
  { nombre: "Garbanzos", categoria: "abarrotes", unidad: "kg" },
  { nombre: "Avena", categoria: "abarrotes", unidad: "kg" },
  { nombre: "Harina de trigo", categoria: "abarrotes", unidad: "kg" },
  { nombre: "Harina de maíz", categoria: "abarrotes", unidad: "kg" },

  // Despensa - Pastas
  { nombre: "Espagueti", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Sopa de coditos", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Sopa de fideos", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Sopa de letras", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Sopa de estrella", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Sopa de conchas", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Sopa instantánea", categoria: "abarrotes", unidad: "pieza" },

  // Despensa - Aceites y grasas
  { nombre: "Aceite vegetal", categoria: "abarrotes", unidad: "litro" },
  { nombre: "Aceite de oliva", categoria: "abarrotes", unidad: "litro" },
  { nombre: "Manteca", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Mantequilla", categoria: "abarrotes", unidad: "pieza" },

  // Despensa - Especias y condimentos
  { nombre: "Sal fina", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Sal gruesa", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Azúcar", categoria: "abarrotes", unidad: "kg" },
  { nombre: "Miel", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Endulzante", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Ajo en polvo", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Pimienta negra", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Orégano", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Comino", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Consomé en polvo", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Sazonador", categoria: "abarrotes", unidad: "pieza" },

  // Despensa - Bebidas en polvo/solubles
  { nombre: "Café soluble", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Café de grano", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Té", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Leche en polvo", categoria: "abarrotes", unidad: "pieza" },

  // Despensa - Enlatados
  { nombre: "Atún en lata", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Sardinas en lata", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Puré de tomate", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Elote en lata", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Chiles en vinagre", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Chiles en salmuera", categoria: "abarrotes", unidad: "pieza" },

  // Despensa - Salsas y aderezos
  { nombre: "Vinagre blanco", categoria: "abarrotes", unidad: "litro" },
  { nombre: "Mayonesa", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Mostaza", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Ketchup", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Salsa inglesa", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Salsa de soya", categoria: "abarrotes", unidad: "pieza" },

  // Despensa - Dulces y snacks
  { nombre: "Mermelada", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Crema de cacahuate", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Cereal de desayuno", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Galletas saladas", categoria: "abarrotes", unidad: "pieza" },
  { nombre: "Galletas dulces", categoria: "abarrotes", unidad: "pieza" },

  // Panadería
  { nombre: "Pan de caja", categoria: "panaderia", unidad: "pieza" },
  { nombre: "Tortilla de maíz", categoria: "panaderia", unidad: "kg" },
  { nombre: "Tortilla de harina", categoria: "panaderia", unidad: "pieza" },

  // Lácteos - Huevos
  { nombre: "Huevos", categoria: "lacteos", unidad: "docena" },

  // Lácteos - Leches
  { nombre: "Leche entera", categoria: "lacteos", unidad: "litro" },
  { nombre: "Leche descremada", categoria: "lacteos", unidad: "litro" },
  { nombre: "Leche deslactosada", categoria: "lacteos", unidad: "litro" },

  // Lácteos - Quesos
  { nombre: "Queso fresco", categoria: "lacteos", unidad: "kg" },
  { nombre: "Queso panela", categoria: "lacteos", unidad: "kg" },
  { nombre: "Queso oaxaca", categoria: "lacteos", unidad: "kg" },
  { nombre: "Queso manchego", categoria: "lacteos", unidad: "kg" },
  { nombre: "Queso amarillo", categoria: "lacteos", unidad: "pieza" },

  // Lácteos - Otros
  { nombre: "Yogurth", categoria: "lacteos", unidad: "pieza" },
  { nombre: "Crema para batir", categoria: "lacteos", unidad: "pieza" },
  { nombre: "Crema ácida", categoria: "lacteos", unidad: "pieza" },

  // Frutas y Verduras - Verduras
  { nombre: "Papas", categoria: "frutas_verduras", unidad: "kg" },
  { nombre: "Cebollas", categoria: "frutas_verduras", unidad: "kg" },
  { nombre: "Ajos frescos", categoria: "frutas_verduras", unidad: "pieza" },
  { nombre: "Tomate", categoria: "frutas_verduras", unidad: "kg" },
  { nombre: "Chile jalapeño", categoria: "frutas_verduras", unidad: "kg" },
  { nombre: "Lechuga", categoria: "frutas_verduras", unidad: "pieza" },
  { nombre: "Zanahoria", categoria: "frutas_verduras", unidad: "kg" },
  { nombre: "Calabacita", categoria: "frutas_verduras", unidad: "kg" },

  // Frutas y Verduras - Frutas
  { nombre: "Plátano", categoria: "frutas_verduras", unidad: "kg" },
  { nombre: "Manzana", categoria: "frutas_verduras", unidad: "kg" },
  { nombre: "Naranja", categoria: "frutas_verduras", unidad: "kg" },
  { nombre: "Limón", categoria: "frutas_verduras", unidad: "pieza" },

  // Carnes - Res
  { nombre: "Bistec de res", categoria: "carnes", unidad: "kg" },
  { nombre: "Carne molida de res", categoria: "carnes", unidad: "kg" },
  { nombre: "Costillas de res", categoria: "carnes", unidad: "kg" },

  // Carnes - Cerdo
  { nombre: "Chuletas de cerdo", categoria: "carnes", unidad: "kg" },
  { nombre: "Costillas de cerdo", categoria: "carnes", unidad: "kg" },
  { nombre: "Piernita de cerdo", categoria: "carnes", unidad: "kg" },

  // Carnes - Pollo
  { nombre: "Pechuga de pollo", categoria: "carnes", unidad: "kg" },
  { nombre: "Pierna y muslo de pollo", categoria: "carnes", unidad: "kg" },
  { nombre: "Pollo entero", categoria: "carnes", unidad: "pieza" },
  { nombre: "Alitas de pollo", categoria: "carnes", unidad: "kg" },

  // Carnes - Embutidos
  { nombre: "Jamón", categoria: "carnes", unidad: "pieza" },
  { nombre: "Salchichas", categoria: "carnes", unidad: "pieza" },
  { nombre: "Tocino", categoria: "carnes", unidad: "pieza" },
  { nombre: "Chorizo", categoria: "carnes", unidad: "pieza" },

  // Limpieza - Baño
  { nombre: "Papel higiénico", categoria: "limpieza", unidad: "paquete" },
  { nombre: "Servilletas", categoria: "limpieza", unidad: "paquete" },
  { nombre: "Servitoallas de papel", categoria: "limpieza", unidad: "paquete" },

  // Limpieza - Cocina
  { nombre: "Jabón para trastes", categoria: "limpieza", unidad: "pieza" },
  { nombre: "Esponjas para lavar trastes", categoria: "limpieza", unidad: "pieza" },
  { nombre: "Bolsas para basura", categoria: "limpieza", unidad: "paquete" },
  { nombre: "Papel aluminio", categoria: "limpieza", unidad: "pieza" },
  { nombre: "Film plástico de cocina", categoria: "limpieza", unidad: "pieza" },

  // Limpieza - Ropa
  { nombre: "Detergente para ropa", categoria: "limpieza", unidad: "pieza" },
  { nombre: "Suavizante de telas", categoria: "limpieza", unidad: "litro" },

  // Limpieza - Piso y superficies
  { nombre: "Cloro", categoria: "limpieza", unidad: "litro" },
  { nombre: "Desinfectante", categoria: "limpieza", unidad: "litro" },
  { nombre: "Limpiador multiusos", categoria: "limpieza", unidad: "litro" },
  { nombre: "Jabón en pastilla", categoria: "limpieza", unidad: "pieza" },

  // Higiene Personal - Cuidado del cuerpo
  { nombre: "Jabón de cuerpo", categoria: "higiene", unidad: "pieza" },
  { nombre: "Desodorante", categoria: "higiene", unidad: "pieza" },
  { nombre: "Crema para manos", categoria: "higiene", unidad: "pieza" },

  // Higiene Personal - Cabello
  { nombre: "Champú", categoria: "higiene", unidad: "pieza" },
  { nombre: "Acondicionador", categoria: "higiene", unidad: "pieza" },

  // Higiene Personal - Dental
  { nombre: "Pasta de dientes", categoria: "higiene", unidad: "pieza" },
  { nombre: "Cepillo de dientes", categoria: "higiene", unidad: "pieza" },
  { nombre: "Hilo dental", categoria: "higiene", unidad: "pieza" }
];
