/**
 * CreateWalletFlow - Main onboarding flow component
 * Extension-adapted: no framer-motion, password-based wallet creation
 *
 * Create flow:  start → nametag → passwordSetup → processing → mnemonicBackup → done
 * Restore flow: start → restoreMethod → restore → passwordSetup → processing → done
 */
import { useCallback } from "react";
import { useSphereContext } from "@/sdk/context";
import { useOnboardingFlow } from "./useOnboardingFlow";
import { StartScreen } from "./StartScreen";
import { RestoreMethodScreen } from "./RestoreMethodScreen";
import { RestoreScreen } from "./RestoreScreen";
import { PasswordSetupScreen } from "./PasswordSetupScreen";
import { ProcessingScreen } from "./ProcessingScreen";
import { MnemonicBackupScreen } from "./MnemonicBackupScreen";
import { NametagScreen } from "./NametagScreen";

export type { OnboardingStep } from "./useOnboardingFlow";

export function CreateWalletFlow() {
  const { exportWallet, nametag } = useSphereContext();

  const {
    // Step management
    step,
    setStep,
    goToStart,

    // State
    isBusy,
    error,
    isRestoreFlow,

    // Password state
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,

    // Mnemonic restore state
    seedWords,
    setSeedWords,

    // Generated mnemonic
    generatedMnemonic,

    // Nametag state
    nametagInput,
    setNametagInput,
    nametagAvailability,

    // Processing state
    processingStatus,
    processingStep,
    processingTotalSteps,
    processingTitle,
    processingCompleteTitle,
    isProcessingComplete,

    // Actions
    handleCreateKeys,
    handleStartRestore,
    handleRestoreWallet,
    handleMintNametag,
    handleSkipNametag,
    handlePasswordConfirm,
    handleMnemonicBackupConfirm,
  } = useOnboardingFlow();

  const handleDownloadBackup = useCallback(async () => {
    try {
      const jsonData = await exportWallet();
      const tag = (nametag || nametagInput.trim())?.replace(/^@/, "") || null;
      const fileName = tag
        ? `${tag}.json`
        : "sphere_wallet_backup.json";
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download backup:", err);
    }
  }, [exportWallet, nametag, nametagInput]);

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 text-center relative">
      {step === "start" && (
        <StartScreen
          isBusy={isBusy}
          error={error}
          onCreateWallet={handleCreateKeys}
          onRestore={handleStartRestore}
        />
      )}

      {step === "restoreMethod" && (
        <RestoreMethodScreen
          isBusy={isBusy}
          error={error}
          onSelectMnemonic={() => setStep("restore")}
          onBack={goToStart}
        />
      )}

      {step === "restore" && (
        <RestoreScreen
          seedWords={seedWords}
          isBusy={isBusy}
          error={error}
          onSeedWordsChange={setSeedWords}
          onRestore={handleRestoreWallet}
          onBack={() => setStep("restoreMethod")}
        />
      )}

      {step === "nametag" && (
        <NametagScreen
          nametagInput={nametagInput}
          isBusy={isBusy}
          error={error}
          availability={nametagAvailability}
          onNametagChange={setNametagInput}
          onSubmit={handleMintNametag}
          onSkip={handleSkipNametag}
          onBack={goToStart}
        />
      )}

      {step === "passwordSetup" && (
        <PasswordSetupScreen
          password={password}
          confirmPassword={confirmPassword}
          isBusy={isBusy}
          error={error}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onConfirm={handlePasswordConfirm}
          onBack={() => setStep(isRestoreFlow ? "restore" : "nametag")}
        />
      )}

      {step === "processing" && (
        <ProcessingScreen
          status={processingStatus}
          currentStep={processingStep}
          totalSteps={processingTotalSteps}
          title={processingTitle}
          completeTitle={processingCompleteTitle}
          isComplete={isProcessingComplete}
        />
      )}

      {step === "mnemonicBackup" && generatedMnemonic && (
        <MnemonicBackupScreen
          mnemonic={generatedMnemonic}
          onDownloadBackup={handleDownloadBackup}
          onConfirm={handleMnemonicBackupConfirm}
        />
      )}
    </div>
  );
}
