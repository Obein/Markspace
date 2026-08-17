import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { BentoCard } from './BentoCard';
import { SvgOprfCurve, SvgCommitChain } from './BentoSvgGraphics';

export interface AuthBentoLeftProps {
  isFormFocused: boolean;
}

/**
 * AuthBentoLeft
 * Left wing bento cards (Span 4 in middle grid):
 * - OPRF Blind Gate (Elliptic Curve Zero-Knowledge Gate, 1.2 weight)
 * - Version Control (Merkle DAG & Immutable Commits, 0.8 weight)
 */
export const AuthBentoLeft: React.FC<AuthBentoLeftProps> = ({ isFormFocused }) => {
  const { t } = useI18n();

  return (
    <div className="col-span-1 lg:col-span-4 h-full flex flex-col gap-2.5 sm:gap-3 justify-between order-2 lg:order-1">
      {/* OPRF Blind Verification (Disperses Up & Left) */}
      <BentoCard
        className={`flex-[1.2] min-h-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFormFocused ? '-translate-x-[62%] -translate-y-[28%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
        }`}
        heroTitle={<span className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">OPRF Blind</span>}
        heroSubtitle={t('bentoOprfSub')}
        svgGraphic={<SvgOprfCurve />}
        detailTitle={t('bentoOprfTitle')}
        detailText={t('bentoOprfDesc')}
        detailSpecs={[
          { label: 'Curve Spec', value: 'NIST P-256 (secp256r1)' },
          { label: 'Gate Lockout', value: 'Adaptive Exponential' },
          { label: 'Server State', value: 'Zero Plaintext' },
        ]}
      />

      {/* Version Control / Merkle DAG Commits (Disperses Down & Left) */}
      <BentoCard
        className={`flex-[0.8] min-h-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFormFocused ? '-translate-x-[62%] translate-y-[28%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
        }`}
        heroTitle={<span className="text-2xl sm:text-3xl font-black text-white">{t('bentoVersionControlTitle')}</span>}
        heroSubtitle={t('bentoVersionControlSub')}
        svgGraphic={<SvgCommitChain />}
        detailTitle={t('bentoHistoryTitle')}
        detailText={t('bentoHistoryDesc')}
        detailSpecs={[
          { label: 'Integrity Digest', value: 'SHA-256 Hashes' },
          { label: 'Graph Model', value: 'Merkle DAG Tree' },
          { label: 'History Rollback', value: 'Point-in-Time' },
        ]}
      />
    </div>
  );
};
