"""Cuts the boy's head out of the group photo as a mask (white = head), for layering him in front of the Sundays title."""
import sys
import cv2
import numpy as np

src, out, preview = sys.argv[1], sys.argv[2], sys.argv[3]
img = cv2.imread(src)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
H, W = gray.shape

# Search box around the head, in photo pixels
x0, x1, y0, y1 = 516, 676, 428, 626
box = cv2.GaussianBlur(gray[y0:y1, x0:x1], (5, 5), 0)
dark = (box < 135).astype(np.uint8)
# Stay inside a loose oval around the head, so shirt shadows beside it are left out
oval = np.zeros_like(dark)
cv2.ellipse(oval, (595 - x0, 520 - y0), (75, 92), 0, 0, 360, 1, -1)
oval[566 - y0:, :] = 1
dark &= oval
dark = cv2.morphologyEx(dark, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))

# Below the jaw only keep the neck, so the arm and jumper at the sides stay out
jaw = 566 - y0
dark[jaw:, : 556 - x0] = 0
dark[jaw:, 644 - x0:] = 0

dark = cv2.morphologyEx(dark, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
n, labels, stats, _ = cv2.connectedComponentsWithStats(dark, 8)
keep = labels[(500 - y0), (595 - x0)]
assert keep != 0, "seed is not on the head"
head = (labels == keep).astype(np.uint8)

# Fill holes (highlights on the face)
flood = head.copy()
pad = cv2.copyMakeBorder(flood, 1, 1, 1, 1, cv2.BORDER_CONSTANT, value=0)
cv2.floodFill(pad, None, (0, 0), 2)
head = (pad[1:-1, 1:-1] != 2).astype(np.float32)

# Soft edge, then fade out down the neck
head = cv2.GaussianBlur(head, (0, 0), 1.6)
head = np.clip((head - 0.25) / 0.5, 0, 1)
ys = np.arange(y0, y1, dtype=np.float32)[:, None]
head *= np.clip((620 - ys) / 22.0, 0, 1)

mask = np.zeros((H, W), np.float32)
mask[y0:y1, x0:x1] = head

small = cv2.resize(mask, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
alpha = (small * 255).astype(np.uint8)
rgba = np.dstack([np.full_like(alpha, 255)] * 3 + [alpha])
cv2.imwrite(out, rgba, [cv2.IMWRITE_WEBP_QUALITY, 90])

# Preview: the cut-out over a red ground
crop = img[330:660, 470:1180].astype(np.float32)
a = mask[330:660, 470:1180][..., None]
red = np.zeros_like(crop); red[..., 2] = 255
cv2.imwrite(preview, cv2.resize((crop * a + red * (1 - a)).astype(np.uint8), None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC))
