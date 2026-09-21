import { describe, expect, it } from "vitest";
import { defaultPlatformGeneralSettings } from "./db";

describe("contrato ampliado da identidade da vitrine", () => {
  it("oferece valores padrão para todos os textos editáveis da página inicial", () => {
    expect(defaultPlatformGeneralSettings).toMatchObject({
      loginButtonText: expect.any(String),
      heroPrimaryCtaText: expect.any(String),
      heroSecondaryCtaText: expect.any(String),
      routineStepOneTitle: expect.any(String),
      benefitOneTitle: expect.any(String),
      packagesTitle: expect.any(String),
      finalCtaTitle: expect.any(String),
      footerPaymentText: expect.any(String),
    });
  });

  it("oferece uma paleta completa e hexadecimal para a vitrine", () => {
    const palette = [
      defaultPlatformGeneralSettings.primaryColor,
      defaultPlatformGeneralSettings.backgroundColor,
      defaultPlatformGeneralSettings.textColor,
      defaultPlatformGeneralSettings.heroTextColor,
      defaultPlatformGeneralSettings.heroMutedTextColor,
      defaultPlatformGeneralSettings.accentColor,
      defaultPlatformGeneralSettings.accentTextColor,
      defaultPlatformGeneralSettings.surfaceColor,
      defaultPlatformGeneralSettings.cardColor,
      defaultPlatformGeneralSettings.surfaceAccentColor,
      defaultPlatformGeneralSettings.borderColor,
      defaultPlatformGeneralSettings.mutedTextColor,
      defaultPlatformGeneralSettings.iconBackgroundColor,
      defaultPlatformGeneralSettings.iconColor,
      defaultPlatformGeneralSettings.buttonColor,
      defaultPlatformGeneralSettings.buttonHoverColor,
    ];
    expect(palette).toHaveLength(16);
    expect(palette.every(color => /^#[0-9A-F]{6}$/.test(color))).toBe(true);
  });
});
