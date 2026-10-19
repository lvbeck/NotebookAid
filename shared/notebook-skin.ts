export const notebookSkinColors = ["#7460c9", "#bd9da6", "#9aa99b", "#92a8ba", "#c3b397", "#a6a4af", "#b89b88", "#a3b6b1", "#afa2bb", "#bcc1a2"] as const;
export const notebookSkinNames: Readonly<Record<string, readonly string[]>> = {
    "zh-CN": [
        "极光紫",
        "藕粉",
        "鼠尾草",
        "雾蓝",
        "砂金",
        "岩灰",
        "陶土",
        "海盐绿",
        "丁香",
        "橄榄"
    ],
    "zh-TW": [
        "極光紫",
        "藕粉",
        "鼠尾草",
        "霧藍",
        "砂金",
        "岩灰",
        "陶土",
        "海鹽綠",
        "丁香",
        "橄欖"
    ],
    "en": [
        "Aurora violet",
        "Dusty rose",
        "Sage",
        "Mist blue",
        "Sand gold",
        "Stone grey",
        "Terracotta",
        "Seafoam",
        "Lilac",
        "Olive"
    ],
    "de": [
        "Auroraviolett",
        "Altrosa",
        "Salbei",
        "Nebelblau",
        "Sandgold",
        "Steingrau",
        "Terrakotta",
        "Meerschaum",
        "Flieder",
        "Oliv"
    ],
    "fr": [
        "Violet aurore",
        "Vieux rose",
        "Sauge",
        "Bleu brume",
        "Sable doré",
        "Gris pierre",
        "Terre cuite",
        "Écume de mer",
        "Lilas",
        "Olive"
    ],
    "it": [
        "Viola aurora",
        "Rosa antico",
        "Salvia",
        "Blu nebbia",
        "Sabbia dorata",
        "Grigio pietra",
        "Terracotta",
        "Verde mare",
        "Lilla",
        "Oliva"
    ],
    "es": [
        "Violeta aurora",
        "Rosa palo",
        "Salvia",
        "Azul niebla",
        "Arena dorada",
        "Gris piedra",
        "Terracota",
        "Verde mar",
        "Lila",
        "Oliva"
    ],
    "pt-PT": [
        "Violeta aurora",
        "Rosa velho",
        "Sálvia",
        "Azul névoa",
        "Areia dourada",
        "Cinzento pedra",
        "Terracota",
        "Verde-mar",
        "Lilás",
        "Azeitona"
    ],
    "ja": [
        "オーロラパープル",
        "くすみピンク",
        "セージ",
        "ミストブルー",
        "サンドゴールド",
        "ストーングレー",
        "テラコッタ",
        "シーフォーム",
        "ライラック",
        "オリーブ"
    ],
    "ko": [
        "오로라 퍼플",
        "더스티 로즈",
        "세이지",
        "미스트 블루",
        "샌드 골드",
        "스톤 그레이",
        "테라코타",
        "씨폼",
        "라일락",
        "올리브"
    ]
};
export function skinName(locale: string, index: number): string { return (notebookSkinNames[locale] ?? notebookSkinNames['en'])[index]; }
export function notebookSkinIndex(color?: string): number {
    if (!color || !/^#[0-9a-f]{6}$/i.test(color))
        return 0;
    const normalized = color.toLowerCase();
    if (normalized === '#78b9e8')
        return 3;
    const exact = notebookSkinColors.findIndex(value => value === normalized);
    if (exact >= 0)
        return exact;
    const target = hue(normalized);
    if (Math.max(...rgb(normalized)) - Math.min(...rgb(normalized)) < 0.07)
        return 5;
    let best = 0, distance = Infinity;
    notebookSkinColors.forEach((value, index) => { if (index === 5)
        return; const delta = Math.abs(target - hue(value)); const next = Math.min(delta, 360 - delta); if (next < distance) {
        distance = next;
        best = index;
    } });
    return best;
}
function rgb(hex: string) { return hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255); }
function luminance(hex: string) { return rgb(hex).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0); }
function contrast(a: string, b: string) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
function hue(hex: string) { const [r, g, b] = rgb(hex), max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min; return delta === 0 ? 0 : ((max === r ? (g - b) / delta + (g < b ? 6 : 0) : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60); }
function hsl(h: number, s: number, l: number) { s /= 100; l /= 100; const a = s * Math.min(l, 1 - l), f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return '#' + [f(0), f(8), f(4)].map(value => Math.round(value * 255).toString(16).padStart(2, '0')).join(''); }
export function skinTokens(index: number, dark: boolean): Record<string, string> { if (index === 0)
    return dark ? { bg: '#18181f', surface: '#22222c', sidebar: '#1d1d26', text: '#e6e5ee', muted: '#a19dac', line: '#353442', accent: '#b4a1f5', on: '#241c38', soft: '#39304e' } : { bg: '#f6f6f9', surface: '#ffffff', sidebar: '#f0f0f6', text: '#252436', muted: '#6f6b80', line: '#e7e6ee', accent: '#7460c9', on: '#ffffff', soft: '#e9e4fa' }; const h = hue(notebookSkinColors[index]), s = index === 5 ? 8 : index === 2 ? 24 : 32; let l = dark ? 76 : 40, accent = hsl(h, s, l), on = dark ? hsl(h, 16, 12) : '#ffffff'; while (contrast(accent, on) < 4.5 && l > 15) {
    l--;
    accent = hsl(h, s, l);
} return dark ? { bg: hsl(h, 12, 9), surface: hsl(h, 10, 13), sidebar: hsl(h, 12, 10), text: hsl(h, 16, 92), muted: hsl(h, 11, 70), line: hsl(h, 11, 23), accent, on, soft: hsl(h, 22, 23) } : { bg: hsl(h, 20, 97), surface: '#ffffff', sidebar: hsl(h, 18, 94), text: hsl(h, 18, 16), muted: hsl(h, 12, 42), line: hsl(h, 18, 89), accent, on, soft: hsl(h, 33, 92) }; }
