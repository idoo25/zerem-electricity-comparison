import type { MonthlyInvoiceEstimate } from "@/lib/types";
import { providerLogos } from "@/lib/provider-assets";

const FONT_FILE = "Rubik-Variable.ttf";
const BOLD_FONT_FILE = "Rubik-Bold.ttf";
const FONT_FAMILY = "Rubik";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
let fontDataPromise: Promise<string> | null = null;
let boldFontDataPromise: Promise<string> | null = null;
const providerLogoData = new Map<string, Promise<string | null>>();

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 16_384;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return window.btoa(binary);
}

function loadFontData() {
  fontDataPromise ??= fetch(`${basePath}/fonts/Rubik-Variable.ttf`)
    .then((response) => {
      if (!response.ok) throw new Error("לא ניתן היה לטעון את הגופן לחשבונית.");
      return response.arrayBuffer();
    })
    .then(arrayBufferToBase64);
  return fontDataPromise;
}

function loadBoldFontData() {
  boldFontDataPromise ??= fetch(`${basePath}/fonts/Rubik-Bold.ttf`)
    .then((response) => {
      if (!response.ok) throw new Error("לא ניתן היה לטעון את הגופן המודגש לחשבונית.");
      return response.arrayBuffer();
    })
    .then(arrayBufferToBase64);
  return boldFontDataPromise;
}

function loadProviderLogo(provider: string) {
  const existing = providerLogoData.get(provider);
  if (existing) return existing;
  const logo = providerLogos[provider];
  if (!logo) return Promise.resolve(null);
  const promise = fetch(logo.src)
    .then((response) => {
      if (!response.ok) throw new Error("לא ניתן היה לטעון את לוגו נותן השירות.");
      return response.blob();
    })
    .then((blob) => new Promise<string>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 320;
        const context = canvas.getContext("2d");
        if (!context) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("לא ניתן היה להכין את לוגו נותן השירות."));
          return;
        }
        const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("לא ניתן היה להכין את לוגו נותן השירות."));
      };
      image.src = objectUrl;
    }))
    .catch(() => null);
  providerLogoData.set(provider, promise);
  return promise;
}

function money(value: number) {
  return `${moneyNumber(value)} ₪`;
}

function moneyNumber(value: number) {
  if (!Number.isFinite(value)) throw new Error("נתון כספי חסר או לא תקין בחשבונית.");
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function number(value: number, maximumFractionDigits = 1) {
  if (!Number.isFinite(value)) throw new Error("נתון מספרי חסר או לא תקין בחשבונית.");
  return new Intl.NumberFormat("he-IL", { maximumFractionDigits }).format(value);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function todayInIsraelIso() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function safeFilePart(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 55);
}

export async function createMockInvoicePdf(invoice: MonthlyInvoiceEstimate) {
  const requiredNumbers = [
    invoice.calendarDays,
    invoice.consumptionKwh,
    invoice.baselineEnergyInclVatIls,
    invoice.supplierDiscountInclVatIls,
    invoice.distributionFixedInclVatIls,
    invoice.supplyFixedInclVatIls,
    invoice.capacityChargeInclVatIls,
    invoice.supplierFeeInclVatIls,
    invoice.totalInclVatIls,
    invoice.baselineTotalInclVatIls,
    invoice.vatIncludedIls,
    invoice.savingsInclVatIls,
    invoice.savingsPercent,
    invoice.energyDiscountPercent,
    invoice.effectiveBillDiscountInclVatIls,
    invoice.effectiveBillDiscountPercent,
    invoice.fixedChargeSavingsInclVatIls,
    invoice.distributionMonthlyRateInclVatIls,
    invoice.baselineDistributionMonthlyRateInclVatIls,
    invoice.baselineSupplyMonthlyRateInclVatIls,
    invoice.capacityAnnualRateInclVatIls,
  ];
  if (requiredNumbers.some((value) => !Number.isFinite(value))) {
    throw new Error("לא ניתן להפיק חשבונית: אחד מנתוני התעריף חסר. רעננו את החישוב ונסו שוב.");
  }
  const [{ jsPDF }, fontData, boldFontData, providerLogo] = await Promise.all([
    import("jspdf"),
    loadFontData(),
    loadBoldFontData(),
    loadProviderLogo(invoice.provider),
  ]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS(FONT_FILE, fontData);
  doc.addFileToVFS(BOLD_FONT_FILE, boldFontData);
  doc.addFont(FONT_FILE, FONT_FAMILY, "normal");
  doc.addFont(BOLD_FONT_FILE, FONT_FAMILY, "bold");
  doc.setFont(FONT_FAMILY, "normal");
  doc.setLanguage("he");
  doc.setProperties({
    title: `חשבונית דמה - ${invoice.provider} - ${invoice.plan}`,
    subject: "סימולציית עלות חודשית לתוכנית חשמל",
    author: "מחשבון השוואת תוכניות חשמל",
  });

  const pageWidth = 210;
  const left = 16;
  const right = pageWidth - 16;
  const contentWidth = right - left;
  const ink = [5, 18, 14] as const;
  const muted = [52, 62, 58] as const;
  const brand = [0, 103, 78] as const;
  const brandDark = [0, 67, 51] as const;
  const warning = [213, 104, 0] as const;
  const warningFill = [255, 232, 194] as const;
  const neutralFill = [240, 242, 241] as const;
  const line = [121, 132, 127] as const;
  const white = [255, 255, 255] as const;

  const rtl = (value: string, x: number, y: number, size = 10, color: readonly [number, number, number] = ink, bold = false) => {
    doc.setR2L(true);
    doc.setFont(FONT_FAMILY, bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, x, y, { align: "right" });
  };
  const ltr = (value: string, x: number, y: number, size = 10, color: readonly [number, number, number] = ink, align: "left" | "right" = "left", bold = false) => {
    doc.setR2L(false);
    doc.setFont(FONT_FAMILY, bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(value, x, y, { align });
  };
  const directional = (value: string, x: number, y: number, size: number, color: readonly [number, number, number], bold = false) => {
    if (/[א-ת]/.test(value)) rtl(value, x, y, size, color, bold);
    else ltr(value, x, y, size, color, "right", bold);
  };
  const mixedDirectional = (value: string, x: number, y: number, size: number, color: readonly [number, number, number], bold = false) => {
    const mixed = value.trim().match(/^([א-ת\s]+)([A-Za-z][A-Za-z0-9 .+/-]*)$/);
    if (!mixed) {
      directional(value, x, y, size, color, bold);
      return;
    }
    const hebrewPart = mixed[1].trim();
    const latinPart = mixed[2].trim();
    ltr(latinPart, x, y, size, color, "right", bold);
    const latinWidth = doc.getTextWidth(latinPart);
    rtl(hebrewPart, x - latinWidth - 1.5, y, size, color, bold);
  };
  const roundedBox = (x: number, y: number, width: number, height: number, fill: readonly [number, number, number], stroke?: readonly [number, number, number]) => {
    doc.setFillColor(...fill);
    if (stroke) {
      doc.setDrawColor(...stroke);
      doc.roundedRect(x, y, width, height, 3, 3, "FD");
    } else {
      doc.roundedRect(x, y, width, height, 3, 3, "F");
    }
  };

  doc.setLineWidth(0.55);
  roundedBox(left, 14, contentWidth, 13, warningFill, warning);
  rtl("חשבונית דמה - אומדן בלבד, אינה חשבונית מס ואינה לתשלום", right - 5, 22.5, 10.5, ink, true);

  rtl("תוכנית", right, 37, 8.5, muted, true);
  directional(invoice.plan, right, 47, 15, ink, true);
  rtl("שם החברה", 126, 37, 8.5, muted, true);
  mixedDirectional(invoice.provider, 126, 47, 12, ink, true);
  rtl(`הופקה בתאריך ${shortDate(todayInIsraelIso())}`, right, 57, 8, muted);
  if (providerLogo) {
    doc.setDrawColor(...brandDark);
    doc.setFillColor(...white);
    doc.roundedRect(left, 33, 31, 27, 3, 3, "FD");
    doc.addImage(providerLogo, "PNG", left + 3, 38.7, 25, 15.6);
  } else {
    roundedBox(left, 33, 31, 27, neutralFill, brandDark);
    directional(invoice.provider.slice(0, 2), left + 21, 50, 14, brandDark, true);
  }

  doc.setFillColor(...brandDark);
  doc.roundedRect(left, 65, contentWidth, 35, 3, 3, "F");
  rtl("העלות המשוערת לחודש", right - 7, 75, 10, white, true);
  const mainAmount = moneyNumber(invoice.totalInclVatIls);
  ltr(mainAmount, left + 7, 90, 26, white, "left", true);
  ltr("₪", left + 10 + doc.getTextWidth(mainAmount), 90, 20, white, "left", true);
  rtl("כולל מע״מ וכל הרכיבים הידועים", right - 7, 95, 8.5, white, true);

  const sourceLabel = invoice.source === "meter-full-month"
    ? "חודש קלנדרי מלא מקובץ המונה"
    : "תרחיש דוגמה המבוסס על החשבון שסופק";
  roundedBox(left, 106, contentWidth, 28, neutralFill, line);
  rtl("הנתונים ששימשו לחישוב", right - 6, 115, 10, ink, true);
  rtl(`${shortDate(invoice.periodStart)} - ${shortDate(invoice.periodEnd)}  •  ${invoice.calendarDays} ימים`, right - 6, 123, 9, ink);
  rtl(`${number(invoice.consumptionKwh)} קוט״ש  •  ${sourceLabel}`, right - 6, 130, 9, ink);

  rtl("פירוט מלא של העלות", right, 146, 13, ink, true);
  const fixedFormula = (monthlyRate: number) => (
    `${money(monthlyRate)} לחודש × 12 × ${invoice.calendarDays}/${invoice.billingYearDays}`
  );
  const rows: Array<{ label: string; amount: number; positive?: boolean; size?: number }> = [
    { label: `צריכת חשמל: ${number(invoice.consumptionKwh, 3)} קוט״ש × ${number(invoice.rateAgorotInclVat, 4)} אג׳`, amount: invoice.baselineEnergyInclVatIls },
    { label: `הנחת התוכנית על ${number(invoice.discountedKwh)} קוט״ש • תעריף שנה ראשונה ${invoice.firstYearDiscountLabel}`, amount: -invoice.supplierDiscountInclVatIls, positive: true },
    { label: `תשלום קבוע חלוקה: ${money(invoice.distributionMonthlyRateInclVatIls)} לחודש × 12 × ${invoice.calendarDays}/${invoice.billingYearDays}`, amount: invoice.distributionFixedInclVatIls, size: 8.0 },
    {
      label: `תשלום קבוע אספקה: ${money(invoice.supplyMonthlyRateInclVatIls)} לחודש × 12 × ${invoice.calendarDays}/${invoice.billingYearDays}`,
      amount: invoice.supplyFixedInclVatIls,
      size: 8.0,
    },
    {
      label: `תשלום בגין הספק/קיבולת: ${number(invoice.capacityKva ?? 17.32, 2)} קו״א × ${number(invoice.capacityAnnualRateInclVatIls, 4)} ₪ לשנה × ${invoice.calendarDays}/${invoice.billingYearDays}`,
      amount: invoice.capacityChargeInclVatIls,
      size: 8.2,
    },
    { label: `עמלת תוכנית: ${fixedFormula(invoice.supplierMonthlyFeeInclVatIls)}`, amount: invoice.supplierFeeInclVatIls, size: 8.2 },
  ];
  let rowY = 149;
  for (const row of rows) {
    doc.setDrawColor(...line);
    doc.setLineWidth(0.22);
    doc.line(left, rowY + 6.4, right, rowY + 6.4);
    rtl(row.label, right, rowY + 4.3, row.size ?? 9.1, row.positive ? brand : ink, row.positive);
    ltr(money(row.amount), left, rowY + 4.3, 9.5, row.positive ? brand : ink, "left", true);
    rowY += 8.3;
  }
  doc.setDrawColor(...ink);
  doc.setLineWidth(0.75);
  doc.line(left, rowY + 1, right, rowY + 1);
  rtl("סה״כ משוער לתקופה", right, rowY + 10, 12, ink, true);
  ltr(money(invoice.totalInclVatIls), left, rowY + 10, 12, ink, "left", true);
  rtl(`מתוך הסכום (לא להוספה): מע״מ ${money(invoice.vatIncludedIls)} לפי שיעור ${number(invoice.vatRatePercent, 0)}%`, right, rowY + 17, 8.5, ink);
  rtl(`בדיקת חיבור: ${money(invoice.baselineEnergyInclVatIls)} - ${money(invoice.supplierDiscountInclVatIls)} + ${money(invoice.distributionFixedInclVatIls)} + ${money(invoice.supplyFixedInclVatIls)} + ${money(invoice.capacityChargeInclVatIls)} + ${money(invoice.supplierFeeInclVatIls)} = ${money(invoice.totalInclVatIls)}`, right, rowY + 22, 7.2, ink);
  rtl(`בדיקת חשבון בסיס: ${money(invoice.baselineEnergyInclVatIls)} + ${money(invoice.distributionFixedInclVatIls)} + ${money(invoice.supplyFixedInclVatIls)} + ${money(invoice.capacityChargeInclVatIls)} = ${money(invoice.baselineTotalInclVatIls)}`, right, rowY + 26, 7.1, ink);

  doc.setDrawColor(...brandDark);
  doc.setLineWidth(0.7);
  roundedBox(left, 230, contentWidth, 32, white, brandDark);
  rtl("הנחה בפועל לאחר כל חיובי החובה", right - 6, 238, 9.2, ink, true);
  rtl(`תעריף שנה ראשונה: ${invoice.firstYearDiscountLabel}  •  הנחת אנרגיה לפי הפרופיל: ${number(invoice.energyDiscountPercent, 2)}%`, right - 6, 245, 8.5, ink, true);
  rtl(`הנחה בפועל אחרי חיובי חובה: ${money(invoice.effectiveBillDiscountInclVatIls)}  •  ${number(invoice.effectiveBillDiscountPercent, 2)}% מחשבון בסיס ${money(invoice.baselineTotalInclVatIls)}`, right - 6, 253, 9.3, brandDark, true);
  rtl(`חיסכון כולל במחיר: ${money(invoice.savingsInclVatIls)}  •  ${number(invoice.savingsPercent, 2)}%  •  הקבועים נכללו בשתי החלופות`, right - 6, 260, 8.2, ink, true);

  const notes = [...invoice.assumptions, ...invoice.warnings].slice(0, 3);
  rtl("הנחות והבהרות", right, 269, 9.5, ink, true);
  let noteY = 275;
  for (const note of notes) {
    rtl(`• ${note.replaceAll("KVA", "קילוואט-אמפר")}`, right, noteY, 7.4, ink);
    noteY += 4.8;
  }

  doc.setDrawColor(...ink);
  doc.setLineWidth(0.35);
  doc.line(left, 289, right, 289);
  rtl(`מקור התוכנית אומת בתאריך ${shortDate(invoice.verifiedAt)}  •  החישוב מקומי ואינו נשלח לשרת`, right, 294, 7.3, ink);

  return doc.output("blob");
}

export async function downloadMockInvoice(invoice: MonthlyInvoiceEstimate) {
  const blob = await createMockInvoicePdf(invoice);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `חשבונית-דמה-${safeFilePart(invoice.provider)}-${safeFilePart(invoice.plan)}-${invoice.periodStart.slice(0, 7)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
