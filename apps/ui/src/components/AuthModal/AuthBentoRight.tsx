import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { BentoCard } from './BentoCard';
import { SvgKaTeXMermaid, SvgVisualTable } from './BentoSvgGraphics';

export interface AuthBentoRightProps {
  isFormFocused: boolean;
}

/**
 * AuthBentoRight
 * Right wing bento cards (Span 4 in middle grid):
 * - KaTeX + Mermaid (Scientific Typesetting & AST Diagrams, 1.1 weight)
 * - Visual Table Editor (WYSIWYG Spreadsheet & Formulas, 1.1 weight)
 */
export const AuthBentoRight: React.FC<AuthBentoRightProps> = ({ isFormFocused }) => {
  const { t } = useI18n();

  return (
    <div className="col-span-1 lg:col-span-4 h-full flex flex-col gap-2.5 sm:gap-3 justify-between order-3">
      {/* KaTeX + Mermaid (Disperses Up & Right) */}
      <BentoCard
        className={`flex-[1.1] min-h-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFormFocused ? 'translate-x-[62%] -translate-y-[28%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
        }`}
        heroTitle={<span className="text-2xl sm:text-3xl font-black text-white">KaTeX + Mermaid</span>}
        heroSubtitle={t('bentoKaTeXSub')}
        svgGraphic={<SvgKaTeXMermaid />}
        detailTitle={t('bentoMarkdownTitle')}
        detailText={t('bentoMarkdownDesc')}
        detailSpecs={[
          { label: 'Math Typesetting', value: 'KaTeX v0.16' },
          { label: 'Diagramming', value: 'Mermaid v10' },
          { label: 'Syntax Parser', value: 'Lezer Incremental' },
        ]}
      />

      {/* Visual Table Editor (Disperses Down & Right) */}
      <BentoCard
        className={`flex-[1.1] min-h-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isFormFocused ? 'translate-x-[62%] translate-y-[28%] opacity-40 blur-[0.5px]' : 'translate-0 opacity-100 blur-0'
        }`}
        heroTitle={<span className="text-2xl sm:text-3xl font-black text-white">{t('bentoTableTitle')}</span>}
        heroSubtitle={t('bentoTableSub')}
        svgGraphic={<SvgVisualTable />}
        detailTitle={t('bentoTableDetailTitle')}
        detailText={t('bentoTableDesc')}
        detailSpecs={[
          { label: 'Grid Engine', value: 'Interactive WYSIWYG' },
          { label: 'Formulas', value: 'SUM, AVG, COUNT, IF' },
          { label: 'Serialization', value: 'Lossless GFM Markdown' },
        ]}
      />
    </div>
  );
};
