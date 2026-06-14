"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProjectCreateStepConfirm } from "./ProjectCreateStepConfirm";
import { ProjectCreateStepDetails } from "./ProjectCreateStepDetails";
import { ProjectCreateSuccess } from "./ProjectCreateSuccess";
import { ProjectCreateWizardHeader } from "./ProjectCreateWizardHeader";
import { projectCreateTokens } from "./project-create-tokens";
import { useMobileProjectCreate } from "./useMobileProjectCreate";

export function MobileProjectCreateWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const { form, updateForm, createProject, isSubmitting, error, createdProjectId } =
    useMobileProjectCreate();

  const handleBack = () => {
    if (showSuccess) {
      router.push("/projects");
      return;
    }
    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }
    router.back();
  };

  const handleComplete = async () => {
    const projectId = await createProject();
    if (projectId) setShowSuccess(true);
  };

  if (showSuccess && createdProjectId) {
    return (
      <div className={projectCreateTokens.page}>
        <ProjectCreateWizardHeader step={2} onBack={handleBack} />
        <div className={projectCreateTokens.scrollBody}>
          <ProjectCreateSuccess projectId={createdProjectId} projectName={form.name} inviteWarnings={[]} />
        </div>
      </div>
    );
  }

  return (
    <div className={projectCreateTokens.page}>
      <ProjectCreateWizardHeader step={step} onBack={handleBack} />

      <div className={projectCreateTokens.scrollBody}>
        {error ? <div className={`mb-4 ${projectCreateTokens.errorBanner}`}>{error}</div> : null}

        {step === 1 ? (
          <ProjectCreateStepDetails form={form} onChange={updateForm} onContinue={() => setStep(2)} />
        ) : null}

        {step === 2 ? (
          <ProjectCreateStepConfirm
            form={form}
            isSubmitting={isSubmitting}
            onSubmit={() => void handleComplete()}
          />
        ) : null}
      </div>
    </div>
  );
}
