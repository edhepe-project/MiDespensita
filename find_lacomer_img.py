from bs4 import BeautifulSoup
import re

html = open("debug_lacomer_search.html", encoding="utf-8").read()
soup = BeautifulSoup(html, "html.parser")

# Buscar imagenes de productos
imgs = soup.find_all("img", src=lambda s: s and "articulo" in s.lower())
print("Imágenes con 'articulo' en src:")
for img in imgs[:5]:
    print(" ", img.get("src"))

# Buscar cualquier img con ng-src (Angular)
ng_imgs = soup.find_all(lambda tag: tag.name == "img" and tag.get("ng-src"))
print("\nImagenes con ng-src:")
for img in ng_imgs[:5]:
    print(" ", img.get("ng-src"))

# Buscar en el JS cualquier patrón de imagen de artículo
img_patterns = re.findall(r'[\'\"](https?://[^\s\'\"]*(?:articulosImagen|resource)[^\s\'\"]*)[\'\"]]?', html)
print("\nPatrones de URL de imagen encontrados en JS/HTML:")
for p in list(set(img_patterns))[:10]:
    print(" ", p[:120])
