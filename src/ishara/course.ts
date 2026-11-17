import { phrase } from "./copy";

export const letters = {
  a: "А", v: "В", g: "Г", d: "Д", k: "К", n: "Н",
  o: "О", s: "С", u: "У", sh: "Ш", y: "Ы", t: "Т",
} as const;
export type Letter = keyof typeof letters;

export const units = [
  { id: "first", name: phrase("Первые буквы", "Алғашқы әріптер", "First letters"), letters: ["a", "v", "n"] },
  { id: "fingers", name: phrase("Положение пальцев", "Саусақтардың қалпы", "Finger positions"), letters: ["d", "u", "sh"] },
  { id: "angles", name: phrase("Поворот кисти", "Қолдың бұрылуы", "Palm angles"), letters: ["g", "k", "y"] },
  { id: "shapes", name: phrase("Разные формы", "Әртүрлі қалыптар", "Different shapes"), letters: ["o", "s", "t"] },
] as const;

export const cameraLetters = ["v", "n", "u", "k", "y"] as const satisfies readonly Letter[];
export type CameraLetter = typeof cameraLetters[number];

export const cameraHints = {
  v: phrase("Выпрямите четыре пальца рядом друг с другом. Отведите большой палец в сторону.", "Төрт саусақты қатар түзеңіз. Бас бармақты шетке шығарыңыз.", "Straighten four fingers and keep them together. Point your thumb to the side."),
  n: phrase("Поднимите указательный, средний и мизинец. Большим пальцем прижмите безымянный.", "Сұқ саусақты, ортаңғы саусақты және шынашақты көтеріңіз. Аты жоқ саусақты бас бармақпен басып ұстаңыз.", "Raise your index, middle and little fingers. Hold your ring finger down with your thumb."),
  u: phrase("Раскройте большой палец и мизинец, остальные пальцы согните.", "Бас бармақ пен шынашақты ашып, қалған саусақтарды бүгіңіз.", "Extend your thumb and little finger. Curl the other fingers."),
  k: phrase("Выпрямите указательный и средний пальцы, держите их рядом. Остальные пальцы согните.", "Сұқ саусақ пен ортаңғы саусақты қатар түзеңіз. Қалған саусақтарды бүгіңіз.", "Straighten your index and middle fingers and keep them together. Curl the other fingers."),
  y: phrase("Выпрямите указательный палец и мизинец. Большим пальцем придержите два согнутых пальца.", "Сұқ саусақ пен шынашақты түзеңіз. Бүгілген екі саусақты бас бармақпен ұстап тұрыңыз.", "Extend your index and little fingers. Hold down the two curled fingers with your thumb."),
};

export const referenceSource = "https://www.mdpi.com/2227-7080/14/11/744#fig_body_display_technologies-14-00744-f001";

export const photo = (letter: Letter) => `/ishara/${letter}.webp`;
