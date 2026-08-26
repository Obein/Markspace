import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { BentoCard } from './BentoCard';
import {
  SvgRamPurge,
  SvgNonceCircuit,
  SvgTypographyOled,
} from './BentoSvgGraphics';

export interface AuthBentoBottomProps {
  isFormFocused: boolean;
}

/**
 * AuthBentoBottom
 * Bottom row bento cards (Span 3 - Span 5 - Span 4):
 * - RAM Shield (Non-Extractable Keys & RAM Isolation, Span 3)
 * - Anti-Replay Gate (6-Byte Nonce & RFC 9449 DPoP, Span 5)
 * - Monaspace (GitHub Monaspace & OLED Pure Obsidian Typography, Span 4)
 */
export const AuthBentoBottom: React.FC<AuthBentoBottomProps> = ({ isFormFocused }) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 lg:gap-3.5 flex-[1] min-h-0">
      {/* Bottom Left: Ephemeral Crypto (Span 3 - Compact Card) */}
      <BentoCard
        className={`col-span-1 md:col-span-3 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFormFocused ? 'lg:translate-y-[62%] lg:-translate-x-[20%] lg:opacity-40 lg:blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
        }`}
        heroTitle={<span className="text-2xl sm:text-3xl font-black text-zinc-100">Zero-Disk</span>}
        heroSubtitle={t('bentoMemorySub')}
        svgGraphic={<SvgRamPurge />}
        detailTitle={t('bentoMemoryTitle')}
        detailText={t('bentoMemoryDesc')}
        detailSpecs={[
          { label: 'Key Scope', value: 'Ephemeral RAM' },
          { label: 'Disk Persistence', value: 'None' },
        ]}
      />

      {/* Bottom Center: Nonce Anti-Replay Gate (Span 5 - Wide Hero Card) */}
      <BentoCard
        className={`col-span-1 md:col-span-5 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFormFocused ? 'lg:translate-y-[68%] lg:opacity-30 lg:blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
        }`}
        heroTitle={<span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">Anti-Replay Gate</span>}
        heroSubtitle={t('bentoNonceSub')}
        svgGraphic={<SvgNonceCircuit />}
        detailTitle={t('bentoNonceTitle')}
        detailText={t('bentoNonceDesc')}
        detailSpecs={[
          { label: 'Challenge Spec', value: '6-Byte Nonce' },
          { label: 'Device Binding', value: 'RFC 9449 DPoP' },
          { label: 'Protection', value: 'Zero-Replay Lock' },
        ]}
      />

      {/* Bottom Right: Monaspace OLED Dark (Span 4 - Medium Card) */}
      <BentoCard
        className={`col-span-1 md:col-span-4 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFormFocused ? 'lg:translate-y-[62%] lg:translate-x-[20%] lg:opacity-40 lg:blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
        }`}
        heroTitle={<span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">Monaspace</span>}
        heroSubtitle={t('bentoTypographySub')}
        svgGraphic={<SvgTypographyOled />}
        detailTitle={t('bentoTypographyTitle')}
        detailText={t('bentoTypographyDesc')}
        detailSpecs={[
          { label: 'Code Engine', value: 'GitHub Monaspace' },
          { label: 'CJK Prose', value: 'Noto Sans / Serif' },
          { label: 'Theme Base', value: 'OLED #070709' },
        ]}
      />
    </div>
  );
};
