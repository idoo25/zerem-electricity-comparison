const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

export const providerLogos: Record<string, { src: string; alt: string }> = {
  "בזק energy": { src: asset("/providers/bezeq-energy.png"), alt: "לוגו בזק energy" },
  "Partner Power": { src: asset("/providers/partner-power.png"), alt: "לוגו Partner Power" },
  "סלקום Energy": { src: asset("/providers/cellcom-energy.png"), alt: "לוגו סלקום Energy" },
  "HOT energy": { src: asset("/providers/hot-energy.png"), alt: "לוגו HOT energy" },
  "Super Power": { src: asset("/providers/super-power.svg"), alt: "לוגו Super Power" },
  "אמישראגז חשמל": { src: asset("/providers/amisragaz.svg"), alt: "לוגו אמישראגז חשמל" },
  "פזגז חשמל": { src: asset("/providers/pazgas.png"), alt: "לוגו פזגז חשמל" },
};
