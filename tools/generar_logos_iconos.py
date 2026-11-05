"""
tools/generar_logos_iconos.py - Procesamiento de logo e iconos para THE TIKI TAKA.
Genera static/img/logo.png, static/img/icono.png, tamaños PWA (192, 512), y icono.ico.
"""

import os
import pathlib
from PIL import Image

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
STATIC_IMG = BASE_DIR / "static" / "img"
STATIC_ICONS = BASE_DIR / "static" / "icons"
STATIC_DIR = BASE_DIR / "static"

STATIC_IMG.mkdir(parents=True, exist_ok=True)
STATIC_ICONS.mkdir(parents=True, exist_ok=True)

# Ruta del archivo subido
SOURCE_LOGO = pathlib.Path("C:/Users/JuanBa/.gemini/antigravity/brain/0b439c83-bcf6-423c-b055-7704dd18baff/.user_uploaded/media_1793320891814_002683bb.jpg")

if not SOURCE_LOGO.exists():
    print(f"[ERROR] No se encontró el archivo fuente: {SOURCE_LOGO}")
    exit(1)

print(f"Cargando imagen fuente: {SOURCE_LOGO}...")
im_original = Image.open(SOURCE_LOGO).convert("RGBA")
print(f"Tamaño original: {im_original.size}")

# 1. Guardar static/img/logo.png (resolución completa 1024x1024 PNG optimizada)
logo_path = STATIC_IMG / "logo.png"
im_original.save(logo_path, format="PNG", optimize=True)
print(f"[OK] Generado: {logo_path}")

# 2. Guardar static/img/icono.png (512x512)
icono_512 = im_original.resize((512, 512), Image.Resampling.LANCZOS)
icono_path = STATIC_IMG / "icono.png"
icono_512.save(icono_path, format="PNG", optimize=True)
print(f"[OK] Generado: {icono_path}")

# 3. Guardar iconos de la PWA
# 512x512
pwa_512_path = STATIC_ICONS / "icon-512.png"
icono_512.save(pwa_512_path, format="PNG", optimize=True)
print(f"[OK] Generado: {pwa_512_path}")

# También en static/img/ para redundancia
icono_512.save(STATIC_IMG / "icon-512.png", format="PNG", optimize=True)

# 192x192
icono_192 = im_original.resize((192, 192), Image.Resampling.LANCZOS)
pwa_192_path = STATIC_ICONS / "icon-192.png"
icono_192.save(pwa_192_path, format="PNG", optimize=True)
print(f"[OK] Generado: {pwa_192_path}")
icono_192.save(STATIC_IMG / "icon-192.png", format="PNG", optimize=True)

# Icono Maskable (con 10% de padding seguro para Android PWA)
maskable_size = 512
pad = int(maskable_size * 0.1) # 10% margen
inner_size = maskable_size - 2 * pad
inner_img = im_original.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
maskable_img = Image.new("RGBA", (maskable_size, maskable_size), (6, 7, 13, 255))
maskable_img.paste(inner_img, (pad, pad), inner_img)
maskable_path = STATIC_ICONS / "icon-maskable.png"
maskable_img.save(maskable_path, format="PNG", optimize=True)
print(f"[OK] Generado: {maskable_path}")

# 4. Generar icono.ico (con Pillow) para el .exe y la ventana
# Incluye resoluciones 256, 128, 64, 48, 32, 16
ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
ico_target_paths = [
    STATIC_ICONS / "icon.ico",
    STATIC_IMG / "icono.ico",
    STATIC_DIR / "icono.ico",
    STATIC_DIR / "favicon.ico",
    BASE_DIR / "icono.ico"
]

for p in ico_target_paths:
    im_original.save(p, format="ICO", sizes=ico_sizes)
    print(f"[OK] Generado .ICO: {p}")

print("\n¡Todos los logos e iconos generados exitosamente!")
