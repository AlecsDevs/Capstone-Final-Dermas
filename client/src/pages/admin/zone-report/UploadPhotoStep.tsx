interface UploadPhotoStepProps {
  uploadedPhoto: string | null
  onPhotoChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function UploadPhotoStep({ uploadedPhoto, onPhotoChange }: UploadPhotoStepProps) {
  return (
    <div className="step-content">
      <div className="step-header mb-4">
        <h4 className="fw-bold mb-1">Upload Documentation</h4>
        <p className="text-muted mb-0">Attach one photo related to this incident.</p>
      </div>

      <label className="upload-zone d-block">
        <i className="bi bi-cloud-arrow-up fs-2 text-secondary"></i>
        <h6 className="mt-3">Click to upload photo</h6>
        <p className="text-muted mb-0">JPG, PNG up to 20MB</p>
        <input
          type="file"
          accept="image/jpeg,image/png"
          className="d-none"
          onChange={onPhotoChange}
        />
      </label>

      {uploadedPhoto && (
        <div className="mt-3 text-center">
          <img src={uploadedPhoto} alt="Incident" className="zr-photo-preview" />
        </div>
      )}
    </div>
  )
}
