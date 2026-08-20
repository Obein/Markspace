import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { BentoCard } from './BentoCard';
import {
  SvgAesEnvelope,
  SvgGlobalEdge,
  SvgTotpDial,
} from './BentoSvgGraphics';

export interface AuthBentoTopProps {
  isFormFocused: boolean;
}

/**
 * AuthBentoTop
 * Top row bento cards (Span 6 - Span 2 - Span 4):
 * - 256-bit AES-GCM Envelope Encryption (Wide Hero Banner)
 * - < 15ms Edge Global Storage (Compact Chip)
 * - MFA / Multi-Factor Authentication (Medium Card)
 */
export const AuthBentoTop: React.FC<AuthBentoTopProps> = ({ isFormFocused }) => {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 lg:gap-3.5 flex-[1] min-h-0">
      {/* Top Left: 256-bit AES-GCM (Span 6 - Wide Hero Banner) */}
      <BentoCard
        className={`col-span-1 md:col-span-6 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFormFocused ? 'lg:-translate-y-[62%] lg:-translate-x-[20%] lg:opacity-40 lg:blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
        }`}
        heroTitle={<span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">256-bit</span>}
        heroSubtitle={t('bentoE2eeSub')}
        svgGraphic={<SvgAesEnvelope />}
        detailTitle={t('bentoE2eeTitle')}
        detailText={t('bentoE2eeDesc')}
        detailSpecs={[
          { label: 'Algorithm', value: 'AES-256-GCM' },
          { label: 'Key Derivation', value: 'PBKDF2-HMAC-SHA256' },
          { label: 'IV Spec', value: '96-bit CSPRNG' },
        ]}
      />

      {/* Top Center: Global Edge Storage (Span 2 - Ultra-Compact Mini Chip) */}
      <BentoCard
        className={`col-span-1 md:col-span-2 h-full text-center items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFormFocused ? 'lg:-translate-y-[68%] lg:opacity-30 lg:blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
        }`}
        heroTitle={<span className="text-2xl sm:text-3xl lg:text-4xl font-black text-primaryColor-400">&lt;15ms</span>}
        heroSubtitle={t('bentoEdgeSub')}
        svgGraphic={<SvgGlobalEdge />}
        detailTitle={t('bentoEdgeTitle')}
        detailText={t('bentoEdgeDesc')}
        detailSpecs={[
          { label: 'Edge Network', value: '300+ Global PoPs' },
          { label: 'Database', value: 'Cloudflare D1 SQL' },
          { label: 'Object Storage', value: 'Cloudflare R2 Bucket' },
        ]}
      />

      {/* Top Right: MFA (Span 4 - Medium Card) */}
      <BentoCard
        className={`col-span-1 md:col-span-4 h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFormFocused ? 'lg:-translate-y-[62%] lg:translate-x-[20%] lg:opacity-40 lg:blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
        }`}
        heroTitle={<span className="text-3xl sm:text-4xl lg:text-5xl font-black text-white">MFA</span>}
        heroSubtitle={t('bentoMfaSub')}
        svgGraphic={<SvgTotpDial />}
        detailTitle={t('bentoMfaTitle')}
        detailText={t('bentoMfaDesc')}
        detailSpecs={[
          { label: 'Verification Type', value: 'Multi-Factor (MFA / 2FA)' },
          { label: 'Rotation Cycle', value: '30 Seconds' },
          { label: 'Standard', value: 'RFC 6238 TOTP' },
        ]}
      />
    </div>
  );
};
