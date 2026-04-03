interface Step {
  id: number
  label: string
}

interface StepperProps {
  steps: Step[]
  currentStep: number
}

export const Stepper = ({ steps, currentStep }: StepperProps) => {
  return (
    <div className="stepper-container">
      <div className="stepper-wrapper">
        {steps.map((step, index) => (
          <div key={step.id} className="stepper-item">
            <div className={`stepper-step ${currentStep >= step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}>
              {step.id}
            </div>
            <div className="stepper-label">{step.label}</div>
            {index < steps.length - 1 && (
              <div className={`stepper-line ${currentStep > step.id ? 'active' : ''}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
