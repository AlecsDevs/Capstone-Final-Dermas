import { Stepper } from '../../../../components/Stepper'
import type { StepItem } from '../../../../types/zoneReport'

interface ZoneReportStepperProps {
  steps: StepItem[]
  currentStep: number
}

export function ZoneReportStepper({ steps, currentStep }: ZoneReportStepperProps) {
  const current = steps.find(step => step.id === currentStep)
  const progress = Math.max(0, Math.min(100, (currentStep / Math.max(steps.length, 1)) * 100))

  return (
    <div className="zr-stepper-wrap">
      <div className="zr-stepper-desktop">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>

      <div className="zr-stepper-mobile" aria-label="Current step">
        <div className="zr-stepper-mobile-top">Step {currentStep} of {steps.length}</div>
        <div className="zr-stepper-mobile-label">{current?.label ?? 'Progress'}</div>
        <div className="zr-stepper-mobile-track">
          <span className="zr-stepper-mobile-fill" style={{ width: `${progress}%` }}></span>
        </div>
      </div>
    </div>
  )
}
