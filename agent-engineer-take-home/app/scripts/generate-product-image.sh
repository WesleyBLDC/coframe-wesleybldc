#!/bin/zsh
# One-time helper: generate a product listing image with Tencent Hy Image 3.5 (via OpenRouter)
# and save it to public/products/<id>.png. Run from app/:
#   zsh scripts/generate-product-image.sh lg-c3-oled-65
set -euo pipefail

id=${1:?usage: generate-product-image.sh <product-id> [out-dir]}
model=tencent/hy-image-v3.5-preview
outdir=${2:-public/products}
out=$outdir/$id.jpg
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Read the key from .env.local itself so a shell-exported OpenAI key can't shadow it.
key=$(sed -n 's/^OPENAI_API_KEY=//p' .env.local)

# Build the prompt and request body from the product's specs.
python3 -I - "$id" "$model" > "$tmp/body.json" <<'PY'
import hashlib, json, sys
pid, model = sys.argv[1:]
p = next((x for x in json.load(open('data/products.json')) if x['id'] == pid), None)
if p is None:
    sys.exit(f'unknown product id {pid}')

# Each product gets its own mix of setting, light, angle, on-screen scene and style, picked from a
# hash of its id so a rerun reproduces the same image idea.
ROOMS = ['a Scandinavian living room with oak floors', 'an industrial loft with exposed brick',
         'a cozy bedroom with linen bedding', 'a sleek glass-walled office meeting room',
         'a dark home theater with velvet seating', 'a sunlit coastal apartment', 'a Japandi lounge with paper lamps',
         'a mid-century den with a walnut console']
LIGHT = ['golden hour sunlight', 'soft overcast daylight', 'blue hour dusk with warm lamps', 'moody evening with accent lighting',
         'bright morning light', 'night with a city skyline glowing outside']
ANGLE = ['straight on at eye level', 'a slight three-quarter angle', 'a low wide angle', 'a high angle from across the room']
SCREEN = ['a glowing coral reef', 'a snowy mountain range at sunrise', 'a neon city street in the rain', 'a nebula in deep space',
          'a football stadium under floodlights', 'a desert at sunset', 'an aurora over a frozen lake', 'a vivid abstract colour field']
STYLE = ['editorial interior photography', 'minimal studio product shot', 'cinematic film still', 'luxury magazine advert']
h = int(hashlib.sha256(pid.encode()).hexdigest(), 16)
pick = lambda options, n: options[(h // n) % len(options)]

prompt = (
    f"Product advert photo of a {p['size']}-inch {p['brand']} {p['displayType']} TV, thin bezels, "
    f"in {pick(ROOMS, 1)}, {pick(LIGHT, 7)}, shot from {pick(ANGLE, 53)}. "
    f"The screen shows {pick(SCREEN, 311)} with deep contrast and rich colour. "
    f"Style: {pick(STYLE, 1009)}, aesthetic and creative composition with the TV as the hero. "
    "No text, words, numbers or logos anywhere in the image."
)
print(json.dumps({'model': model, 'prompt': prompt, 'aspect_ratio': '16:9', 'resolution': '1K'}))
print(f'prompt: {prompt}', file=sys.stderr)
print(prompt, file=sys.stderr)
PY

echo "requesting image for $id from $model ..."
# Image-only models use the images endpoint, not chat completions.
curl -sS https://openrouter.ai/api/v1/images \
  -H "Authorization: Bearer $key" -H 'Content-Type: application/json' \
  --data @"$tmp/body.json" -o "$tmp/response.json" -w 'http %{http_code} in %{time_total}s\n'

# The image comes back base64 encoded in data[0].b64_json.
mkdir -p "$outdir"
python3 -I - "$tmp/response.json" "$tmp/full.png" <<'PY'
import base64, json, sys
src, dest = sys.argv[1:]
d = json.load(open(src))
if 'error' in d:
    sys.exit(f"error: {d['error']}")
if not d.get('data'):
    sys.exit(f"no image in response: {json.dumps(d)[:400]}")
open(dest, 'wb').write(base64.b64decode(d['data'][0]['b64_json']))
print(f"cost ${d.get('usage', {}).get('cost', '?')}")
PY

# 1K is the model's smallest size; shrink to a 640px wide JPEG for product cards.
sips -s format jpeg -s formatOptions 80 --resampleWidth 640 "$tmp/full.png" --out "$out" >/dev/null
echo "saved $out ($(( $(stat -f %z "$out") / 1024 )) KB)"
