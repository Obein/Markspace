import { HttpTransport } from './HttpTransport';

export class VaultOprfApi {
  constructor(private readonly transport: HttpTransport) {}

  async setupVaultOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.transport.request<{ evaluatedPoint: string }>(`/vaults/${vaultId}/oprf/setup`, {
      method: 'POST',
      body: JSON.stringify({ blindedElement }),
    });
  }

  async evaluateVaultOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.evaluateVaultPinOprf(vaultId, blindedElement);
  }

  async evaluateVaultPinOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.transport.request<{ evaluatedPoint: string }>(`/vaults/${vaultId}/oprf/evaluate-pin`, {
      method: 'POST',
      body: JSON.stringify({ blindedElement }),
    });
  }

  async evaluateVaultRecoveryOprf(vaultId: string, blindedElement: string): Promise<{ evaluatedPoint: string }> {
    return this.transport.request<{ evaluatedPoint: string }>(`/vaults/${vaultId}/oprf/evaluate-recovery`, {
      method: 'POST',
      body: JSON.stringify({ blindedElement }),
    });
  }

  async reportVaultPinFailure(
    vaultId: string
  ): Promise<{ remainingAttempts: number; lockoutUntil: number; serverTime: number }> {
    return this.transport.request<{ remainingAttempts: number; lockoutUntil: number; serverTime: number }>(
      `/vaults/${vaultId}/pin/fail`,
      {
        method: 'POST',
      }
    );
  }

  async reportVaultPinSuccess(vaultId: string): Promise<void> {
    await this.transport.request<void>(`/vaults/${vaultId}/pin/success`, {
      method: 'POST',
    });
  }
}
