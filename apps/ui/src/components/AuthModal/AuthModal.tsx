import React from 'react';
import { useApp } from '../../context/AppContext';
import { AuthModalProps } from './AuthModal.types';
import { AuthBackground } from './AuthBackground';
import { AuthFormCard } from './AuthFormCard';
import { AuthBentoTop } from './AuthBentoTop';
import { AuthBentoLeft } from './AuthBentoLeft';
import { AuthBentoRight } from './AuthBentoRight';
import { AuthBentoBottom } from './AuthBentoBottom';
import { useAuthModalForm } from './useAuthModalForm';

/**
 * AuthModal
 * Orchestrator component for the zero-trust authentication experience,
 * combining the ambient background afterglow, asymmetric lunchbox bento showcase grids,
 * and the fixed centered glassmorphic login/registration form card.
 */
export const AuthModal: React.FC<AuthModalProps> = () => {
  const { isAuthenticated } = useApp();
  const form = useAuthModalForm();

  if (isAuthenticated) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto lg:overflow-hidden bg-[#050507] backdrop-blur-xl animate-in fade-in duration-300 flex items-center justify-center">
      {/* Background with ultra-dim rotating theme afterglow */}
      <AuthBackground />

      <div className="w-full max-w-[1700px] h-full lg:h-screen p-2.5 sm:p-3.5 lg:p-4 mx-auto flex flex-col justify-between relative z-10 gap-2.5 sm:gap-3 lg:gap-3.5">
        {/* TOP ROW: 3 Asymmetric Bento Cards (Span 6 - Span 2 - Span 4) */}
        <AuthBentoTop isFormFocused={form.isFormFocused} />

        {/* MIDDLE ROW: Left Wing | Fixed Centered Form | Right Wing */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3 lg:gap-3.5 flex-[2.2] min-h-0 items-stretch">
          {/* Left Wing (Span 4): OPRF Blind & Version Control */}
          <AuthBentoLeft isFormFocused={form.isFormFocused} />

          {/* Center Column (Span 4): Fixed Centered Login / Register Panel */}
          <div className="col-span-1 lg:col-span-4 h-full flex items-center justify-center order-1 lg:order-2">
            <AuthFormCard form={form} />
          </div>

          {/* Right Wing (Span 4): KaTeX + Mermaid & Visual Table Editor */}
          <AuthBentoRight isFormFocused={form.isFormFocused} />
        </div>

        {/* BOTTOM ROW: 3 Asymmetric Bento Cards (Span 3 - Span 5 - Span 4) */}
        <AuthBentoBottom isFormFocused={form.isFormFocused} />
      </div>
    </div>
  );
};
