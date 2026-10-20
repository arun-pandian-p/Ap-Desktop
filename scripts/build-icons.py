import os
from PIL import Image, ImageFilter, ImageDraw
import numpy as np
from collections import deque

def main():
    src_path = 'assets/branding/Glossy Red Ap Monogram Icon.png' if os.path.exists('assets/branding/Glossy Red Ap Monogram Icon.png') else 'build/icon.png'
    if not os.path.exists(src_path):
        print(f"File not found: {src_path}")
        return

    img = Image.open(src_path).convert('RGB')
    w, h = img.size
    print(f"Loaded master icon: {w}x{h}")

    arr = np.array(img, dtype=np.uint8)

    # 1. Connected component of the outer background from 4 corners
    visited = np.zeros((h, w), dtype=bool)
    bg_mask = np.zeros((h, w), dtype=bool)

    q = deque([(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)])
    for x, y in q:
        visited[y, x] = True

    while q:
        x, y = q.popleft()
        r, g, b = arr[y, x]
        if r > 240 and g > 240 and b > 240:
            bg_mask[y, x] = True
            for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                    visited[ny, nx] = True
                    q.append((nx, ny))

    # Alpha: 0 on background, 255 elsewhere
    alpha = np.ones((h, w), dtype=np.float32) * 255.0
    alpha[bg_mask] = 0.0

    # Anti-alias mask along boundary
    alpha_img = Image.fromarray(alpha.astype(np.uint8), mode='L')
    alpha_smooth = alpha_img.filter(ImageFilter.GaussianBlur(radius=1.2))

    icon_rgba = img.convert('RGBA')
    icon_rgba.putalpha(alpha_smooth)

    # Ensure output directories exist
    os.makedirs('public/assets', exist_ok=True)
    os.makedirs('build', exist_ok=True)

    # Save public/assets/icon.png and build/icon.png
    icon_rgba.save('public/assets/icon.png', format='PNG')
    icon_rgba.save('build/icon.png', format='PNG')
    print("Saved public/assets/icon.png and build/icon.png")

    # Generate circular icon variant for login / avatar
    circle_mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(circle_mask)
    draw.ellipse((0, 0, w-1, h-1), fill=255)
    circle_mask_smooth = circle_mask.filter(ImageFilter.GaussianBlur(radius=1.0))
    circle_rgba = img.convert('RGBA')
    circle_rgba.putalpha(circle_mask_smooth)
    circle_rgba.save('public/assets/icon-circle.png', format='PNG')
    print("Saved public/assets/icon-circle.png")

    # Multi-resolution ICO for browser & Windows
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    icon_rgba.save('public/favicon.ico', format='ICO', sizes=ico_sizes)
    icon_rgba.save('build/icon.ico', format='ICO', sizes=ico_sizes)
    print("Saved public/favicon.ico and build/icon.ico")

    # Additional web icons
    icon_rgba.resize((192, 192), Image.Resampling.LANCZOS).save('public/assets/icon-192.png', format='PNG')
    icon_rgba.resize((512, 512), Image.Resampling.LANCZOS).save('public/assets/icon-512.png', format='PNG')
    print("Saved public/assets/icon-192.png and icon-512.png")

if __name__ == '__main__':
    main()
